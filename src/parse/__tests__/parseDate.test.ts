import { describe, it, expect } from "vitest";
import { parseDate } from "../parseDate.js";

describe("parseDate", () => {
  it("parses YYYY-MM-DD", () => {
    expect(parseDate("2024-03-15")).toBe("2024-03-15");
  });

  it("parses DD-MM-YYYY", () => {
    expect(parseDate("15-03-2024")).toBe("2024-03-15");
  });

  it("parses DD/MM/YYYY", () => {
    expect(parseDate("15/03/2024")).toBe("2024-03-15");
  });

  it("parses YYYY/MM/DD", () => {
    expect(parseDate("2024/03/15")).toBe("2024-03-15");
  });

  it("parses YYYYMMDD", () => {
    expect(parseDate("20240315")).toBe("2024-03-15");
  });

  it("parses DD-MMM-YYYY (English)", () => {
    expect(parseDate("15-Mar-2024")).toBe("2024-03-15");
  });

  it("parses DD MMM YYYY (English)", () => {
    expect(parseDate("15 Mar 2024")).toBe("2024-03-15");
  });

  it("parses MMM DD, YYYY (US style)", () => {
    expect(parseDate("Mar 15, 2024")).toBe("2024-03-15");
  });

  it("parses MMM-DD-YYYY", () => {
    expect(parseDate("Mar-15-2024")).toBe("2024-03-15");
  });

  it("parses 2-digit year DD-MM-YY", () => {
    expect(parseDate("15-03-24")).toBe("2024-03-15");
  });

  it("parses 2-digit year DD-MMM-YY", () => {
    expect(parseDate("15-Mar-24")).toBe("2024-03-15");
  });

  it("handles Malay month abbreviation Ogos (August)", () => {
    expect(parseDate("15 Ogos 2024")).toBe("2024-08-15");
  });

  it("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });

  it("returns null for gibberish", () => {
    expect(parseDate("not a date")).toBeNull();
  });

  it("returns null for out-of-range values", () => {
    expect(parseDate("2024-13-01")).toBeNull();
    expect(parseDate("2024-00-01")).toBeNull();
  });

  it("pads single-digit month and day", () => {
    expect(parseDate("5-3-2024")).toBe("2024-03-05");
  });
});
