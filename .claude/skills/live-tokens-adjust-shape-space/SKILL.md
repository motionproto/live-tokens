---
name: live-tokens-adjust-shape-space
description: Adjust corner radius, padding, gap, and border width across live-tokens components by moving each token alias along the shipped scales. Use when the user asks for pill or capsule buttons, rounded, rounder, sharp, sharper, square corners, softer, harder, a bigger or smaller corner radius, thicker or thinner borders, or talks about spacing and padding. Make the buttons pill shaped, give the cards sharp corners, make the windows sharper, make the UI softer, space it out, tighter, denser, more compact, airier, more breathing room. Changes shape and space aliases per component, never color, fonts, or tokens.css. Not for editing a single token (use the editor) or for color (see live-tokens-generate-theme).
---

# Adjusting shape and space

You translate the request into a small ops file; the CLI resolves each matching alias on its token ladder, writes the result into each component's unsaved buffer, and prints a report card. Never hand-edit the data tree.

## Workflow

1. Write the ops file to a temp path (not the project tree), e.g. `/tmp/adjust-ops.json`.
2. Run `npx live-tokens adjust /tmp/adjust-ops.json`. It writes `component-configs/<id>/_working.json` for every component the ops change, which is the buffer the page already runs. `--dry-run` prints the report without writing.
3. Read the report card: every changed alias old → new, plus skips (raw value, off the ladder, already at the ladder end, pill preserved). Exit 1 means the run was rejected; the message names the offending op or the missing input, so fix it and re-run.
4. Tell the user to reload the app and look. Offer the inverse op as the undo, and say the edit is unsaved until they save the open theme.

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
- `target` (optional): a component id (the folder names under `src/live-tokens/data/component-configs/`). A named component targets its id: "windows" or "modals" is `dialog`, "cards" is `card`, "tabs" is `tabbar`; an unknown target is a hard error. "The UI", "everything", or no noun at all means global, so omit it.
- `kind`: `radius | padding | gap | border-width`.
- `set` or `shift`, exactly one of the two. `set` takes an existing token on that kind's ladder. `shift` is a whole number of steps, clamped at the ladder ends.
- `full` (radius shifts only): admits `--radius-full` as the ladder's top rung. `set` plus `full` is an error, so a pill request is `set: "--radius-full"` with no `full` flag.

## Idioms

| Request | Ops |
|---|---|
| pill, capsule | radius `set: "--radius-full"` |
| sharp, square corners | radius `set: "--radius-none"`, or `--radius-sm` for "mostly sharp" |
| rounded (a named component) | radius `shift: 2` |
| softer, rounder (global) | radius `shift: 1` to `2`, no `full` |
| harder, sharper | radius `shift: -1` to `-2` |
| increase the radius, less round, more round | radius `shift: 1` or `-1` with `"full": true`, so repeated pushes reach pill and a pill can come back down |
| space it out, airier, breathing room | padding and gap `shift: 1` |
| tighter, denser, more compact | padding and gap `shift: -1` |
| thicker, thinner borders | border-width `shift: 1` or `-1` |

Magnitude words: "slightly" or "a bit" is 1 step, unqualified is 1 to 2, "much", "way", or "really" is 2 to 3. Mood words often mean both axes: "softer" is rounder plus airier, "compact" is tighter padding plus smaller gaps.

## Ladders

Radius runs `none, sm, md, lg, xl, 2xl, 3xl, 4xl`, with `full` as the gated ninth rung. Space (padding and gap) is the editor picker's subset: `0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48`, so every written value stays re-editable by hand. Border width is the full `--border-width-*` scale. `set` values must be on the ladder (`--space-64` is rejected).

Content insets stop at `--space-4`. Below it the text sits against its own edge, so `--space-0` and `--space-2` are destinations a person picks on purpose, not ones a relative "tighter" hands you. Both stay available through the editor picker and through `set`. An alias already below the floor still moves up, and a shift that would push one under `--space-4` reports as clamped and writes nothing.

The floor guards `-padding` only. Outer space is exempt, because a 2px gap between an icon and its label, or a 2px margin under a bar, is ordinary design rather than a mistake. Note that `-margin` rides the `padding` kind, so a padding op moves margins too; it just does not floor them.

An alias sitting off the subset spends its first step reaching the rung the shift points at, so `--space-2` with `shift: 1` lands on `--space-4` rather than jumping past it.

## Scope

Every value written is an existing token; nothing new is minted. `tokens.css`, saved themes, colors, and fonts are never touched, so any theme composes with any shape state. An adjustment is an unsaved edit: Save the open theme in the editor to keep it, and Adopt to ship it. Both stay human actions.

## Verify

- The CLI exits 0 and the report card lists the changes you expected, with no surprising skips.
- The app (dev server running) shows the new shape on each changed component after a reload.
- `component-configs/<id>/_working.json` exists for every component the report listed. That buffer is the whole change: it stays until the open theme is saved or another theme is loaded.
- To revert, run the inverse ops, or load a theme in the Theme panel to discard every unsaved edit.
