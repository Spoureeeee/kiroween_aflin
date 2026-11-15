# Requirements Document

## Introduction

The recurring-charge detector is a pure-function module (`src/detect/`) for Subscription Graveyard. It receives a `Transaction[]` from the parse layer and returns a list of detected recurring charges, each enriched with cadence, typical cost, confidence level, and activity status. The module has no DOM access and stores all money as integer minor units.

## Glossary

- **Detector**: The `src/detect/` module; the system under specification.
- **Transaction**: A single normalised row from a parsed bank statement as defined in `src/parse/types.ts`.
- **Merchant_Name**: A normalised string derived from a transaction description by stripping trailing reference numbers, collapsing whitespace, and upper-casing.
- **Series**: The ordered sequence of transactions that share the same `Merchant_Name`.
- **Cadence**: The detected periodicity of a series — one of weekly (~7 days), monthly (~30 days), quarterly (~90 days), or annual (~365 days).
- **Median_Interval**: The median number of calendar days between consecutive charges in a series.
- **Typical_Amount**: The median `amountMinorUnits` across the series, stored as a positive integer minor unit value.
- **Confidence**: A label indicating certainty — `"confirmed"` when minimum charge-count thresholds are met, `"possible"` otherwise.
- **Active_Subscription**: A subscription whose `lastCharge` falls within 1.5 × the cadence period before the latest transaction date in the input.
- **Minor_Unit**: The smallest currency denomination (e.g. sen for MYR, cent for USD); amounts are always integers in this unit.
- **Coefficient_of_Variation**: Standard deviation divided by mean for a set of amounts, expressed as a ratio.
- **Reference_Number**: A trailing sequence of digits or alphanumeric code in a description that identifies a specific transaction instance rather than the merchant (e.g. `"8823"` in `"NIGHTFLIX.COM 8823"`).

---

## Requirements

### Requirement 1: Merchant-Name Normalisation

**User Story:** As the Detector, I want to normalise raw description strings into canonical merchant names, so that charges from the same merchant group together regardless of trailing reference numbers.

#### Acceptance Criteria

1. WHEN a transaction description contains one or more trailing Reference_Numbers separated from the base name by whitespace, THE Detector SHALL strip those Reference_Numbers to produce the Merchant_Name, where a Reference_Number is defined as a token matching one or more digits, one or more uppercase letters, or an alphanumeric string of 6 or more characters with at least one digit.
2. WHEN a transaction description contains consecutive internal whitespace, THE Detector SHALL collapse it to a single space in the Merchant_Name.
3. THE Detector SHALL upper-case the full Merchant_Name using Unicode locale-independent case mapping.
4. WHEN two transaction descriptions differ only in their trailing Reference_Numbers, THE Detector SHALL assign them the same Merchant_Name.
5. THE Detector SHALL treat normalisation as a pure function: the same input description always produces the same Merchant_Name.
6. IF a transaction description is an empty string or contains only whitespace, THEN THE Detector SHALL return an empty string as the Merchant_Name without throwing an error.
7. IF a transaction description consists entirely of tokens that match the Reference_Number pattern, THEN THE Detector SHALL return the full uppercased description as the Merchant_Name, preserving at least one token.

---

### Requirement 2: Credit Filtering

**User Story:** As the Detector, I want to ignore credits and refunds, so that salary deposits and refunds are never presented as recurring charges.

#### Acceptance Criteria

1. WHEN a transaction has `amountMinorUnits` ≤ 0, THE Detector SHALL exclude it from all series analysis.
2. WHEN the entire input contains only transactions with `amountMinorUnits` ≤ 0, THE Detector SHALL return an empty result array.
3. IF a transaction with `amountMinorUnits` > 0 shares a merchant name with a transaction where `amountMinorUnits` ≤ 0, THEN THE Detector SHALL exclude only the non-positive transaction and retain the positive transaction in series analysis.

---

### Requirement 3: Same-Day Duplicate Suppression

**User Story:** As the Detector, I want to collapse multiple charges from the same merchant on the same date into a single occurrence, so that a single billing event with a split debit does not trigger a false recurring detection.

#### Acceptance Criteria

1. WHEN two or more transactions share the same `Merchant_Name` (case-insensitive exact match) and the same `date` (ISO date string, ignoring time component), THE Detector SHALL treat them as a single occurrence for cadence analysis.
2. WHEN duplicates are collapsed, THE Detector SHALL sum their `amountMinorUnits` as the amount for that single occurrence, with the result stored as an integer in minor units.
3. IF collapsing two or more transactions would produce a summed `amountMinorUnits` that exceeds 999,999,999, THEN THE Detector SHALL retain the original transactions as separate occurrences without collapsing them.
4. WHEN a merchant has only one transaction on a given date, THE Detector SHALL pass that transaction through to cadence analysis unchanged.

---

### Requirement 4: Cadence Detection

**User Story:** As the Detector, I want to identify the billing cadence of a series, so that the UI can tell users how often they are charged.

#### Acceptance Criteria

