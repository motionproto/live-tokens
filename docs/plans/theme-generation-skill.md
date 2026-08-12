# Theme generation skill

Status: EXECUTED 2026-08-12 (uncommitted). Shipped: engine `src/editor/core/themes/generateTheme.ts` (+ tests) bundled via `vite-plugin/generateTheme` → `dist-plugin/generateTheme`; CLI `live-tokens generate-theme <brief.json> [--no-activate] [--dry-run]`; skill `.claude/skills/live-tokens-generate-theme/SKILL.md`; README + SAMPLE_PROMPTS registration. Refinement during implementation: the correction solver aims for comfortable targets (7 / 5.5 / 3.5:1) while the floors below stay the pass criteria, so corrected text never sits at the knife edge. Approved 2026-08-12. Decisions: radius deferred to v2 (option 1); generated themes activate by default (`--no-activate` opts out); iteration regenerates from the brief (skill warns that post-generation manual palette edits are replaced); contrast floors are AA_BODY 4.5 for `--text-primary`/`--text-secondary`, AA_LARGE 3.0 for tertiary and functional text.

## Goal

A user in a consumer project says:

- "Make me a bright and cheerful color theme."
- "Give me a dark and moody night theme."
- "Give me a theme for St. Patrick's Day that uses green and gold."

Claude produces a valid named theme that passes AA contrast on text and surfaces, saves it, and makes it active. Fonts stay untouched. Radius personality is a stretch goal (see Radius section).

## Ground truth (what exists today)

- A theme's color identity reduces to **10 OKLCH seeds + a scheme direction**. `defaultPaletteConfig({baseColor, neutral?, scheme})` (`src/editor/ui/palette/paletteMath.ts:68`) builds the full `PaletteConfig` (curves, anchor bookkeeping) from one seed. All visible tokens derive from that via `palettesToVars` (`src/editor/core/palettes/paletteDerivation.ts`), which is pure and Node-safe.
- The 10 palettes: Brand, Accent, Special, Canvas, Neutral, Alternate, Info, Success, Warning, Danger. `neutral` flag affects seed defaults only.
- Scheme (light/dark) is not a stored field; it lives entirely in the scale-curve seed anchors (`scaleCurveDefaults(scheme)`).
- Harmony axes are advisory: on load, bound axes snap to the palettes' own `baseColor.h`. Getting the seeds right is sufficient; `harmonyAxes` just records slot ownership.
- Contrast: `contrastRatio`, `findLForContrast`, `AA_BODY`/`AA_LARGE` in `src/editor/core/palettes/contrast.ts` — pure, no DOM. The old `recommendNeutralText` solver was deleted (commit `c5009f2`); nothing currently drives curves from contrast, but the primitives remain.
- Persistence: `PUT /api/live-tokens/themes/<slug>` creates or updates a theme file; `PUT /themes/active {name}` activates it. `default` is protected (403 on PUT, 403 on DELETE). No POST; PUT-on-new-name is the create.
- Skills ship in the tarball (`.claude/skills/*` in `files`), copied into consumer projects by `npx @motion-proto/live-tokens setup-claude`. New skill = new dir + `SAMPLE_PROMPTS` entry in `bin/cli.mjs` + README table row.
- CLI subcommand pattern: `bin/<name>.mjs` exporting `run<Name>()` + `format<Name>Result()`, imported by `bin/cli.mjs`. `bin/migrate.mjs` is the precedent for a CLI importing compiled engine code from `dist-plugin/`.

## Architecture: skill + CLI engine

Split the problem at the creative/mechanical boundary:

- **Claude (skill)** does the part only a model can do: translate "bright and cheerful" into 10 seeds, a scheme, and a harmony mode. Color psychology, holiday palettes, warm/cool balance.
- **Engine (CLI subcommand)** does the part that must be correct by construction: assemble the full theme JSON from the seeds, verify AA contrast, auto-correct text lightness where needed, write the file, activate it, and print a contrast report card.

