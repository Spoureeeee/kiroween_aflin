---
inclusion: always
---

# Tech conventions

## Stack
- Vite + TypeScript (strict mode), no backend.
- Plain CSS with custom properties, or Tailwind if added deliberately. No heavy UI frameworks.
- Graveyard rendering with SVG or canvas.
- Tests: Vitest for unit tests, fast-check for property-based tests.
- Deploy as a static site (GitHub Pages or Vercel).

## Architecture
- Keep parsing, detection and UI in separate modules under `src/`: `parse/`, `detect/`, `ui/`.
- `parse/` and `detect/` are pure functions with no DOM access, so they are easy to test.
- Money is stored as integer minor units (cents/sen), never floats.
- Dates are handled as ISO strings or UTC dates. No timezone-dependent logic.

## Rules
- Every function in `detect/` needs at least one property-based test.
- No `any`. Prefer small functions with explicit types.
- Add dependencies sparingly and mention why in the PR or commit message.
- Commit small and often with clear messages. The git history is part of the evidence for the Kiro write-up.
- Never commit real bank data. Only the synthetic sample CSV lives in the repo.

## File encoding
- All files are UTF-8 without BOM. When writing or editing files from a Windows shell (PowerShell), never use commands or settings that re-encode the file as UTF-16 or ANSI, and never add a BOM.
- Keep source comments and test names in plain ASCII (use "-" and "->" rather than typographic dashes or arrows) so encoding problems cannot garble them again.