1. WHEN the Median_Interval of a series, measured in calendar days, falls within 3–10 days (inclusive), THE Detector SHALL classify the cadence as `"weekly"`.
2. WHEN the Median_Interval of a series, measured in calendar days, falls within 25–45 days (inclusive), THE Detector SHALL classify the cadence as `"monthly"`.
3. WHEN the Median_Interval of a series, measured in calendar days, falls within 80–100 days (inclusive), THE Detector SHALL classify the cadence as `"quarterly"`.
4. WHEN the Median_Interval of a series, measured in calendar days, falls within 330–400 days (inclusive), THE Detector SHALL classify the cadence as `"annual"`.
5. WHEN the Median_Interval of a series falls outside all drift-expanded cadence windows — where each window's lower bound is reduced by 5 and upper bound is increased by 5 — THE Detector SHALL not include that series in the output.
6. WHEN a series contains exactly one occurrence after duplicate suppression AND a prior transaction from the same merchant series exists with a date between 330 and 400 calendar days before that occurrence, THE Detector SHALL classify the cadence as `"possible-annual"` with `confidence` set to `"possible"`.
7. WHEN computing intervals, THE Detector SHALL use calendar-day differences between ISO date strings with no timezone conversion.
8. WHEN computing the Median_Interval for a series, THE Detector SHALL calculate the difference in calendar days between each pair of chronologically consecutive occurrences and take the median of those differences.

---

### Requirement 5: Day-of-Month Drift Tolerance

**User Story:** As the Detector, I want to tolerate small shifts in billing date, so that a subscription billed on the 7th one month and the 10th the next is still recognised.

#### Acceptance Criteria

1. WHEN the Median_Interval of a series falls within 5 calendar days below the lower bound or 5 calendar days above the upper bound of a defined cadence window, THE Detector SHALL still classify the series under that cadence window, treating the effective window as expanded by ±5 days on each boundary.
2. THE Detector SHALL use the Median_Interval — not the mean — to determine cadence, so that a single outlier interval does not suppress a valid series.

---

### Requirement 6: Minimum Charge-Count Thresholds

**User Story:** As the Detector, I want minimum occurrence thresholds per cadence, so that a one-off charge is not mistaken for a subscription.

#### Acceptance Criteria

1. IF a series has cadence `"weekly"` and fewer than 3 occurrences after duplicate suppression, THEN THE Detector SHALL exclude the series from the output.
2. IF a series has cadence `"monthly"` and fewer than 2 occurrences after duplicate suppression, THEN THE Detector SHALL exclude the series from the output.
3. IF a series has cadence `"quarterly"` and fewer than 2 occurrences after duplicate suppression, THEN THE Detector SHALL exclude the series from the output.
4. IF a series has cadence `"annual"` and fewer than 2 occurrences after duplicate suppression, THEN THE Detector SHALL exclude the series from the output.
5. IF a series has cadence `"annual"` and at least 2 occurrences after duplicate suppression, THEN THE Detector SHALL set `confidence` to `"confirmed"`.
6. IF a series has cadence `"possible-annual"` with exactly 1 occurrence after duplicate suppression, THEN THE Detector SHALL set `confidence` to `"possible"`.
7. IF a series meets its minimum charge-count threshold for its cadence AND the Detector does not exclude it under the Non-Subscription Filter (Requirement 8), THEN THE Detector SHALL set `confidence` to `"confirmed"` for cadences `"weekly"`, `"monthly"`, and `"quarterly"`.

---

### Requirement 7: Price-Change Tolerance

**User Story:** As the Detector, I want price changes within a series to be tolerated, so that a subscription that raised its price is still detected as recurring.

#### Acceptance Criteria

1. IF the Coefficient_of_Variation of `amountMinorUnits` within a series is greater than 0 and less than or equal to 0.5, THEN THE Detector SHALL still recognise the series as recurring.
2. THE Detector SHALL record the Typical_Amount as the median `amountMinorUnits` across occurrences in the series; when the occurrence count is even, the Typical_Amount is the lower of the two middle values, expressed as a positive integer in minor units.
3. IF the most recent occurrence's `amountMinorUnits` differs from the Typical_Amount, THEN THE Detector SHALL set `amountChanged` to `true`.
4. IF all occurrences in the series have identical `amountMinorUnits`, THEN THE Detector SHALL set `amountChanged` to `false`.

---

### Requirement 8: Non-Subscription Filter

**User Story:** As the Detector, I want to suppress merchants with variable amounts and irregular cadence, so that grocery stores, fuel stops, and food delivery services are not shown as subscriptions.

#### Acceptance Criteria

1. IF a series has a Coefficient_of_Variation of `amountMinorUnits` greater than 0.5 AND the Median_Interval (the median number of days between consecutive occurrences in the series, sorted by date) does not fall within any cadence window defined in the cadence-assignment rules, THEN THE Detector SHALL exclude the series from the output.
2. IF a series has a Coefficient_of_Variation of `amountMinorUnits` greater than 0.5 AND the Median_Interval falls within a cadence window defined in the cadence-assignment rules, THEN THE Detector SHALL include the series in the output and set `confidence` to `"possible"`.

