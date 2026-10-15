---
type: regex
target:
  source: file
  path: src/pages/Billing.svelte
pattern: '<MenuSelect\b'
match: not_contains
---

The delivery day is picked on a calendar of next month. A `menuselect` of dates hides which weekday each date falls on, which the brief asks to show. Nothing shipped draws a month grid, so the page needs a new component.
