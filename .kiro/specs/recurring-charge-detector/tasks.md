# Implementation Plan: recurring-charge-detector

## Overview

Build the `src/detect/` module as a pure-function pipeline that takes a `Transaction[]` from the
parse layer and returns a sorted `DetectedSubscription[]`. The pipeline runs nine named steps —
credit filter, merchant normalisation, grouping, same-day dedup, cadence classification, minimum
count gate, amount assessment, record construction, and sort — each implemented in its own file.
Unit tests cover every exported helper; property-based tests (fast-check) cover the seven
correctness properties from the design document; a fixture test validates all 16 Req 12 assertions
against the real sample CSV.

## Tasks

- [x] 1. Create module types and project skeleton
  - Create `src/detect/types.ts` with `Cadence`, `Confidence`, and `DetectedSubscription`
    interfaces exactly matching the design document's type signatures.
  - Create stub files for all six implementation modules (`normaliseMerchant.ts`,
    `computeIntervals.ts`, `classifyCadence.ts`, `assessAmounts.ts`, `detectSubscriptions.ts`,
    `index.ts`) — each exporting its named functions/constants with `throw new Error("not
    implemented")` bodies so TypeScript compilation succeeds from the start.
  - Create `src/detect/__tests__/` directory (empty placeholder files are not needed; test files
    are added in later tasks).
  - _Requirements: 9.1_

- [x] 2. Implement merchant-name normalisation
  - [x] 2.1 Implement `normaliseMerchant` in `src/detect/normaliseMerchant.ts`
    - Strip trailing whitespace-delimited tokens that contain at least one digit, but never the
      first token.
    - Collapse consecutive internal whitespace to a single space.
    - Upper-case the result using `String.prototype.toUpperCase()` (locale-independent).
    - Return `""` for blank or whitespace-only input without throwing.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - [ ]* 2.2 Write unit tests for `normaliseMerchant` in `src/detect/__tests__/normaliseMerchant.test.ts`
    - Test blank/whitespace-only input returns `""`.
    - Test single-token description is returned unchanged (uppercased).
    - Test description with one trailing numeric suffix strips that suffix.
    - Test description with multiple trailing numeric suffixes strips all.
    - Test `"7-ELEVEN 1234"` and `"7-ELEVEN 5678"` both normalise to `"7-ELEVEN"`.
    - Test descriptions differing only in trailing reference numbers produce the same merchant name.
    - Test internal whitespace collapse.
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8_

- [x] 3. Implement interval and median helpers
  - [x] 3.1 Implement `daysBetween`, `computeGaps`, and `median` in `src/detect/computeIntervals.ts`
    - `daysBetween(earlier, later)`: compute whole calendar days between two ISO date strings using
      `Date.UTC` subtraction with no timezone conversion; always non-negative.
    - `computeGaps(dates)`: given a sorted array of ISO date strings, return the array of
      consecutive day-gaps; return `[]` when fewer than 2 elements.
    - `median(values)`: return the median of a non-empty number array; for even-length arrays
      return the lower of the two middle values; return `null` for an empty array.
    - _Requirements: 4.6, 4.7_
  - [ ]* 3.2 Write unit tests for interval helpers in `src/detect/__tests__/computeIntervals.test.ts`
    - `daysBetween`: same date returns 0; a known 365-day span; a leap-year boundary.
    - `computeGaps`: empty array returns `[]`; single-element returns `[]`; two dates returns
      one gap; chronological three-date sequence.
    - `median`: single element; odd-count array; even-count array (lower-of-two rule verified).
    - _Requirements: 4.6, 4.7_

- [x] 4. Implement cadence classification
  - [x] 4.1 Implement `classifyCadence`, `MIN_OCCURRENCES`, and `ACTIVE_LOOKBACK` in `src/detect/classifyCadence.ts`
    - Drift-expanded windows: weekly 0–15 days, monthly 20–50, quarterly 75–105, annual 325–405.
    - Return `null` when the interval falls outside all windows.
    - `MIN_OCCURRENCES`: `{ weekly: 3, monthly: 2, quarterly: 2, annual: 2 }`.
    - `ACTIVE_LOOKBACK` (days): `{ weekly: 10, monthly: 45, quarterly: 135, annual: 548 }`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.1, 6.2, 6.3, 6.4, 9.11, 9.12_
  - [ ]* 4.2 Write unit tests for cadence classification in `src/detect/__tests__/classifyCadence.test.ts`
    - Boundary values at the exact lower and upper edge of each expanded window.
    - Values one day outside each boundary return `null`.
    - Value squarely in each cadence window returns the correct label.
    - Value between two windows (e.g. 60 days) returns `null`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1_

