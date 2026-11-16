import type { Cadence } from "./types.js";

export function classifyCadence(medianInterval: number): Cadence | null {
  if (medianInterval >= 0 && medianInterval <= 15) return "weekly";
  if (medianInterval >= 20 && medianInterval <= 50) return "monthly";
  if (medianInterval >= 75 && medianInterval <= 105) return "quarterly";
  if (medianInterval >= 325 && medianInterval <= 405) return "annual";
  return null;
}

export const MIN_OCCURRENCES: Readonly<Record<Cadence, number>> = {
  weekly: 3,
  monthly: 2,
  quarterly: 2,
  annual: 2,
};

export const ACTIVE_LOOKBACK: Readonly<Record<Cadence, number>> = {
  weekly: 10,
  monthly: 45,
  quarterly: 135,
  annual: 548,
};
