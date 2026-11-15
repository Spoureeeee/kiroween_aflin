/**
 * Resolves a ManualColumnSpec (names or indices) to a concrete ColumnMap
 * against the actual header row.
 */

import type { ColumnMap, ManualColumnSpec, ParseError as ParseErrorType } from "./types.js";
import { ParseError } from "./types.js";

/**
 * Given a ManualColumnSpec and the header row, returns a ColumnMap or throws
 * a ParseError with a plain-language hint.
 */
export function resolveManualColumnMap(
  spec: ManualColumnSpec,
  headers: string[],
): ColumnMap {
  const resolve = (
    ref: string | number,
    role: string,
  ): number => {
    if (typeof ref === "number") {
      if (ref < 0 || ref >= headers.length) {
        throw new ParseError(
          `Column index ${ref} is out of range`,
          `The CSV has ${headers.length} column(s) (0–${headers.length - 1}). Check the "${role}" column index you provided.`,
        );
      }
      return ref;
    }
    // Name-based lookup: case-insensitive, whitespace-normalised.
    const normalise = (s: string) =>
      s.toLowerCase().replace(/\s+/g, " ").trim();
    const target = normalise(ref);
    const idx = headers.findIndex((h) => normalise(h) === target);
    if (idx === -1) {
      throw new ParseError(
        `Column "${ref}" not found`,
        `No column named "${ref}" was found. Available headers: ${headers.map((h) => `"${h}"`).join(", ")}.`,
      );
    }
    return idx;
  };

  const dateIdx = resolve(spec.date, "date");
  const descIdx = resolve(spec.description, "description");
  const debitIdx = resolve(spec.debit, "debit/amount");

  const map: ColumnMap = {
    date: dateIdx,
    description: descIdx,
    debit: debitIdx,
  };

  if (spec.credit !== undefined) {
    map.credit = resolve(spec.credit, "credit");
  }

  return map;
}
