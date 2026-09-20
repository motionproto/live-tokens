---
type: regex
target: last_message
pattern: '^\s*3:\s*tabbar\b'
flags: 'mi'
---

Requirement 3 expects `3: tabbar -` in the ANSWERS block. A choice that swaps the content area below it takes `tabbar`. `segmentedcontrol` rules itself out for that condition.
