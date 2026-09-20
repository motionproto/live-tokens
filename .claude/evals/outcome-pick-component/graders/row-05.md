---
type: regex
target: last_message
pattern: '^\s*5:\s*input\b'
flags: 'mi'
---

Requirement 5 expects `5: input -` in the ANSWERS block. A value with no predefined list takes `input`.
