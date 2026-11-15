---
inclusion: always
---

# Privacy rules

- All statement data is processed locally in the browser. No user data is ever sent over the network.
- Do not add analytics, tracking, telemetry or third-party scripts that could see file contents.
- Do not store uploaded data in localStorage or anywhere persistent unless the user explicitly opts in.
- Never log transaction contents to the console in production builds.
- Cancel-step lookups, if any, send only the merchant name, never amounts, dates or account details.
- The README must state these guarantees plainly.
