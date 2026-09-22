---
type: regex
target: last_message
pattern: '^\s*2:\s*segmentedcontrol\b'
flags: 'mi'
---

Requirement 2 expects `2: segmentedcontrol -` in the ANSWERS block. An inline switch among other controls, over the same data, takes `segmentedcontrol`. `tabbar` rules itself out when the switch sits among other controls in a row.