This keeps Claude out of curve-anchor JSON (fragile, easy to get `anchorPlacement` wrong) and keeps the contrast guarantee in tested code instead of model judgment. It also works without the dev server running: the CLI writes `<dataDir>/themes/<slug>.json` and `_active.json` directly, same files the server serves.

Rejected alternatives:

- **Skill-only** (Claude hand-authors theme JSON or drives the HTTP API): no contrast guarantee, fragile curve bookkeeping, requires the dev server.
- **MCP server**: heavier runtime surface with no benefit over a CLI the skill can call via Bash. The project's extension precedent is skills + CLI.

## The brief format

The skill's output and the engine's input is a small JSON brief:

```json
{
  "name": "spring-meadow",
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
  "harmony": { "mode": "analogous", "anchor": "Brand" }
}
```

Hex seeds are accepted too (the load-time hex→Oklch migration already exists). `harmony` is optional metadata; the engine stamps matching `harmonyAxes` but seeds are ground truth.

## Seed-selection framework

Research-backed rules for turning a mood brief into 10 seeds. This section becomes the body of the skill. Sources: Material Design (M2 color system + dark theme, M3/HCT scheme generation from material-color-utilities source), NN/g, Figma's color-theory guide, the Valdez & Mehrabian 1994 color-emotion regressions plus two large cross-cultural reviews, Evil Martians' OKLCH work, Refactoring UI, Stripe's accessible color systems, IBM Carbon.

### Fit with the live-tokens wheel

The existing machinery already encodes several of the research rules:

- Status palettes are excluded from `HARMONY_ELIGIBLE` — matching the finding that Info/Success/Warning/Danger keep conventional hues and never rotate with the harmony mode. Only their L/C adapt to the theme.
- `tintNeutralsFromAnchor` mechanizes the practitioner rule that greys are tinted toward the brand hue, never pure C = 0.
- Harmony rotates hue only. The framework below owns L and C; the wheel owns H. The skill picks a mode from the existing set (complementary 180°, split-complementary 150/210°, triadic 120°, tetradic 60/180/240°, compound 30/180/210°, square 90°, analogous ±30°, monochromatic) and assigns Brand to the anchor axis.

### Chroma budget: color is inversely proportional to area

All sources converge on this (NN/g's 60-30-10, Material's "reserve bright colors for smaller surfaces", the tones-dominate-hues-garnish rule):

| Tier | Palettes | Screen share | Chroma band |
|---|---|---|---|
| Ground (~60%) | Canvas, Neutral, Alternate | most of every screen | C 0.005–0.03 |
| Dominant chromatic (~30%) | Brand | components, emphasis | C 0.10–0.20 |
| Garnish (~10%) | Accent, Special | focal points, rare moments | may exceed Brand's C; at most one at "pure hue" strength |
| Conditional | Info, Success, Warning, Danger | only in their moments | vivid enough to signal (C 0.12–0.19) |

A well-formed theme shows at most 3–4 perceived hue families on any screen. Ten seeds must not read as ten hues.

### Per-role numeric bands

