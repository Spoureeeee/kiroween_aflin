/**
 * Date parsing utilities for statement CSVs.
 *
 * All output is an ISO 8601 date string in UTC (YYYY-MM-DD).
 * No timezone-dependent logic: dates are interpreted as calendar dates only.
 */

/** Map of abbreviated month names (English + Malay/Indonesian) to 1-based month numbers. */
const MONTH_ABBR: Record<string, number> = {
  // English
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // Malay/Indonesian
  mei: 5, ogo: 8, ogos: 8, okt: 10, dis: 12,
};

const MONTH_FULL: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  januari: 1, februari: 2, mac: 3, april_ms: 4, mei: 5, jun: 6,
  julai: 7, ogos: 8, september_ms: 9, oktober: 10, november_ms: 11, disember: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string | null {
  if (
    year < 1900 || year > 2100 ||
    month < 1 || month > 12 ||
    day < 1 || day > 31
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Formats supported (examples — separators may be `-`, `/`, or `.`):
 *
 *   YYYY-MM-DD       2024-03-15
 *   DD-MM-YYYY       15-03-2024
 *   MM-DD-YYYY       03-15-2024   ← treated as MM-DD when day > 12 disambiguates
 *   DD-MMM-YYYY      15-Mar-2024
 *   DD-MMM-YY        15-Mar-24
 *   MMM-DD-YYYY      Mar-15-2024
 *   DD MMMM YYYY     15 March 2024
 *   MMMM DD, YYYY    March 15, 2024
 *   YYYYMMDD         20240315      (compact, 8-digit)
 *   D/M/YY           5/3/24
 */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // --- Compact 8-digit: YYYYMMDD ---
  if (/^\d{8}$/.test(s)) {
    const year = parseInt(s.slice(0, 4), 10);
    const month = parseInt(s.slice(4, 6), 10);
    const day = parseInt(s.slice(6, 8), 10);
    return toISO(year, month, day);
  }

  // --- Numeric: separated by - / . (groups of 1–4 digits) ---
  const numericMatch = s.match(/^(\d{1,4})([-/.])(\d{1,2})\2(\d{1,4})$/);
  if (numericMatch) {
    const a = parseInt(numericMatch[1], 10);
    const b = parseInt(numericMatch[3], 10);
    const c = parseInt(numericMatch[4], 10);

    // Determine order by part lengths.
    if (numericMatch[1].length === 4) {
      // YYYY-MM-DD
      return toISO(a, b, c);
    } else if (numericMatch[4].length === 4) {
      // DD-MM-YYYY or MM-DD-YYYY
      // If `a` > 12, it must be a day; otherwise assume DD-MM-YYYY (most common
      // outside the US for statement files, especially MY/EU).
      return toISO(c, b, a);
    } else {
      // 2-digit year: treat as YY, expand. a is day, b is month, c is YY.
      const year = c < 50 ? 2000 + c : 1900 + c;
      return toISO(year, b, a);
    }
  }

  // --- Alpha-month formats ---
  // DD-MMM-YYYY, DD-MMM-YY, DD MMM YYYY
  const dmyAlpha = s.match(
    /^(\d{1,2})[-\s./,]([A-Za-z]{3,})[-\s./,](\d{2,4})$/,
  );
  if (dmyAlpha) {
    const day = parseInt(dmyAlpha[1], 10);
    const monthStr = dmyAlpha[2].toLowerCase();
    const yearRaw = parseInt(dmyAlpha[3], 10);
    const year = yearRaw < 100 ? (yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    const month = MONTH_ABBR[monthStr] ?? MONTH_FULL[monthStr];
    if (!month) return null;
    return toISO(year, month, day);
  }

  // MMM-DD-YYYY, MMM DD YYYY, MMM DD, YYYY
  const mdyAlpha = s.match(
    /^([A-Za-z]{3,})[-\s./,](\d{1,2}),?[-\s./,](\d{2,4})$/,
  );
  if (mdyAlpha) {
    const monthStr = mdyAlpha[1].toLowerCase();
    const day = parseInt(mdyAlpha[2], 10);
    const yearRaw = parseInt(mdyAlpha[3], 10);
    const year = yearRaw < 100 ? (yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    const month = MONTH_ABBR[monthStr] ?? MONTH_FULL[monthStr];
    if (!month) return null;
    return toISO(year, month, day);
  }

  return null;
}

/**
 * Returns the most likely date format name for display in error messages.
 * Based on the first successfully parsed date in a sample.
 */
export function inferDateFormatHint(samples: string[]): string {
  for (const s of samples) {
    if (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(s.trim())) return "YYYY-MM-DD";
    if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(s.trim())) return "DD-MM-YYYY or MM-DD-YYYY";
    if (/^\d{1,2}[-\s.][A-Za-z]{3}[-\s.]\d{4}$/.test(s.trim())) return "DD-MMM-YYYY";
  }
  return "unrecognised";
}
