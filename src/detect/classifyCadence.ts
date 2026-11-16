import type { Cadence } from "./types.js";

export function classifyCadence(medianInterval: number): Cadence | null {
  throw new Error("not implemented");
}

export const MIN_OCCURRENCES: Readonly<Record<Cadence, number>> = {
  weekly: 0, monthly: 0, quarterly: 0, annual: 0
};

export const ACTIVE_LOOKBACK: Readonly<Record<Cadence, number>> = {
  weekly: 0, monthly: 0, quarterly: 0, annual: 0
};
