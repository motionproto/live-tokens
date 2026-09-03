---
name: live-tokens-generate-theme
description: Generate a complete live-tokens theme (color, type, and geometry) from a natural-language request, delegating the type and geometry intents to its sibling skills. Use whenever the user asks for a theme, look, vibe, brand feel, color scheme, or palette by mood, style, era, season, holiday, or hue; when they name only a color; or when they refine an existing theme (warmer, more contrast, calmer). Not for a single token (use the editor), type alone (live-tokens-set-fonts), or geometry alone (live-tokens-adjust-geometry).
---

# Generating a theme from a request

A theme is three decisions made from one request: color, type, and geometry. This skill reads the request once and states a **design direction**, one sentence that fixes all three. It executes the color intent itself, because the color CLI writes the theme file that the other two then adjust through unsaved buffers, and it hands the type and geometry intents to its sibling skills, so the whole look comes from one reading. Never hand-author theme JSON and never edit the data tree directly.

## Workflow

1. Read the request once and state the design direction to the user: the mood, the hue family, the scheme, and the type and geometry that mood implies. It fixes enough to derive the three intents in step 3, and it names the default where the request leaves a dimension open. Keep it short enough to state in a line or two. Every step below keys off the design direction.
2. Read the anchor reference that matches the design direction (feeling, idiom, or occasion; see Anchor references) before choosing base colors. Each entry fixes color, type, and geometry together and overrides the generic defaults below.
3. State the three intents the design direction and the anchor entry imply, one line each: the color intent, the type intent, and the geometry intent. An entry's Type and Geometry columns are those intents. The generic tables below cover a dimension no entry fixed. This skill executes the color intent itself and hands the other two to their sibling skills.
4. Translate the color intent into a base color file using the framework below. Write it to `scratch/<slug>-base-colors.json`. Nothing else records the base colors, so this file is the only copy; one per slug is what makes the refinement pass below cheap.
5. Run `npx live-tokens generate-theme scratch/<slug>-base-colors.json`. It writes `themes/<slug>.json`, opens that theme, and prints a contrast report.
6. Read the report. Exit 0 passes, and auto-corrected values count as passing. Exit 1 means the base colors are unworkable; each failure line names the base color to change, usually by raising its lightness or cutting its chroma. Fix the base color file and re-run under the same name.
7. Invoke **live-tokens-set-fonts** with the type intent. Skip only when the user asked for colors specifically and said to leave the type alone.
8. Invoke **live-tokens-adjust-geometry** with the geometry intent (table below). Skip when that intent is to leave geometry alone.
9. Tell the user to look at the running app, and that type and geometry sit in the unsaved buffer until they save the open theme. Offer refinements as edits to the same base color file (see Refining a theme that exists).

Order matters only for safety, and the order above is safe: the color generator carries the live buffers forward into the new theme file, so a color re-roll after fonts and geometry keeps both.

Flags: `--dry-run` prints the report without writing; `--no-activate` writes without opening; `--carry-from <theme>` takes the non-color content (gradients, fonts, component aliases) from a named theme rather than from the live look. Generating a set needs it: the first run becomes the live look, so a second run without it carries the first theme's fonts and geometry into the second.

## The base color file

