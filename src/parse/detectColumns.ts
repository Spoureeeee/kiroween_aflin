/**
 * Auto-detects which columns contain the date, description and amount.
 *
 * Strategy:
 *   1. Score each column against keyword sets and value patterns.
 *   2. Pick the best non-overlapping candidates.
 *   3. If confidence is too low, return null so the caller can fall back to
 *      the manual mapper.
 */

import type { ColumnMap, SignConvention } from "./types.js";

/** Minimum fraction of data rows that must match a pattern to accept it. */
const MIN_MATCH_FRACTION = 0.5;

// ---------------------------------------------------------------------------
// Keyword sets for header matching
// ---------------------------------------------------------------------------

const DATE_HEADERS = [
  "date",
  "transaction date",
  "txn date",
  "posting date",
  "value date",
  "trade date",
  "settlement date",
  "tanggal",   // Malay/Indonesian
];

const DESC_HEADERS = [
  "description",
  "desc",
  "details",
  "particulars",
  "narrative",
  "merchant",
  "reference",
  "memo",
  "remarks",
  "keterangan", // Malay/Indonesian
];

const DEBIT_HEADERS = [
  "debit",
  "debit amount",
  "withdrawal",
  "withdrawals",
  "amount",
  "charge",
  "charges",
  "payment",
  "dr",
  "debit (rm)",
  "pengeluaran", // Malay
];

const CREDIT_HEADERS = [
  "credit",
  "credit amount",
  "deposit",
  "deposits",
  "cr",
  "credit (rm)",
  "masukan", // Malay
];

/** Headers that commonly hold a single signed amount. */
const SIGNED_AMOUNT_HEADERS = [
  "amount",
  "jumlah",  // Malay
  "transaction amount",
  "txn amount",
];

// ---------------------------------------------------------------------------
// Value-pattern regexes
// ---------------------------------------------------------------------------

/** Matches common date representations, not time-only or year-only strings. */
const DATE_VALUE_RE =
  /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$|^\d{1,2}\s+\w{3}\s+\d{2,4}$|^\w{3}\s+\d{1,2},?\s+\d{4}$/;

/** Matches numeric amounts, possibly with commas, currency prefix/suffix, sign. */
const AMOUNT_VALUE_RE = /^[+-]?[A-Z]{0,3}\s*[\d,]+(\.\d{1,4})?$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreHeaderAgainst(header: string, keywords: string[]): number {
  const h = normaliseHeader(header);
  for (const kw of keywords) {
    if (h === kw) return 2; // exact match
    if (h.includes(kw) || kw.includes(h)) return 1; // partial
  }
  return 0;
}

function matchFraction(values: string[], re: RegExp): number {
  if (values.length === 0) return 0;
  const hits = values.filter((v) => re.test(v.trim())).length;
  return hits / values.length;
}

function columnValues(rows: string[][], colIdx: number): string[] {
  return rows.map((r) => r[colIdx] ?? "").filter((v) => v !== "");
}

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

export interface DetectResult {
  columnMap: ColumnMap;
  signConvention: SignConvention;
  /** 0â€“1 confidence score. */
  confidence: number;
}

/**
 * Attempts to detect the column map from the header row and data rows.
 *
 * @param headers  - The header row (first row of the CSV, already split).
 * @param dataRows - The remaining rows (without the header).
 * @returns `DetectResult` when confident enough, or `null` to trigger manual mapping.
 */
export function detectColumns(
  headers: string[],
  dataRows: string[][],
): DetectResult | null {
  const n = headers.length;
  if (n < 2) return null;

  // Score each column for each role.
  const dateScores = headers.map((h, i) => {
    const headerScore = scoreHeaderAgainst(h, DATE_HEADERS) * 2;
    const values = columnValues(dataRows, i);
    const valueScore = matchFraction(values, DATE_VALUE_RE) >= MIN_MATCH_FRACTION ? 2 : 0;
    return headerScore + valueScore;
  });

  const descScores = headers.map((h, i) => {
    const headerScore = scoreHeaderAgainst(h, DESC_HEADERS) * 2;
    // Description columns usually contain longer text; penalise short/numeric cols.
    const values = columnValues(dataRows, i);
    const avgLen = values.reduce((s, v) => s + v.length, 0) / (values.length || 1);
    const lengthBonus = avgLen > 10 ? 1 : 0;
    const numericPenalty = matchFraction(values, AMOUNT_VALUE_RE) > 0.8 ? -3 : 0;
    return headerScore + lengthBonus + numericPenalty;
  });

  const debitScores = headers.map((h, i) => {
    const headerScore = scoreHeaderAgainst(h, DEBIT_HEADERS) * 2;
    const values = columnValues(dataRows, i);
    const valueScore = matchFraction(values, AMOUNT_VALUE_RE) >= MIN_MATCH_FRACTION ? 2 : 0;
    return headerScore + valueScore;
  });

  const creditScores = headers.map((h, i) => {
    const headerScore = scoreHeaderAgainst(h, CREDIT_HEADERS) * 2;
    const values = columnValues(dataRows, i);
    const valueScore = matchFraction(values, AMOUNT_VALUE_RE) >= MIN_MATCH_FRACTION ? 2 : 0;
    return headerScore + valueScore;
  });

  // Pick best column for each role, ensuring no two roles share the same column.
  const datePick = bestUnused(dateScores, new Set<number>());
  const used = new Set([datePick.index]);

  const descPick = bestUnused(descScores, used);
  used.add(descPick.index);

  const debitPick = bestUnused(debitScores, used);
  used.add(debitPick.index);

  // Credit column is optional.
  const creditPick = bestUnused(creditScores, used);
  const hasCreditCol =
    creditPick.score >= 2 &&
    headers.some((h) =>
      scoreHeaderAgainst(h, CREDIT_HEADERS) > 0,
    );

  // Determine sign convention.
  let signConvention: SignConvention;
  if (hasCreditCol) {
    signConvention = "split-columns";
  } else {
    // Check if the debit column contains negative values (bank-perspective sign).
    const debitValues = columnValues(dataRows, debitPick.index);
    const hasNegatives = debitValues.some((v) => /^-/.test(v.trim()));
    const hasPositives = debitValues.some((v) => /^\+?[^-]/.test(v.trim()));
    signConvention = hasNegatives && hasPositives ? "debit-negative" : "debit-positive";
  }

  // Compute overall confidence.
  const totalScore = datePick.score + descPick.score + debitPick.score;
  // Max possible: 4 header + 2 value = 6 per key column Ã— 3 = 18.
  const confidence = Math.min(totalScore / 12, 1);

  if (confidence < 0.3) return null;

  const columnMap: ColumnMap = {
    date: datePick.index,
    description: descPick.index,
    debit: debitPick.index,
    ...(hasCreditCol ? { credit: creditPick.index } : {}),
  };

  return { columnMap, signConvention, confidence };
}

function bestUnused(
  scores: number[],
  excluded: Set<number>,
): { index: number; score: number } {
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < scores.length; i++) {
    if (!excluded.has(i) && (scores[i] ?? -Infinity) > bestScore) {
      bestScore = scores[i]!;
      bestIdx = i;
    }
  }
  // If every column is excluded or scores are all zero, pick the first unused.
  if (bestIdx === -1) {
    for (let i = 0; i < scores.length; i++) {
      if (!excluded.has(i)) {
        bestIdx = i;
        bestScore = 0;
        break;
      }
    }
  }
  return { index: bestIdx === -1 ? 0 : bestIdx, score: bestScore };
}

