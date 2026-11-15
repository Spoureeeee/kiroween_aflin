/**
 * Amount parsing utilities.
 *
 * Converts raw amount strings to integer minor units (e.g. RM 12.50 → 1250).
 * Handles:
 *   - Currency symbols and codes as prefix or suffix (RM, MYR, $, USD, £, €, etc.)
 *   - Comma-as-thousands-separator and period-as-decimal (e.g. 1,234.56)
 *   - Period-as-thousands and comma-as-decimal (European: 1.234,56)
 *   - No decimal (integer amounts)
 *   - Parentheses as negative sign: (12.50) → −1250
 *   - Explicit sign prefix: +12.50, -12.50
 *   - Blank / empty fields (returns null)
 */

// Match an optional currency code/symbol, an optional sign, digits with
// optional separators, and an optional decimal part.
const AMOUNT_RE =
  /^(?<pre>[A-Z$€£¥₹฿₩]+\s*)?(?<paren_open>\()?(?<sign>[+-])?(?<int>[\d,.']+)(?:[.,](?<frac>\d{1,4}))?(?<paren_close>\))?(?:\s*(?<post>[A-Z$€£¥₹฿₩]+))?$/i;

/**
 * Detects whether a list of raw amount strings uses European decimal notation
 * (period-as-thousands, comma-as-decimal), e.g. "1.234,56".
 *
 * Returns true when more than half the non-empty values look European.
 */
export function detectEuropeanDecimal(samples: string[]): boolean {
  let euroCount = 0;
  let usCount = 0;
  for (const s of samples) {
    const stripped = s.replace(/[^0-9.,]/g, "");
    // European: comma after at least one digit group that's exactly 2 chars.
    if (/\d,\d{2}$/.test(stripped) && stripped.includes(".")) euroCount++;
    else if (/\d\.\d{2}$/.test(stripped) && stripped.includes(",")) usCount++;
  }
  return euroCount > usCount;
}

/**
 * Parses a raw amount string into integer minor units.
 *
 * @param raw            - The raw cell value from the CSV.
 * @param europeanDecimal - When true, treat `.` as thousands and `,` as decimal.
 * @returns Minor units as an integer, or `null` if the field is blank/unparseable.
 */
export function parseAmount(
  raw: string,
  europeanDecimal = false,
): number | null {
  const s = raw.trim();
  if (s === "" || s === "-" || s === "—") return null;

  const m = s.match(AMOUNT_RE);
  if (!m?.groups) return null;

  const { paren_open, sign, frac } = m.groups;
  let intPart = m.groups["int"] ?? "";

  // Strip separators according to convention.
  if (europeanDecimal) {
    // Remove period (thousands) then convert comma to dot (decimal).
    intPart = intPart.replace(/\./g, "");
    intPart = intPart.replace(/,/g, "");
  } else {
    // Remove comma (thousands).
    intPart = intPart.replace(/,/g, "");
    // Remove any trailing period that isn't a decimal point.
    intPart = intPart.replace(/\.$/, "");
  }

  const intVal = parseInt(intPart || "0", 10);
  if (isNaN(intVal)) return null;

  // Handle fractional part → minor units.
  let minorUnits: number;
  if (frac !== undefined) {
    // Pad or truncate to exactly 2 decimal places.
    const fracStr = frac.padEnd(2, "0").slice(0, 2);
    const fracVal = parseInt(fracStr, 10);
    minorUnits = intVal * 100 + fracVal;
  } else {
    // No decimal separator — treat as already in minor units if the value looks
    // like it has no cents, otherwise multiply by 100.
    // Convention: values without a decimal point are treated as whole currency
    // units and converted to minor units.
    minorUnits = intVal * 100;
  }

  // Apply sign: parentheses mean negative, explicit sign overrides.
  const isNegative = paren_open === "(" || sign === "-";
  return isNegative ? -minorUnits : minorUnits;
}

/**
 * Extracts a currency code from a raw amount string, returning it in upper
 * case or `null` if none is found.
 *
 * Checks for ISO 4217 codes (3 uppercase letters) and common symbols.
 */
export function extractCurrency(raw: string): string | null {
  const s = raw.trim();

  // Look for a 3-letter code first.
  const isoMatch = s.match(/\b([A-Z]{3})\b/);
  if (isoMatch) return isoMatch[1];

  // Symbol fallback.
  if (s.includes("RM")) return "MYR";
  if (s.includes("$")) return "USD";
  if (s.includes("£")) return "GBP";
  if (s.includes("€")) return "EUR";
  if (s.includes("¥")) return "JPY";
  if (s.includes("₹")) return "INR";

  return null;
}

/**
 * Infers the currency from the first few non-empty amount cells in a column.
 * Falls back to `defaultCurrency` when nothing is found.
 */
export function inferCurrency(
  samples: string[],
  defaultCurrency = "MYR",
): string {
  for (const s of samples) {
    const c = extractCurrency(s);
    if (c) return c;
  }
  return defaultCurrency;
}
