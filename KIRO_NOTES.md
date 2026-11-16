# Kiro build log

Running notes on how Kiro was used on Subscription Graveyard (Kiroween 2026, Costume Contest, solo). Facts only, added as things happen. This is the raw material for the Kiro write-up. Add your own observations under each entry.

## Setup (15 Nov)
- Wrote four steering docs before any code: `product.md`, `tech.md`, `design.md`, `privacy.md` (all `inclusion: always`). They set scope, stack, testing rules, accessibility rules and the no-data-leaves-the-browser guarantee.
- Created a synthetic sample statement (`samples/statement-sample.csv`) as a shared fixture, with deliberate edge cases (price rise, changing reference numbers, free-trial conversion, quarterly and annual charges, same-day duplicate, noise merchants).

## CSV parser (15-16 Nov) - chat mode, not spec mode
- Prompted Kiro in Auto/chat mode. It scaffolded a Vite + TypeScript project and wrote the whole parser (tokeniser, column detection, date and amount parsing, manual mapper) with unit and property-based tests, in one pass.
- This was vibe coding, not spec-driven. No spec existed for the parser.
- Independent check after the push found: 16 of 80 tests failing, 12 TypeScript errors under `strict` + `noUncheckedIndexedAccess`, and a real money bug (`"55.90"` parsed as 5500).
- Used the **Bug Fix** agent with an explicit instruction not to weaken tests. Result: 80 of 80 passing and a clean typecheck; test files were not edited to pass.
- Windows file-encoding problem (BOMs and garbled dashes) appeared in the generated files. Fixed it and added a **file-encoding rule to the `tech.md` steering doc** so it does not recur.

## Recurring-charge detector (16 Nov) - spec mode
- Used **Spec** mode, "Build a Feature", requirements first. Kiro asked for permission before creating files and running commands.
- First draft of `requirements.md` was reviewed against the sample data before approval. Problems found by simulating the rules on the CSV:
  - The non-subscription filter let groceries, fuel and coffee through (amount variation cap of 0.5 was far too loose).
  - Merchant normalisation treated any all-caps word as a reference number.
  - The expected typical amount for the price-rise case contradicted the median rule.
  - One requirement (`possible-annual`) contradicted itself.
- Revision 2: CV cap tightened to 0.10, reference numbers defined as digit-containing tokens, `latestAmountMinorUnits` added, `possible-annual` removed, fixtures added for the trial conversion, quarterly and exclusion cases, plus two metamorphic property tests (numeric suffixes never change grouping; unrelated noise merchants never change a real subscription's result).
- Revision 3: two-distinct-values exemption for clean price steps, never strip the first token (`7-ELEVEN`), CV defined as population standard deviation.
- Credits: about 10 of 50 free credits used by the end of requirements.

## Still to do
- Design and tasks stages for the detector.
- Hooks (run tests on save), one MCP integration that does real work, UI built by vibe coding (for the spec vs vibe comparison).
