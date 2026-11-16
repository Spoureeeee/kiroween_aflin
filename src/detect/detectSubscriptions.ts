import type { Transaction } from "../parse/types.js";
import type { DetectedSubscription } from "./types.js";
import { normaliseMerchant } from "./normaliseMerchant.js";
import { computeGaps, median, daysBetween } from "./computeIntervals.js";
import { classifyCadence, MIN_OCCURRENCES, ACTIVE_LOOKBACK } from "./classifyCadence.js";
import { assessAmounts } from "./assessAmounts.js";

const AMOUNT_SUM_LIMIT = 999_999_999;

export function detectSubscriptions(
  transactions: readonly Transaction[]
): DetectedSubscription[] {
  // Step 1 - Credit filter.
  // Keep the full list for the isActive look-back anchor in Step 8.
  const allTransactions = transactions;
  const debits = transactions.filter((t) => t.amountMinorUnits > 0);

  // Step 2 - Merchant normalisation.
  const withMerchant = debits.map((t) => ({
    date: t.date,
    amountMinorUnits: t.amountMinorUnits,
    currency: t.currency,
    merchantName: normaliseMerchant(t.description),
  }));

  // Step 3 - Group by merchantName; discard blank keys.
  const groups = new Map<
    string,
    Array<{ date: string; amountMinorUnits: number; currency: string }>
  >();
  for (const item of withMerchant) {
    if (item.merchantName === "") continue;
    let group = groups.get(item.merchantName);
    if (group === undefined) {
      group = [];
      groups.set(item.merchantName, group);
    }
    group.push({
      date: item.date,
      amountMinorUnits: item.amountMinorUnits,
      currency: item.currency,
    });
  }

  // Determine the latest transaction date across ALL input transactions (Step 1 anchor).
  let latestTransactionDate = "";
  for (const t of allTransactions) {
    if (t.date > latestTransactionDate) latestTransactionDate = t.date;
  }

  const results: DetectedSubscription[] = [];

  for (const [merchantName, rawEntries] of groups) {
    // Step 4 - Same-day dedup by summing.
    const byDate = new Map<string, { amounts: number[]; currency: string }>();
    for (const entry of rawEntries) {
      const existing = byDate.get(entry.date);
      if (existing === undefined) {
        byDate.set(entry.date, {
          amounts: [entry.amountMinorUnits],
          currency: entry.currency,
        });
      } else {
        existing.amounts.push(entry.amountMinorUnits);
      }
    }

    const entries: Array<{ date: string; amountMinorUnits: number; currency: string }> = [];
    for (const [date, { amounts, currency }] of byDate) {
      if (amounts.length === 1) {
        entries.push({ date, amountMinorUnits: amounts[0] as number, currency });
      } else {
        const sum = amounts.reduce((acc, v) => acc + v, 0);
        if (sum > AMOUNT_SUM_LIMIT) {
          // Keep originals unsummed.
          for (const a of amounts) {
            entries.push({ date, amountMinorUnits: a, currency });
          }
        } else {
          entries.push({ date, amountMinorUnits: sum, currency });
        }
      }
    }

    // Step 5 - Cadence classification.
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const dates = entries.map((e) => e.date);
    const gaps = computeGaps(dates);
    const medianGap = median(gaps);
    if (medianGap === null) continue;
    const cadence = classifyCadence(medianGap);
    if (cadence === null) continue;

    // Step 6 - Minimum occurrences gate.
    if (entries.length < MIN_OCCURRENCES[cadence]) continue;

    // Step 7 - Amount assessment.
    const amounts = entries.map((e) => e.amountMinorUnits);
    const assessment = assessAmounts(amounts);
    if (!assessment.passes) continue;

    // Step 8 - Build DetectedSubscription.
    const firstCharge = entries[0]!.date;
    const lastCharge = entries[entries.length - 1]!.date;
    const currency = entries[0]!.currency;
    const chargeCount = entries.length;
    const confidence = chargeCount === 2 ? "possible" : "confirmed";

    const isActive =
      latestTransactionDate !== "" &&
      daysBetween(lastCharge, latestTransactionDate) <= ACTIVE_LOOKBACK[cadence];

    results.push({
      merchantName,
      cadence,
      typicalAmountMinorUnits: assessment.typicalAmountMinorUnits,
      latestAmountMinorUnits: assessment.latestAmountMinorUnits,
      currency,
      firstCharge,
      lastCharge,
      chargeCount,
      confidence,
      isActive,
      amountChanged: assessment.amountChanged,
    });
  }

  // Step 9 - Sort by typicalAmountMinorUnits descending, then merchantName ascending.
  results.sort((a, b) => {
    if (b.typicalAmountMinorUnits !== a.typicalAmountMinorUnits) {
      return b.typicalAmountMinorUnits - a.typicalAmountMinorUnits;
    }
    return a.merchantName < b.merchantName ? -1 : a.merchantName > b.merchantName ? 1 : 0;
  });

  return results;
}
