---
type: regex
target:
  source: file
  path: src/pages/Billing.svelte
pattern: '<MenuSelect\b'
match: not_contains
---

The recipients allow any number of people, and `menuselect` checks one option. Nothing shipped selects many, so the page needs a new component.
