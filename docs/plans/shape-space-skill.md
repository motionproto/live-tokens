# Shape & space by natural language

Status: decided 2026-08-12, ready to implement. Decisions are folded into the body; the original open questions and their resolutions are recorded at the end.

Goal: the user says "make the buttons pill shaped", "give the button sharp corners", "make the windows sharper", "make the UI softer", "make it harder", "space it out", and the token values change. Same shape as theme generation: intent in, a small structured file, a CLI that applies it with validation, a report card out.

## Why this is not a second theme generator

Color is derivational: 10 seeds expand through curves into hundreds of tokens, stored in one theme file. Shape and space have no derivation layer. Every radius, padding, and gap value is an independent alias in a per-component config file (`src/live-tokens/data/component-configs/<id>/<name>.json`), pointing at an ordered primitive scale in `tokens.css`:

- Radius: `--radius-none, sm, md, lg, xl, 2xl, 3xl, 4xl, full` (`tokens.css:393`)
- Space: `--space-0…128` (`tokens.css:419`)
- Border width: `--border-width-0…24` (`tokens.css:404`)

So the engine is not a generator. It is an **ops applier over ordered scales**: take each matching alias, find its position on the scale, move it or set it, write the result back as component-config aliases. The theme-generation plan doc reached the same conclusion (`theme-generation-skill.md:195`): "doing it properly points at per-component configs, not themes."

This also means the invariants come for free:

- `tokens.css` is never written (hand-authored, migration contract).
- No new tokens are minted; every output value is an existing scale token.
- Theme files are untouched; color and shape stay orthogonal, so any theme composes with any shape state.

## The two request classes

The example prompts split cleanly:

| Class | Examples | Operation |
|---|---|---|
| Targeted, absolute | "buttons into pill shapes", "button sharp corners" | `set` a named component's matching aliases to one scale token |
| Global, relative | "softer", "harder", "sharper windows", "space it out" | `shift` every matching alias N steps along its scale |

Relative shifts are the important design move. "Softer" must not flatten the system to one radius; it moves every component along the scale by the same number of steps, so Card stays rounder than Badge and the hierarchy survives. That is the shape/space analog of the color engine preserving curve relationships.

## The ops file

Claude translates the request into a small JSON file (temp path, like the theme brief):

```json
{
  "ops": [
    { "kind": "radius", "shift": 2 },
    { "kind": "padding", "shift": 1 },
    { "kind": "gap", "shift": 1 }
  ]
}
```

```json
{
  "name": "pill-buttons",
  "ops": [
    { "target": "button", "kind": "radius", "set": "--radius-full" }
  ]
}
```

- `name` (optional): slug for the written config files. Omitted = the rolling slug `adjusted` (see lifecycle below). Claude passes a name only when the user names a look worth keeping.
- `target` (optional): component id; omitted = all components that have matching aliases, consumer-registered components included (their configs live in the same data dir).
- `kind`: `radius | padding | gap | border-width`. Matching reuses the editor's suffix patterns (`TokenLayout.svelte:90`): `-radius`, `-padding`/`-margin`, `-gap`, `-border-width`. Extract those patterns into a shared pure module so CLI and editor cannot drift.
- `set`: an existing scale token. Validated against the scale; unknown token or kind/suffix mismatch is a hard error.
- `shift`: integer steps along the ordered ladder for that kind, clamped at the ends.
- `full` (optional, radius shifts only, default false): includes `--radius-full` as the ladder's top rung, so a shift can cross into or out of pill form.

### Ladders

