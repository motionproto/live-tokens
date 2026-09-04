---
name: live-tokens-set-geometry
description: Adjust corner radius, padding, gap, and border width across live-tokens components by moving each token alias along the shipped scales. Use when the user asks for pill or capsule buttons; rounded, rounder, sharp, sharper, square, softer, or harder corners; thicker or thinner borders; or density: space it out, tighter, denser, more compact, airier, more breathing room. Also invoked by live-tokens-create-theme, which supplies the geometry intent for a whole look. Changes shape and space aliases per component, never color, fonts, or tokens.css. Not for editing a single token (use the editor) or for a whole look (see live-tokens-create-theme).
---

# Adjusting geometry

You translate the request into a small ops file; the CLI resolves each matching alias on its token ladder, writes the result into each component's unsaved buffer, and prints a report card. Never hand-edit the data tree.

## Workflow

1. Read the geometry intent. When it names an anchor (a feeling, an idiom, or a genre), read `references/geometry-anchors.md` for that entry; it overrides the Idioms table below. Write the ops file to `scratch/geometry-ops.json`.
2. Run `npx live-tokens set-geometry scratch/geometry-ops.json`. It writes `component-configs/<id>/_working.json` for every component the ops change, which is the buffer the page already runs. `--dry-run` prints the report without writing.
3. Read the report card: every changed alias old → new, plus skips (raw value, off the ladder, already at the ladder end, pill preserved). Exit 1 means the run was rejected; the message names the offending op or the missing input, so fix it and re-run. Read where the controls landed, not only that the run succeeded: a button, badge, input, or tab padding sitting at `--space-6` is on its floor, and one that also carries `--radius-full` wants a targeted lift.
4. Report back in a line: every alias that moved, and any skip or clamp worth naming.
5. Offer the inverse op as the undo and say the edit is unsaved until they save the open theme.

Each run reads the LIVE config (buffer, else the open theme, else the shipped default), so "a bit more" and "back one" compound naturally.

## The ops file

Global, relative:

```json
{ "ops": [{ "kind": "radius", "shift": 1 }, { "kind": "padding", "shift": 1 }, { "kind": "gap", "shift": 1 }] }
```

Targeted, absolute:

```json
{ "ops": [{ "target": "button", "kind": "radius", "set": "--radius-full" }] }
```

- `name`: ignored. Buffers are fixed slots, so a name names no file, and the CLI says it dropped one. Leave it out.
- `target` (optional): a component id (the folder names under `src/live-tokens/data/component-configs/`, which the Catalogue in **live-tokens-pick-component** also names in full). A named component targets its id: "windows" or "modals" is `dialog`, "cards" is `card`, "tabs" is `tabbar`; an unknown target is a hard error. "The UI", "everything", or no noun at all means global, so omit it.
- `kind`: `radius | padding | gap | border-width`.
- `set` or `shift`, exactly one of the two. `set` takes an existing token on that kind's ladder. `shift` is a whole number of steps, clamped at the ladder ends.
- `full` (radius shifts only): admits `--radius-full` as the ladder's top rung. `set` plus `full` is an error, so a pill request is `set: "--radius-full"` with no `full` flag.

## Idioms

This table covers an intent that names no anchor. When the intent names one, `references/geometry-anchors.md` has the row and it wins.

| The intent says | Ops |
|---|---|
| pill, capsule | radius `set: "--radius-full"`, plus the padding the pill needs (see below) |
| sharp, square corners | radius `set: "--radius-none"`, or `--radius-sm` for "mostly sharp" |
| rounded (a named component) | radius `shift: 2` |
| softer, rounder (global) | radius `shift: 1` to `2`, no `full` |
| harder, sharper | radius `shift: -1` to `-2` |
| increase the radius, less round, more round | radius `shift: 1` or `-1` with `"full": true`, so repeated pushes reach pill and a pill can come back down |
| space it out, airier, breathing room | padding and gap `shift: 1` |
| tighter, denser, more compact | padding and gap `shift: -1` |
| thicker, thinner borders | border-width `shift: 1` or `-1` |

