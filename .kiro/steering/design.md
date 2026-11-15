---
inclusion: always
---

# Visual design rules

## Look and feel
Haunted but readable. Dark background, one or two accent colours (for example a sickly green and a warm amber), subtle fog and glow effects, and a serif or gothic display font for headings paired with a clean sans-serif for numbers and body text.

## Hard rules
- Readability beats atmosphere. Body text and amounts must meet WCAG AA contrast.
- Respect `prefers-reduced-motion`: disable fog, flicker and floating animations for those users.
- All interactions must work with the keyboard. Tombstones are real buttons with visible focus states and accessible labels.
- Must work at phone width as well as desktop.
- No real brand logos or trademarks. Show merchant names as plain text.
- No copyrighted music or sound. Audio, if any, is optional, off by default, and royalty-free.

## Interaction
- Exhume: clicking a tombstone opens a detail panel with cost, age and cancel steps.
- Empty state: before upload, show a friendly graveyard with a "Try the sample data" button.
- Errors: a malformed CSV shows a plain-language message and what to fix, never a stack trace.
