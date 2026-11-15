/**
 * RFC 4180-compliant CSV tokeniser.
 *
 * Handles:
 *   - Quoted fields (double-quote escaping "")
 *   - CRLF and LF line endings
 *   - Fields that contain commas, newlines, or quotes inside quotes
 *   - Leading/trailing whitespace trimming on unquoted fields only
 *
 * Returns rows as arrays of strings. Empty trailing rows are dropped.
 */
export function tokeniseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let wasQuoted = false;
  let i = 0;

  // Normalise CRLF -> LF to simplify line-end handling.
  const src = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const pushField = () => {
    row.push(wasQuoted ? field : field.trim());
    field = "";
    wasQuoted = false;
  };

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
        wasQuoted = true;
        i++;
      } else if (ch === ",") {
        pushField();
        i++;
      } else if (ch === "\n") {
        pushField();
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
  pushField();
  if (row.some((c) => c !== "")) {
    rows.push(row);
  }

  return rows;
}