- [x] 5. Implement amount assessment
  - [x] 5.1 Implement `computeCV`, `isMonotoneStep`, and `assessAmounts` in `src/detect/assessAmounts.ts`
    - `computeCV(amounts)`: population CV = std-dev / mean using integer arithmetic throughout;
      return `0` when all amounts are equal.
    - `isMonotoneStep(amounts)`: return `true` when the sequence changes value at most once
      (A*B* form); `false` otherwise.
    - `assessAmounts(amounts)`: compute `typicalAmountMinorUnits` (median, lower-of-two for even
      count), `latestAmountMinorUnits` (last element), `amountChanged` (latest ≠ typical), and
      `passes` (CV ≤ 0.10 OR clean price-step exemption: ≤2 distinct amounts AND ≥3 occurrences
      AND ≥2 share one value AND isMonotoneStep).
    - A two-occurrence series with two distinct amounts does NOT qualify for the price-step
      exemption and must satisfy CV ≤ 0.10.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1_
  - [ ]* 5.2 Write unit tests for amount assessment in `src/detect/__tests__/assessAmounts.test.ts`
    - `isMonotoneStep`: `[1790, 1790, 2490]` → true; `[1790, 2490, 2490]` → true;
      `[1790, 2490, 1790]` → false; single element → true.
    - `assessAmounts`: CV=0 series passes; CV just below 0.10 passes; CV just above 0.10 with
      >2 distinct amounts fails; clean price-step `[1790, 1790, 2490]` passes (amountChanged
      true); `[1790, 2490, 1790]` fails (non-monotone); `[1790, 2490]` with large CV fails (2-
      occurrence two-value series); two-occurrence series with CV ≤ 0.10 passes via CV path.
    - `typicalAmountMinorUnits` is the lower of the two middle values for even-count input.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1_

- [ ] 6. Checkpoint - Core helpers complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the main detection pipeline
  - [x] 7.1 Implement `detectSubscriptions` in `src/detect/detectSubscriptions.ts`
    - Step 1: filter transactions where `amountMinorUnits <= 0`.
    - Step 2: add `merchantName` by calling `normaliseMerchant(description)` for each
      transaction.
    - Step 3: group by `merchantName`.
    - Step 4: within each group, collapse same-date entries by summing `amountMinorUnits`; if
      the summed value would exceed `999_999_999`, keep the original entries unsummed.
    - Step 5: compute gaps with `computeGaps`, take median, call `classifyCadence`; skip the
      series if the result is `null`.
    - Step 6: skip the series if `occurrences.length < MIN_OCCURRENCES[cadence]`.
    - Step 7: call `assessAmounts` with chronologically ordered amounts; skip if `passes ===
      false`.
    - Step 8: build a `DetectedSubscription` record — `currency` from the earliest occurrence;
      `confidence` is `"possible"` for exactly 2 occurrences and `"confirmed"` for ≥3; `isActive`
      by comparing `lastCharge` against the latest `date` among ALL input transactions (before any
      filtering) using `ACTIVE_LOOKBACK[cadence]`.
    - Step 9: sort output by `typicalAmountMinorUnits` descending, then `merchantName` ascending.
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1–4.7, 5.1, 5.2, 6.1–6.6, 7.1–7.6, 8.1, 9.1–9.12, 10.1, 10.2_
  - [x] 7.2 Wire public exports in `src/detect/index.ts`
    - Export `detectSubscriptions` from `./detectSubscriptions.js`.
    - Export types `DetectedSubscription`, `Cadence`, `Confidence` from `./types.js`.
    - _Requirements: 9.1_

