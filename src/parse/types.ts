/**
 * Core types for the CSV parsing module.
 *
 * All amounts are stored as integer minor units (e.g. cents, sen) to avoid
 * floating-point rounding. A positive amount means money left the account
 * (a debit / expense). A negative amount means money entered (a credit /
 * refund).
 */

/** A single normalised transaction extracted from a statement CSV. */
export interface Transaction {
  /** ISO 8601 date string (YYYY-MM-DD, UTC). */
  date: string;
  /** Raw description text from the source file, whitespace-trimmed. */
  description: string;
  /**
   * Amount in integer minor units. Positive = debit (money out).
   * Negative = credit (money in / refund).
   */
  amountMinorUnits: number;
  /** ISO 4217 currency code inferred from the file, or the user-supplied value. */
  currency: string;
}

/**
 * Zero-indexed column indices resolved by the auto-detector or the manual
 * mapper. `credit` is optional; some formats use a single signed-amount column.
 */
export interface ColumnMap {
  date: number;
  description: number;
  /** Column that holds the debit amount (money out, stored as positive). */
  debit: number;
  /**
   * Column that holds the credit amount (money in).
   * When absent the debit column already carries sign.
   */
  credit?: number;
}

/** Sign convention used in the amount column(s). */
export type SignConvention =
  /** Positive = debit, negative or absent = credit. */
  | "debit-positive"
  /** Negative = debit, positive = credit. */
  | "debit-negative"
  /** Two separate columns: one for debit, one for credit. */
  | "split-columns";

/** Full result returned by `parseCSV`. */
export interface ParseResult {
  transactions: Transaction[];
  /** Currency code used for every transaction in this file. */
  currency: string;
  /** Number of raw rows that were skipped (blank, header, unparse-able). */
  skippedRows: number;
  /** Warnings accumulated during parsing (non-fatal). */
  warnings: string[];
}

/**
 * Error thrown (or the message returned) when the CSV is structurally
 * unrecognisable. The `hint` field carries a plain-language suggestion the
 * UI can show directly.
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly hint: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Manual column mapping supplied by the user when auto-detection fails.
 * Column names are matched case-insensitively against the header row.
 * Indices (0-based) are used when names are absent.
 */
export interface ManualColumnSpec {
  date: string | number;
  description: string | number;
  /** The debit column, or the single signed-amount column. */
  debit: string | number;
  credit?: string | number;
  currency?: string;
}
