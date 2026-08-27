# Execution plan: the sketch layer belongs to the theme

Branch off `main` as `sketch-in-the-theme`. Five waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green.

**Execution model.** A fresh Opus session orchestrates from this doc and writes no wave code itself. Each wave runs in a `wave-executor` sub-agent on **Sonnet**. The review gate after each wave (`wave-reviewer`) runs at the orchestrator's tier (Opus). The manual halves of each wave's verification belong to the user; the executor runs only the automated commands and reports the manual checklist as pending.

**Precondition:** a clean working tree, and no dev server running. A running server re-adopts its open theme and rewrites the data tree underneath a wave (see `feedback_cli_buffer_vs_running_editor`). Never stash, reset, or checkout over uncommitted changes; if the tree is dirty, stop and report.

Line numbers date from `0.62.0`. Locate by the cited symbol or string, and stop only if the symbol itself is gone.

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 1 | `Theme.sketch`, carried through `normalizeTheme` | Sonnet | Not started | |
| 2 | Capture on save, hydrate on apply and on boot | Sonnet | Not started | |
| 3 | Off-the-theme signal and the Theme panel row | Sonnet | Not started | |
| 4 | Sketchy carries its own sketch layer | Sonnet | Not started | |
| 5 | Docs and changelog | Sonnet | Not started | |

The orchestrator updates this table after each review gate: `Not started` to `In progress` to `Done` (or `Blocked`, with a one-line reason under the table). Record the short commit SHA.

Wave 1 is invisible on its own. Waves 1 and 2 together are the feature. Cutting after Wave 2 leaves a coherent product: the sketch layer round-trips through themes, but an unsaved dial move is silent. Cutting between 1 and 2 leaves a field nothing writes.

---

## The problem

The sketch dials live in four localStorage keys (`sketchStore.ts:18`): `lt.sketchEnabled`, `lt.sketchSettings`, `lt.sketchPreset`, `lt.sketchBaseline`. Browser-scoped and origin-scoped. They survive a reload on one machine and nothing else sees them. The only thing that reaches disk is an explicit **Save current**, which writes `data/sketch-presets/<slug>.json`: a named look you can pick again, bound to no theme.

So a look that includes a sketch layer is not a look anyone can hand over. Open the same theme on another machine, or after clearing site data, and the drawing is gone with no record that it was ever part of the design. `themeFileApi.ts:263` states the original rationale, that a sketch look is a draft effect never opened as a document nor published. That was right while Sketch mode was a way to look at the page. It stopped being right when Sketchy shipped as a preset theme: the theme now carries sketchy colors and type for a page that renders crisp.

The layer already behaves like part of the theme. It reads `--{stem}-surface`, `-border` and `-radius` off whatever theme is active and redraws them. It is stored like a scratch setting and used like a design decision.

## The fix

A theme carries its sketch layer by value, the way it already carries `colorsAndType` and `componentConfigs`:

```jsonc
{
  "name": "Sketchy",
  "schemaVersion": 4,
  "colorsAndType": { ... },
  "componentConfigs": { ... },
  "sketch": { "label": "Napkin", "blurb": "...", "fillTravel": 2.5, ... }
}
```

Presence is the on state. A theme with no `sketch` key paints no sketch layer, which is what every theme on disk today means and what every theme written before this change keeps meaning.

`sketch-presets/` is untouched. A preset is a reusable look you pick from, exactly the relation `colors-and-type/*.json` has to a theme. Saving a preset and saving a theme stay separate gestures.

Out of scope, and deliberately: **Adopt does not bake the layer, and a production build still has no sketch in it.** That decision needs its own evidence (an injected SVG defs block, or data-URI filter refs; the paint cost of filters on every drawn part) and is written up under "The second move" at the end of this doc. This plan makes the look survive; it does not make it ship.

## Reserved judgment calls (already decided, do not re-litigate)

1. **Presence is the on state. There is no `sketchEnabled` field in the theme.** A boolean beside the settings is a second thing to keep in agreement with the first, and the disagreement (`enabled: false` with a full dial set) has no meaning worth storing. `sketch` absent, or `sketch: null`, is off.

2. **`THEME_SCHEMA_VERSION` stays at 4, and there is no migration.** An older theme read by a newer editor means "no sketch", which is exactly what it meant when it was written; a newer theme read by an older editor drops a field it does not know. Both directions degrade correctly, so there is nothing for a migration to do, and a bump would mark every theme on disk `migrated` and rewrite it at boot for no change in content. Compare RJC 5 of `docs/plans/palette-hue-curve.md`.

