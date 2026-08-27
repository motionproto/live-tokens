---
name: live-tokens-generate-theme
description: Generate a complete live-tokens theme — color, type, and geometry — from a natural-language brief, delegating the type and geometry halves to its sibling skills. Use whenever the user asks for a theme, look, vibe, brand feel, color scheme, or palette by mood, style, era, season, holiday, or hue; when they name only a color (something red-based, green and gold for St. Patrick's Day); or when they refine an existing theme (warmer, more contrast, calmer). Examples: bright and cheerful, dark and moody, brutalist, mid-century modern, Swiss and minimal, cyberpunk neon, editorial magazine, make it feel like a terminal. Not for a single token (use the editor), type alone (live-tokens-pair-fonts), or geometry alone (live-tokens-adjust-geometry).
---

# Generating a theme from a brief

A theme is three decisions made from one brief: color, type, and geometry. This skill owns the color decision directly and delegates the other two, so the whole look comes from the same reading of the brief. Never hand-author theme JSON and never edit the data tree directly.

## Workflow

1. Read the brief once and name its voice in a sentence: the mood, the hue family, the scheme, and the type and geometry that mood implies. Everything below keys off that sentence. Then read the anchor reference that matches the brief (feeling, idiom, or occasion; see below) before seeding: each entry fixes all three decisions together and overrides the generic defaults here.
2. Translate the brief into a seed file using the framework below. Write it to `scratch/<slug>-brief.json`. Nothing else records the seeds, so this file is the only copy; one per slug is what makes the refinement pass below cheap.
3. Run `npx live-tokens generate-theme scratch/<slug>-brief.json`. It writes `themes/<slug>.json`, opens that theme, and prints a contrast report. Auto-corrections are fine. Unmet floors (exit 1) mean the seeds themselves are unworkable; each failure line names the seed to change, usually by raising its lightness or cutting its chroma. Fix the brief and re-run; the same name overwrites. Regeneration replaces that theme's whole color state, including palette edits made in the editor since the last run, so say so once when iterating.
4. Invoke **live-tokens-pair-fonts** with the same voice. Skip only when the user asked for colors specifically and said to leave the type alone.
5. Invoke **live-tokens-adjust-geometry** with the geometry the voice implies (table below). Skip when the voice implies nothing about geometry.
6. Tell the user to look at the running app, and that type and geometry sit in the unsaved buffer until they save the open theme. Offer refinements as edits to the same brief (see Refining a theme that exists).

Order matters only for safety, and the order above is safe: the color generator carries the live buffers forward into the new theme file, so a color re-roll after fonts and geometry keeps both.

Flags: `--dry-run` prints the report without writing; `--no-activate` writes without opening; `--carry-from <theme>` takes the non-color content (gradients, fonts, component aliases) from a named theme rather than from the live look. Generating a set needs it: the first run becomes the live look, so a second run without it carries the first theme's fonts and geometry into the second. Opening a theme never changes what the site ships. Only Adopt, in the editor, does that.

## The brief

```json
{
  "name": "Spring Meadow",
  "scheme": "light",
  "seeds": {
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

All 10 seeds are required; a seed may also be a `"#rrggbb"` string. OKLCH: `l` is 0 to 1 lightness, `c` is chroma (0 grey, about 0.37 max), `h` is hue in degrees. `name` becomes the file slug; `"default"` is refused. `canvasGradient` is an optional boolean, see below.

Roles: **Brand** is the dominant chromatic identity; **Accent** the supporting color; **Special** the rare expressive tertiary; **Canvas** is the page background verbatim; **Neutral** drives neutral surfaces and body text; **Alternate** is the second near-grey family; the four statuses are conventional signals.

## Chroma budget: color is inversely proportional to area

| Tier | Palettes | Chroma |
|---|---|---|
| Ground (about 60% of every screen) | Canvas, Neutral, Alternate | C 0.005 to 0.03 |
| Dominant chromatic (about 30%) | Brand | C 0.10 to 0.20 |
| Garnish (about 10%) | Accent, Special | may exceed Brand; at most one at full saturation |
| Conditional | Info, Success, Warning, Danger | C 0.12 to 0.19 |

A good theme reads as 3 or 4 hue families on screen, never 10. Neutral and Alternate stay near-grey but tinted toward the theme (Neutral near Brand's hue; Alternate offset 15 to 60 degrees, or a warm/cool counterpoint), never pure C = 0.

## Per-role bands

| Seed | Light scheme | Dark scheme | Hue |
|---|---|---|---|
| Canvas | L 0.92 to 0.98, C 0.02 to 0.06 | L 0.15 to 0.28, C 0.01 to 0.05 | Brand's hue or its harmony slot |
| Neutral, Alternate | L about 0.55, C 0.008 to 0.02 | same | per the chroma budget |
| Brand | L 0.45 to 0.62, C 0.12 to 0.20 | L 0.70 to 0.83, C cut by a third | the brief's identity hue |
| Accent | harmony slot, or at least 0.25 L from Brand when the mode collapses hue distance | lighten and desaturate like Brand | harmony slot |
| Special | most expressive; default Brand hue +60 at about 65% of Brand's C | same transform | harmony slot |
| Info | shared status L (0.55 to 0.65 light) | lighten like Brand | H 230 to 260 |
| Success | shared status L | same | H 140 to 155 |
| Warning | L 0.75 or higher (vivid yellow must be light) | same | H 70 to 90 |
| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to 30 |

**The canvas carries the theme's identity, so commit to it.** The page background is the largest area on screen and the strongest difference between themes; a timid canvas makes every theme look the same. Below C 0.015 at L 0.95 a tint is imperceptible, which makes near-white a deliberate choice for clean or minimal briefs and never the default. Three levels of commitment:

1. *Tinted paper* (most UI briefs): C 0.02 to 0.06, with L down to 0.92 where the hue needs room.
2. *Colored ground* (expressive briefs): L 0.85 to 0.92 at C 0.05 to 0.10. The page is unmistakably mint, parchment, sky.
3. *Full-color ground* (holiday and statement briefs): the canvas is the theme color, like a red Christmas page with green and gold on it. Keep canvas L at or below 0.48 or at or above 0.85 so text has somewhere to go; the contrast gate enforces legibility either way.

Also:

- Blue tints cap very low at high L (H 264 at L 0.95 barely reaches C 0.03): lower L for a blue canvas rather than fighting the ceiling. Yellow, green, and cream tint generously at high L.
- When generating a set of themes, make the canvases pairwise distinct in hue or in L. Two light themes both near (0.97, 0.01) read as one theme with different buttons.
- A dark scheme is a transform, not just a dark canvas: every chromatic seed lightens to L 0.75 to 0.85 and drops about a third of its chroma, because saturated color vibrates on dark grounds.
- Equal lightness reads as equal weight: give the four statuses one shared L, and do the same for Brand and Accent when they should balance.
- Status hues never rotate with the harmony; only their L and C adapt to the mood.

## Mood dials

Pleasantness rises with lightness (strongly) and saturation (weakly); energy rises with saturation; drama rises with dark plus saturated. Dominance, the third axis, is carried by surface contrast, type weight, and tightness rather than by color at all.

That is the whole mechanism, and one dial moves without a reference: warm is hues 20 to 110 plus pink 290 to 360, cool is 140 to 290. For a brief that names a feeling, read `references/mood-vocabulary.md` instead of guessing the dial settings; each entry places the emotion on the three axes and gives the color, type, and geometry together.

Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0.7, C about 0.1) unless the brief asks for olive or toxic.

## Gamut guardrails

The engine clamps to gamut regardless; these keep your intent achievable rather than silently muted.

- Dark saturated yellow does not exist: H 90 at L 0.4 caps at C 0.08 and reads olive. Vivid yellow needs L 0.8 or more. Brown is dark low-chroma orange.
- Vivid light blue does not exist: H 264 at L 0.9 caps at C 0.05. Rich blue lives at L 0.40 to 0.55.
- Teal and sky cap at C 0.15.
- Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C 0.18 at L 0.76; yellow H90 C 0.18 at L 0.86; green H140 C 0.28 at L 0.88; blue H264 C 0.28 at L 0.50; magenta H320 C 0.31 at L 0.65.

## Harmony

Hue offsets from Brand: complementary +180; split-complementary +150/+210; triadic +120/+240; tetradic +60/+180/+240; square +90 steps; compound +30/+180/+210; analogous plus or minus 30; monochromatic same hue.

- A vague or single-adjective brief takes monochromatic or analogous, with Accent separated from Brand by L and C rather than hue. The polished-UI default: Accent at Brand's hue and about 45% of its chroma, Special at +60 and about 65%.
- A brief naming two colors: measure their hue gap and pick the matching mode (green plus gold is 60 to 90 degrees, so analogous or compound).
- Drama or maximum contrast: complementary, triadic, or tetradic, and then tone one side down, since max-chroma text on a near-black ground vibrates.

## Canvas sky and shadows

`"canvasGradient": true` renders the page background as a vertical gradient from the Canvas ramp. Default off. Turn it on only when the brief evokes atmosphere (sky, night, dusk, glow, underwater) or asks for a gradient outright; keep it off for crisp, flat, minimal, or corporate briefs and whenever in doubt, because a sky on every theme stops meaning anything. It needs a committed canvas (level 2 or 3); at the ramp edge the engine skips it and says so. Say why you enabled it in one line.

Shadow opacity derives from Canvas lightness and re-derives on every run, so there is nothing to choose. When shadows read heavy or muddy, raise the Canvas seed's L.

## Anchor references

Read the matching reference before seeding, and apply the bands above on top of it.

- `references/mood-vocabulary.md` covers feelings: joyful, playful, optimistic, confident, serene, tender, cozy, earthy, clinical, wistful, contemplative, urgent, tense, defiant, melancholy, somber, ominous, austere. It opens with the valence, energy, and dominance axes, so a feeling it does not list still places on them.
- `references/style-vocabulary.md` covers named idioms, eras, and genres: Swiss, Bauhaus, mid-century, art deco, terminal, cyberpunk, vaporwave, Y2K, blueprint, Scandinavian, Japandi, cottagecore, editorial, newsprint, riso, corporate, brutalist, Memphis, industrial. Each entry fixes color, type, and geometry as one set, so hand its Type and Geometry columns to the sibling skills verbatim.
- `references/named-themes.md` covers holidays, seasons, and natural scenes: Christmas, Halloween, St. Patrick's, Ocean, Sunset, Autumn, Spring. A holiday or season brief is a statement brief: commitment level 2 or 3, with the named color on the ground rather than only on the buttons.

Most briefs hit the first file. A brief that names no feeling, idiom, or occasion at all takes the bands above and the geometry table below.

## Geometry from the voice

The geometry lives in radius, padding, gap, and border width, and `live-tokens-adjust-geometry` knows the mechanics. Hand it the intent:

| Voice | Geometry |
|---|---|
| playful, friendly, soft | rounder, a step airier; pill buttons when the brief is warm |
| luxurious, elegant, editorial | sharper corners, airier padding, thin borders |
| technical, dense, systematic | tighter spacing, small radius, square corners on containers |
| calm, minimal | leave geometry alone unless the brief says otherwise |

This table is the fallback. When the brief matched an entry in the mood or style reference, take the geometry from that entry instead: it is tuned to the same reading the color came from, and a style's geometry is often targeted rather than global.

## Refining a theme that exists

"Warmer", "calmer", "more contrast" arrive against a theme that is already open, and the answer is a new brief rather than hand-edits. Edit `scratch/<slug>-brief.json` when it is still there. When it is not, recover the seeds: `src/live-tokens/data/themes/<slug>.json` holds each one verbatim at `colorsAndType.editorConfigs.<Palette>.baseColor` as `{l, c, h}`, and the Canvas seed's lightness tells you the scheme. Rebuild the brief from those ten values, move the dial the user named, re-run under the same name.

One adjective moves one dial. Warmer and cooler rotate hue; calmer and louder move chroma; lighter, darker, and moodier move Canvas L and the scheme; more contrast widens the L gap between Canvas and Brand and takes chroma out of the ground rather than adding it to the garnish. Leave every seed the user did not name alone, because a refinement that re-rolls the whole palette reads as a different theme and loses the thing they liked.

## What each step writes

Color writes `themes/<slug>.json` and opens it. Type and geometry write the unsaved buffers, which the page already runs. One Save in the editor keeps all three; Adopt ships them. Component aliases and gradients carry forward from the live look into a generated theme; user-tuned gradients survive, stock ones rebuild from the new families.

## Verify

- The color CLI exits 0 with every check passing (auto-corrected is fine), and the two sibling skills report what they changed.
- The app (dev server running) shows the whole look after a reload, and the editor's Theme panel names the theme.
- To return to the previous look, load the theme the CLI output named from the Theme panel; that discards the buffers too.
