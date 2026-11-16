export type Cadence = "weekly" | "monthly" | "quarterly" | "annual";
export type Confidence = "confirmed" | "possible";

export interface DetectedSubscription {
  merchantName: string;
  cadence: Cadence;
  typicalAmountMinorUnits: number;   // positive integer >= 1
  latestAmountMinorUnits: number;    // positive integer >= 1
  currency: string;                  // ISO 4217
  firstCharge: string;               // ISO date YYYY-MM-DD
  lastCharge: string;                // ISO date YYYY-MM-DD
  chargeCount: number;               // occurrences after duplicate suppression
  confidence: Confidence;
  isActive: boolean;
  amountChanged: boolean;
}