---

### Requirement 9: Output Shape

**User Story:** As the Detector, I want a well-typed output record per detected subscription, so that the UI layer can render tombstones without additional data wrangling.

#### Acceptance Criteria

1. THE Detector SHALL return a `DetectedSubscription[]` where each element contains exactly the fields: `merchantName`, `cadence`, `typicalAmountMinorUnits`, `currency`, `firstCharge`, `lastCharge`, `chargeCount`, `confidence`, `isActive`, and `amountChanged`.
2. THE Detector SHALL set `merchantName` to the Merchant_Name string.
3. THE Detector SHALL set `cadence` to one of `"weekly" | "monthly" | "quarterly" | "annual" | "possible-annual"`.
4. THE Detector SHALL set `typicalAmountMinorUnits` to the Typical_Amount (a positive integer greater than or equal to 1).
5. THE Detector SHALL set `currency` to the ISO 4217 code of the earliest-dated occurrence in the series after duplicate suppression.
6. THE Detector SHALL set `firstCharge` to the ISO date string of the earliest occurrence in the series.
7. THE Detector SHALL set `lastCharge` to the ISO date string of the latest occurrence in the series.
8. THE Detector SHALL set `chargeCount` to the number of occurrences after duplicate suppression.
9. THE Detector SHALL set `confidence` to `"confirmed"` or `"possible"` as determined by Requirements 6 and 8.
10. IF `lastCharge` is within the cadence-window look-back distance (weekly: 10 days, monthly: 45 days, quarterly: 135 days, annual or possible-annual: 548 days) of the latest transaction date present anywhere in the input, THEN THE Detector SHALL set `isActive` to `true`.
11. IF `lastCharge` is not within the cadence-window look-back distance defined in criterion 10, THEN THE Detector SHALL set `isActive` to `false`.

---

### Requirement 10: Output Ordering

**User Story:** As the Detector, I want results sorted by typical cost descending, so that the most expensive subscriptions appear first in the UI.

#### Acceptance Criteria

1. THE Detector SHALL sort the output array by `typicalAmountMinorUnits` in descending order.
2. WHEN two items share the same `typicalAmountMinorUnits`, THE Detector SHALL break the tie by sorting alphabetically ascending by `merchantName`.

---

### Requirement 11: Property-Based Test Coverage

**User Story:** As a developer, I want property-based tests for the detector, so that edge cases across random inputs are systematically exercised.

#### Acceptance Criteria

1. FOR ALL permutations of a valid transaction list containing at least 2 transactions, the Detector SHALL return the same result regardless of transaction order (order-independence property).
2. FOR ALL synthetically generated monthly series containing at least 2 occurrences with a base interval of 30 days and per-charge date drift of ±3 days, THE Detector SHALL classify the series as `"monthly"`.
3. FOR ALL non-empty outputs produced by the Detector, every `typicalAmountMinorUnits` SHALL be strictly greater than 0.
4. FOR ALL input lists composed entirely of transactions with `amountMinorUnits` ≤ 0, THE Detector SHALL return an empty array.
5. FOR ALL valid `DetectedSubscription` outputs, `firstCharge` SHALL be lexicographically less than or equal to `lastCharge`.

---

### Requirement 12: Fixture Test Against Sample Data

**User Story:** As a developer, I want an integration-style fixture test using the real sample CSV, so that known-good and known-bad merchants are verified end-to-end.

#### Acceptance Criteria

1. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL include a result for `"IRONHOUSE GYM MEMBERSHIP"` with cadence `"monthly"`, confidence `"confirmed"`, `typicalAmountMinorUnits` equal to 12900, `amountChanged` equal to `false`, and `isActive` equal to `true`.
2. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL include a result for `"NIGHTFLIX.COM"` with cadence `"monthly"`, confidence `"confirmed"`, `typicalAmountMinorUnits` equal to 5990, `amountChanged` equal to `true`, and `isActive` equal to `true`.
3. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL include a result for `"SPOTIFLY PREMIUM"` with cadence `"monthly"`, confidence `"confirmed"`, `typicalAmountMinorUnits` equal to 1790, `amountChanged` equal to `false`, and `isActive` equal to `true`.
4. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL include a result for `"CLOUDBOX 200GB STORAGE"` with cadence `"monthly"`, confidence `"confirmed"`, `typicalAmountMinorUnits` equal to 490, `amountChanged` equal to `false`, and `isActive` equal to `true`.
5. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL include a result for `"MOBILEONE POSTPAID BILL"` with cadence `"monthly"`, confidence `"confirmed"`, `typicalAmountMinorUnits` equal to 6800, `amountChanged` equal to `false`, and `isActive` equal to `true`.
6. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL NOT include `"FRESHMART GROCERIES"` in the output.
7. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL NOT include `"PETRONOVA FUEL"` in the output.
8. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL NOT include `"KOPI CORNER"` in the output.
9. WHEN the parsed transactions from `samples/statement-sample.csv` are passed to the Detector, THE Detector SHALL NOT include `"SALARY CREDIT ACME SDN BHD"` in the output.
