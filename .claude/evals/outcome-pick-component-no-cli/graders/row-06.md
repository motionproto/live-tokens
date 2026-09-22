---
type: regex
target: last_message
pattern: '^\s*6:\s*slider\s+single\b'
flags: 'mi'
---

Requirement 6 expects `6: slider single` in the ANSWERS block. A bounded number whose position carries the meaning takes `slider`, and one number takes `single`. `range` would be two.
