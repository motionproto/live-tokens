---
type: regex
target: last_message
pattern: '^\s*12:\s*none\b'
flags: 'mi'
---

Requirement 12 expects `12: none -` in the ANSWERS block. No shipped component filters a list by typing. Nothing shipped fits, so the answer is `none`.
