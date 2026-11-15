/**
 * RFC 4180-compliant CSV tokeniser.
 *
 * Handles:
 *   - Quoted fields (double-quote escaping "")
 *   - CRLF and LF line endings
 *   - Fields that contain commas, newlines, or quotes inside quotes
 *   - Leading/trailing whitespace trimming on unquoted fields
 *
 * Returns rows as arrays of strings. Empty trailing rows are dropped.
 */
export function tokeniseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  // Normalise CRLF → LF to simplify line-end handling.
  const src = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead to distinguish escaped quote ("") from closing quote.
        if (i + 1 < src.length && src[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
        i++;
      } else if (ch === "\n") {
        row.push(field.trim());
        field = "";
        // Only push non-empty rows (skip blank lines).
        if (row.some((c) => c !== "")) {
          rows.push(row);
        }
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Flush any trailing content that was not terminated by a newline.
  row.push(field.trim());
  if (row.some((c) => c !== "")) {
    rows.push(row);
  }

  return rows;
}
