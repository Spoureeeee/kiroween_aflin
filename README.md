# Subscription Graveyard 🪦

> **Kiroween 2026 — Costume Contest entry.**  
> Drop in a bank statement CSV. Watch your forgotten subscriptions rise from the dead.

Recurring charges appear as tombstones in a spooky graveyard. Click a tombstone to *exhume* it: monthly cost, yearly total, how long it has haunted you, and cancel steps. A header shows the annual drain at a glance.

---

## Privacy guarantees

- **All processing happens in your browser.** No file contents are sent over the network.
- Statement data is never written to `localStorage` or any other persistent store unless you explicitly opt in.
- Nothing is logged to the console in production builds.
- If a cancel-step lookup is added in the future, only the merchant name is sent — never amounts, dates or account details.

---

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run unit + property-based tests
npm run build      # type-check + production bundle
```

Requires Node.js 18 + and npm 9 +.

---

## CSV support

Subscription Graveyard supports a **generic column mapper**, not every bank's proprietary format. It auto-detects the date, description and amount columns from the header row; if detection fails you get a manual mapper to point it at the right columns.

**What works out of the box:**

| Feature | Detail |
|---|---|
| Column auto-detection | Scores headers against keyword sets (English + Malay) and validates cell patterns |
| Split debit/credit columns | Two separate amount columns |
| Signed single-amount column | One column with `+`/`−` sign or parentheses for negatives |
| Date formats | `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MMM-YYYY`, `YYYYMMDD`, US-style, 2-digit year, Malay months |
| Amount formats | Comma-separated thousands, European decimal (`.` thousands, `,` decimal), currency prefixes (`RM`, `$`, `€`, …) |
| Currency inference | Read from amount cells; defaults to MYR; overrideable |
| Manual mapper fallback | Specify column names or 0-based indices |

**What is out of scope:** No bank API connections, no accounts, no backend.

There is a **sample CSV** at `public/sample.csv` — the only statement data committed to this repo; it is entirely synthetic.

---

## Architecture

```
src/
  parse/      – CSV tokenising, column detection, date/amount parsing (pure functions)
  detect/     – Subscription detection (recurring-charge heuristics)
  ui/         – DOM, graveyard rendering (SVG/canvas)
```

`parse/` and `detect/` have no DOM access and are tested with Vitest unit tests and fast-check property-based tests.

Money is stored as **integer minor units** (cents / sen) throughout — never floats.

---

## Honest caveats

- Subscription detection is heuristic. The confidence label shown on each tombstone reflects uncertainty; dismiss false positives with one click.
- Currency defaults to MYR. If your statement uses a different currency, the manual mapper lets you set it.
- Not tested against every bank export format. If your CSV fails to parse, the manual mapper will get you there.
