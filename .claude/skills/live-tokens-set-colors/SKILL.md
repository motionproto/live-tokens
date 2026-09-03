---
name: live-tokens-set-colors
description: Set a live-tokens theme's color from a color intent: ten OKLCH base colors, a light or dark scheme, and an AA-gated contrast pass, written into the unsaved color buffer the app already renders. Use whenever the user asks for a palette, colors, or hues by mood, style, era, season, holiday, or hue; when they name only a color; or when they refine the color of a look: warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast. Also invoked by live-tokens-create-theme, which supplies the color intent for a whole look. Changes color only, never fonts or geometry. Not for a single token (use the editor), and not for a whole look (see live-tokens-create-theme).
---

# Setting a theme's colors

You choose ten base colors; the CLI builds every ramp from them, enforces AA
contrast on the derived text tokens, writes the result into the unsaved colors
buffer the app already renders, and prints a contrast report. Never hand-author
theme JSON and never edit the data tree directly.

The run replaces the color state in that buffer and carries everything else
forward, so it composes with type and geometry in any order. Saving the open
theme in the editor, or running `save-theme`, turns the live look into a theme.

## Workflow

1. Read the color intent. When it names an anchor (a feeling, an idiom, or an occasion), read `references/color-anchors.md` for that entry; it overrides the generic bands below. Say which anchor you took.
2. Translate the intent into ten base colors using the framework below and write `scratch/<slug>-base-colors.json`. Nothing else records the base colors, so this file is the only copy; one per slug is what makes the refinement pass cheap.
3. Run `npx live-tokens set-colors scratch/<slug>-base-colors.json`. It writes the color state into the unsaved buffer the page already runs, and prints a contrast report.
4. Read the report. Exit 0 passes, and auto-corrected values count as passing. Exit 1 means the base colors are unworkable; each failure line names the base color to change, usually by raising its lightness or cutting its chroma. Fix the base color file and re-run.
5. Report back in a line: the scheme, the hue families on screen, the canvas commitment level, and anything the report auto-corrected.

Flags: `--dry-run` prints the contrast report without writing.

## The base color file

```json
{
  "scheme": "light",
  "baseColors": {
    "Brand":     { "l": 0.62, "c": 0.17, "h": 145 },
    "Accent":    { "l": 0.80, "c": 0.15, "h": 95 },
    "Special":   { "l": 0.60, "c": 0.19, "h": 300 },
    "Canvas":    { "l": 0.93, "c": 0.04, "h": 120 },
    "Neutral":   { "l": 0.55, "c": 0.012, "h": 140 },
    "Alternate": { "l": 0.58, "c": 0.009, "h": 60 },
    "Info":      { "l": 0.60, "c": 0.15, "h": 255 },
    "Success":   { "l": 0.60, "c": 0.16, "h": 150 },
    "Warning":   { "l": 0.75, "c": 0.15, "h": 85 },
    "Danger":    { "l": 0.58, "c": 0.20, "h": 25 }
  }
}
```

A base color is the one color a palette's whole ramp derives from. All 10 are required, and each may be given as a `"#rrggbb"` string instead. OKLCH: `l` is 0 to 1 lightness, `c` is chroma (0 grey, about 0.37 max), `h` is hue in degrees. The file names no theme: the slug in its own path is the theme name live-tokens-create-theme intends, or any label when this skill runs alone. `canvasGradient` is an optional boolean, see below.

Roles: **Brand** is the dominant chromatic identity; **Accent** the supporting color; **Special** the rare expressive tertiary; **Canvas** is the page background verbatim; **Neutral** drives neutral surfaces and body text; **Alternate** is the second near-grey family; the four statuses are conventional signals.

## Chroma budget: color is inversely proportional to area

| Tier | Palettes | Chroma |
|---|---|---|
| Ground (about 60% of every screen) | Neutral, Alternate | C 0.008 to 0.02 |
| Canvas (the largest single area) | Canvas | Per the commitment levels below, C 0.02 to 0.14 |
| Dominant chromatic (about 30%) | Brand | C 0.10 to 0.20 |
| Garnish (about 10%) | Accent, Special | may exceed Brand; at most one at the gamut cap for its hue (see Gamut guardrails) |
| Conditional | Info, Success, Warning, Danger | C 0.12 to 0.19 |