3. **The theme stores settings only, never the preset name.** The Sketch tab's readout picks the name back up by comparing the loaded dials against the shipped presets (`sameLook`, already in `sketchStore.ts`) and falls back to the adjusted-from-a-preset state. A stored name goes stale the moment a saved preset is deleted or a dial moves; derivation cannot.

4. **localStorage stays, as the live buffer and as the cross-document channel.** It keeps the effect painting on the first frame, before any fetch lands, and the storage-event handshake in `sketchStore.ts:250` is what keeps the overlay iframe and the host page in step. What changes is its authority: it holds the live value, the open theme holds the saved one, and the difference between them is unsaved work.

5. **Unsaved is derived, never flagged.** `sketchOffLook` compares the live pair (enabled, settings) against the open theme's `sketch`. Dial a value back to where the theme has it and the panel stops claiming a change, with no bookkeeping to get wrong. This is the rule `sketchDirty` already follows against the preset baseline.

6. **Applying a theme overwrites the live sketch state, buffer included.** Loading a theme already clears the `_working` buffers (`CLAUDE.md`, `clearAllWorking` at `themeFileApi.ts:1674`). Sketch follows the same rule rather than inventing a preserve-my-dials exception.

7. **An existing user's localStorage sketch reads as unsaved work after the upgrade.** Their dials are live, their theme has no `sketch`, so the panel says the sketch is off the theme and Save folds it in. That is the honest reading of what those dials were, and it needs no migration.

8. **No new door and no `sketch/_working.json`.** Saving a theme goes through the theme door, which already carries the whole document. A server-side buffer file would be a second channel next to the localStorage one the iframe sync needs anyway, and the CLI has no reason to write sketch dials.

9. **The Default theme never carries a sketch layer.** It is regenerated at boot and is the crisp baseline. Nothing in this plan writes to it.

10. UI copy: no em-dashes, short sentences. Values tokenized. Pill buttons via `UIPillButton`. Comments state only non-obvious WHYs and never restate the code.

## Global invariants (reviewer checklist)

1. **`normalizeTheme` returns a whitelist.** Its return is an object literal built key by key (`normalizeTheme.ts:272`), so a field it does not name is destroyed on every read and on every PUT, which normalizes the incoming body before writing (`themeFileApi.ts:1570`). `sketch` must be named there, and `EncapsulatedTheme` must declare it, or Wave 2 writes a field that vanishes on the next read.
2. **A theme with no `sketch` key round-trips byte-identical.** No wave writes `"sketch": null` into a file that had no sketch.
3. **Absent means off, everywhere.** No code path resolves a missing `sketch` to a default preset. `hydrateSketchSettings` fills missing *dials* inside a sketch that exists; it is never called on a theme that has none.
4. **Export and import carry it for free.** `ThemeBundle.manifest` is a whole `Theme` and import runs `normalizeTheme`, so Wave 1 is the entire cost. Wave 1 pins this with a test rather than assuming it.
5. **The editor's own chrome never draws sketched.** `setSketchPageRoot` (`LiveTokensRouter.svelte:109`) stays the only thing that decides which root paints. No wave touches it.
6. **`tokens.generated.css`, `fonts.css` and `tokens.css` are untouched by every wave.** Adopt's bake is out of scope; the token contract does not move.
7. **The data tree is live app state.** Only Wave 4 writes to `src/live-tokens/data/`, where that write is the deliverable. Every other wave leaves it clean; restore per the recipe in `CLAUDE.md` before committing, and run `node scripts/check-production-is-default.mjs`.
8. `npm run check` clean and `npm run test` green at every wave boundary.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing; never commit red. Commit message `Sketch in the theme W<n>: <summary>` plus the standard co-author trailer. Do not push, tag, or release. Stop after each wave for review. If reality contradicts this plan (a cited symbol is missing, a test pins conflicting behavior), stop and report rather than improvise.

---

## Wave 1 — the field, and the server carrying it

**Goal:** a theme file can hold a sketch layer and survive every read, write, export and import with it intact. Nothing writes one yet, so nothing renders differently.

**Executor:** Sonnet.

