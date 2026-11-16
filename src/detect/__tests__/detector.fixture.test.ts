/**
 * Fixture test for Requirement 12 - sample CSV assertions.
 *
 * Parses samples/statement-sample.csv through the full pipeline and asserts
 * all 16 Req 12 acceptance criteria.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV } from "../../parse/parseCSV.js";
import { detectSubscriptions } from "../index.js";
import type { DetectedSubscription } from "../index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const csvPath = resolve(__dirname, "../../../samples/statement-sample.csv");

let results: DetectedSubscription[];

beforeAll(() => {
  const csvText = readFileSync(csvPath, "utf-8");
  const { transactions } = parseCSV(csvText);
  results = detectSubscriptions(transactions);
});

const find = (name: string): DetectedSubscription | undefined =>
  results.find((r) => r.merchantName === name);

// ---------------------------------------------------------------------------
// Req 12.1-12.7: subscriptions that MUST be present
// ---------------------------------------------------------------------------

describe("Requirement 12 - present subscriptions", () => {
  it("12.1 IRONHOUSE GYM MEMBERSHIP: monthly, confirmed, 12900, unchanged, active", () => {
    const sub = find("IRONHOUSE GYM MEMBERSHIP");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("monthly");
    expect(sub!.confidence).toBe("confirmed");
    expect(sub!.typicalAmountMinorUnits).toBe(12900);
    expect(sub!.latestAmountMinorUnits).toBe(12900);
    expect(sub!.amountChanged).toBe(false);
    expect(sub!.isActive).toBe(true);
  });

  it("12.2 NIGHTFLIX.COM: monthly, confirmed, typical 5590, latest 5990, changed, active", () => {
    const sub = find("NIGHTFLIX.COM");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("monthly");
    expect(sub!.confidence).toBe("confirmed");
    expect(sub!.typicalAmountMinorUnits).toBe(5590);
    expect(sub!.latestAmountMinorUnits).toBe(5990);
    expect(sub!.amountChanged).toBe(true);
    expect(sub!.isActive).toBe(true);
  });

  it("12.3 SPOTIFLY PREMIUM: monthly, confirmed, 1790, unchanged, active", () => {
    const sub = find("SPOTIFLY PREMIUM");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("monthly");
    expect(sub!.confidence).toBe("confirmed");
    expect(sub!.typicalAmountMinorUnits).toBe(1790);
    expect(sub!.latestAmountMinorUnits).toBe(1790);
    expect(sub!.amountChanged).toBe(false);
    expect(sub!.isActive).toBe(true);
  });

  it("12.4 CLOUDBOX 200GB STORAGE: monthly, confirmed, 490, unchanged, active", () => {
    const sub = find("CLOUDBOX 200GB STORAGE");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("monthly");
    expect(sub!.confidence).toBe("confirmed");
    expect(sub!.typicalAmountMinorUnits).toBe(490);
    expect(sub!.latestAmountMinorUnits).toBe(490);
    expect(sub!.amountChanged).toBe(false);
    expect(sub!.isActive).toBe(true);
  });

  it("12.5 MOBILEONE POSTPAID BILL: monthly, confirmed, 6800, unchanged, active", () => {
    const sub = find("MOBILEONE POSTPAID BILL");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("monthly");
    expect(sub!.confidence).toBe("confirmed");
    expect(sub!.typicalAmountMinorUnits).toBe(6800);
    expect(sub!.latestAmountMinorUnits).toBe(6800);
    expect(sub!.amountChanged).toBe(false);
    expect(sub!.isActive).toBe(true);
  });

  it("12.6 PIXELPRO TRIAL CONVERSION: monthly, confirmed, 2990, unchanged, active", () => {
    const sub = find("PIXELPRO TRIAL CONVERSION");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("monthly");
    expect(sub!.confidence).toBe("confirmed");
    expect(sub!.typicalAmountMinorUnits).toBe(2990);
    expect(sub!.latestAmountMinorUnits).toBe(2990);
    expect(sub!.amountChanged).toBe(false);
    expect(sub!.isActive).toBe(true);
  });

  it("12.7 READLY NEWS DIGITAL: quarterly, possible, 4500, unchanged, active", () => {
    const sub = find("READLY NEWS DIGITAL");
    expect(sub).toBeDefined();
    expect(sub!.cadence).toBe("quarterly");
    expect(sub!.confidence).toBe("possible");
    expect(sub!.typicalAmountMinorUnits).toBe(4500);
    expect(sub!.latestAmountMinorUnits).toBe(4500);
    expect(sub!.amountChanged).toBe(false);
    expect(sub!.isActive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req 12.8-12.16: entries that must NOT appear in output
// ---------------------------------------------------------------------------

describe("Requirement 12 - absent entries", () => {
  it("12.8 FRESHMART GROCERIES is absent (variable amounts, high CV)", () => {
    expect(find("FRESHMART GROCERIES")).toBeUndefined();
  });

  it("12.9 PETRONOVA FUEL is absent (variable amounts, high CV)", () => {
    expect(find("PETRONOVA FUEL")).toBeUndefined();
  });

  it("12.10 KOPI CORNER is absent (variable amounts, high CV)", () => {
    expect(find("KOPI CORNER")).toBeUndefined();
  });

  it("12.11 SALARY CREDIT ACME SDN BHD is absent (credit, filtered out)", () => {
    expect(find("SALARY CREDIT ACME SDN BHD")).toBeUndefined();
  });

  it("12.12 DOMAINNEST ANNUAL RENEWAL is absent (single occurrence)", () => {
    expect(find("DOMAINNEST ANNUAL RENEWAL")).toBeUndefined();
  });

  it("12.13 QUICKBITE DELIVERY is absent (variable delivery amounts)", () => {
    expect(find("QUICKBITE DELIVERY")).toBeUndefined();
  });

  it("12.14 GREENLEAF MARKET is absent (variable market amounts)", () => {
    expect(find("GREENLEAF MARKET")).toBeUndefined();
  });

  it("12.15 PAYGO EWALLET RELOAD is absent (variable reload amounts)", () => {
    expect(find("PAYGO EWALLET RELOAD")).toBeUndefined();
  });

  it("12.16 BOOKNOOK ONLINE is absent (irregular/insufficient occurrences)", () => {
    expect(find("BOOKNOOK ONLINE")).toBeUndefined();
  });
});
