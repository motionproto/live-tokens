---
type: regex
target: last_message
pattern: '^\s*7:\s*toggle\b'
flags: 'mi'
---

Requirement 7 expects `7: toggle -` in the ANSWERS block. A setting that takes effect the moment it flips, with one name for both states, takes `toggle`.