Files: `src/editor/core/themes/themeTypes.ts`, `vite-plugin/themes/normalizeTheme.ts`, `vite-plugin/themes/normalizeTheme.test.ts`, `vite-plugin/themeFileApi.themes.test.ts`.

1. `themeTypes.ts`, on `Theme` (after `componentSchemaVersion`, `:281`):

   ```ts
   /** The sketch layer this look paints, by value. Absent means the look is
    *  crisp: presence is the on state, so there is no separate flag that can
    *  disagree with the dials beside it (RJC 1). */
   sketch?: SketchSettings;
   ```

   with `import type { SketchSettings } from '../sketch/sketchPresets';` at the top. `sketchPresets.ts` imports nothing, so this adds no cycle and no browser dependency to a type module the server reads.

2. `normalizeTheme.ts`: declare `sketch?: SketchSettings` on `EncapsulatedTheme` (`:53`) with the same comment, import `hydrateSketchSettings` and the type from `../../src/editor/core/sketch/sketchPresets`, and resolve it just before the return:

   ```ts
   // Reconciled the way a saved preset is: a look stored before a dial existed
   // picks that dial's default up, a retired key is dropped. A theme with no
   // sketch keeps none — absent is the off state, not a value to fill (RJC 3).
   const embeddedSketch = asObject(src.sketch);
   const sketch = embeddedSketch ? hydrateSketchSettings(embeddedSketch) : undefined;
   ```

   and in the returned theme, `...(sketch ? { sketch } : {})`. Nothing else in the function changes.

3. Tests in `normalizeTheme.test.ts`:
   - a theme carrying a full sketch round-trips its dials unchanged;
   - a theme with no `sketch` key comes back with no `sketch` key (`expect('sketch' in theme).toBe(false)`), not `undefined` written into the file;
   - `sketch: null`, `sketch: "napkin"` and `sketch: []` all resolve to no sketch;
   - a sketch missing a dial gets that dial from the fallback preset, and an unknown key is dropped;
   - the completeness fill does not invent a sketch for a theme that has none.

4. Test in `themeFileApi.themes.test.ts`: PUT a theme carrying a sketch, GET it back, and assert the dials survived. This is the one that would have caught the whitelist (invariant 1). Add an export/import round-trip assertion in the same file if one already exists to extend; otherwise add one (invariant 4).

**Verification:** `npm run test`, `npm run check`, `npm run check:preset-themes`. `git status --short src/live-tokens/data` empty.

---

## Wave 2 — capture on save, hydrate on apply and on boot

**Goal:** Save folds the live sketch into the open theme, Load applies the theme's sketch, and a reload comes back to what the theme says unless there are unsaved dials.

**Executor:** Sonnet.

Files: `src/editor/core/sketch/sketchStore.ts`, `src/editor/core/themes/themeService.ts`, `src/editor/core/themes/themeDocumentSync.ts`, `src/editor/core/themes/themeInit.ts`, `src/editor/core/sketch/sketchStore.test.ts`.

1. `sketchStore.ts` gains three things:

   ```ts
   /** The live look as a theme would carry it: the dials when the effect is
       on, nothing when it is off (RJC 1). */
   export function liveSketch(): SketchSettings | undefined {
     return get(sketchEnabled) ? get(sketchSettings) : undefined;
   }

   /** What the open theme holds, so "unsaved" is a comparison rather than a
       flag (RJC 5). Set by every path that opens or saves a theme. */
   export const themeSketch = writable<SketchSettings | undefined>(undefined);

   /** Open a theme's sketch layer: the dials, the on/off state, and the preset
       label recovered by comparison (RJC 3). Overwrites the live buffer, which
       is what opening a theme means everywhere else (RJC 6). */
   export function openThemeSketch(sketch: SketchSettings | undefined): void { ... }
   ```

   `openThemeSketch` sets `themeSketch`, then either `sketchEnabled.set(false)` (absent) or `sketchSettings.set({ ...sketch })` plus `sketchEnabled.set(true)`. It sets `sketchBaseline` to the same object and `sketchPreset` to the shipped preset whose dials match under `sameLook`, or `''` when none does. It must not write a saved-preset name: a `user:` label the file for which no longer exists is the state `deleteUserSketchPreset` already clears.

