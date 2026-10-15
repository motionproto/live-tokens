---
type: regex
target:
  source: file
  path: src/pages/Billing.svelte
pattern: '<SegmentedControl\b'
---

The monthly and annual switch sits beside two buttons and picks one view of the same prices, so it takes `segmentedcontrol`. `tabbar` rules itself out among other controls, and `toggle` rules itself out when the two states have names of their own.
