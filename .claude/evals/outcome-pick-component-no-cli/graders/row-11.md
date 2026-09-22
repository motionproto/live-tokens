---
type: regex
target: last_message
pattern: '^\s*11:\s*none\b'
flags: 'mi'
---

Requirement 11 expects `11: none -` in the ANSWERS block. Every shipped selection component picks one value, and `menuselect` rules itself out when the choice allows more than one. Nothing shipped fits, so the answer is `none`.