2. `themeService.ts`: `captureLook` returns `Pick<Theme, 'colorsAndType' | 'componentConfigs' | 'sketch'>` and adds `sketch: liveSketch()`. Both `saveAsTheme` and `saveActiveTheme` spread it already, so the only other change is setting `themeSketch.set(look.sketch)` after a successful write, so a save clears the off-the-theme state it just resolved.

   Note for the executor: `captureLook` reads server doors for everything else. Sketch is the exception by design (RJC 8); state that in one line of comment where the field is captured, because a reader will otherwise expect a fetch.

3. `themeDocumentSync.ts`: `hydrateAppliedTheme` calls `openThemeSketch(result.theme?.sketch)`. The apply response already carries the whole theme (`themeFileApi.ts:1695`), so no new field on `ApplyThemeResult` is needed. Extend `isAppliedThemeMessage` only if it would reject a message whose `theme` carries the new key; it validates by presence, so it should not.

4. `themeInit.ts`: at the end of `initializeTheme`, read the active theme and reconcile:

   ```ts
   const active = await safeFetch<Theme>(`${API_BASE}/themes/active`);
   ```

   Set `themeSketch` to `active?.sketch`. Then, and only then, decide the live state: if the persisted buffer already matches the theme, leave it alone (it painted on the first frame and re-setting it would restart the layer); if it differs, leave the buffer live as well, because it is unsaved work Wave 3 is about to make visible. In other words boot never overwrites the buffer; it only learns what the theme holds. The one case that does write is a document with no persisted sketch state at all, where the theme's value becomes the live value.

   The executor should read `readEnabled`/`readSettings` in `sketchStore.ts:24` before writing this: "no persisted state" has to mean the keys are absent, not that they parsed to the default preset.

5. Tests in `sketchStore.test.ts`: `openThemeSketch(undefined)` turns the effect off and empties the preset selection; `openThemeSketch(napkinDials)` turns it on, selects `napkin` by comparison, and reports `sketchDirty` false; a theme carrying dials that match no preset selects `''` and still reports clean; `liveSketch()` returns `undefined` while disabled and the dials while enabled.

**Verification:** `npm run test`, `npm run check`. Manual, for the user: dial the sketch, Save the open theme, reload, confirm the dials come back; Load a theme with no sketch and confirm the page goes crisp; Load a sketched theme from the overlay and confirm the host page and the preview agree.

---

## Wave 3 — the off-the-theme signal

**Goal:** an unsaved dial move reads as unsaved, in the same place the panel already reports colors and components.

**Executor:** Sonnet.

Files: `src/editor/core/sketch/sketchStore.ts`, `src/editor/ui/ThemePanel.svelte`, `src/editor/ui/sketch/SketchTab.svelte`, `src/editor/core/sketch/sketchStore.test.ts`.

1. `sketchStore.ts`:

   ```ts
   /** The live sketch differs from what the open theme carries. Presence is
       half the comparison: on with dials the theme does not hold, or off while
       the theme holds a layer, are both off the theme. */
   export const sketchOffLook = derived(
     [sketchEnabled, sketchSettings, themeSketch],
     ([enabled, settings, saved]) => { ... },
   );
   ```

   Reuse `sameLook` for the dial half. Every dial move must also set `liveMovedSinceBake` true, matching what `writeWorkingComponentConfig` does for a component buffer; put that in `updateSketchSettings` and in the `sketchEnabled` subscription rather than at each call site.

2. `ThemePanel.svelte`: fold `$sketchOffLook` into `unsavedEdits` (`:107`), and add a third row to the `look-parts` list (`:810`), after Components, in the same shape:

   ```
   Sketch   · Napkin            (in sync, naming the matched preset)
   Sketch   · off the theme     (sketchOffLook)
   Sketch   · none              (theme carries no layer, effect off)
   ```

   The label the row prints comes from the same comparison Wave 2 used, so read it off `sketchPreset`/`sketchSettings.label` rather than recomputing. Add a `UIInfoPopover` matching its neighbours: one paragraph saying the sketch layer is part of the theme and travels with it, one saying it does not reach a production build. No new colors; the row is greyscale like the rest of the panel.

3. `SketchTab.svelte`: the header readout gains one line when `$sketchOffLook`, saying the dials are ahead of the saved theme and naming Save in the Theme panel as the thing that folds them in. One sentence, no new control: the tab does not grow a second save button next to **Save current**, which means something else (a preset file).

4. Tests: `sketchOffLook` false when the live state matches the theme in both the absent and present cases; true when the effect is on and the theme has none; true when the effect is off and the theme has one; false again after `openThemeSketch` of the live value.

