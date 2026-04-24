# Token naming conventions

This project uses a **two-layer token system**. Read this before adding or renaming a CSS custom property.

## Layer 1 — theme tokens (`tokens.css`)

Theme tokens are the design system's vocabulary. They describe colors, sizes, spacing, shadows, motion — the things a designer reasons about independent of any one component. They're consumed by components and recolored/re-scaled by themes in `themes/*.json`.

### Category-first naming

Every theme token starts with a **category prefix**. The category tells you what *kind* of value lives at that key:

| Category       | What it holds                                                   |
|----------------|-----------------------------------------------------------------|
| `--color-*`    | Primitive color palette (e.g. `--color-accent-500`)             |
| `--surface-*`  | Fill/background colors, with elevation tiers                    |
| `--border-*`   | Border colors, with emphasis tiers                              |
| `--text-*`     | Text colors, with hierarchy tiers                               |
| `--font-*`     | Font families and weights                                       |
| `--font-size-*`| Font sizes (explicit subcategory to avoid colliding with families) |
| `--space-*`    | Spacing scale, values encoded in the name (`--space-8` = 8px)   |
| `--radius-*`   | Border radii (t-shirt scale)                                    |
| `--shadow-*`   | Elevation shadows                                               |
| `--ring-*`     | Focus rings (separate namespace from shadows)                   |
| `--border-width-*` | Stroke widths                                               |
| `--transition-*`, `--opacity-*`, `--z-*` | Animation, opacity, z-index scales    |
| `--overlay-*`, `--hover-*` | Semantic overlay tints                                |
| `--gradient-*` | Named gradients                                                 |
| `--columns-*`, `--page-*` | Page-level layout primitives                         |

**Rule: a bare one-word token belongs to *some* category.** If you find yourself writing `--overlay` or `--border`, make sure the category is obvious and it's the canonical default — otherwise pick a longer name that slots it into its family (e.g. `--border-neutral-default`).

### Families within a category

Color categories (`--surface-*`, `--border-*`, `--text-*`) partition into **families**: `neutral`, `canvas`, `primary` (*→ brand, rename pending*), `accent`, `success`, `warning`, `danger`, `info`, `special`, `alternate`. Each family carries its own emphasis/elevation scale suited to its role (7-step elevation for surfaces, 4-step emphasis for borders, 5-step hierarchy for text — they differ on purpose).

### Scales

Two shapes appear:

- **T-shirt scale** (`-xs / -sm / -md / -lg / -xl / -2xl …`) — `--radius-*`, `--font-size-*`, `--shadow-*`, `--ring-focus-*`.
- **Numeric scale** — `--color-*-100` through `--color-*-950` for palettes; `--space-4 / -8 / -16 / …` (value encoded in the name).

Don't invent a third scale shape for a new category.

## Layer 2 — component tokens (`component-configs/*/default.json` + component Svelte files)

Component tokens *reference* theme tokens. They're how a component names its own slots: "my bar's surface color", "my selected option's border width". The config file records which theme alias is currently assigned to each slot.

### The naming scheme

```
--<componentId>-<part>[-<state>][-<element>]-<property>
```

