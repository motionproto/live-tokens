---
type: regex
target:
  source: file
  path: src/system/components/Rating.svelte
pattern: ':global\(:root\)\s*\{'
---

The runtime file declares its editable properties in a `:global(:root)` block.
