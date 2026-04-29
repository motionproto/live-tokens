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

**Rule: a bare one-word token belongs to *some* category.** If you find yourself writing `--overlay` or `--border`, make sure the category is obvious and it's the canonical default — otherwise pick a longer name that slots it into its family (e.g. `--border-neutral`).

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
| `-thickness`   | Alternative stroke dimension (used where `-width` would alias another token under name-based fallback grouping) |
| `-height`      | Explicit height when `-width`'s sibling would collide under name-based fallback grouping |
| `-color`       | Generic color when none of the role words fits (rare)        |

**Why `thickness` and `height` are sometimes used instead of `width`:** when an editor declares no explicit `groupKey` for a token, sibling grouping falls back to matching the final `-<property>` segment. If two unrelated slots both end in `-width` and neither has a `groupKey`, they get auto-grouped. Either declare a `groupKey` per token in the editor (preferred) or use an alternative property word. The divider in SegmentedControl uses `--segmentedcontrol-divider-thickness` for legacy parity with the fallback rule, but it now also has `groupKey: 'divider-thickness'` declared in the editor — the `groupKey` is the source of truth.

### State order matters

State comes **before** the property, not after:

```
--inlineeditactions-save-hover-surface    ✓  state before property; siblings on `-surface`
--inlineeditactions-save-surface-hover    ✗  breaks sibling matching and reads oddly
```

### Shareable siblings (the link toggle)

Tokens that share a `groupKey` form a **sibling set**. A property declared `canBeShared: true` in the editor shows a link toggle that lets the user broadcast one value across every sibling. So in SegmentedControl:

- `--segmentedcontrol-bar-border-width` and `--segmentedcontrol-selected-border-width` share `groupKey: 'border-width'`.
- `--segmentedcontrol-option-text-font-weight`, `--segmentedcontrol-option-disabled-text-font-weight`, `--segmentedcontrol-selected-text-font-weight` share `groupKey: 'font-weight'`.

Editor authors declare `groupKey` per token in the editor's token list (and call `registerComponentSchema(component, tokens)` once at module load). The store consults the schema first; for unmigrated editors with no schema entry, it falls back to matching the last `-<property>` segment. Tokens with neither a `groupKey` nor a colliding name suffix are solo.

The `unlinked` array on a `ComponentSlice` stores the `groupKey` strings that have been explicitly unlinked by the user.

### When the last-dash fallback surprises you

For tokens without an explicit `groupKey`, the store derives one by splitting on the last dash:

- `--segmentedcontrol-option-text-font-weight` → fallback groupKey `weight`.

So the fallback property is always the literal last segment. If you don't want a token to participate in the fallback grouping, declare an explicit `groupKey` (or omit `canBeShared`).

## Checklist for adding a new component token

1. Does the value belong at the **theme layer**? (It's a color/scale that multiple components could reuse.) → Add it to `tokens.css` under the correct category, not here.
2. Pick a **componentId** matching the one used in `component-configs/` and the editor's `const component = '...'` literal.
3. Build the name as `--<componentId>-<part>[-<state>]-<property>`.
4. Use **full words**: no `bg`, no shortened component IDs.
5. Declare the slot in both the component's Svelte `<style>` (`--tok: var(--theme-alias);`) and the config JSON (`"--tok": "--theme-alias"`).
6. If the slot should link across variants, add `canBeShared: true` and `groupKey: '<your-key>'` in the editor's token list — siblings are tokens that share the same `groupKey`. Pick a `groupKey` that names the kind of property (`radius`, `border-width`, `font-weight`, `font-family`, etc.); a unique key isolates a token from any other.
7. Make sure the editor calls `registerComponentSchema(component, tokens)` once at module load so the store sees the explicit groupKeys.

## What's still pending

- **`primary` → `brand` rename** — disambiguates the emphasis-tier, color-family, and component-variant uses of "primary". Tracked in `temp/primary-to-brand-rename.md`.
- **Theme-layer cleanups** tracked in `temp/theme-token-improvements.md` (font-weight scale normalization, bare-word orphan audit, full `bg` → `canvas` sweep).
