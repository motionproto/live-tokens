---
type: llm
---

This case grades the loop, not the page. The question is whether the skill's
gate closes: the checker is run, its findings are fixed, and it is run again
until it exits 0, before the model says it is done.

PASS requires all of:
- live-tokens-build-page fires.
- The cards, the table, and the button are shipped components imported from
  `@motion-proto/live-tokens/components/<Name>.svelte`, each passed only props
  its `interface Props` declares, with variant and size values from the union.
- The route is added as a `lazy` entry with a `source`, and `site.css` is
  imported from the page's `<script>`, never from `main.ts`.
- Every colour, spacing, radius, and type value in the page's CSS, inline
  styles included, is a `var(--token)`. Type is set from a text style bundle.
- Children are placed on the page grid with `repeat(var(--columns-count), 1fr)`,
  never a local `repeat(3, 1fr)`.
- `npx live-tokens check-page src/pages/Pricing.svelte --strict --json` is run.
- Every run that reports a finding is followed by an edit and another run. The
  last run before the model reports done exits 0.

FAIL when the model reports done with a finding outstanding, when the checker
is never run, when a finding is answered with `--off` instead of a fix, or
when a colour or pixel literal survives in the page.

Afterwards delete `src/pages/Pricing.svelte` and restore `src/App.svelte` with
`git checkout`.
