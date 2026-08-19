# Themes are deltas, not documents

An audit of what a theme file actually stores, why Midnight Study shipped
badges at `--space-2`, and what it would take for a theme to be a complete
description of a look.

Status: analysis and proposal. Nothing here is implemented.

## The question

A theme should be a valid, self-contained theme: a unique set of components,
as if a person had customized each one by hand. Generating that set from
modifiers is fine. Shipping the modifiers, or shipping a file that leans on
internal defaults to be complete, is not.

Today neither the format nor the preset generator meets that bar. The reasons
are different in each case, and only one of them is a mistake.

## What a theme stores today

`Theme.componentConfigs` is documented as delta encoded:

> Component id → its config. Delta encoding: a component absent here is on its
> default. Defaults are never inlined. The local `default.json` derived from
> the component source is canonical, and a frozen copy would drift.
>
> `src/editor/core/themes/themeTypes.ts:224`

The encoding is two-level, and the two levels disagree.

**Across components it is sparse.** A component whose config matches the
default is omitted. Both writers enforce this. The editor's Save filters to
`c.source !== 'default'` (`themeService.ts:144`). The preset generator skips
any component whose diff is empty (`generate-preset-themes.mjs:179`). A test
pins it: *"carries only the components the shape ops changed"*
(`presetThemes.test.ts:76`).

**Within a component it is complete.** Every alias of an included component is
written, including the ones equal to the default. The same test asserts it:
`expect(Object.keys(config.aliases)).toEqual(Object.keys(base.aliases))`.

So a theme freezes a component wholesale or omits it wholesale. There is no
per-alias delta anywhere in the format.

## How a value resolves at runtime

`resolveLiveComponentConfig` (`vite-plugin/themeFileApi.ts:956`, with the
short-circuit at `:963`) walks three layers and stops at the first hit:

| Layer | Source | Granularity |
|---|---|---|
| 1 | `_working.json` buffer | whole component |
| 2 | the open theme's `componentConfigs[id]` | whole component |
| 3 | `component-configs/<id>/default.json` | whole component |

Beneath all three sits the component's own `:global(:root)` block in its
`.svelte` file, which supplies a value for any alias none of the layers names.

The critical detail is that layer 2 short-circuits layer 3 entirely. If a theme
includes a component, that component's default config is never consulted, not
even for aliases the theme happens to omit. The delta encoding therefore
protects only the components a theme leaves out.

## How much the delta actually saves

| Theme | components stored | aliases stored | file size |
|---|---|---|---|
| halloween | 25 / 25 | **1237 / 1237** | 141 KB |
| royal-velvet | 25 / 25 | 1237 / 1237 | 138 KB |
| autumn | 24 / 25 | 1210 / 1237 | 137 KB |
| ocean | 24 / 25 | 1210 / 1237 | 137 KB |
| spring-meadow | 24 / 25 | 1210 / 1237 | 137 KB |
| sunset | 23 / 25 | 1193 / 1237 | 138 KB |
| midnight-study | 19 / 25 | 1014 / 1237 | 125 KB |

Halloween and Royal Velvet are already complete. Four more omit a single
component, `radiobutton`. Midnight Study is the only real outlier, and six of
its omissions appeared today when the inset floor lifted several components
back onto their defaults.

Making every theme complete costs 2% on five of the seven files and 18% on the
worst case. The delta encoding buys almost nothing and couples every theme to
the baseline to get it.

## Why it was built this way

The stated reason is drift: *"a frozen copy would drift."* Read as written,
the concern is that a theme inlining today's defaults goes stale when a
component gains a token or changes one.

That concern is real. The design does not address it.

**The format already freezes.** Every theme has frozen 1014 to 1237 aliases
across 19 to 25 components. Drift protection applies only to `radiobutton`
and, in Midnight Study, five others. The rule is stated globally and holds
almost nowhere.

**The project already has the right mechanism.** There are 29 dated theme
migrations under `src/editor/core/themes/migrations/`, several declaring
`appliesTo: 'component-config'` and rewriting alias keys inside stored configs.
Schema evolution is handled explicitly, versioned, and tested.

**New tokens are already handled elsewhere.** A migration comment records the
convention: *"those have no v9 predecessor, they simply start unset"*
(`2026-05-21-sectiondivider-spacing-to-padding.ts`). An unset alias falls to
the component's `:global(:root)`. That is the backstop for added tokens, and it
works whether or not a theme includes the component.

So delta encoding duplicates, implicitly and partially, a job that migrations
and the CSS layer already do explicitly and completely.

## The second problem: preset values are computed, not chosen

The seven shipped presets are not authored. `scripts/generate-preset-themes.mjs`
takes the component defaults as the base and applies a table of relative ops:

```js
{ slug: 'midnight-study', ops: [
  { kind: 'padding', shift: -2 },
  { kind: 'gap',     shift: -1 },
  { target: 'dialog', kind: 'radius', set: '--radius-none' },
  { target: 'card',   kind: 'radius', set: '--radius-sm' },
  { target: 'button', kind: 'radius', set: '--radius-full' },
]}
```

`padding shift: -2` moves every padding alias in every component two rungs down
from whatever the default is. Between 79 and 104 padding aliases per preset are
produced this way.

The theme file stores the result as absolute values, so the modifiers do not
ship. But the derivation is re-run by `npm run generate:preset-themes`, and
three consequences follow.

**Nobody chose the numbers.** Midnight Study's badges were `--space-2` because
6 minus 2 rungs is 2. Sixteen paddings reached `--space-0` the same way. No one
judged either value right for the element it landed on. This is the whole
origin of the reported bug.