A good theme reads as 3 or 4 hue families on screen, never 10. Neutral and Alternate stay near-grey but tinted toward the theme (Neutral near Brand's hue; Alternate offset 15 to 60 degrees, or a warm/cool counterpoint), never pure C = 0 unless an anchor calls for it.

## Per-role bands

| Base color | Light scheme | Dark scheme | Hue |
|---|---|---|---|
| Canvas | L 0.92 to 0.98, C 0.02 to 0.06 | L 0.15 to 0.28, C 0.01 to 0.05 | Brand's hue or its harmony slot |
| Neutral, Alternate | L about 0.55, C 0.008 to 0.02 | same | per the chroma budget |
| Brand | L 0.45 to 0.62, C 0.12 to 0.20 | L 0.70 to 0.83, C cut by a third | the request's identity hue |
| Accent | harmony slot, or at least 0.25 L from Brand when the mode collapses hue distance | lighten and desaturate like Brand | harmony slot |
| Special | most expressive; default Brand hue +60 at about 65% of Brand's C | same transform | harmony slot |
| Info | shared status L (0.55 to 0.65 light) | lighten like Brand | H 230 to 260 |
| Success | shared status L | same | H 140 to 155 |
| Warning | L 0.75 or higher (vivid yellow must be light) | same | H 70 to 90 |
| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to 30 |

**The canvas carries the theme's identity, so commit to it.** The page background is the largest area on screen and the strongest difference between themes; a timid canvas makes every theme look the same. Below C 0.015 at L 0.95 a tint is imperceptible, which makes near-white a deliberate choice for clean or minimal intents and never the default. Three levels of commitment:

1. *Tinted paper* (most UI intents): C 0.02 to 0.06, with L down to 0.92 where the hue needs room.
2. *Colored ground* (expressive intents): L 0.85 to 0.92 at C 0.05 to 0.10. The page is unmistakably mint, parchment, sky.
3. *Full-color ground* (holiday and statement intents): the canvas is the theme color, like a red Christmas page with green and gold on it. Keep canvas L at or below 0.48 or at or above 0.85 so text has somewhere to go; the contrast gate enforces legibility either way.

Also:

- Blue tints cap very low at high L (H 264 at L 0.95 barely reaches C 0.03): lower L for a blue canvas rather than fighting the ceiling. Yellow, green, and cream tint generously at high L.
- When generating a set of themes, make the canvases pairwise distinct in hue or in L. Two light themes both near (0.97, 0.01) read as one theme with different buttons.
- A dark scheme transforms every base color: each chromatic one lightens to L 0.75 to 0.85 and drops about a third of its chroma, because saturated color vibrates on dark grounds.
- Equal lightness reads as equal weight: give the four statuses one shared L, and do the same for Brand and Accent when they should balance.
- Status hues never rotate with the harmony; only their L and C adapt to the mood.

## Mood dials

Pleasantness rises with lightness (strongly) and saturation (weakly); energy rises with saturation; drama rises with dark plus saturated. Dominance, the third axis, is carried by surface contrast, type weight, and tightness rather than by color at all.

That is the whole mechanism, and one dial moves without a reference: warm is hues 20 to 110 plus pink 290 to 360, cool is 140 to 290. For an intent that names a feeling, read `references/color-anchors.md` instead of guessing the dial settings.

Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0.7, C about 0.1) unless the intent asks for olive or toxic.

## Gamut guardrails

The engine clamps to gamut regardless; these keep the intent achievable.

- Dark saturated yellow does not exist: H 90 at L 0.4 caps at C 0.08 and reads olive. Vivid yellow needs L 0.8 or more. Brown is dark low-chroma orange.
- Vivid light blue does not exist: H 264 at L 0.9 caps at C 0.05. Rich blue lives at L 0.40 to 0.55.
- Teal and sky cap at C 0.15.
- Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C 0.18 at L 0.76; yellow H90 C 0.18 at L 0.86; green H140 C 0.28 at L 0.88; blue H264 C 0.28 at L 0.50; magenta H320 C 0.31 at L 0.65.

## Harmony

Hue offsets from Brand: complementary +180; split-complementary +150/+210; triadic +120/+240; tetradic +60/+180/+240; square +90 steps; compound +30/+180/+210; analogous plus or minus 30; monochromatic same hue.

- A vague or single-adjective intent takes monochromatic or analogous, with Accent separated from Brand by L and C rather than hue. The polished-UI default: Accent at Brand's hue and about 45% of its chroma, Special at +60 and about 65%.
- An intent naming two colors: measure their hue gap and pick the matching mode (green plus gold is 60 to 90 degrees, so analogous or compound).
- Drama or maximum contrast: complementary, triadic, or tetradic, and then tone one side down, since max-chroma text on a near-black ground vibrates.

## Canvas sky and shadows

`"canvasGradient": true` renders the page background as a vertical gradient from the Canvas ramp. Default off. Turn it on only when the intent evokes atmosphere (sky, night, dusk, glow, underwater) or asks for a gradient outright; keep it off for crisp, flat, minimal, or corporate intents and whenever in doubt, because a sky on every theme stops meaning anything. It needs a committed canvas (level 2 or 3); at the ramp edge the engine skips it and says so. Say why it is on, in one line.

Shadow opacity derives from Canvas lightness and re-derives on every run, so there is nothing to choose. When shadows read heavy or muddy, raise the Canvas base color's L.

## Refining the color of a theme that exists

"Warmer", "calmer", "more contrast" arrive against a theme that is already open, and the answer is a new base color file. Edit `scratch/<slug>-base-colors.json` when it is still there. When it is not, recover the base colors: `src/live-tokens/data/themes/<slug>.json` holds each one verbatim at `colorsAndType.editorConfigs.<Palette>.baseColor` as `{l, c, h}`, and the Canvas base color's lightness gives the scheme. Rebuild the base color file from those ten values, move the dial the user named, and re-run. A re-run replaces the buffer's whole color state, including palette edits made in the editor since the last run, so say so once when iterating; a Save or a `save-theme` run keeps the result.

One adjective moves one dial. Warmer and cooler rotate hue; calmer and louder move chroma; lighter, darker, and moodier move Canvas L and the scheme; more contrast widens the L gap between Canvas and Brand and takes chroma out of the ground rather than adding it to the garnish. Leave every base color the user did not name alone, because a refinement that re-rolls the whole palette reads as a different theme and loses the thing they liked.

## Scope

Color only. Type and geometry are untouched: `set-colors` replaces the color
state in the unsaved buffer and carries every other value in it forward. Save
the open theme in the editor, or run `save-theme`, to keep the result; Adopt
ships it.

## Verify

- The CLI exits 0 with every check passing (auto-corrected is fine), and the report names the layer it carried the rest of the look forward from.
- The app (dev server running) shows the new palette after a reload. The editor's Theme panel marks the open theme unsaved, unless the report says the buffer was discarded because the new colors are what the open theme already holds.
- The canvas is committed: on screen it reads as the theme's color rather than as generic near-white.
- To revert, re-run with the previous base color file, or load the open theme again to discard the buffer.
