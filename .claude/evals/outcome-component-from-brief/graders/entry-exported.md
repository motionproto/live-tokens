---
type: regex
target:
  source: file
  path: src/system/components/Rating.svelte
pattern: 'export\s+const\s+catalogue\s*='
---

The runtime file exports a `catalogue` entry from its module script.
