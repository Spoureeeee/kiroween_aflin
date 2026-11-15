import { describe, it, expect } from "vitest";
import { parseAmount, detectEuropeanDecimal, inferCurrency } from "../parseAmount.js";

describe("parseAmount – standard (US) decimal", () => {
  it("parses a plain decimal", () => {
    expect(parseAmount("12.50")).toBe(1250);
  });

  it("parses with comma thousands separator", () => {
    expect(parseAmount("1,234.56")).toBe(123456);
  });

  it("parses a whole number", () => {
    expect(parseAmount("100")).toBe(10000);
  });

  it("parses a negative value", () => {
    expect(parseAmount("-12.50")).toBe(-1250);
  });

  it("parses a positive explicit sign", () => {
    expect(parseAmount("+12.50")).toBe(1250);
  });

  it("treats parentheses as negative", () => {
    expect(parseAmount("(12.50)")).toBe(-1250);
  });

  it("strips currency prefix RM", () => {
    expect(parseAmount("RM 12.50")).toBe(1250);
  });

  it("strips currency prefix $", () => {
    expect(parseAmount("$12.50")).toBe(1250);
  });

  it("strips currency suffix MYR", () => {
    expect(parseAmount("12.50 MYR")).toBe(1250);
  });

  it("returns null for empty string", () => {
    expect(parseAmount("")).toBeNull();
  });

  it("returns null for lone dash", () => {
    expect(parseAmount("-")).toBeNull();
  });

  it("handles single decimal place", () => {
    expect(parseAmount("12.5")).toBe(1250);
  });

  it("handles zero", () => {
    expect(parseAmount("0.00")).toBe(0);
  });

  it("handles large amounts", () => {
    expect(parseAmount("99,999.99")).toBe(9999999);
  });
});

describe("parseAmount – European decimal", () => {
  it("parses European format 1.234,56", () => {
    expect(parseAmount("1.234,56", true)).toBe(123456);
  });

  it("parses European format 12,50", () => {
    expect(parseAmount("12,50", true)).toBe(1250);
  });
});

describe("detectEuropeanDecimal", () => {
  it("detects European format in a sample", () => {
    expect(detectEuropeanDecimal(["1.234,56", "2.000,00", "50,00"])).toBe(true);
  });

  it("returns false for US format", () => {
    expect(detectEuropeanDecimal(["1,234.56", "2,000.00", "50.00"])).toBe(false);
  });
});

describe("inferCurrency", () => {
  it("extracts MYR from RM prefix", () => {
    expect(inferCurrency(["RM 12.50", "RM 5.00"])).toBe("MYR");
  });

  it("extracts USD from explicit code", () => {
    expect(inferCurrency(["12.50 USD", "5.00 USD"])).toBe("USD");
  });

  it("falls back to default", () => {
    expect(inferCurrency(["12.50", "5.00"])).toBe("MYR");
  });

  it("respects custom default", () => {
    expect(inferCurrency(["12.50", "5.00"], "SGD")).toBe("SGD");
  });
});
