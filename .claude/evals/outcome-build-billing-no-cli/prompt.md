---
name: outcome-build-billing-no-cli
runs: 3
max_turns: 200
timeout_seconds: 3600
allowed_tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

We need a billing page at `/billing`, in `src/pages/Billing.svelte`, for our monthly coffee box.

Customers should see their current plan next to the others, Taster, Regular, Office, and Roastery, all side by side, with prices they can flip between monthly and annual. Regular is the plan we want to push, so make it stand out; our brand gold works for that. Each plan needs a way to pick it, and the prices should be big and clear. Next to the price switch, put two smaller buttons, Download invoices and Contact us, so they don't compete with the plans.

Next month's box ships on a day the customer chooses. Show next month as a calendar, so they can see which weekday each date falls on, and let them pick one day. We don't ship on weekends.

Below that, let them set how they pay: card, bank transfer, or invoice. Not everyone qualifies for the last two, so say who does.

Add a switch for emailed receipts, their invoice history for the last two years with whether each one was paid, and one save button for all of this that tells them it worked.

At the very bottom, give them a way to cancel the subscription. Cancelling is permanent, so it shouldn't happen by accident.