```json
{
  "name": "Spring Meadow",
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

A base color is the one color a palette's whole ramp derives from. All 10 are required, and each may be given as a `"#rrggbb"` string instead. OKLCH: `l` is 0 to 1 lightness, `c` is chroma (0 grey, about 0.37 max), `h` is hue in degrees. `name` becomes the file slug; `"default"` is refused. `canvasGradient` is an optional boolean, see below.

Roles: **Brand** is the dominant chromatic identity; **Accent** the supporting color; **Special** the rare expressive tertiary; **Canvas** is the page background verbatim; **Neutral** drives neutral surfaces and body text; **Alternate** is the second near-grey family; the four statuses are conventional signals.

## Chroma budget: color is inversely proportional to area

| Tier | Palettes | Chroma |
|---|---|---|
| Ground (about 60% of every screen) | Neutral, Alternate | C 0.008 to 0.02 |
| Canvas (the largest single area) | Canvas | Per the commitment levels below, C 0.02 to 0.14 |
| Dominant chromatic (about 30%) | Brand | C 0.10 to 0.20 |
| Garnish (about 10%) | Accent, Special | may exceed Brand; at most one at the gamut cap for its hue (see Gamut guardrails) |
| Conditional | Info, Success, Warning, Danger | C 0.12 to 0.19 |

A good theme reads as 3 or 4 hue families on screen, never 10. Neutral and Alternate stay near-grey but tinted toward the theme (Neutral near Brand's hue; Alternate offset 15 to 60 degrees, or a warm/cool counterpoint), never pure C = 0 unless an idiom entry calls for it.

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

**The canvas carries the theme's identity, so commit to it.** The page background is the largest area on screen and the strongest difference between themes; a timid canvas makes every theme look the same. Below C 0.015 at L 0.95 a tint is imperceptible, which makes near-white a deliberate choice for clean or minimal requests and never the default. Three levels of commitment:

1. *Tinted paper* (most UI requests): C 0.02 to 0.06, with L down to 0.92 where the hue needs room.
2. *Colored ground* (expressive requests): L 0.85 to 0.92 at C 0.05 to 0.10. The page is unmistakably mint, parchment, sky.
3. *Full-color ground* (holiday and statement requests): the canvas is the theme color, like a red Christmas page with green and gold on it. Keep canvas L at or below 0.48 or at or above 0.85 so text has somewhere to go; the contrast gate enforces legibility either way.

Also:

- Blue tints cap very low at high L (H 264 at L 0.95 barely reaches C 0.03): lower L for a blue canvas rather than fighting the ceiling. Yellow, green, and cream tint generously at high L.
- When generating a set of themes, make the canvases pairwise distinct in hue or in L. Two light themes both near (0.97, 0.01) read as one theme with different buttons.
- A dark scheme transforms every base color: each chromatic one lightens to L 0.75 to 0.85 and drops about a third of its chroma, because saturated color vibrates on dark grounds.
- Equal lightness reads as equal weight: give the four statuses one shared L, and do the same for Brand and Accent when they should balance.
- Status hues never rotate with the harmony; only their L and C adapt to the mood.

## Mood dials

Pleasantness rises with lightness (strongly) and saturation (weakly); energy rises with saturation; drama rises with dark plus saturated. Dominance, the third axis, is carried by surface contrast, type weight, and tightness rather than by color at all.

That is the whole mechanism, and one dial moves without a reference: warm is hues 20 to 110 plus pink 290 to 360, cool is 140 to 290. For a request that names a feeling, read `references/mood-vocabulary.md` instead of guessing the dial settings; each entry places the emotion on the three axes and gives the color, type, and geometry together.

Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0.7, C about 0.1) unless the request asks for olive or toxic.

## Gamut guardrails

The engine clamps to gamut regardless; these keep the intent achievable.

- Dark saturated yellow does not exist: H 90 at L 0.4 caps at C 0.08 and reads olive. Vivid yellow needs L 0.8 or more. Brown is dark low-chroma orange.
- Vivid light blue does not exist: H 264 at L 0.9 caps at C 0.05. Rich blue lives at L 0.40 to 0.55.
- Teal and sky cap at C 0.15.
- Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C 0.18 at L 0.76; yellow H90 C 0.18 at L 0.86; green H140 C 0.28 at L 0.88; blue H264 C 0.28 at L 0.50; magenta H320 C 0.31 at L 0.65.

## Harmony

Hue offsets from Brand: complementary +180; split-complementary +150/+210; triadic +120/+240; tetradic +60/+180/+240; square +90 steps; compound +30/+180/+210; analogous plus or minus 30; monochromatic same hue.

- A vague or single-adjective request takes monochromatic or analogous, with Accent separated from Brand by L and C rather than hue. The polished-UI default: Accent at Brand's hue and about 45% of its chroma, Special at +60 and about 65%.
- A request naming two colors: measure their hue gap and pick the matching mode (green plus gold is 60 to 90 degrees, so analogous or compound).
- Drama or maximum contrast: complementary, triadic, or tetradic, and then tone one side down, since max-chroma text on a near-black ground vibrates.

## Canvas sky and shadows

`"canvasGradient": true` renders the page background as a vertical gradient from the Canvas ramp. Default off. Turn it on only when the request evokes atmosphere (sky, night, dusk, glow, underwater) or asks for a gradient outright; keep it off for crisp, flat, minimal, or corporate requests and whenever in doubt, because a sky on every theme stops meaning anything. It needs a committed canvas (level 2 or 3); at the ramp edge the engine skips it and says so. Say why it is on, in one line.

Shadow opacity derives from Canvas lightness and re-derives on every run, so there is nothing to choose. When shadows read heavy or muddy, raise the Canvas base color's L.

## Anchor references

- `references/mood-vocabulary.md` covers feelings: joyful, playful, optimistic, confident, serene, tender, cozy, earthy, clinical, wistful, contemplative, urgent, tense, defiant, melancholy, somber, ominous, austere. It opens with the valence, energy, and dominance axes, so a feeling it does not list still places on them.
- `references/style-vocabulary.md` covers named idioms, eras, and genres: Swiss, Bauhaus, mid-century, art deco, terminal, cyberpunk, vaporwave, Y2K, blueprint, Scandinavian, Japandi, cottagecore, editorial, newsprint, riso, corporate, brutalist, Memphis, industrial. Each entry fixes color, type, and geometry as one set, so hand its Type and Geometry columns to the sibling skills verbatim.
- `references/named-themes.md` covers holidays, seasons, and natural scenes: Christmas, Halloween, St. Patrick's, Ocean, Sunset, Autumn, Spring. A holiday or season request is a statement request: commitment level 2 or 3, with the named color on the ground rather than only on the buttons.

Most requests hit the first file. A request that matches two ("cozy brutalist", "clinical Swiss") reads the idiom first and lets the feeling move the dials inside it: an idiom sets constraints, and dials move within constraints. A request that names no feeling, idiom, or occasion at all takes the bands above and the geometry table below.

## Geometry from the design direction

The geometry lives in radius, padding, gap, and border width, and `live-tokens-adjust-geometry` knows the mechanics. Hand it the geometry intent:

| Design direction | Geometry intent |
|---|---|
| playful, friendly, soft | rounder, a step airier; pill buttons when the request is warm |
| luxurious, elegant, editorial | sharper corners, airier padding, thin borders |
| technical, dense, systematic | tighter spacing, small radius, square corners on containers |
| calm, minimal | leave geometry alone unless the request says otherwise |

This table is the fallback. When the request matched an entry in the mood or style reference, take the geometry from that entry instead: it is tuned to the same design direction the color came from, and a style's geometry is often targeted rather than global.

## Refining a theme that exists

"Warmer", "calmer", "more contrast" arrive against a theme that is already open, and the answer is a new base color file. Edit `scratch/<slug>-base-colors.json` when it is still there. When it is not, recover the base colors: `src/live-tokens/data/themes/<slug>.json` holds each one verbatim at `colorsAndType.editorConfigs.<Palette>.baseColor` as `{l, c, h}`, and the Canvas base color's lightness gives the scheme. Rebuild the base color file from those ten values, move the dial the user named, re-run under the same name. A re-run replaces that theme's whole color state, including palette edits made in the editor since the last run, so say so once when iterating.

One adjective moves one dial. Warmer and cooler rotate hue; calmer and louder move chroma; lighter, darker, and moodier move Canvas L and the scheme; more contrast widens the L gap between Canvas and Brand and takes chroma out of the ground rather than adding it to the garnish. Leave every base color the user did not name alone, because a refinement that re-rolls the whole palette reads as a different theme and loses the thing they liked.

## Files each step writes

Color writes `themes/<slug>.json` and opens it. Type and geometry write the unsaved buffers, which the page already runs. One Save in the editor keeps all three; Adopt ships them. Opening a theme never changes what the site ships. Only Adopt, in the editor, does that. Component aliases and gradients carry forward from the live look into a generated theme; user-tuned gradients survive, stock ones rebuild from the new families.

## Verify

- The color CLI exits 0 with every check passing (auto-corrected is fine), and the two sibling skills report what they changed.
- The app (dev server running) shows the whole look after a reload, and the editor's Theme panel names the theme.
- To return to the previous look, load the theme the CLI output named from the Theme panel; that discards the buffers too.
