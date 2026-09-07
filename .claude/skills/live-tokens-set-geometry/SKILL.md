---
name: live-tokens-set-geometry
description: Set a live-tokens theme's geometry: corner radius, padding, gap, and border width. Each moves per component along its shipped scale. Called with an anchor and a geometry intent by live-tokens-create-theme, or with the user's request directly. Use when the user asks for pill or capsule buttons. Use when the user asks for rounded, sharp, square, softer, or harder corners. Use when the user asks for thicker or thinner borders. Use when the user asks for density: space it out, tighter, denser, airier. Changes geometry only. For a request that also names color or type, read live-tokens-create-theme.
---

# Setting a theme's geometry

Write the request as an ops file. The CLI moves each matching alias along its scale, writes the result to each component's buffer, and prints a report. Never hand-edit the data tree.

The result is on screen as soon as the run finishes. The three set skills write the same buffer, so color, type, and geometry compose in any order. When the user accepts the result, run `save-theme` to keep it as a theme. Loading a theme in the editor discards it.

## Workflow

1. Read the geometry intent and the anchor, when live-tokens-create-theme passed one. When the intent or the anchor names a feeling, an idiom, or a genre, read its entry in `references/geometry-anchors.md`.
2. Write the ops file to `scratch/geometry-ops.json`.
3. Run `npx live-tokens set-geometry scratch/geometry-ops.json`. It writes `component-configs/<id>/_working.json` for every component the ops change.
4. Read the report. It lists every changed alias, old and new, and every skip with its reason.
5. When the CLI exits 1, fix the op or the input the message names, then re-run.
6. Reply with every alias that moved and any skip or clamp worth naming.

`--dry-run` prints the report without writing.

Each run reads the live config, so "a bit more" and "back one" compound. The live config is the buffer, else the open theme, else the shipped default.

## The ops file

Global, relative:

```json
{ "ops": [{ "kind": "radius", "shift": 1 }, { "kind": "padding", "shift": 1 }, { "kind": "gap", "shift": 1 }] }
```

Targeted, absolute:

```json
{ "ops": [{ "target": "button", "kind": "radius", "set": "--radius-full" }] }
```

- `target` (optional): a component id, one of the folder names under `src/live-tokens/data/component-configs/`. "Windows" or "modals" is `dialog`, "cards" is `card`, "tabs" is `tabbar`. "The UI", "everything", or no noun means global, so omit `target`.
- `kind`: `radius | padding | gap | border-width`.
- `set` or `shift`, one of the two. `set` takes a token on that kind's scale. `shift` is a whole number of steps, clamped at the ends of the scale.
- `full` (radius shifts only): admits `--radius-full` as the top of the scale. A pill request is `set: "--radius-full"` with no `full` flag.

## Idioms

The table covers an intent that names no anchor. An anchor's entry in `references/geometry-anchors.md` overrides the table.

| The intent says | Ops |
|---|---|
| pill, capsule | radius `set: "--radius-full"`, plus the padding the pill needs (see Compact containers before controls) |
| sharp, square corners | radius `set: "--radius-none"`, or `--radius-sm` for "mostly sharp" |
| rounded (a named component) | radius `shift: 2` |
| softer, rounder (global) | radius `shift: 1` to `2`, no `full` |
| harder, sharper | radius `shift: -1` to `-2` |
| increase the radius, less round, more round | radius `shift: 1` or `-1` with `"full": true` |
| space it out, airier, breathing room | padding and gap `shift: 1` |
| tighter, denser, more compact | padding and gap `shift: -1` |
| thicker, thinner borders | border-width `shift: 1` or `-1` |

A theme intent names a direction.

| The direction is | Geometry |
|---|---|
| playful, friendly, soft | rounder and a step airier. Warm adds pill buttons. |
| luxurious, elegant, editorial | sharper corners, airier padding, thin borders |
| technical, dense, systematic | tighter spacing, a small radius, square corners on containers |
| calm, minimal | unchanged |

Magnitude follows the qualifier. "Slightly" or "a bit" is 1 step. No qualifier is 1 to 2 steps. "Much", "way", or "really" is 2 to 3 steps. A mood word often means both axes: "softer" is rounder plus airier, "compact" is tighter padding plus smaller gaps.

## Compact containers before controls

A global op spends the same number of steps everywhere, but a step costs a control more than a container. `padding shift: -2` takes a card from a 16px inset to 10px and it is still a card. The same op takes a button from 8px to 4px, which the button doubles to 8px at each end, around an 18px line. The button stops reading as a button.

So a global compaction is `shift: -1`. When the request wants more, spend the extra steps on the containers by name and leave the controls alone. The containers are:

- `card`
- `dialog`
- `panel`
- `collapsiblesection`
- `sidenavigation`
- `table`
- `codesnippet`

Airier is safe globally, because nothing breaks by growing.

A pill needs the most room. `--radius-full` bends the corner in over the first and last glyph, so a capsule wants more horizontal inset than a square-cornered control. `--space-8` is the floor for a large-text pill. Compact Midnight Study sits there. The roomier pill presets, Ocean, Sunset, and Royal Velvet, run `--space-10` to `--space-12`. Pair the radius op with a padding `set` on the same target. In the ops list, place the padding `set` after any global padding shift. The later op wins:

```json
{ "ops": [
  { "kind": "padding", "shift": -1 },
  { "target": "button", "kind": "radius", "set": "--radius-full" },
  { "target": "button", "kind": "padding", "set": "--space-10" }
] }
```

## Scales

Radius runs `none, sm, md, lg, xl, 2xl, 3xl, 4xl`, with `full` as the gated ninth step. Space (padding and gap) is the editor picker's subset, `0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48`, so the editor can select every value the CLI writes. Border width is the full `--border-width-*` scale.

An alias off the subset spends its first step reaching the subset, so `--space-2` with `shift: 1` lands on `--space-4`.

## Floors

Content insets stop at `--space-4`. Below `--space-4` the text sits against its own edge, so `--space-0` and `--space-2` are values a person picks on purpose, through the editor picker or `set`. An alias below the floor still moves up. A shift that would push one under `--space-4` reports as clamped and writes nothing.

Padding around a line of type stops at `--space-6`. A variant that declares a `-text-font-size` holds text. A component that holds text doubles its padding horizontally, so `--space-4` there is 4px over an 18px line and 8px at each end. No shipped default puts text below `--space-6`.

The floor guards `-padding` only. A 2px gap between an icon and its label, or a 2px margin under a bar, is ordinary design. `-margin` belongs to the `padding` kind, so a padding op moves margins too, without the floor.

## Scope

Geometry only. Color, type, saved themes, and `tokens.css` are untouched: `set-geometry` writes existing tokens into each component's buffer and creates no new ones. `save-theme` keeps the result; Adopt ships it.

## Verify

- The CLI exits 0 and the report lists the expected changes, with no unexpected skips.
- The app shows the new shape on each changed component.
- Buttons still read as buttons: the label has room at both ends, and a pill has more than a square-cornered control. A control whose padding sits at `--space-6` is on its floor. A control that also carries `--radius-full` needs a targeted lift.
- `component-configs/<id>/_working.json` exists for every component the report listed.
- To revert, run the inverse ops, or load the open theme to discard the buffer.