- **`componentId`** — the literal component ID. No abbreviations. The ID itself has no dashes (it's the file-system-safe form: `segmentedcontrol`, not `segmented-control`).
- **`part`** — which part of the component this slot belongs to: `bar`, `divider`, `option`, `selected`, `track`, `save`, `cancel`, etc.
- **`state`** — optional; the interaction state if more than default: `hover`, `disabled`, `active`, `focus`. States come **before** the property, never after.
- **`element`** — optional; a sub-element within the part, e.g. `dot`, `icon`, `label`, `text`.
- **`property`** — always last. Either a **theme role** (`surface`, `border`, `text`, `icon`, `label`, `fill`) or a **CSS property name** (`radius`, `border-width`, `font-weight`, `font-family`, `font-size`).

### No abbreviations

- `bg` → `surface` (matches the theme role name and the theme layer's full-word vocabulary).
- `fg` → `text`.
- Component IDs are never abbreviated — `--segmentedcontrol-*`, not `--segment-*` or `--sc-*`.

### Property suffix vocabulary

| Suffix         | Meaning                                                      |
|----------------|--------------------------------------------------------------|
| `-surface`     | Fill/background color                                        |
| `-border`      | Border color                                                 |
| `-text`        | Text color                                                   |
| `-icon`        | Icon color                                                   |
| `-label`       | Label text color                                             |
| `-fill`        | Inner fill (distinct from outer surface)                     |
| `-radius`      | Corner radius                                                |
| `-border-width`| Stroke thickness                                             |
| `-font-family` | Font family reference                                        |
| `-font-weight` | Font weight reference                                        |
| `-font-size`   | Font size reference                                          |
| `-thickness`   | Alternative stroke dimension (used where `-width` would alias another token — e.g. divider thickness vs border width) |
| `-height`      | Explicit height when `-width`'s sibling would collide        |
| `-color`       | Generic color when none of the role words fits (rare)        |

**Why `thickness` and `height` are sometimes used instead of `width`:** sibling grouping is derived from the final `-<property>` segment (see below). If two unrelated slots both end in `-width`, they get auto-grouped as link candidates. Use an alternative property word when the generic term would create a false sibling. The divider in SegmentedControl is the canonical example: `--segmentedcontrol-divider-thickness` (not `-width`) prevents it from linking with `--segmentedcontrol-bar-border-width`.

### State order matters

State comes **before** the property, not after:

```
--inlineeditactions-save-hover-surface    ✓  state before property; siblings on `-surface`
--inlineeditactions-save-surface-hover    ✗  breaks sibling matching and reads oddly
```

### Shareable siblings (the link toggle)

The editor groups tokens whose names end with the same last `-<property>` segment into **sibling sets**. A property declared `canBeShared: true` in the editor shows a link toggle that lets the user broadcast one value across every sibling. So:

- `--segmentedcontrol-bar-border-width` and `--segmentedcontrol-selected-border-width` share on `-width`.
- `--segmentedcontrol-option-text-font-weight`, `--segmentedcontrol-option-disabled-text-font-weight`, `--segmentedcontrol-selected-text-font-weight` share on `-weight`.

Sibling matching is purely name-derived — there is no explicit `groupKey` yet. **If two unrelated tokens happen to end in the same `-<property>`, they will be treated as siblings.** Either rename one (see `thickness` vs `width` above) or accept the grouping.

### When the last-dash rule surprises you

`parseComponentVar` splits on the *last* dash:

- `--segmentedcontrol-option-text-font-weight` → variant `option-text-font`, property `weight`.

So the property is always the literal last segment. Compound "properties" like `border-width` or `font-family` work because the second-to-last segment is the disambiguator ("border", "font"), and the siblings still match on the exact last segment (`-width`, `-family`).

## Checklist for adding a new component token

1. Does the value belong at the **theme layer**? (It's a color/scale that multiple components could reuse.) → Add it to `tokens.css` under the correct category, not here.
2. Pick a **componentId** matching the one used in `component-configs/` and the editor's `const component = '...'` literal.
3. Build the name as `--<componentId>-<part>[-<state>]-<property>`.
4. Use **full words**: no `bg`, no shortened component IDs.
5. Check the `-<property>` suffix doesn't collide with an unrelated slot in the same component. If it would, reach for `thickness` / `height` / a different role word.
6. Declare the slot in both the component's Svelte `<style>` (`--tok: var(--theme-alias);`) and the config JSON (`"--tok": "--theme-alias"`).
7. If the slot should link across variants, add `canBeShared: true` in the editor's token list — the grouping is automatic via the suffix.

## What's still pending

- **`groupKey` on tokens** — replaces the last-dash sibling parser with an explicit field. Removes the need for `thickness`-style workarounds.
- **`primary` → `brand` rename** — disambiguates the emphasis-tier, color-family, and component-variant uses of "primary". Tracked in `temp/primary-to-brand-rename.md`.
- **Theme-layer cleanups** tracked in `temp/theme-token-improvements.md` (font-weight scale normalization, bare-word orphan audit, full `bg` → `canvas` sweep).
