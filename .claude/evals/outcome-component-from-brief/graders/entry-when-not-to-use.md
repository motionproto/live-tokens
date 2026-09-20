---
type: regex
target:
  source: file
  path: src/system/components/Rating.svelte
pattern: 'whenNotToUse\s*:\s*\[\s*\{\s*when\s*:'
---

The entry holds at least one `whenNotToUse` row with a `when` condition. A rating control has near siblings, so an empty array misses them.
