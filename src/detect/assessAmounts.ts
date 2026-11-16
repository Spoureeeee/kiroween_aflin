export interface AmountAssessment {
  typicalAmountMinorUnits: number;
  latestAmountMinorUnits: number;
  amountChanged: boolean;
  passes: boolean;
}

export function computeCV(amounts: readonly number[]): number {
  throw new Error("not implemented");
}

export function isMonotoneStep(amounts: readonly number[]): boolean {
  throw new Error("not implemented");
}

export function assessAmounts(amounts: readonly number[]): AmountAssessment {
  throw new Error("not implemented");
}
