---
type: regex
target:
  source: file
  path: src/pages/Billing.svelte
pattern: '<SegmentedControl\b'
---

The monthly and annual switch sits in a row with other controls and picks one view of the same prices, so it takes `segmentedcontrol`. `tabbar` rules itself out among other controls.
