/**
 * Main entry point for the CSV parsing module.
 *
 * Usage:
 *   import { parseCSV } from "./parse/parseCSV.js";
 *
 *   const result = parseCSV(csvText);
 *   // or with a manual column spec:
 *   const result = parseCSV(csvText, { date: "Date", description: "Details", debit: "Amount" });
 *
 * All statement data stays in memory; nothing is written to localStorage or
 * sent over the network (see privacy steering doc).
 */

import type {
  ParseResult,
  ManualColumnSpec,
  ColumnMap,
  SignConvention,
  Transaction,
} from "./types.js";
import { ParseError } from "./types.js";
import { tokeniseCSV } from "./tokenise.js";
import { detectColumns } from "./detectColumns.js";
import { resolveManualColumnMap } from "./resolveColumnMap.js";
import { parseDate } from "./parseDate.js";
import {
  parseAmount,
  inferCurrency,
  detectEuropeanDecimal,
} from "./parseAmount.js";

/** Options for `parseCSV`. */
export interface ParseOptions {
  /**
   * Manual column mapping supplied by the user. When provided, auto-detection
   * is skipped entirely.
   */
  manualColumns?: ManualColumnSpec;
  /**
   * Override the currency code for all transactions in this file.
   * Defaults to what is found in the amount cells, then to "MYR".
   */
  currency?: string;
  /**
   * Maximum number of non-fatal warnings to collect before stopping.
   * Defaults to 50.
   */
  maxWarnings?: number;
}

/**
 * Parses a CSV text string into normalised transactions.
 *
 * @throws `ParseError` when the file is structurally unrecognisable (too few
 *   columns, no data rows, column resolution failure).
 */