A whole-look intent often arrives as a direction rather than an op. Playful, friendly, or soft is rounder and a step airier, with pill buttons when the direction is warm. Luxurious, elegant, or editorial is sharper corners, airier padding, thin borders. Technical, dense, or systematic is tighter spacing, a small radius, and square corners on containers. Calm or minimal leaves geometry alone.

Magnitude words: "slightly" or "a bit" is 1 step, unqualified is 1 to 2, "much", "way", or "really" is 2 to 3. Mood words often mean both axes: "softer" is rounder plus airier, "compact" is tighter padding plus smaller gaps.

## Controls squeeze before containers

A global op spends the same number of steps everywhere, but a step costs a control far more than a container. `padding shift: -2` takes a card from a 16px inset to 10px and it is still a card. It takes a button from 8 to 4, doubled to 8px at each end, around an 18px line. The button stops reading as a button.

So a global compaction is `shift: -1`. When the request wants more, spend the extra steps on the containers by name (`card`, `dialog`, `panel`, `collapsiblesection`, `sidenavigation`, `table`, `codesnippet`) and leave the controls alone. Loosening is not symmetric: airier is safe globally, because nothing breaks by growing.

A pill needs the room most. `--radius-full` bends the corner in over the first and last glyph, so a capsule wants more horizontal inset than a square-cornered control, never less. `--space-8` is the floor for a large-text pill, which is where compact Midnight Study sits; the roomier pill presets (Ocean, Sunset, Royal Velvet) run `--space-10` to `--space-12`. Pair the radius op with a padding `set` on the same target, placed after any global compaction so it wins outright:

```json
{ "ops": [
  { "kind": "padding", "shift": -1 },
  { "target": "button", "kind": "radius", "set": "--radius-full" },
  { "target": "button", "kind": "padding", "set": "--space-10" }
] }
```

## Ladders

Radius runs `none, sm, md, lg, xl, 2xl, 3xl, 4xl`, with `full` as the gated ninth rung. Space (padding and gap) is the editor picker's subset: `0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48`, so every written value stays re-editable by hand. Border width is the full `--border-width-*` scale. `set` values must be on the ladder (`--space-64` is rejected).

Content insets stop at `--space-4`. Below it the text sits against its own edge, so `--space-0` and `--space-2` are destinations a person picks on purpose, not ones a relative "tighter" hands you. Both stay available through the editor picker and through `set`. An alias already below the floor still moves up, and a shift that would push one under `--space-4` reports as clamped and writes nothing.

Padding that wraps a line of type stops a rung higher, at `--space-6`. The engine spots it in the config itself: a variant that also declares a `-text-font-size` is holding text, and the components that hold text double their padding horizontally, so `--space-4` there is 4px over an 18px line and 8px at each end. No shipped default puts text below `--space-6`.

The floor guards `-padding` only. Outer space is exempt, because a 2px gap between an icon and its label, or a 2px margin under a bar, is ordinary design rather than a mistake. Note that `-margin` rides the `padding` kind, so a padding op moves margins too; it just does not floor them.

An alias sitting off the subset spends its first step reaching the rung the shift points at, so `--space-2` with `shift: 1` lands on `--space-4` rather than jumping past it.

## Scope

Every value written is an existing token; nothing new is minted. `tokens.css`, saved themes, colors, and fonts are never touched, so any theme composes with any shape state. An adjustment is an unsaved edit: Save the open theme in the editor to keep it, and Adopt to ship it. Both stay human actions.

## Verify

- The CLI exits 0 and the report card lists the changes you expected, with no surprising skips.
- The app (dev server running) shows the new shape on each changed component.
- Buttons still read as buttons: the label has room at both ends, and a pill has more of it than a square-cornered control had.
- `component-configs/<id>/_working.json` exists for every component the report listed. That buffer is the whole change: it stays until the open theme is saved or another theme is loaded.
- To revert, run the inverse ops, or load a theme in the Theme panel to discard every unsaved edit.
