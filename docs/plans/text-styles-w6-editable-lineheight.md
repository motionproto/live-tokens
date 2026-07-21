# Execution plan: W6 — reshape line-height scale + unlock line-height/transform in the editor

Follow-up to `docs/plans/semantic-text-styles.md` (Waves 1–5, committed on branch `text-styles`, HEAD `70cf552`). One wave = one commit. Decided with the user 2026-07-21. The worktree dev server must stay **stopped** during execution (it regenerates `tokens.generated.css` and would race the edits) — do not start it.

## Decided spec (do not re-litigate)

### New line-height scale (replaces `none/tighter/tight/normal/loose/looser` = 1/1.1/1.25/1.5/1.75/2)

| Name | Value |
|---|---|
| `none` | 1 |
| `tightest` | 1.1 |
| `tighter` | 1.25 |
| `tight` | 1.35 |
| `normal` | 1.5 |
| `relaxed` | 1.75 |

Net: `tighter`(1.1) is renamed to `tightest`; `tight`(1.25) is renamed to `tighter`; a **new** `tight`=1.35 is inserted; `loose`(1.75) is renamed to `relaxed`; `looser`(2) is **removed**; `none` and `normal` are unchanged.

### Rename map for existing repo references — APPLY IN THIS ORDER (names are reassigned, so order + word-boundary matching are mandatory)

