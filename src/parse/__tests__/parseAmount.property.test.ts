/**
 * Property-based tests for parseAmount and related helpers.
 * Uses fast-check to generate arbitrary inputs and verify invariants.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseAmount, detectEuropeanDecimal } from "../parseAmount.js";

describe("parseAmount – properties", () => {
  it("always returns an integer or null", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = parseAmount(s);
        return result === null || Number.isInteger(result);
      }),
    );
  });

  it("round-trips: formatting an integer and parsing it recovers the value", () => {
    // Generate arbitrary minor-unit amounts (−10 million to +10 million cents).
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }), (minorUnits) => {
        const whole = Math.trunc(minorUnits / 100);
        const frac = Math.abs(minorUnits % 100);
        const formatted =
          `${whole < 0 || (whole === 0 && minorUnits < 0) ? "-" : ""}${Math.abs(whole)}.${String(frac).padStart(2, "0")}`;
        const parsed = parseAmount(formatted);
        return parsed === minorUnits;
      }),
    );
  });

  it("parseAmount with parentheses negates the value", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }),
        (minorUnits) => {
          const whole = Math.trunc(minorUnits / 100);
          const frac = minorUnits % 100;
          const positive = `${whole}.${String(frac).padStart(2, "0")}`;
          const paren = `(${positive})`;
          const posResult = parseAmount(positive);
          const negResult = parseAmount(paren);
          return (
            posResult !== null &&
            negResult !== null &&
            negResult === -posResult
          );
        },
      ),
    );
  });

  it("never returns a non-finite number", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = parseAmount(s);
        return result === null || isFinite(result);
      }),
    );
  });
});

describe("detectEuropeanDecimal – properties", () => {
  it("returns a boolean for any array of strings", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (samples) => {
        const result = detectEuropeanDecimal(samples);
        return typeof result === "boolean";
      }),
    );
  });
});
