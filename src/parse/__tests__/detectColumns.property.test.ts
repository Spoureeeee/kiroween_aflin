/**
 * Property-based tests for detectColumns.
 *
 * The tech steering doc requires at least one property-based test for every
 * function in detect/. detectColumns lives in parse/ but it is the detection
 * logic, so it gets coverage here too.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { detectColumns } from "../detectColumns.js";

// A minimal but structurally valid data row.
const validDataRow = (cols: number) =>
  fc.tuple(
    fc.constant("15-03-2024"),                        // date-ish
    fc.string({ minLength: 5, maxLength: 30 }),       // description
    ...Array(Math.max(0, cols - 2)).fill(
      fc.oneof(fc.constant(""), fc.float({ min: 0, max: 9999 }).map((n) => n.toFixed(2))),
    ),
  ).map((parts) => parts as string[]);

describe("detectColumns – properties", () => {
  it("confidence is always in [0, 1] when a result is returned", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 8 }),
        fc.array(
          fc.array(fc.string({ maxLength: 20 }), { minLength: 2, maxLength: 8 }),
          { minLength: 1, maxLength: 20 },
        ),
        (headers, dataRows) => {
          // Pad/truncate data rows to match header count.
          const colCount = headers.length;
          const normalised = dataRows.map((r) => {
            const row = r.slice(0, colCount);
            while (row.length < colCount) row.push("");
            return row;
          });
          const result = detectColumns(headers, normalised);
          if (result === null) return true;
          return result.confidence >= 0 && result.confidence <= 1;
        },
      ),
    );
  });

  it("never maps two roles to the same column index when result is non-null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 8 }),
        fc.array(
          fc.array(fc.string({ maxLength: 20 }), { minLength: 2, maxLength: 8 }),
          { minLength: 1, maxLength: 20 },
        ),
        (headers, dataRows) => {
          const colCount = headers.length;
          const normalised = dataRows.map((r) => {
            const row = r.slice(0, colCount);
            while (row.length < colCount) row.push("");
            return row;
          });
          const result = detectColumns(headers, normalised);
          if (result === null) return true;
          const { columnMap } = result;
          const indices = [
            columnMap.date,
            columnMap.description,
            columnMap.debit,
            ...(columnMap.credit !== undefined ? [columnMap.credit] : []),
          ];
          const unique = new Set(indices);
          return unique.size === indices.length;
        },
      ),
    );
  });

  it("all returned column indices are valid indices into the header array", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 8 }),
        fc.array(
          fc.array(fc.string({ maxLength: 20 }), { minLength: 2, maxLength: 8 }),
          { minLength: 1, maxLength: 20 },
        ),
        (headers, dataRows) => {
          const colCount = headers.length;
          const normalised = dataRows.map((r) => {
            const row = r.slice(0, colCount);
            while (row.length < colCount) row.push("");
            return row;
          });
          const result = detectColumns(headers, normalised);
          if (result === null) return true;
          const { columnMap } = result;
          const indices = [
            columnMap.date,
            columnMap.description,
            columnMap.debit,
            ...(columnMap.credit !== undefined ? [columnMap.credit] : []),
          ];
          return indices.every((i) => i >= 0 && i < headers.length);
        },
      ),
    );
  });
});
