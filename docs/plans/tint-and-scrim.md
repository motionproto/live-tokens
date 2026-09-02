# Tint and scrim

Three washes of translucent color exist in this system and two of them share a
name. This splits them, then builds the hover tint the split makes possible.

## The model

| Family | What it is | Where it sits |
| --- | --- | --- |
| `--tint-*` | A wash **on** a surface that shifts its shade | Hover, an active tab, a badge on a button |
| `--scrim-*` | A translucent layer that **dims what is behind it** | Behind a modal |
| `backdrop` | Not paint. What is behind a thing, and which way it leans | `@motion-proto/live-tokens/backdrop`, polarity detection |

`backdrop` is already taken, and by a different concept: `src/system/backdrop/backdrop.ts`
exports `BACKDROP_ATTRIBUTE`, `backgroundLuminance`, and `polarityOf`. It is the
public answer to "is the thing behind me light or dark". Reusing it for the paint
would be one word covering two concepts.

`scrim` is the ordinary name for the other thing. Material Design uses it for
exactly this layer, and it cannot be read as anything else.

Today all three collide. `--dialog-overlay-surface` is labelled "backdrop color"
in `DialogEditor.svelte:19`, reads `var(--overlay-high)`, and has nothing to do
with the exported `backdrop` module. Three names, two concepts, one token.

## What moves

**`--hover-low/--hover/--hover-high` become `--tint-low/--tint/--tint-high`.**
Same alias (`--text-primary`), same opacities (5/10/15%). Nothing in `src/` reads
the hover names, so this is zero visual change. They also gain baselines in
`tokens.css`, which they never had: that absence is why `var(--hover)` in Button
painted nothing before a theme was adopted.

**`--overlay-low/--overlay/--overlay-high` become `--scrim-low/--scrim/--scrim-high`.**
Same alias (`--surface-neutral-lowest`), same opacities (38/51/64%).

**Two strays move from scrim to tint.** Both are washes on a surface, not
dimming layers, and only borrowed the scrim family because no tint family
existed:

- `TabBar.svelte:106` — `--tabbar-active-surface`
- `Button.svelte:501` — the slotted badge background

**This restyles them.** They go from a 38% near-black wash to a 10% white wash:
lighter, and about a quarter the strength. Every saved theme inherits it. This is
the one change in the plan that needs eyes on a running app before it lands.

**Dialog's part follows the token.** `--dialog-overlay-surface` becomes
`--dialog-scrim-surface`, its editor label becomes "scrim color", and it reads
`var(--scrim-high)`. The part is a scrim; naming it so is consistent with parts
being named for what they are.

## Then: the hover tint

Settled earlier, and unblocked by the split.

1. **Surface only.** `-hover-text` and `-hover-border` keep swapping, so a hover
   that changes only the border stays expressible.
2. **One stop per component.** `--<id>-hover-tint` aliases one of `--tint-low`,
   `--tint`, `--tint-high`. Not per variant: per variant is the drift this
   removes. Button and IconButton carry 36 hover tokens each, TabBar 28,
   CollapsibleSection 29, SideNavigation 104, every one tuned by hand.
3. **No blend mode.** A blend mode needs a layer to blend, and its effect inverts
   silently when a theme flips light to dark. `background-blend-mode` stays
   available later as a per-component token without restructuring anything.

Two tokens per component, gated the way Card and Image already gate optional
interactions:

```css
:global(:root) {
  --button-hover-tint: var(--tint);          /* which stop, alias-editable */
  --button-hover-tint-enabled: transparent;  /* gate, off */
}
```

On, the gate holds `var(--button-hover-tint)`. One line joins each variant's
existing hover rule, layered over the `background-color` it already sets:

```css
background-image: linear-gradient(
  var(--button-hover-tint-enabled),
  var(--button-hover-tint-enabled)
);
```

No pseudo-element, so it does not collide with Button's `::before` shimmer. Off
is a transparent gradient, a no-op, so the shipped look is unchanged until
someone turns it on. The editor control is an intrinsic, which the component
editor already renders. Per instance, a tri-state prop: `undefined` inherits,
`true` and `false` force.

Scope is the six components where hover tints a solid surface and the token
count hurts: Button, IconButton, TabBar, SegmentedControl, MenuSelect,
SideNavigation. Card and CollapsibleSection have their own hover gates already.
Toggle and CodeSnippet have eight and two hover tokens, too few to pay for a
control.

## Blocker: the gate suffix is illegal

`--card-hover-border-active` and `--card-hover-shadow-active` read as state after
property, and `check-component card` errors on both today. `active` cannot leave
`STATE_TOKENS`, because `:active` is a real state that
`--button-outline-active-surface` depends on.

So the gate segment is renamed to `-enabled` before the pattern is repeated,
covering Card's two gates and Image's. Otherwise the documented gate pattern is
one a consumer cannot use without a hard error.

## Resolved: tint against swap

Shipped as B, with the switch writing aliases.

A CSS gate was tried first and is unsound: a component token is declared in
`:global(:root)`, and a custom property's `var()` is substituted **at the element
it is declared on**, not lazily where it is used. So a `:root` gate holding
`var(--_hover-surface)` resolves against `:root`, where the per-variant private
var does not exist, computes to guaranteed-invalid, and drops `background-color`
to `unset` — a black button on hover. The editor's alias derivation had already
hinted at this by silently skipping those gates, which was the signal to read
rather than explain away.

