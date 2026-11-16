export interface AmountAssessment {
  typicalAmountMinorUnits: number;
  latestAmountMinorUnits: number;
  amountChanged: boolean;
  passes: boolean;
}

// Population coefficient of variation: stdDev / mean.
// Uses integer arithmetic throughout; Math.sqrt only for the final step.
// Returns 0 when all amounts are equal.
export function computeCV(amounts: readonly number[]): number {
  const n = amounts.length;
  if (n === 0) return 0;

  let sum = 0;
  for (const x of amounts) sum += x;
  const mean = sum / n; // floating point only used here and in sqrt below

  let sumSqDiff = 0;
  for (const x of amounts) {
    const diff = x - mean;
    sumSqDiff += diff * diff;
  }

  if (sumSqDiff === 0) return 0;

  const stdDev = Math.sqrt(sumSqDiff / n);
  return stdDev / mean;
}

// Returns true when the sequence has the form A*B* -- changes value at most once.
// A single-element (or empty) array is always true.
export function isMonotoneStep(amounts: readonly number[]): boolean {
  if (amounts.length <= 1) return true;

  let transitionCount = 0;
  for (let i = 1; i < amounts.length; i++) {
    if (amounts[i] !== amounts[i - 1]) {
      transitionCount++;
      if (transitionCount > 1) return false;
    }
  }
  return true;
}

// Median using lower-of-two rule: sort ascending, pick index floor((n-1)/2).
function median(amounts: readonly number[]): number {
  const sorted = amounts.slice().sort((a, b) => a - b);
  // sorted is non-empty (caller guarantees amounts is non-empty)
  return sorted[Math.floor((sorted.length - 1) / 2)] as number;
}

export function assessAmounts(amounts: readonly number[]): AmountAssessment {
  const typicalAmountMinorUnits = median(amounts);
  const latestAmountMinorUnits = amounts[amounts.length - 1] as number;
  const amountChanged = latestAmountMinorUnits !== typicalAmountMinorUnits;

  const cv = computeCV(amounts);
  let passes = cv <= 0.10;

  if (!passes) {
    // Clean price-step exemption:
    // - distinct value count <= 2
    // - total occurrences >= 3
    // - isMonotoneStep
    const distinct = new Set(amounts).size;
    if (
      distinct <= 2 &&
      amounts.length >= 3 &&
      isMonotoneStep(amounts)
    ) {
      passes = true;
    }
  }

  return { typicalAmountMinorUnits, latestAmountMinorUnits, amountChanged, passes };
}
