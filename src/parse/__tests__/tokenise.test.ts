import { describe, it, expect } from "vitest";
import { tokeniseCSV } from "../tokenise.js";

describe("tokeniseCSV", () => {
  it("parses a minimal two-column CSV", () => {
    expect(tokeniseCSV("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(tokeniseCSV("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted fields with commas inside", () => {
    expect(tokeniseCSV('"a,b",c\n"1,2",3')).toEqual([
      ["a,b", "c"],
      ["1,2", "3"],
    ]);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    expect(tokeniseCSV('"say ""hi""",next')).toEqual([['say "hi"', "next"]]);
  });

  it("strips leading/trailing whitespace from unquoted fields", () => {
    expect(tokeniseCSV("  a , b \n 1 , 2 ")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("skips blank lines", () => {
    expect(tokeniseCSV("a,b\n\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles no trailing newline", () => {
    expect(tokeniseCSV("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("preserves whitespace inside quoted fields", () => {
    expect(tokeniseCSV('"  hello  ",b')).toEqual([["  hello  ", "b"]]);
  });

  it("handles a quoted field spanning a newline", () => {
    expect(tokeniseCSV('"line one\nline two",end')).toEqual([
      ["line one\nline two", "end"],
    ]);
  });
});
