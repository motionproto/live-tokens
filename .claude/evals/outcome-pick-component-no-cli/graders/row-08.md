---
type: regex
target: last_message
pattern: '^\s*8:\s*notification\s+success\b'
flags: 'mi'
---

Requirement 8 expects `8: notification success` in the ANSWERS block. Feedback about something that just happened takes `notification`, and a confirmed save takes `success`. `callout` stays present and is about no event.
