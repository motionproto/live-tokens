---
name: live-tokens-generate-theme
description: Generate a complete live-tokens color theme from a natural-language mood brief by choosing 10 OKLCH seeds and running the packaged generator, which enforces AA contrast automatically. Use when the user asks for a color theme, color scheme, or palette by mood, vibe, season, holiday, or hue — make me a bright and cheerful theme, give me a dark and moody night theme, a St. Patrick's Day theme with green and gold, a Christmas theme, a red-based theme, make it warmer, more contrast, a calmer palette. Changes color assignments only, never fonts. Not for editing a single token (use the editor) or building pages (see live-tokens-build-page).
---

# Generating a theme from a mood brief

You translate the brief into 10 OKLCH seed colors plus a scheme; the CLI does everything else (curve assembly, AA contrast enforcement with auto-correction, file writing, activation). Never hand-author theme JSON and never edit `colors-and-type/*.json` directly — seeds in, valid theme out.

## Workflow

1. Translate the brief into a seed file using the framework below. Write it to a temp path (not the project tree), e.g. `/tmp/theme-brief.json`.
2. Run `npx live-tokens generate-theme /tmp/theme-brief.json`. It writes `colors-and-type/<slug>.json`, activates it, and prints a contrast report card. Exit 1 means unmet floors.
3. Read the report. Auto-corrections are fine (the engine adjusted text curves to hit the floors). Unmet floors mean the seeds themselves are unworkable; each failure line says which seed to adjust (usually raise the seed's lightness or cut chroma). Fix the brief and re-run — same name, same file, it overwrites.
4. Tell the user to look at the running app. Offer refinements ("warmer", "more contrast", "less saturated") as seed adjustments to the same brief, re-run.

Flags: `--dry-run` prints the report without writing; `--no-activate` writes the file without switching the active theme.

Warn once per session when iterating: regeneration replaces the whole color state of that theme file, including any manual palette tweaks made in the editor after the last generation.

## The brief

```json
{
  "name": "Spring Meadow",
  "scheme": "light",
  "seeds": {
    "Brand":     { "l": 0.62, "c": 0.17, "h": 145 },
    "Accent":    { "l": 0.80, "c": 0.15, "h": 95 },
    "Special":   { "l": 0.60, "c": 0.19, "h": 300 },
    "Canvas":    { "l": 0.97, "c": 0.01, "h": 120 },
    "Neutral":   { "l": 0.55, "c": 0.012, "h": 140 },
    "Alternate": { "l": 0.58, "c": 0.009, "h": 60 },
    "Info":      { "l": 0.60, "c": 0.15, "h": 255 },
    "Success":   { "l": 0.60, "c": 0.16, "h": 150 },
    "Warning":   { "l": 0.75, "c": 0.15, "h": 85 },
    "Danger":    { "l": 0.58, "c": 0.20, "h": 25 }
  },
  "harmony": { "mode": "analogous" }
}
```

All 10 seeds are required. A seed may also be a `"#rrggbb"` hex string (converted for you). OKLCH: `l` 0–1 perceptual lightness, `c` chroma (0 grey, ~0.37 max), `h` hue degrees. `name` becomes the theme file slug; `"default"` is refused (protected package theme). `harmony` is an optional record of your reasoning; the seeds are ground truth.

Roles: **Brand** is the dominant chromatic identity; **Accent** the supporting color; **Special** the rare expressive tertiary; **Canvas** is the page background verbatim; **Neutral** drives all neutral surfaces and body text; **Alternate** is the second near-grey family; the four status colors are conventional signals.

## Chroma budget: color is inversely proportional to area

| Tier | Palettes | Chroma |
|---|---|---|
| Ground (~60% of every screen) | Canvas, Neutral, Alternate | C 0.005–0.03 |
| Dominant chromatic (~30%) | Brand | C 0.10–0.20 |
| Garnish (~10%) | Accent, Special | may exceed Brand; at most one at full saturation |
| Conditional | Info, Success, Warning, Danger | C 0.12–0.19 |

A good theme reads as 3–4 hue families on screen, never 10. Neutral and Alternate stay near-grey, tinted toward the theme (Neutral near Brand's hue; Alternate offset +15–60° or as a warm/cool counterpoint), never pure C = 0.

## Per-role bands

| Seed | Light scheme | Dark scheme | Hue |
|---|---|---|---|
| Canvas | L 0.92–0.98, C 0.02–0.06 (see below) | L 0.15–0.28, C 0.01–0.05 | brand hue or its harmony slot |
| Neutral / Alternate | L ≈ 0.55, C 0.008–0.02 | same | see chroma budget |
| Brand | L 0.45–0.62, C 0.12–0.20 | L 0.70–0.83, C cut by ~⅓ | the brief's identity hue |
| Accent | harmony slot, or ΔL ≥ 0.25 from Brand when the mode collapses hue distance | lighten/desaturate like Brand | harmony slot |
| Special | most expressive; default = Brand hue +60° at ~65% of Brand's C | same transform | harmony slot |
| Info | shared status L (0.55–0.65 light) | lighten like Brand | H 230–260 |
| Success | shared status L | same | H 140–155 |
| Warning | L ≥ 0.75 (vivid yellow must be light) | same | H 70–90 |
| Danger | shared status L, C 0.15–0.20 | same | H 20–30 |

- **The canvas carries the theme's identity — commit to it.** The page background is the largest area on screen and the strongest differentiator between themes; a timid canvas makes every theme look the same. Below C ≈ 0.015 at L ≥ 0.95 a tint is imperceptible: that near-white is a deliberate choice for clean/minimal briefs, never the default. Three escalating levels of commitment, matched to the brief:
  1. *Tinted paper* (most UI briefs): a tint you can actually see — C 0.02–0.06, dropping L to 0.92–0.95 where the hue needs room.
  2. *Colored ground* (expressive briefs): L 0.85–0.92 at C 0.05–0.10 — the page is unmistakably mint, parchment, sky.
  3. *Full-color ground* (holiday and statement briefs): the canvas IS the theme color — a red Christmas page (0.40–0.48, C 0.12–0.16, H 25) with green and gold on it, an orange Halloween page. Keep canvas L ≤ ~0.48 or ≥ ~0.85 so text has somewhere to go; the contrast gate enforces legibility either way. A saturated background is a legitimate choice, not something to correct.
- **Gamut note for light canvases**: blue tints cap very low at high L (H 264 at L 0.95 barely reaches C 0.03) — for a blue-leaning canvas, lower L instead of fighting the ceiling; yellow/green/cream hues tint generously at high L.
- **When generating a set of themes, make the canvases pairwise distinct.** Any two Canvas seeds should differ noticeably in hue (at visible chroma) or in L. Two light themes both near (0.97, 0.01, anything) read as the same theme with different buttons. Dark canvases differentiate the same way: deep indigo, plum, and near-black violet are three different nights.
- **Dark scheme is a transform, not just a dark Canvas**: every chromatic seed lightens to L ≈ 0.75–0.85 and drops about a third of its chroma. Saturated color vibrates on dark grounds.
- **Equal lightness = equal weight**: give the four statuses one shared L; do the same for Brand vs Accent when they should balance.
- Status hues never rotate with the harmony; only their L/C adapt to the mood.

## Mood dials

Empirically: pleasantness rises with lightness (strongly) and saturation (weakly); energy/arousal rises with saturation; drama/dominance rises with dark + saturated.

| Brief says | Dials |
|---|---|
| cheerful, bright, playful | light scheme; Brand/Accent L 0.7–0.9, C 0.15–0.22; warm hues 40–140 (yellow is the strongest joy hue) |
| calm, serene, soft | light scheme; C 0.03–0.08 on everything chromatic; cool hues 140–260 |
| energetic, bold | C ≥ 0.18 at L 0.55–0.65; red/orange/magenta |
| dark, moody, dramatic, luxurious | dark scheme; Canvas L 0.15–0.25; purple, deep blue, crimson; keep working accents light per the dark transform, reserve dark-saturated color for one or two moments |
| professional, trustworthy | blue 230–265, C 0.08–0.15; everything else muted |
| warm / cool | hues 20–110 (plus pink 290–360) / hues 140–290 |

Avoid mid-lightness yellow-green (H 100–120 at L 0.5–0.7, C ≈ 0.1) unless the brief asks for olive/toxic.

## Gamut guardrails (don't request impossible seeds)

- Dark saturated yellow does not exist: H 90 at L 0.4 caps at C ≈ 0.08 and reads olive. Vivid yellow needs L ≥ 0.8. Brown = dark low-chroma orange.
- Vivid light blue does not exist: H 264 at L 0.9 caps at C ≈ 0.05. Rich blue lives at L 0.40–0.55.
- Teal/sky cap at C ≈ 0.15; a "vivid teal" is C 0.13–0.15.
- Peak chroma anchors: red H20 C 0.25 @ L 0.63; orange H60 C 0.18 @ L 0.76; yellow H90 C 0.18 @ L 0.86; green H140 C 0.28 @ L 0.88; blue H264 C 0.28 @ L 0.50; magenta H320 C 0.31 @ L 0.65.

The engine gamut-clamps regardless; these rules keep your *intent* achievable rather than silently muted.

## Choosing the harmony mode

Modes and hue offsets from Brand: complementary +180; split-complementary +150/+210; triadic +120/+240; tetradic +60/+180/+240; square +90 steps; compound +30/+180/+210; analogous ±30; monochromatic same hue.

- Vague or single-adjective brief → monochromatic or analogous; differentiate Accent from Brand by L/C, not hue. Polished-UI default: Accent = Brand's hue at ~45% chroma, Special = +60° at ~65% chroma.
- Brief names two colors → measure their hue gap and pick the matching mode (green + gold ≈ 60–90° → analogous/compound).
- Drama or maximum contrast → complementary/triadic/tetradic; then never pair max-chroma text with a near-black ground; tone one side down.

## Named themes (canonical OKLCH anchors)

Holiday briefs are statement briefs — default to commitment level 2–3 above, not cream. The named colors go on the *ground*, not just the buttons.

- **Christmas**: red (0.53, 0.21, 22) + green (0.46, 0.11, 155) + gold (0.77, 0.14, 91). Strongest form: a full red canvas (0.42, 0.14, 25) with green Brand and gold Accent on it (dark scheme). Softer form: evergreen canvas (0.35, 0.07, 160) or deep cream (0.95, 0.04, 85). Never a 50/50 red-green split — one owns the ground, the other highlights.
- **Halloween**: pumpkin (0.70, 0.20, 46) + purple (0.51, 0.21, 313) + poison green (0.73, 0.20, 137). Strongest form: an orange canvas (0.45, 0.13, 55) with violet and poison-green accents; alternative: near-black violet canvas with pumpkin Brand. Dark scheme either way.
- **St. Patrick's**: green (0.51, 0.13, 152) Brand, gold Accent, white/beige neutrals.
- **Ocean**: deep blue (0.35, 0.08, 237) vs aqua (0.78, 0.12, 214); H 180–240.
- **Sunset**: hues 90 → 320 through red, L falling 0.85 → 0.40.
- **Autumn / Fall**: leaves and dry grass — canvas warm tan/parchment (0.87, 0.06, 80), rust Brand (0.55, 0.15, 40), golden Accent (0.75, 0.15, 85), moss/olive Special (0.55, 0.10, 120), warm brown neutrals H 50–70. Deep red H 25 welcome. **Spring**: pastels L 0.85–0.95, C 0.04–0.10, greens 130–150 / pinks 0–20, mint canvas.

## Scope

Fonts are never touched (they carry forward from the active theme, as do gradients, shadows, and component aliases). Radius is out of scope for generation. Production promotion stays a human action in the editor.

## Verify

- The CLI exits 0 and the report card shows every check ✓ (auto-corrected is fine).
- The app (dev server running) shows the new theme after a reload; the editor's Theme file manager lists the new file as active.
- If the user wants to keep the previous look, the previous active theme is named in the CLI output; restore it in the Theme file manager.