**Presets track the baseline.** Change a default's padding and all seven
presets move on the next regeneration. A preset cannot hold an opinion that
survives a baseline edit.

**The coupling is silent.** No workflow runs the generator and no test compares
the themes against the ops table. `presetThemes.test.ts` re-declares the slug
list literally and checks structure, fonts, and distinctness. It never
re-derives. Drift stays invisible until someone regenerates, which is how the
committed Midnight Study accumulated 164 redundant aliases and 16 stale
`--space-0` paddings.

One test also depends on the derivation: *"gives no two presets the same card
radius and button padding."* A comment records that three presets' ops were
altered from the original design sketch to satisfy it. Distinctness is
currently a property of the arithmetic, not of a design decision.

## Where the logical failing sits

It is in the format, not in the skills.

The `adjust` skill and the `generate-theme` skill both write through the same
layers the editor writes through. Neither invents the delta. The preset
generator is guilty of a narrower charge: it chooses values by arithmetic
rather than by judgment, and it re-chooses them on every run.

Stated plainly: a theme is currently a patch against a moving baseline, and the
baseline moves.

## Proposal

Three changes. The first is the substance; the other two follow from it.

### 1. Themes become component-complete

Every theme stores a config for all 25 components, each with its full alias
set. A theme then fully determines its look. Layer 3 becomes what it should be,
the seed for a new theme and the fallback for no theme at all, rather than a
silent participant in every saved look.

Concretely:

- `captureLook()` drops the `c.source !== 'default'` filter and captures every
  component.
- `generate-preset-themes.mjs` drops the `if (diff === 0) continue` skip.
- `presetThemes.test.ts` inverts: assert every theme carries all 25 components,
  and drop `expect(config.aliases).not.toEqual(base.aliases)`.
- A migration fills existing themes: for each omitted component, inline the
  current default. It is additive and idempotent, and it can reuse the existing
  migration harness.
- The `Theme.componentConfigs` doc comment is rewritten. The drift rationale
  goes; migrations own that problem.

Added tokens keep working exactly as they do now. They start unset and resolve
through `:global(:root)` until a migration seeds them, which is already the
convention.

### 2. Padding stops being a modifier

Remove `{ kind: 'padding', shift: n }` from the preset ops table. Give each
preset an authored density instead, written as absolute values in the same
table, so a person reads `--space-4` and sees `--space-4`.

This is the direct fix for the reported bug. A floor stops a shift from landing
somewhere absurd, which is what shipped today, but it only bounds a number
nobody chose. Authoring the value removes the class.

The distinctness test needs rewriting alongside this, since it currently keys
on button padding produced by the shifts.

Radius, gap, and border width can keep their relative ops. A relative move is a
reasonable way to say "rounder" and none of them produced the failure.

### 3. Gate the generator

Add a `--check` mode to `generate-preset-themes.mjs` that regenerates into
memory and fails on any difference, then run it in `verify.yml`. Today nothing
notices when the shipped themes and the ops table disagree.

## What this costs

- Theme files grow 0% to 18%. Two are already complete.
- One additive migration, of a kind this repo has written 29 times.
- Two tests invert and one is rewritten.
- Themes stop inheriting improvements to component defaults automatically. This
  is the real trade, and it is the point. A theme that silently changes when
  the baseline changes is not a document.

## Open questions

1. Should `default.json` itself become a theme, so the baseline is one more
   document rather than a distinct layer? That would remove layer 3 entirely
   and leave `:global(:root)` as the only fallback. Larger change, cleaner
   model.
   
   ANSWER: YES
2. Should completeness be enforced on read, so a hand-edited or third-party
   theme missing components is filled at load and flagged, rather than
   resolving silently against the defaults?
   ANSWER: We should not block an incomplete theme but load any existing components. Presumably, tokens would always be there. If not, we should alert the user and prompt them to use the theme builder skill to complete their work. 
3. Do the presets keep a generator at all once padding is authored? Radius and
   border width alone may not justify the machinery.
   ANSWER: Padding can be changed by the skill, so generators that can modify colors, padding, and gaps could be useful. The idea here is that it's not a modifier, so it sounds like we need to rethink how these generators work and whether they are needed at all.

   BUILT (Wave 5, `docs/plans/theme-completeness.md`, RJC 7): the machinery
   survives as a one-shot **seeder**, not a generator that sweeps shipped
   files. `scripts/generate-preset-themes.mjs` became
   `scripts/seed-preset-theme.mjs <slug> [--force]`: it seeds exactly one new
   preset from the `PRESETS` ops table applied on top of the current component
   defaults, and refuses to touch a preset that already exists unless
   `--force`. There is no sweep-all path — a regeneration that could silently
   move a shipped preset when the baseline shifts is exactly the bug this
   correction closes. `scripts/check-preset-themes.mjs` replaces the old
   regenerate-and-diff gate: it asserts invariants (complete, current schema,
   no orphans, fonts stamped, distinct looks) on the seven committed files
   directly and never re-derives them, so it cannot itself be coupled to the
   baseline. The `adjust` skill still uses the same underlying engine against
   a live theme; only the shipped presets stop being re-derivable.
4. Motion Proto keeps five `-padding` aliases at `--space-2`, by instruction.
   Three are `--sectiondivider-*-title-padding`, one is
   `--segmentedcontrol-bar-small-padding`, one is `--toggle-track-padding`. A
   2px toggle track inset is plausibly correct. Worth a deliberate pass once
   these values are authored rather than derived.
   
   ANSWER:MotionProto was the archetypal example so they should be correct. 
