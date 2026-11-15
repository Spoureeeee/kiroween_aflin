---
inclusion: always
---

# Product: Subscription Graveyard

Kiroween 2026 entry, Costume Contest category. Solo build by a student.

## What it is
The user drops in a bank or card statement CSV. Recurring charges are detected and shown as tombstones in a spooky graveyard. Clicking a tombstone "exhumes" the charge: monthly cost, yearly cost, how long it has been haunting the user, and steps to cancel. A header total shows how much the subscriptions drain per year.

## Who it is for
Anyone who suspects they are paying for subscriptions they forgot about. Judges and first-time users must understand it within 10 seconds.

## Principles
- The spooky theme must help the function. A tombstone is a recurring charge, not decoration.
- Never claim support for every bank. Support a generic column mapper plus a built-in sample CSV, and say so honestly in the UI and the README.
- Be honest about uncertainty. Show a confidence label on detected subscriptions and let the user dismiss false positives.
- Currency defaults to MYR but must not be hard-coded. Use the currency found in the file, or let the user pick.

## Out of scope
No accounts, no backend, no bank API connections, no real brand logos (third-party trademarks are not allowed in the submission).