1. `--line-height-tighter` → `--line-height-tightest`  (FIRST)
2. `--line-height-tight` → `--line-height-tighter`     (AFTER #1)
3. `--line-height-loose` → `--line-height-relaxed`
4. `--line-height-looser` → removed (0 real consumers; only its tokens.css definition and one test assertion reference it)

Word boundary is required so `--line-height-tight` never matches `--line-height-tighter`/`--line-height-tightest`. New `--line-height-tight` (1.35) has no existing consumer — it is only added to the scale definition + pickers.

### Style default line-heights (tokens.css bundle block + the additive migration)

- `--heading-xl-line-height`, `--heading-lg-line-height` → `var(--line-height-tightest)` (1.1)
- `--heading-md-line-height`, `--heading-sm-line-height` → `var(--line-height-tighter)` (1.25)
- `--body-md`, `--body-sm`, `--code`, `--eyebrow` line-height → `var(--line-height-normal)` (1.5, unchanged)

### Drop the responsive mobile re-points

Remove the two `--heading-xl-line-height` / `--heading-lg-line-height` re-points (and their comment) from the `@media (max-width: 768px)` block in `tokens.css`. h1/h2 are now `tightest` (1.1) at every viewport, so the re-points are redundant and would fight an editor edit. This retires the `appendMediaOverride` mechanism (see step 6).

### Eyebrow text-transform → editable, default `none`

`--eyebrow-text-transform: none` (was `uppercase`) in `tokens.css` and the additive migration. Editable in the editor (step 7/8).

## Global invariants (reviewer checklist)

1. Every `var(--line-height-…)` reference across the repo resolves to one of exactly `{none, tightest, tighter, tight, normal, relaxed}`. No `--line-height-loose`/`--line-height-looser` survives **outside** `vite-plugin/tokensCssMigrations/migrations/`.
2. Scale values exact: none=1, tightest=1.1, tighter=1.25, tight=1.35, normal=1.5, relaxed=1.75.
3. Bundles stay alias-only except `--eyebrow-text-transform: none` (the sole raw value now).
4. No new `--surface-*`/`--text-*`/`--color-*` tokens.
5. Migrations stay idempotent; `findContractViolations` clean; `npm run check:token-contract` passes (pre-1.0 breaking warning + CHANGELOG flag is fine).
6. Editor chrome greyscale, `--ui-*` only. The Text Styles table now has NO locked cells — line-height is a picker for every row; text-transform is a picker on the eyebrow row only (other rows: empty transform cell).
7. `tokens.css` stays hand-authored; edits are repo edits with the paired migration updates.

## Steps (one commit)

1. **`src/system/styles/tokens.css`** — reshape the Line Heights block to the six new names/values (drop `looser`, insert `tight: 1.35`, rename per the map); update the block comment; set the heading bundle line-heights to `tightest`/`tighter` as above; delete the two heading line-height re-points from the 768px `@media` block (keep the font-size overrides and margin-related lines); set `--eyebrow-text-transform: none`.

2. **Sweep** every remaining `--line-height-{tighter,tight,loose}` reference, applying the ordered rename map, across: `src/**/*.{svelte,css,ts}` (component `:global(:root)`, app css, editor UI/styles, demo), `src/live-tokens/data/**/*.json`, `src/live-tokens/data/tokens.generated.css`, `src/editor/docs/content/*.md`, `TOKENS.md`, `scripts/`. EXCLUDE `vite-plugin/tokensCssMigrations/migrations/` (hand-edited in step 5) and handle `tokenScales.ts` + `UILineHeightSelector.svelte` explicitly (steps 3–4). Mechanical exact-name replacement only; never touch values except where a value change is specified here.

3. **`src/editor/ui/sections/tokenScales.ts`** — set `LINE_HEIGHT_VARS` to the six new names in scale order: none, tightest, tighter, tight, normal, relaxed.

4. **`src/editor/ui/UILineHeightSelector.svelte`** (stale-bug fix) — its `options` currently map `xs/sm/md/lg/xl` → old values via `varPrefix="--line-height-"`. Replace with the final scale: `none`(1), `tightest`(1.1), `tighter`(1.25), `tight`(1.35), `normal`(1.5), `relaxed`(1.75). (Wave 1 missed this file because the var name is built dynamically.)

5. **Migrations (both unreleased — edit in place, no new migration):**
   - `2026-07-20-line-height-rename.ts`: it renames a pre-Wave-1 consumer's `xs..xl` scale to the current scale. Update `RENAMES` to the FINAL targets: `xs→none`, `sm→tighter`, `md→normal`, `lg→relaxed`; and `removeToken('--line-height-xl')` (retire the 2.0 slot). Update the `ensureScale` entries to the full final scale (none/tightest/tighter/tight/normal/relaxed). Keep idempotent; update the doc comment.
   - `2026-07-20-semantic-text-styles.ts`: set the heading bundle line-heights (xl/lg → `var(--line-height-tightest)`, md/sm → `var(--line-height-tighter)`); set `--eyebrow-text-transform` value to `none`; remove the `RESPONSIVE` re-points and the `appendMediaOverride` call (apply = the bundle `ensureScale` only).

6. **Retire `appendMediaOverride`** (now unused) — first grep-confirm nothing else calls it, then remove `appendMediaOverride` + the private `collectAtRuleRegions` from `cssTokenOps.ts`, its re-export from `index.ts`, its `describe('appendMediaOverride', …)` block from `cssTokenOps.test.ts`, and the `@media` re-point assertions from the semantic-text-styles migration test in `index.test.ts`. If any other caller exists, STOP and report instead.

7. **`src/editor/ui/TextStylesSection.svelte` + `src/editor/ui/sections/textStyles.ts`** — unlock:
   - Line-height column: render `UILineHeightSelector` (variable `${prefix}-line-height`) for EVERY row. Remove the read-only locked line-height cell and the `getComputedStyle`-based `locked` derivation used only for it.
   - Transform column: render the new `UITextTransformSelector` (step 8) for the eyebrow row only; other rows keep an empty transform cell.
   - Registry: drop the `lockedAxes` locking model. Mark eyebrow as the single style with an editable text-transform (e.g. a `hasTextTransform: true` flag or equivalent). Keep it data-driven; don't hardcode the eyebrow prefix in the component if a registry flag reads cleaner.

8. **New `src/editor/ui/UITextTransformSelector.svelte`** — a keyword picker (text-transform is a literal keyword, not a scale alias). Options: `none`, `uppercase`, `lowercase`, `capitalize`. Mirror `UIFontFamilySelector`'s use of `UITokenSelector` — `selector.writeOverride(keyword)` writes the literal value; `writeOverride(null)` resets to inherited; read the current value to mark the active option. Preview each option by rendering a short sample through that transform. Greyscale `--ui-*` chrome only. Svelte 5 runes; get `npm run check` clean. If the Svelte MCP autofixer is available, run it.

9. **Tests** — update `index.test.ts` migration assertions to the final scale values and names, to `--eyebrow-text-transform: none`, and remove the dropped `@media` re-point assertions; remove the `appendMediaOverride` tests (step 6). Fix any other test that asserts the old scale (`loose`/`looser`) or the old eyebrow uppercase default. The Wave-1 rename test's dynamic `oldSteps` fixture must reflect the final mapping (xl retired).

## Verification (green before commit)

`npm test`, `npm run check` (0 errors), `npm run build:plugin` then `npm run check:token-contract`, `npm run check:component-defaults`, `npm run check:editor-font-isolation`, `npm run build`. Plus: grep-confirm invariant 1 (no `--line-height-loose`/`-looser` outside `migrations/`, and every referenced step name is in the valid set).

Commit (stage wave files only, exclude `package-lock.json`):
```
Text styles W6: reshape line-height scale (none/tightest/tighter/tight/normal/relaxed) + unlock line-height & eyebrow transform in the editor

<short body>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X8oaD88HvwSFwh4Wz2MNxD
```
Do NOT push/tag/release. Do NOT start the dev server. Stop after the single commit.

If reality contradicts this spec (a mechanism differs, a rename collides unexpectedly, `appendMediaOverride` has another caller), STOP and report instead of improvising.