export function parseCSV(
  csvText: string,
  options: ParseOptions = {},
): ParseResult {
  const { maxWarnings = 50 } = options;
  const warnings: string[] = [];

  const addWarning = (msg: string) => {
    if (warnings.length < maxWarnings) warnings.push(msg);
  };

  // â”€â”€ 1. Tokenise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const rows = tokeniseCSV(csvText);

  if (rows.length === 0) {
    throw new ParseError(
      "The CSV is empty",
      "The file has no content. Please upload a CSV with at least a header row and one transaction row.",
    );
  }

  // Find the header row: first row that has at least 2 non-empty cells and
  // does not look entirely numeric. Some bank exports have metadata rows at the
  // top; skip them.
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]!;
    const nonEmpty = row.filter((c) => c !== "");
    const allNumeric = nonEmpty.every((c) => /^[\d.,\s-]+$/.test(c));
    if (nonEmpty.length >= 2 && !allNumeric) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rows[headerRowIndex]!;
  const dataRows = rows.slice(headerRowIndex + 1);

  if (dataRows.length === 0) {
    throw new ParseError(
      "No data rows found",
      "The file appears to have a header but no transaction rows beneath it.",
    );
  }

  if (headerRow.length < 2) {
    throw new ParseError(
      "Too few columns",
      `Only ${headerRow.length} column was found. A statement CSV needs at least a date, a description and an amount column.`,
    );
  }

  // â”€â”€ 2. Resolve column map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  let columnMap: ColumnMap;
  let signConvention: SignConvention;
  let detectionConfidence = 1;

  if (options.manualColumns) {
    columnMap = resolveManualColumnMap(options.manualColumns, headerRow);
    signConvention = options.manualColumns.credit !== undefined
      ? "split-columns"
      : "debit-positive";
  } else {
    const detected = detectColumns(headerRow, dataRows);
    if (!detected) {
      throw new ParseError(
        "Could not detect column layout",
        "The column headers could not be matched to date, description and amount roles. " +
          "Use the manual column mapper to tell the parser which columns to use.",
      );
    }
    columnMap = detected.columnMap;
    signConvention = detected.signConvention;
    detectionConfidence = detected.confidence;

    if (detectionConfidence < 0.6) {
      addWarning(
        `Column detection confidence is low (${Math.round(detectionConfidence * 100)}%). ` +
          "Review the parsed results and use the manual mapper if columns look wrong.",
      );
    }
  }

  // â”€â”€ 3. Infer currency and decimal convention â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const amountSamples = dataRows
    .slice(0, 30)
    .map((r) => r[columnMap.debit] ?? "")
    .filter((v) => v !== "");

  const europeanDecimal = detectEuropeanDecimal(amountSamples);
  const currency =
    options.currency ??
    options.manualColumns?.currency ??
    inferCurrency(amountSamples);

  // â”€â”€ 4. Parse rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  let skippedRows = headerRowIndex; // rows before the header
  const validTransactions: Transaction[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;
    const rowNum = headerRowIndex + i + 2; // 1-based, counting from file start

    const result = buildTransaction(
      row,
      columnMap,
      signConvention,
      europeanDecimal,
      currency,
      rowNum,
      addWarning,
    );

    if (result === null) {
      skippedRows++;
    } else {
      validTransactions.push(result);
    }
  }

  if (validTransactions.length === 0) {
    throw new ParseError(
      "No valid transactions parsed",
      "Every data row was skipped due to missing or unrecognisable date/amount values. " +
        "Check that the correct columns are mapped.",
    );
  }

  return {
    transactions: validTransactions,
    currency,
    skippedRows,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Row builder
// ---------------------------------------------------------------------------

function buildTransaction(
  row: string[],
  map: ColumnMap,
  signConvention: SignConvention,
  europeanDecimal: boolean,
  currency: string,
  rowNum: number,
  addWarning: (msg: string) => void,
): Transaction | null {
  // Skip completely blank rows.
  if (row.every((c) => c === "")) return null;

  // â”€â”€ Date â”€â”€
  const rawDate = row[map.date] ?? "";
  const date = parseDate(rawDate);
  if (!date) {
    if (rawDate !== "") {
      addWarning(`Row ${rowNum}: could not parse date "${rawDate}" â€” row skipped.`);
    }
    return null;
  }

  // â”€â”€ Description â”€â”€
  const description = (row[map.description] ?? "").trim();

  // â”€â”€ Amount â”€â”€
  let amountMinorUnits: number;

  if (signConvention === "split-columns" && map.credit !== undefined) {
    const rawDebit = row[map.debit] ?? "";
    const rawCredit = row[map.credit] ?? "";

    const debitAmount = parseAmount(rawDebit, europeanDecimal);
    const creditAmount = parseAmount(rawCredit, europeanDecimal);

    if (debitAmount === null && creditAmount === null) {
      if (rawDebit !== "" || rawCredit !== "") {
        addWarning(
          `Row ${rowNum}: could not parse debit "${rawDebit}" or credit "${rawCredit}" â€” row skipped.`,
        );
      }
      return null;
    }

    // Debit (money out) is positive; credit (money in) is negative.
    if (debitAmount !== null && debitAmount !== 0) {
      amountMinorUnits = Math.abs(debitAmount);
    } else if (creditAmount !== null && creditAmount !== 0) {
      amountMinorUnits = -Math.abs(creditAmount);
    } else {
      // Both zero â€” keep as 0 (might be a fee waiver row, etc.)
      amountMinorUnits = 0;
    }
  } else {
    const rawAmount = row[map.debit] ?? "";
    const parsed = parseAmount(rawAmount, europeanDecimal);

    if (parsed === null) {
      if (rawAmount !== "") {
        addWarning(`Row ${rowNum}: could not parse amount "${rawAmount}" â€” row skipped.`);
      }
      return null;
    }

    if (signConvention === "debit-negative") {
      // In this convention, negative means debit (money out); we flip to
      // our internal convention (positive = money out).
      amountMinorUnits = -parsed;
    } else {
      // debit-positive: sign is already correct.
      amountMinorUnits = parsed;
    }
  }

  return { date, description, amountMinorUnits, currency };
}

