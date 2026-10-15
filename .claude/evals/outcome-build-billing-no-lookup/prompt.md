---
name: outcome-build-billing-no-lookup
runs: 3
max_turns: 150
timeout_seconds: 3600
allowed_tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

Add a billing page at `/billing`, in `src/pages/Billing.svelte`.

- At the top, a switch between monthly and annual prices. It sits in one row with two actions, "Download invoices" and "Contact sales". Make those toolbar buttons smaller than the rest of the page's buttons.
- Four plan cards side by side: Free, Team, Business, and Enterprise. Each shows its price in large type, three features, and a "Choose plan" action. Mark Business as recommended, with a gold highlight on its card.
- A payment method choice: card, bank transfer, or invoice. Each option has a line saying who is eligible, which the reader reads before choosing.
- An "Email receipts" setting that takes effect the moment it flips.
- Invoice recipients: the reader picks any number of people from the full team list of 30.
- The last 24 invoices, with date, amount, and status, for the reader to scan and compare. Show each status as a short label.
- A "Save billing details" action. After it saves, a confirmation appears and goes away on its own.
- A "Cancel subscription" action at the bottom of the page. Cancelling cannot be undone.