- [x] 8. Write property-based tests
  - [x]* 8.1 Write Property 1 (order-independence) in `src/detect/__tests__/detector.property.test.ts`
    - **Property 1: Order-independence**
    - Use `fc.array(transactionArbitrary(), { minLength: 2, maxLength: 50 })` and a Fisher-Yates
      shuffle or `fc.shuffledSubarray` on the same array; assert deep equality of outputs.
    - **Validates: Requirements 11.1**
  - [x]* 8.2 Write Property 2 (monthly drift detection) in the same file
    - **Property 2: Monthly series with bounded drift is always detected**
    - Generate merchant name via `fc.stringMatching(/^[A-Z]{3,12}$/)` (alphabetic only); build
      ≥3 transactions at intervals drawn from [27, 33] days; assert output contains an entry with
      that merchant and `cadence === "monthly"` and `confidence === "confirmed"`.
    - **Validates: Requirements 11.2, 4.2, 5.1**
  - [x]* 8.3 Write Property 3 (positive typical amounts) in the same file
    - **Property 3: All typical amounts are positive**
    - Build a known confirmed monthly series (≥3 charges, alphabetic-only merchant name via
      `fc.stringMatching(/^[A-Z]{4,10}$/)`, fixed amount) plus random noise; assert all
      `typicalAmountMinorUnits` in output are ≥ 1.
    - **Validates: Requirements 11.3, 9.4**
  - [x]* 8.4 Write Property 4 (all-credit empty output) in the same file
    - **Property 4: All-credit input yields empty output**
    - Generate transactions with `amountMinorUnits <= 0`; assert output is `[]`.
    - **Validates: Requirements 11.4, 2.1, 2.2**
  - [ ]* 8.5 Write Property 5 (firstCharge <= lastCharge) in the same file
    - **Property 5: firstCharge is not after lastCharge**
    - Build a known confirmed monthly series plus random noise; assert every output entry has
      `firstCharge <= lastCharge` (lexicographic ISO string comparison).
    - **Validates: Requirements 11.5, 9.7, 9.8**
  - [ ]* 8.6 Write Property 6 (numeric suffixes do not affect grouping) in the same file
    - **Property 6: Numeric suffixes do not affect grouping**
    - Generate alphabetic-only base name and two distinct numeric suffixes; build a monthly series
      alternating between `"<base> <suffix1>"` and `"<base> <suffix2>"` descriptions; assert
      exactly one output entry exists for this merchant and its `merchantName` equals the uppercased
      base.
    - **Validates: Requirements 11.6, 1.1, 1.4**
  - [ ]* 8.7 Write Property 7 (unrelated merchants do not disturb results) in the same file
    - **Property 7: Unrelated merchants do not disturb existing results**
    - Build a known confirmed monthly series S with alphabetic-only merchant name; generate random
      noise transactions under a distinct alphabetic-only merchant name; assert the entry for S has
      identical `merchantName`, `cadence`, `typicalAmountMinorUnits`, `latestAmountMinorUnits`,
      `confidence`, `firstCharge`, `lastCharge`, and `chargeCount` with and without the noise.
    - **Validates: Requirements 11.7**

- [x] 9. Write the sample-CSV fixture test
  - [x]* 9.1 Write all 16 Req 12 assertions in `src/detect/__tests__/detector.fixture.test.ts`
    - Parse `samples/statement-sample.csv` via `src/parse/parseCSV`; pass result to
      `detectSubscriptions`.
    - Assert confirmed monthly subscriptions present: IRONHOUSE GYM MEMBERSHIP (12900, amountChanged
      false, isActive true), SPOTIFLY PREMIUM (1790), CLOUDBOX 200GB STORAGE (490), MOBILEONE
      POSTPAID BILL (6800), PIXELPRO TRIAL CONVERSION (2990).
    - Assert NIGHTFLIX.COM present with cadence monthly, confidence confirmed, typical 5590, latest
      5990, amountChanged true, isActive true.
    - Assert READLY NEWS DIGITAL present with cadence quarterly, confidence possible, typical 4500,
      amountChanged false, isActive true.
    - Assert NOT present: FRESHMART GROCERIES, PETRONOVA FUEL, KOPI CORNER, SALARY CREDIT ACME SDN
      BHD, DOMAINNEST ANNUAL RENEWAL, QUICKBITE DELIVERY, GREENLEAF MARKET, PAYGO EWALLET RELOAD,
      BOOKNOOK ONLINE.
    - _Requirements: 12.1–12.16_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP; core pipeline tasks must all be implemented.
- Each task references specific requirements for traceability.
- Property tests each correspond directly to a named property in the design document's Correctness Properties section; include the property number in the test `describe`/`it` label.
- All file imports must use `.js` extensions (ESM + `verbatimModuleSyntax`).
- Money arithmetic stays entirely in integer minor units; never store a floating-point amount.
- The `assessAmounts` clean price-step exemption is a subtle rule — the unit test for `[1790, 2490, 1790]` (should fail) and `[1790, 1790, 2490]` (should pass) is the key edge-case guard.
- `isActive` uses the latest `date` across ALL input transactions before any filtering (a salary credit near the end of the period still anchors the look-back window correctly).
- The sample CSV amounts are shown as negatives (money out from the account); the parse layer converts them to positive `amountMinorUnits` values before the detector sees them.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "5.2"] },
    { "id": 3, "tasks": ["7.1"] },
    { "id": 4, "tasks": ["7.2"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] },
    { "id": 6, "tasks": ["9.1"] }
  ]
}
```