- **Radius**: `none → sm → md → lg → xl → 2xl → 3xl → 4xl`, with `full` as a gated ninth rung. By default a shift clamps at `4xl` and skips aliases currently at `full` (they stay pill). With `"full": true`, shifting up from `4xl` lands on `full` and shifting down from `full` lands on `4xl`. So a global "softer" never silently turns the UI into capsules, but "keep increasing the radius" and "less round" on a pill button both stay expressible.
- **Space** (padding/margin/gap): the editor picker's 12-step subset (`UIPaddingSelector.svelte:66`): `0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48`. Hands-off mode stays inside what the editor UI can render and re-edit; the user refines by hand in the editor from there. An alias currently on an off-subset token (`--space-40/64/96/128`) snaps to the nearest subset rung when shifted, and is left alone otherwise. `--space-full` is never on the ladder.
- **Border width**: the full `--border-width-*` scale.

Rules the applier enforces:

- Aliases whose value is raw CSS rather than a token (e.g. a `color-mix` surface) are skipped and listed in the report.
- Per-side paddings (`-padding-top` etc.) shift with their parent; they match the same suffix rule already.

## Write path and lifecycle

Component configs already have the full artifact lifecycle (named files, `_active`/`_production`, protected `default`, file-manager UI), so nothing new is invented:

1. For each touched component, read its **active** config as the base.
2. Apply the ops to matching aliases.
3. Write `<slug>.json` into each touched component's dir; refuse `name: "default"` exactly as the theme CLI does.
4. Flip each touched component's `_active.json` to the new file. Production slots untouched; promotion stays a human action in the editor.

**One rolling slug, no trail.** With `name` omitted, every run writes `adjusted.json` and overwrites the previous one, so hands-off iteration ("a bit more", "too much, back one") accumulates in a single file per component instead of littering the file manager. Shifts compound naturally because each run reads the now-active config. A user-supplied `name` writes a separate named file for a look worth keeping; the next unnamed run resumes rolling on top of it.

Flags mirror `generate-theme`: `--dry-run`, `--no-activate`. The report card lists, per component, each alias old → new, plus skips (raw value, clamped at ladder end, pill preserved).

No manifest writing in v1. Flipping active configs is exactly what the editor does, and the existing manifest export captures the combined state when the user wants a shippable bundle. Successor: `docs/plans/manifest-encapsulation.md` makes a manifest one self-contained file, which is the prerequisite for a CLI that writes one.

## Engine and CLI placement

Same precedent as theme generation:

- Pure engine (Node-safe, no Svelte imports) next to the existing config code in `src/editor/core/components/`, e.g. `adjustAliases.ts`: `(configs, scales, ops) → { configs, report }`. Unit tests assert shift/clamp/pill/skip semantics against fixture configs.
- tsup entry in `vite-plugin/`, CLI worker `bin/adjust.mjs`, dispatch in `bin/cli.mjs`.
- Command name: `npx live-tokens adjust <ops.json>`. ("shape" reads as radius-only; "adjust" covers space too.)

## Skill

One skill, not two. The idioms overlap ("softer" often means both rounder and airier, "compact" means tighter padding and smaller gaps), the ops file is shared, and splitting would double the trigger-matching surface for no isolation benefit.

Proposed name: `live-tokens-adjust-shape-space`. Description triggers on: pill, rounded, rounder, sharp, sharper, square corners, softer, harder, corner radius, spacing, padding, space it out, tighter, denser, more compact, airier, breathing room.

Content stays short (target ≤ 70 lines; the domain knowledge is one page of idioms, unlike color):

- **Idiom table**: pill / capsule → `set --radius-full` on the named component; sharp / square → `set --radius-none` (or `sm` for "mostly sharp"); rounded (a named component) → `shift +2`; softer / rounder (global) → radius `shift +1..2` without `full`; harder / sharper → radius `shift -1..2`; increase / decrease the radius → `shift ±1` with `"full": true`, so repeated pushes reach pill and a pill component can come back down; space it out / airier → padding and gap `shift +1`; tighter / denser / compact → `shift -1`. Magnitude words: "slightly/a bit" = 1 step, unqualified = 1–2, "much/way/really" = 2–3.
- **Target resolution**: a named component targets that component ("windows" → Dialog, "cards" → Card); "the UI" / no noun → global.
- **Workflow**: ops file to temp path → `npx live-tokens adjust` → read report → tell the user to look at the app → offer the inverse op as the undo.
- **Scope**: never edits `tokens.css`, never invents values, never touches color or fonts.

