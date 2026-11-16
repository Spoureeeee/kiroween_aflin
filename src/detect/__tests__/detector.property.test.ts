/**
 * Property-based tests for detectSubscriptions.
 *
 * Property 1: Order-independence (Requirement 11.1)
 *   For all permutations of a valid transaction list, detectSubscriptions
 *   returns the same result regardless of transaction order.
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { detectSubscriptions } from "../index.js";
import type { Transaction } from "../../parse/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Add `days` calendar days to an ISO date string (YYYY-MM-DD). */
function addDays(isoDate: string, days: number): string {
  const ms = Date.UTC(
    parseInt(isoDate.slice(0, 4), 10),
    parseInt(isoDate.slice(5, 7), 10) - 1,
    parseInt(isoDate.slice(8, 10), 10),
  );
  const result = new Date(ms + days * 86_400_000);
  const y = result.getUTCFullYear();
  const m = String(result.getUTCMonth() + 1).padStart(2, "0");
  const d = String(result.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Fisher-Yates shuffle (creates a new array, does not mutate the input). */
function shuffle<T>(arr: readonly T[], indices: number[]): T[] {
  const copy = arr.slice();
  // Use the provided indices as a source of randomness by swapping according
  // to them (mod the remaining length). fast-check's model gives us a
  // shuffledSubarray approach; here we drive a deterministic FY from an
  // arbitrary integer array that fast-check generates alongside the data.
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.abs(indices[i % indices.length] ?? 0) % (i + 1);
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Builds a confirmed monthly subscription series plus random noise.
 *
 * The series uses an alphabetic-only merchant name so that the numeric-suffix
 * stripping in normaliseMerchant does not interfere.
 */
const monthlySeriesPlusNoise: fc.Arbitrary<Transaction[]> = fc
  .tuple(
    // Series merchant name (alphabetic, 4-10 chars)
    fc.stringMatching(/^[A-Z]{4,10}$/),
    // Noise merchant name - distinct from series merchant
    fc.stringMatching(/^[A-Z]{4,10}$/),
    // Fixed charge amount for the series (1 MYR to 999 MYR in sen)
    fc.integer({ min: 100, max: 99900 }),
    // Number of charges: 3-6
    fc.integer({ min: 3, max: 6 }),
    // Intervals between charges (28-32 days each)
    fc.array(fc.integer({ min: 28, max: 32 }), { minLength: 5, maxLength: 5 }),
    // Number of noise transactions: 0-10
    fc.integer({ min: 0, max: 10 }),
    // Noise amounts
    fc.array(fc.integer({ min: 1, max: 99900 }), {
      minLength: 10,
      maxLength: 10,
    }),
    // Noise date offsets from base (0-180 days)
    fc.array(fc.integer({ min: 0, max: 180 }), {
      minLength: 10,
      maxLength: 10,
    }),
  )
  .filter(
    ([seriesMerchant, noiseMerchant]) => seriesMerchant !== noiseMerchant,
  )
  .map(
    ([
      seriesMerchant,
      noiseMerchant,
      amount,
      chargeCount,
      intervals,
      noiseCount,
      noiseAmounts,
      noiseOffsets,
    ]) => {
      const BASE_DATE = "2024-01-15";
      const transactions: Transaction[] = [];

      // Build series transactions
      let currentDate = BASE_DATE;
      for (let i = 0; i < chargeCount; i++) {
        transactions.push({
          date: currentDate,
          description: seriesMerchant,
          amountMinorUnits: amount,
          currency: "MYR",
        });
        if (i < chargeCount - 1) {
          currentDate = addDays(currentDate, intervals[i] ?? 30);
        }
      }

      // Build noise transactions
      for (let i = 0; i < noiseCount; i++) {
        transactions.push({
          date: addDays(BASE_DATE, noiseOffsets[i] ?? 0),
          description: noiseMerchant,
          amountMinorUnits: noiseAmounts[i] ?? 500,
          currency: "MYR",
        });
      }

      return transactions;
    },
  );

// ---------------------------------------------------------------------------
// Property 1: Order-independence
// ---------------------------------------------------------------------------

describe("Property 1: order-independence", () => {
  it(
    "detectSubscriptions output is identical for any permutation of the input",
    () => {
      fc.assert(
        fc.property(
          monthlySeriesPlusNoise,
          // Integer array used to drive the Fisher-Yates shuffle
          fc.array(fc.integer(), { minLength: 1, maxLength: 100 }),
          (transactions, shuffleSeeds) => {
            const shuffled = shuffle(transactions, shuffleSeeds);
            const original = detectSubscriptions(transactions);
            const permuted = detectSubscriptions(shuffled);
            return JSON.stringify(original) === JSON.stringify(permuted);
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 2: Monthly series with bounded drift is always detected
// Validates: Requirements 11.2
// ---------------------------------------------------------------------------

describe("Property 2: monthly drift detection", () => {
  it(
    "monthly series with 27-33 day intervals is classified as monthly/confirmed",
    () => {
      fc.assert(
        fc.property(
          // Merchant name: alphabetic only, no digits
          fc.stringMatching(/^[A-Z]{3,12}$/),
          // Number of charges: 3-6
          fc.integer({ min: 3, max: 6 }),
          // Per-interval drift in [27, 33] days (up to 5 intervals for 6 charges)
          fc.array(fc.integer({ min: 27, max: 33 }), {
            minLength: 5,
            maxLength: 5,
          }),
          // Fixed charge amount for the whole series (100-99900 minor units)
          fc.integer({ min: 100, max: 99900 }),
          (merchantName, chargeCount, intervals, amount) => {
            const BASE_DATE = "2024-01-15";
            const transactions: Transaction[] = [];

            // Build series: each date = previous + intervals[i] days
            let currentDate = BASE_DATE;
            for (let i = 0; i < chargeCount; i++) {
              transactions.push({
                date: currentDate,
                description: merchantName,
                amountMinorUnits: amount,
                currency: "MYR",
              });
              if (i < chargeCount - 1) {
                currentDate = addDays(currentDate, intervals[i] ?? 30);
              }
            }

            const results = detectSubscriptions(transactions);
            const entry = results.find((r) => r.merchantName === merchantName);

            // Series must be detected
            if (entry === undefined) return false;

            // Must be classified as monthly
            if (entry.cadence !== "monthly") return false;

            // Must have confirmed confidence (3+ occurrences)
            if (entry.confidence !== "confirmed") return false;

            return true;
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 3: All typical amounts are positive
// Validates: Requirements 11.3 / 9.4
// ---------------------------------------------------------------------------

describe("Property 3: all typical amounts are positive", () => {
  it(
    "every typicalAmountMinorUnits in the output is >= 1",
    () => {
      fc.assert(
        fc.property(
          // Series merchant name: alphabetic only, 4-10 chars
          fc.stringMatching(/^[A-Z]{4,10}$/),
          // Noise merchant name: alphabetic only, 4-10 chars (filtered distinct below)
          fc.stringMatching(/^[A-Z]{4,10}$/),
          // Fixed charge amount for the series (1 to 999900 minor units)
          fc.integer({ min: 1, max: 999900 }),
          // Number of charges: 3-6
          fc.integer({ min: 3, max: 6 }),
          // Intervals between charges: 28-32 days each (5 values, use first chargeCount-1)
          fc.array(fc.integer({ min: 28, max: 32 }), {
            minLength: 5,
            maxLength: 5,
          }),
          // Number of noise transactions: 0-10
          fc.integer({ min: 0, max: 10 }),
          // Noise amounts (positive)
          fc.array(fc.integer({ min: 1, max: 999900 }), {
            minLength: 10,
            maxLength: 10,
          }),
          // Noise date offsets from base date (0-180 days)
          fc.array(fc.integer({ min: 0, max: 180 }), {
            minLength: 10,
            maxLength: 10,
          }),
          (
            seriesMerchant,
            noiseMerchant,
            amount,
            chargeCount,
            intervals,
            noiseCount,
            noiseAmounts,
            noiseOffsets,
          ) => {
            // Skip if merchants collide (normalised names may match)
            if (seriesMerchant === noiseMerchant) return true;

            const BASE_DATE = "2024-03-01";
            const transactions: Transaction[] = [];

            // Build confirmed monthly series
            let currentDate = BASE_DATE;
            for (let i = 0; i < chargeCount; i++) {
              transactions.push({
                date: currentDate,
                description: seriesMerchant,
                amountMinorUnits: amount,
                currency: "MYR",
              });
              if (i < chargeCount - 1) {
                currentDate = addDays(currentDate, intervals[i] ?? 30);
              }
            }

            // Build noise transactions under a distinct merchant
            for (let i = 0; i < noiseCount; i++) {
              transactions.push({
                date: addDays(BASE_DATE, noiseOffsets[i] ?? 0),
                description: noiseMerchant,
                amountMinorUnits: noiseAmounts[i] ?? 500,
                currency: "MYR",
              });
            }

            const results = detectSubscriptions(transactions);

            // Every detected entry must have typicalAmountMinorUnits >= 1
            return results.every((entry) => entry.typicalAmountMinorUnits >= 1);
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 4: All-credit input yields empty output
// Validates: Requirements 11.4, 2.1, 2.2
// ---------------------------------------------------------------------------

describe("Property 4: all-credit input yields empty output", () => {
  it(
    "detectSubscriptions returns [] when every transaction has amountMinorUnits <= 0",
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              date: fc.constantFrom(
                "2024-01-01",
                "2024-02-01",
                "2024-03-01",
                "2024-04-01",
              ),
              description: fc.stringMatching(/^[A-Z]{3,10}$/),
              amountMinorUnits: fc.integer({ min: -999900, max: 0 }), // <= 0 only
              currency: fc.constant("MYR"),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (transactions) => {
            const result = detectSubscriptions(transactions);
            return result.length === 0;
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});