**Verification:** `npm run test`, `npm run check`. Manual: move a dial, confirm the Theme panel says off the theme and Adopt reports the look unpublished; Save, confirm both clear.

---

## Wave 4 — Sketchy carries its own sketch layer

**Goal:** the preset theme named Sketchy paints sketched when you load it.

**Executor:** Sonnet.

**Settled: Sketchy ships `marker`, written in verbatim from `SKETCH_PRESETS`.** Cabin Sketch on display and Shantell Sans on body are a felt-tip hand, and Marker is the same instrument, so the drawing and the lettering read as one hand. Napkin's square wave sends every edge to full travel, which is too loose to hand someone as a shipped example; Pencil's fine graphite sits at a different weight from a rough display face. Do not re-open this.

Files: `src/live-tokens/data/themes/sketchy.json`, `scripts/check-preset-themes.mjs`, `vite-plugin/themes/presetThemes.test.ts`.

1. `sketchy.json` gains the `sketch` object, the `marker` entry of `SKETCH_PRESETS` copied by value, `label` and `blurb` included. Nothing else in the file moves: no `colorsAndType` edit, no alias reordering, no `updatedAt` churn beyond what the write itself does. Diff it before committing and reject any other change (the promotion in `0.57.0` taught this; see `project_sketch_mode_release`).

2. Pin it. `check-preset-themes.mjs` gains an assertion that `sketchy` carries a `sketch` and that every other preset theme carries none, phrased as a property of the preset set rather than of the seeder, since `seed-preset-theme.mjs` cannot rebuild Sketchy and has no slug for it. Mirror the phrasing already used for its font pairing.

3. `presetThemes.test.ts`: the same pin at the unit level, plus an assertion that `normalizeTheme` leaves Sketchy's sketch dials unchanged on read.

**Verification:** `npm run test`, `npm run check:preset-themes`. Manual: load Sketchy from a clean state, confirm the page draws sketched, confirm loading any other preset returns it to crisp. Then restore the data tree per `CLAUDE.md` and confirm `node scripts/check-production-is-default.mjs` passes, since the only intended data change in this wave is `themes/sketchy.json` itself.

---

## Wave 5 — docs and changelog

**Goal:** the shipped guide describes what is now true.

**Executor:** Sonnet.

Files: `src/editor/docs/content/sketch-mode.md`, `src/editor/docs/content.generated.ts` (generated), `CHANGELOG.md`.

1. Rewrite "Where the settings live" (`sketch-mode.md:71`). What it must now say: the dials belong to the theme and are saved with it; the browser holds them until you save, which is what the Theme panel calls off the theme; **Save current** in the Sketch tab is a different gesture, a named preset you can pick from any theme; a production build still has no sketch layer in it.

   Delete "Sketch mode is a tool for looking at the page, not a layer the page can ship" only if the second move lands; while this plan stands alone it is still true, and the paragraph needs the middle sentence corrected rather than the claim dropped.

2. Check `01-overview.md` and `editing-tokens.md` for the same claim stated in passing, and correct it where it appears.

3. `npm run sync:docs` to regenerate `content.generated.ts`. Never hand-edit it. `npm run check:docs-content` must pass.

4. `CHANGELOG.md`: one entry under a new unreleased heading, naming the theme field, the preset files staying where they are, and the unchanged production behaviour.

**Verification:** `npm run check:docs-content`, `npm run test`, `npm run check`.

---

## The second move, not in this plan

Whether Adopt bakes the layer. Once a theme carries a sketch, "the production theme is sketchy and the built site is not" is two truths in one document, so the eventual answer is probably yes. It is a separate piece of work with its own evidence to gather:

- **How it ships.** The layer builds an SVG filter bank and injects it into the document (`sketchLayer.ts:1087`), so a static stylesheet is not enough on its own. Either the bake emits a `sketch.generated.css` whose filters are data-URI SVG refs, or the package exports a small runtime the consumer's entry calls with the production theme's settings. The first keeps the consumer's app untouched; the second is honest about needing JS.
- **What it costs.** Filters on every drawn part, on every page. Measure before committing.
- **Who opts in.** A consumer who adopts a sketched theme without wanting a sketched build needs a way to say so, and that is a new piece of public API surface.

Do not start it inside this plan. The model above was chosen so that the second move is a bake step reading a field that already exists, not a re-model.