| Seed | Light scheme | Dark scheme | Hue rule |
|---|---|---|---|
| Canvas | L 0.92–0.98, C 0.02–0.06 (revised 2026-08-12: the canvas carries the theme's identity — visible tint or distinct paper tone; near-white C ≤ 0.015 is a deliberate minimal look, not the default) | L 0.15–0.28, C 0.01–0.05, hues spread apart | brand hue or its harmony slot |
| Neutral | L ≈ 0.55, C 0.008–0.02 | same | near brand hue |
| Alternate | L ≈ 0.55, C 0.008–0.02 | same | offset from Neutral (+15–60°, or warm/cool counterpoint) |
| Brand | L 0.45–0.62, C 0.12–0.20 | L 0.70–0.83, C cut by ~⅓ | the brief's identity hue |
| Accent | differs from Brand by the harmony angle, or by ΔL ≥ 0.25 when the mode collapses hue distance (analogous/mono) | same, lightened/desaturated like Brand | harmony slot |
| Special | most expressive seed; M3-style default = Brand hue +60° at ~65% of Brand's C | same transform | harmony slot |
| Info | L ≈ status row's shared L, C 0.10–0.15 | lighten like Brand | H 230–260 |
| Success | shared L, C 0.12–0.16 | 〃 | H 140–155 |
| Warning | must be light: L ≥ 0.75, C 0.12–0.16 | 〃 | H 70–90 |
| Danger | shared L, C 0.15–0.20 | 〃 | H 20–30 |

Cross-cutting rules:

- **Equal-lightness accents** (Stripe): seeds meant to carry equal weight (the four statuses; Brand vs Accent in a balanced scheme) share one L so they contrast identically against surfaces. This is the point of working in OKLCH.
- **Dark-scheme transform** (Material tone 40→80 flip): `scheme: dark` is not just a dark Canvas. Every chromatic seed lightens to L ≈ 0.75–0.85 and drops ~⅓ of its chroma; saturated color on dark grounds vibrates. Full-saturation brand color is allowed on one or two elements, not as the working accent.
- **Contrast heuristic**: ΔL ≥ ~0.4 between text and its ground approximates 4.5:1. Seeds chosen inside these bands rarely fail the engine's gate; the gate remains the guarantee.

### Mood dials

Valdez & Mehrabian's regressions map adjectives onto OKLCH axes directly: **pleasure ≈ 0.69·lightness + 0.22·saturation; arousal ≈ 0.60·saturation − 0.31·lightness; dominance ≈ 0.32·saturation − 0.76·lightness**. So:

| Brief says | Dials |
|---|---|
| cheerful, bright, playful | light Canvas; Brand/Accent L 0.7–0.9, C 0.15–0.22; warm hues 40–140 welcome (yellow-joy is the strongest documented hue-emotion link) |
| calm, serene, soft | light Canvas; C 0.03–0.08 everywhere chromatic; cool hues 140–260 |
| energetic, bold | C ≥ 0.18 at mid L 0.55–0.65; red/orange/magenta |
| dark, moody, dramatic, luxurious | dark scheme; Canvas L 0.15–0.25; accents dark and saturated (L 0.40–0.55, C 0.12–0.20) before the dark-scheme lightening is applied to working accents; purple, deep blue, crimson |
| professional, trustworthy | blue 230–265, C 0.08–0.15; everything else muted |
| warm | hues 20–110 (plus pink/magenta 290–360) |
| cool | hues 140–290 |

Avoid mid-lightness yellow-green (H 100–120 at L 0.5–0.7, C 0.08–0.12) unless the brief asks for olive/toxic/sickly; it is the least-pleasant zone in the emotion data.

### Gamut guardrails

sRGB chroma ceilings depend strongly on hue and lightness. The skill must not request impossible seeds:

- Dark saturated yellow does not exist; H 90 at L 0.4 caps at C ≈ 0.08 and reads olive/brown. A vivid yellow must be light (L ≥ 0.8). Brown is dark low-chroma orange.
- Vivid light blue does not exist; H 264 at L 0.9 caps at C ≈ 0.05. A rich blue lives at L 0.40–0.55 (peak C ≈ 0.28 at L 0.50).
- Teal and sky never exceed C ≈ 0.15–0.16; a "vivid teal" is C 0.13–0.15.
- Peak chroma anchors: red H20 C 0.25 @ L 0.63; orange H60 C 0.18 @ L 0.76; yellow H90 C 0.18 @ L 0.86; green H140 C 0.28 @ L 0.88; blue H264 C 0.28 @ L 0.50; magenta H320 C 0.31 @ L 0.65.

The engine clamps at serialization regardless (`serializeDerivedValue`); these rules exist so the *intent* is achievable, not merely clamped into something else.

### Choosing the harmony mode

- Vague or single-adjective brief → monochromatic or analogous (the safe, low-contrast schemes; NN/g calls mono the easiest to get right). Differentiate Accent from Brand by L/C, not hue.
- M3's practice for polished UI is muted harmony: secondary = Brand's hue at ~45% chroma, tertiary = +60° at ~65% chroma. In live-tokens vocabulary: monochromatic-to-analogous with the chroma budget doing the work. Default here when in doubt.
- Brief names two colors → measure their hue gap and pick the mode that matches (green + gold ≈ 60–90° apart → analogous/compound territory).
- Brief asks for drama, boldness, maximum contrast → complementary, triadic, or tetradic; then obey the contrast ceiling (never max-chroma text on near-black ground; tone one side down).

### Named-theme conventions

Canonical anchors so "give me a Christmas theme" lands on expected hues (all OKLCH):

- **Christmas**: red (0.53, 0.21, 22) + green (0.46, 0.11, 155) + gold (0.77, 0.14, 91) on cream (0.98, 0.02, 88) or evergreen (0.35, 0.07, 160). Ground stays calm; never a 50/50 red-green split — one of red/green is the 30%, gold is the 10%.
- **Halloween**: pumpkin (0.70, 0.20, 46) + purple (0.51, 0.21, 313) + poison green (0.73, 0.20, 137), dark scheme by default.
- **St. Patrick's**: green (0.51, 0.13, 152) Brand, gold Accent, white/beige neutrals.
- **Ocean**: deep blue (0.35, 0.08, 237) vs aqua (0.78, 0.12, 214); the depth-vs-shallows L contrast on H 180–240 is the identity.
- **Sunset**: hue sweeps 90 → 320 through red while L falls 0.85 → 0.40.
- **Autumn**: H 40–90, L 0.35–0.70, C 0.08–0.16, plus deep red H 25. **Spring**: pastels, L 0.85–0.95, C 0.04–0.10, greens 130–150 / pinks 0–20.

### Calibration: the shipped default theme

The default theme's seeds already sit inside these bands, so it doubles as the worked example in the skill: Brand (0.557, 0.184, 25) is a vivid mid-L red; Accent (0.767, 0.164, 70) a light amber garnish; Special (0.606, 0.219, 293) an expressive violet; Canvas (0.228, 0.038, 283) a blue-tinted dark ground; Neutral (0.568, 0.013, 240) and Alternate (0.587, 0.009, 49) a cool/warm near-grey pair.

## Engine: `npx live-tokens generate-theme <brief.json> [--activate] [--dry-run]`

New `bin/generate-theme.mjs` following the `run`/`format` pair convention. Pipeline:

1. Validate the brief (all 10 seeds present, chroma/lightness in range, slug via `sanitizeFileName`).
2. Build `editorConfigs` with `defaultPaletteConfig` per seed (`neutral: true` for Neutral/Alternate, scheme passed through).
3. Carry `cssVariables`, `fontSources`, `fontStacks` forward from the current active theme (or package default) so gradients, shadows, component aliases, and fonts survive. Fonts are explicitly untouched.
4. **Contrast gate.** Derive vars with `palettesToVars`, then check:
   - `--text-primary/-secondary/-tertiary` vs the neutral surface band extremes and `--page-bg`: floor `AA_BODY` for primary/secondary, `AA_LARGE` for tertiary.
   - Each functional text color (`--text-brand` etc.) vs the default surface: floor `AA_LARGE`.
   - Where a check fails, solve with `findLForContrast` (respecting `lMax = min(1, 2·seedL)` from the Text-multiplier derivation) and adjust the offending seed's Text scale curve or seed L; re-derive and re-verify. If still unreachable (extreme chroma request), keep the best effort and mark the row FAILED in the report — never silently pass.
5. Write `<dataDir>/themes/<slug>.json` with `schemaVersion: 3` (refuse `default` as a name, matching the server's 403).
6. `--activate`: write `_active.json`. Production promotion stays a human action in the editor.
7. Print the report card: per-pair contrast ratios with pass/fail, plus what was auto-corrected.

Engine code placement: the pure pipeline (`buildThemeFromSeeds`, the contrast gate) lives in `src/editor/core/` next to `paletteDerivation.ts`, gets a tsup entry into `dist-plugin/`, and the CLI imports the compiled output — the `bin/migrate.mjs` precedent. Unit tests derive a brief → theme → vars and assert every AA floor.

## Skill: `live-tokens-generate-theme`

New `.claude/skills/live-tokens-generate-theme/SKILL.md`, structured like the existing three (trigger-dense description, imperative sections, Verify block). Content:

- **The seed-selection framework above**, verbatim or lightly compressed: chroma budget, per-role bands, mood dials, gamut guardrails, harmony-mode choice, named-theme conventions. This is the bulk of the skill; create-component's 569-line SKILL.md is the size precedent.
- **Fixed rules restated imperatively**: Neutral/Alternate stay low-chroma and tinted toward the theme hue; status hues never rotate with harmony; Canvas seed is the page background verbatim; dark scheme lightens and desaturates every chromatic seed, not just the ground.
- **Workflow**: write the brief to a temp file → run `npx live-tokens generate-theme` → read the report card → if rows failed, adjust seeds (usually chroma down or lightness apart) and re-run → tell the user to look at the running app and offer refinements ("warmer", "more contrast") as new briefs.
- Registration: `SAMPLE_PROMPTS` entry in `bin/cli.mjs`, README skills-table row.

## Radius

The radius scale (`--radius-sm`…`--radius-4xl`) is a Layer B primitive in the consumer's vendored `tokens.css` — deliberately outside theme scope, and changing it is global across all themes, not part of one theme's personality. Options:

1. **Skip radius in v1** (recommended). Ship color generation; it is the whole of the three example prompts.
2. Theme-scoped: only re-point the per-component radius aliases that already live in theme `cssVariables` (`--badge-trait-radius`, `--dialog-*-radius`, …). Honest but thin — most component radii live in per-component config files, a much wider surface.
3. Global: the skill edits vendored `tokens.css` directly (it is user-owned and hand-editable), with explicit user consent per run. Not theme-scoped, and it bypasses the migration contract.

Recommendation: option 1 now; revisit radius personality as its own feature once color generation is proven, since doing it properly points at per-component configs, not themes.

## Out of scope

- Fonts (explicitly excluded by the request).
- Production promotion (user promotes in the editor; keeps the protected-manifest 409 flow in one place).
- MCP server.
- Per-component config edits.
- New theme tokens — the generator only writes existing token families.

## Open questions

1. Radius: confirm option 1 (defer) or pick 2/3.
2. Should `--activate` be the default? The editor treats `_active` as "what I'm editing"; auto-activating a generated theme matches the "show me" intent but replaces the user's editing target. Proposal: activate by default, print the one-line revert (`PUT themes/active` back, or the file manager).
3. Iteration verbs ("make it warmer"): v1 handles this as "Claude adjusts the brief and re-runs", regenerating from seeds. Is regenerate-from-brief acceptable, or must iteration start from the current theme file (preserving any manual editor tweaks since generation)? Proposal: regenerate-from-brief in v1; the skill warns that manual palette tweaks made after generation are replaced.
4. Contrast floors: AA_BODY (4.5) for primary/secondary text, AA_LARGE (3.0) for tertiary and functional text — confirm these floors match your intent, since the old solver's exact policy died with `c5009f2`.

## Work plan (after approval)

1. **Engine**: `buildThemeFromSeeds` + contrast gate in `src/editor/core/`, tsup entry, unit tests (brief → theme → vars → AA assertions; default-brief snapshot).
2. **CLI**: `bin/generate-theme.mjs`, USAGE stanza, refuse-`default` guard, report-card formatter.
3. **Skill**: SKILL.md, `SAMPLE_PROMPTS` entry, README row.
4. **Verify**: generate the three example prompts' briefs in the demo app; eyeball plus report cards; `npm run check:production-is-default` still green.
