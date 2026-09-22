---
type: regex
target: last_message
pattern: '^\s*1:\s*button\s+primary\b'
flags: 'mi'
---

Requirement 1 expects `1: button primary` in the ANSWERS block. A labelled action takes `button`, and the form's one main action takes `primary`. `danger` is wrong: nothing is destroyed.
