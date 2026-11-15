import { describe, it, expect } from "vitest";
import { parseCSV } from "../parseCSV.js";
import { ParseError } from "../types.js";

// ---------------------------------------------------------------------------
// Minimal valid CSV fixtures
// ---------------------------------------------------------------------------

const SPLIT_COLUMNS_CSV = `Date,Description,Debit,Credit
15/03/2024,NETFLIX SUBSCRIPTION,15.90,
16/03/2024,SPOTIFY,15.90,
17/03/2024,SALARY MARCH,,5000.00
18/03/2024,AMAZON PRIME,14.90,
`;

const SIGNED_AMOUNT_CSV = `Date,Description,Amount
15/03/2024,NETFLIX,-15.90
16/03/2024,SPOTIFY,-15.90
17/03/2024,SALARY,+5000.00
`;

const SIGNED_DEBIT_POSITIVE_CSV = `Date,Description,Amount
15/03/2024,NETFLIX,15.90
16/03/2024,SPOTIFY,15.90
`;

const CURRENCY_PREFIX_CSV = `Date,Description,Debit
15/03/2024,NETFLIX,RM 15.90
16/03/2024,SPOTIFY,RM 15.90
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseCSV â€“ split debit/credit columns", () => {
  it("parses a split-column statement", () => {
    const result = parseCSV(SPLIT_COLUMNS_CSV);
    expect(result.transactions).toHaveLength(4);
  });

  it("produces positive amounts for debits", () => {
    const result = parseCSV(SPLIT_COLUMNS_CSV);
    const netflix = result.transactions.find((t) =>
      t.description.includes("NETFLIX"),
    );
    expect(netflix!.amountMinorUnits).toBe(1590);
  });

  it("produces negative amounts for credits", () => {
    const result = parseCSV(SPLIT_COLUMNS_CSV);
    const salary = result.transactions.find((t) =>
      t.description.includes("SALARY"),
    );
    expect(salary!.amountMinorUnits).toBe(-500000);
  });

  it("sets the date as ISO 8601", () => {
    const result = parseCSV(SPLIT_COLUMNS_CSV);
    expect(result.transactions[0]!.date).toBe("2024-03-15");
  });
});

describe("parseCSV â€“ signed single amount column", () => {
  it("flips negative amounts to positive (money out)", () => {
    const result = parseCSV(SIGNED_AMOUNT_CSV);
    const netflix = result.transactions.find((t) =>
      t.description.includes("NETFLIX"),
    );
    // -15.90 in the file â†’ debit-negative convention â†’ 1590 minor units out
    expect(netflix!.amountMinorUnits).toBeGreaterThan(0);
  });

  it("produces negative for credits", () => {
    const result = parseCSV(SIGNED_AMOUNT_CSV);
    const salary = result.transactions.find((t) =>
      t.description.includes("SALARY"),
    );
    expect(salary!.amountMinorUnits).toBeLessThan(0);
  });
});

describe("parseCSV â€“ currency inference", () => {
  it("infers MYR from RM prefix", () => {
    const result = parseCSV(CURRENCY_PREFIX_CSV);
    expect(result.currency).toBe("MYR");
  });

  it("respects the currency override option", () => {
    const result = parseCSV(SIGNED_DEBIT_POSITIVE_CSV, { currency: "SGD" });
    expect(result.currency).toBe("SGD");
  });

  it("defaults to MYR when no currency found", () => {
    const result = parseCSV(SIGNED_DEBIT_POSITIVE_CSV);
    expect(result.currency).toBe("MYR");
  });
});

describe("parseCSV â€“ manual column mapping", () => {
  it("accepts manual column names", () => {
    const csv = `Tanggal,Keterangan,Jumlah\n15/03/2024,Netflix,15.90\n`;
    const result = parseCSV(csv, {
      manualColumns: { date: "Tanggal", description: "Keterangan", debit: "Jumlah" },
    });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]!.amountMinorUnits).toBe(1590);
  });

  it("accepts manual column indices", () => {
    const csv = `col0,col1,col2\n15/03/2024,Netflix,15.90\n`;
    const result = parseCSV(csv, {
      manualColumns: { date: 0, description: 1, debit: 2 },
    });
    expect(result.transactions).toHaveLength(1);
  });

  it("throws ParseError for an unknown column name", () => {
    const csv = `Date,Description,Amount\n15/03/2024,Netflix,15.90\n`;
    expect(() =>
      parseCSV(csv, {
        manualColumns: { date: "Date", description: "Description", debit: "Nonexistent" },
      }),
    ).toThrow(ParseError);
  });

  it("throws ParseError for an out-of-range index", () => {
    const csv = `Date,Description,Amount\n15/03/2024,Netflix,15.90\n`;
    expect(() =>
      parseCSV(csv, {
        manualColumns: { date: 0, description: 1, debit: 99 },
      }),
    ).toThrow(ParseError);
  });
});

describe("parseCSV â€“ error cases", () => {
  it("throws ParseError on empty input", () => {
    expect(() => parseCSV("")).toThrow(ParseError);
  });

  it("throws ParseError when no data rows exist", () => {
    expect(() => parseCSV("Date,Description,Amount\n")).toThrow(ParseError);
  });

  it("includes a plain-language hint in every ParseError", () => {
    try {
      parseCSV("");
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).hint).toBeTruthy();
    }
  });
});

describe("parseCSV â€“ robustness", () => {
  it("skips blank rows and counts them", () => {
    const csv = `Date,Description,Amount\n15/03/2024,Netflix,15.90\n\n16/03/2024,Spotify,15.90\n`;
    const result = parseCSV(csv);
    expect(result.transactions).toHaveLength(2);
  });

  it("stores amounts as integers (no floats)", () => {
    const result = parseCSV(SPLIT_COLUMNS_CSV);
    for (const t of result.transactions) {
      expect(Number.isInteger(t.amountMinorUnits)).toBe(true);
    }
  });

  it("handles metadata rows before the header", () => {
    const csv = `Bank Statement Export\nAccount: 1234567890\nDate,Description,Amount\n15/03/2024,Netflix,15.90\n`;
    const result = parseCSV(csv);
    expect(result.transactions).toHaveLength(1);
  });

  it("handles quoted fields with commas in the description", () => {
    const csv = `Date,Description,Amount\n15/03/2024,"Netflix, Inc.",15.90\n`;
    const result = parseCSV(csv);
    expect(result.transactions[0]!.description).toBe("Netflix, Inc.");
  });
});