### On skill length generally

`generate-theme` is 133 lines / 1,900 words. The workflow portion is ~25 lines; the rest is the color-selection knowledge (chroma budget, gamut guardrails, mood dials), which is the product of that skill and earns its length. If it needs trimming later, the compressible parts are the named-theme anchors and the harmony-mode section, not the physics. This new skill has no such payload and should stay under half that size.

## Prerequisite cleanup (small, separable)

Every theme file carries 11 legacy shape/space keys in its `cssVariables` bag: `--badge-trait-radius`, `--badge-trait-padding`, `--sectiondivider-padding`, and `--dialog-{primary,secondary}-{default,hover}-{radius,padding}`. Grep confirms zero consumers anywhere in `src/`. They predate the component-config system and now only create a second, dead home for shape state. Propose a theme migration (schemaVersion bump in `migrations/`) that drops them, so component configs are the single home for shape and space before this feature ships. Not a blocker; the applier never reads themes either way.

## Out of scope

- Editing the primitive scales themselves ("make the whole radius scale chunkier" would be a `tokens.css` edit behind the migration contract; different feature).
- Per-variant targeting ("only primary buttons") — v1 targets whole components; the suffix match already scopes per-variant aliases together.
- Typography, color, shadows, motion.
- Production promotion and manifests (see `docs/plans/manifest-encapsulation.md`).

## Decisions (2026-08-12)

1. **One skill**, `live-tokens-adjust-shape-space`. Single ownership; no split.
2. **CLI command**: `npx live-tokens adjust <ops.json>`.
3. **Pill**: global shifts may cross into or out of `--radius-full`, but not by default. The `full: true` flag on a radius shift opts in; the skill sets it for explicit radius language ("increase the radius", "less round") and leaves it off for mood language ("softer").
4. **Slug**: one rolling slug `adjusted` by default, overwritten each run; a user-named look writes its own file. No trail.
5. **Spacing ladder**: the editor picker's 12-step subset, not the full 16-step scale. This is hands-off mode; every written value must be re-editable in the picker. Off-subset values snap when shifted.

## Implementation plan

Commit units in order; each leaves the tree green. Modest enough for one session; use worktree waves only if run alongside other work.

1. **Shared kind patterns + engine.** Extract the suffix patterns from `TokenLayout.svelte:90` into a pure module (e.g. `src/editor/core/components/aliasKinds.ts`); TokenLayout imports it. Add `adjustAliases.ts` next to it: `(configs, ops) → { configs, report }`, Node-safe, no Svelte imports. Ladders defined here (radius + gated `full` rung, 12-step space subset, border-width scale). Unit tests: shift/clamp, pill gate both directions, off-subset snap, raw-CSS skip, per-side paddings, set validation errors.
2. **CLI.** tsup entry in `vite-plugin/` → `dist-plugin/`, worker `bin/adjust.mjs` (reads active config per component, applies, writes `<slug>.json`, flips `_active`, prints report card), dispatch + usage in `bin/cli.mjs`, `--dry-run` / `--no-activate`, refuse `name: "default"`. Follow `bin/generate-theme.mjs` structure. Test against the repo's own data dir with `--dry-run`.
3. **Skill + registration.** `.claude/skills/live-tokens-adjust-shape-space/SKILL.md` (≤ 70 lines, content per the Skill section), `SAMPLE_PROMPTS` entry in `bin/cli.mjs`, README skills-table row, tarball `files` check so the skill ships like the other four.
4. **Separable cleanup** (optional, any time): theme migration dropping the 11 dead `cssVariables` shape/space keys.

Verify end to end: `npx live-tokens adjust` with a "softer" ops file against the demo app, confirm the running app changes and the editor file manager shows `adjusted` active per component; then a `pill-buttons` targeted run; then a named run to confirm the rolling slug leaves the named file alone.
