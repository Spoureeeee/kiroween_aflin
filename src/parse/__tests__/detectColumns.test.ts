import { describe, it, expect } from "vitest";
import { detectColumns } from "../detectColumns.js";

const DATA_ROWS = [
  ["15-03-2024", "NETFLIX", "15.90", ""],
  ["16-03-2024", "SPOTIFY", "15.90", ""],
  ["17-03-2024", "SALARY", "", "5000.00"],
];

describe("detectColumns", () => {
  it("detects standard debit/credit headers", () => {
    const headers = ["Date", "Description", "Debit", "Credit"];
    const result = detectColumns(headers, DATA_ROWS);
    expect(result).not.toBeNull();
    expect(result!.columnMap.date).toBe(0);
    expect(result!.columnMap.description).toBe(1);
    expect(result!.columnMap.debit).toBe(2);
    expect(result!.columnMap.credit).toBe(3);
    expect(result!.signConvention).toBe("split-columns");
  });

  it("detects a single amount column", () => {
    const headers = ["Date", "Details", "Amount"];
    const rows = [
      ["15-03-2024", "NETFLIX", "15.90"],
      ["16-03-2024", "SPOTIFY", "-15.90"],
    ];
    const result = detectColumns(headers, rows);
    expect(result).not.toBeNull();
    expect(result!.columnMap.date).toBe(0);
    expect(result!.columnMap.description).toBe(1);
    expect(result!.columnMap.debit).toBe(2);
    expect(result!.columnMap.credit).toBeUndefined();
  });

  it("returns null for a 1-column CSV", () => {
    expect(detectColumns(["Date"], [["15-03-2024"]])).toBeNull();
  });

  it("produces a confidence score between 0 and 1", () => {
    const headers = ["Date", "Description", "Debit", "Credit"];
    const result = detectColumns(headers, DATA_ROWS);
    expect(result!.confidence).toBeGreaterThan(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });

  it("detects Malay headers", () => {
    const headers = ["Tanggal", "Keterangan", "Pengeluaran", "Masukan"];
    const result = detectColumns(headers, DATA_ROWS);
    expect(result).not.toBeNull();
    expect(result!.columnMap.date).toBe(0);
    expect(result!.columnMap.description).toBe(1);
  });
});
