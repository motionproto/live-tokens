---
type: regex
target:
  source: file
  path: src/system/components/Rating.svelte
pattern: 'use\s*:\s*[\x27"](slider|input|toggle|radiobutton|segmentedcontrol|progressbar|badge)[\x27"]'
---

At least one `whenNotToUse` row names a shipped sibling by its lowercase id in `use`, such as `slider` or `progressbar`.