**The constraint to remember: a component token's value can only name things
defined at `:root` — theme tokens and other component tokens. Never a private
per-variant var.** So a per-variant swap cannot be gated in CSS, and the switch
writes each `-hover-surface` alias to that variant's base surface instead.
Switching off calls `clearComponentAlias`, which drops the override and returns
each surface to its `:global(:root)` default. The editor greys the hover-surface
rows while the tint owns hover.

Cost of the alias route: a hover surface the user had customized before flipping
the switch on comes back as the shipped default, not their value. Undo covers the
immediate flip.

The original weighing is kept below, since the reasoning still applies if the
gate is ever reconsidered.

## Original: tint against swap

Both paint the hover surface. With the tint on, a variant still swaps to its own
`-hover-surface` and then takes a wash on top. That is a legitimate look, but it
is not the maintenance win, because the 36 hover surfaces are still live.

Ship the stacking version first. It is the only option that cannot damage saved
theme data, and it makes the tint legible in the editor before deciding whether
it is worth gating the swap per variant, which would reintroduce the per-variant
coordination the tint exists to remove. Revisit once the look has been seen on a
real theme.

## Waves

1. **Scrim rename. DONE.** `--overlay-*` to `--scrim-*` in `tokens.css`, with a
   breaking tokens-css migration and a colors-and-type plus component-config
   migration for saved data. `slices/overlays.ts` became `slices/washes.ts`:
   a *wash* is the generic shape (an aliased color at an opacity), and scrim and
   tint are its two roles, so `OverlayToken` is `WashToken` and the state domain
   is `washes: { scrims, hoverTokens }`. `OverlaysSection.svelte` became
   `WashesSection.svelte` (section "Washes", groups "Scrims" and "Hover").
   Dialog's part token and its "backdrop color" label both became scrim. The 44
   committed data files were migrated in place, and the design-token family
   allowlist in `editorTokens.test.ts` follows the rename.
2. **Tint mint. DONE.** `--hover-*` to `--tint-*` in the slice, store, and
   section (`washes: { scrims, tints }`), with new `tokens.css` baselines that
   the stops never had. Additive to `tokens.css`, so that half auto-applies;
   paired colors-and-type and component-config migrations carry saved data. The
   editor's Hover group is now Tints. `CONTRACT_FAMILIES` in
   `bin/lib/tokenVocabulary.mjs` and the design-token allowlist in
   `editorTokens.test.ts` both moved from `overlay`/`hover` to `scrim`/`tint`.
3. **Strays. DONE.** Five, not two: TabBar's active tab, Button's slotted badge,
   and three inline-`code` backgrounds in the demo. All five washed a surface
   rather than dimming behind it. Migration rebinds the TabBar alias only when it
   still holds the shipped default. **Visual review still owed**: this is the one
   change that alters appearance, and a green suite cannot confirm it.
4. **Gate rename. DONE.** `-active` to `-enabled` on Card's two gates, and
   Image's two moved off `-hover` for the same reason. `check-component` now
   matches intrinsics on the `variable` each spec declares rather than its `key`,
   because the two need not agree, which also cleared two stale warnings.
5. **Hover tint. DONE.** Six components, their editors' intrinsics, the
   `hoverTint` tri-state prop, and `tint` plus `enabled` joining
   `KNOWN_SUFFIXES`. The gate holds `--color-transparent` rather than the bare
   keyword, so it stores as an alias like Card's gates do. Shipped with the
   **use tint** switch moving both gates, so the tint replaces the swap rather
   than stacking on it.

Waves 1 and 2 are independent and can run in either order. 3 depends on 2, 5
depends on 2 and 4.

## Files that carry the token state

`src/editor/core/themes/slices/overlays.ts`, `slices/domainVars.ts`,
`src/editor/core/store/editorTypes.ts`, `src/editor/core/store/editorStore.ts`,
`src/editor/ui/sections/OverlaysSection.svelte`, and
`src/editor/core/store/editorRenderer.test.ts`.

## Invariants

- No visual change from waves 1, 2, or 4. Only wave 3 restyles, and only two
  components.
- A theme saved before this loads after it, through the migrations, with the same
  rendered colors except the two strays.
- A *persisted editor session* loads too. The editor's own state shape is written
  whole to localStorage and shallow-merged on hydrate, so renaming a state key is
  not free the way renaming a theme-file key is: it needs a normalizer in
  `editorPersistence`, beside the ones for gradients, components, and palettes.
- `--tint` and `--scrim` stay alias-editable, as the overlay tokens are today. A
  project wanting dark tints re-aliases `--tint` rather than needing a second
  direction in the token set.
- `hover` stays a name segment, never a token. A component reads
  `var(--button-hover-tint)`, whose default is `var(--tint)`.
- `check:pages`, `check-component`, and the full suite stay green at every wave
  boundary.

## Answered: does a new component token need a migration?

No migration, but the committed presets need filling. `component-configs/<id>/default.json`
is derived at boot, and `normalizeTheme` fills a missing key on load, so saved
themes are safe. The eight shipped presets are complete documents, so each had to
gain the new aliases **in the derived key order**: `presetThemes.test.ts` compares
the ordered key list, not the set.
