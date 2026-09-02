---
type: llm
---

No skill is the clear owner: this could be colour, type, geometry, or the
wrong component entirely.

PASS when the model **asks which** rather than guessing, or names the
candidates it is choosing between.

FAIL when it fires one skill silently and acts. This case exists to catch a
description that has grown greedy enough to claim an ambiguous request.
