import type { Transaction } from "../parse/types.js";
import type { DetectedSubscription } from "./types.js";

export function detectSubscriptions(
  transactions: readonly Transaction[]
): DetectedSubscription[] {
  throw new Error("not implemented");
}
