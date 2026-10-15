---
type: regex
target:
  source: file
  path: src/pages/Billing.svelte
pattern: '<Dialog\b'
---

Cancelling cannot be undone, so the action confirms in a `dialog`. A bare danger `button` is the trap.
