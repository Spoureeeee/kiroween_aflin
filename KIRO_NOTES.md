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

- Design stage: reviewed `design.md` before approving. Found property tests that would pass vacuously (random inputs almost never form a subscription), a price-step rule that admitted habits like A,B,A, and a "possible" confidence value that was never produced. Revised design and requirements before any code was written.
- Task stage: ran tasks one at a time instead of "Run all tasks", to control credit spend. Per-task cost was small (about 0.8 to 2.4 credits); the planning documents (requirements and design revisions) cost far more (about 20 credits) than the code.
- Implementation: normaliser, interval helpers, cadence classification, amount assessment and the 9-step pipeline built from tasks 1 to 7. Independently checked against the sample CSV: exactly the 7 expected subscriptions detected, all noise merchants excluded, output identical when input order is reversed.
- Fixture test (task 9.1) covers all 16 sample-CSV assertions. It broke `npm run typecheck` (missing Node type definitions); fixed by adding `@types/node`.
- Property tests 8.1 to 8.4 added (order independence, monthly drift detection, positive typical amounts, all-credit input). Inputs are built from known subscription series plus noise so they cannot pass vacuously.
- Test count: 100 passing. Credits: about 46 of 50 free credits used.

## Still to do
- Property tests 8.5 to 8.7, unit tests 2.2 to 5.2 (optional tasks, need more credits).
- Hooks (run tests on save), one MCP integration that does real work, UI built by vibe coding (for the spec vs vibe comparison).
