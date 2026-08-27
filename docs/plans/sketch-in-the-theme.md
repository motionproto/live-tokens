# Execution plan: the sketch layer belongs to the theme

Branch off `main` as `sketch-in-the-theme`. Five waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green.

**Execution model.** A fresh Opus session orchestrates from this doc and writes no wave code itself. Each wave runs in a `wave-executor` sub-agent on **Sonnet**. The review gate after each wave (`wave-reviewer`) runs at the orchestrator's tier (Opus). The manual halves of each wave's verification belong to the user; the executor runs only the automated commands and reports the manual checklist as pending.

**Precondition:** a clean working tree, and no dev server running. A running server re-adopts its open theme and rewrites the data tree underneath a wave (see `feedback_cli_buffer_vs_running_editor`). Never stash, reset, or checkout over uncommitted changes; if the tree is dirty, stop and report.

Line numbers date from `0.62.0`. Locate by the cited symbol or string, and stop only if the symbol itself is gone.

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 1 | `Theme.sketch`, carried through `normalizeTheme` | Sonnet | Done | 19ae14c |
| 2 | Capture on save, hydrate on apply and on boot | Sonnet | Done | b2ea83d |
| 3 | Off-the-theme signal and the Theme panel row | Sonnet | Done | 9dbceec + d84d124 |
| 4 | The bake flag follows the gesture | Sonnet | Done | c2cd143 + 68c3551 |
| 5 | Docs and changelog | Sonnet | Done | 3cb0d57 + 0e304ac + 40397dd |
| 6 | The sketchstyle, named as one thing | Sonnet | Done | 2ddf9b6 + 04f7f0c + c979c0b |
| 7 | The preview honours the theme's sketchstyle | Sonnet | Not started | |

Wave 5 blocked at its first gate: `themes-workflow.md` still said two parts sit under a theme, and Wave 3 had added a third. The plan's item 2 named only `01-overview.md` and `editing-tokens.md`, so the sweep missed the chapter that documents the panel. It passed on re-review after `0e304ac` and `40397dd`, which swept all eight chapters and carried the corrected vocabulary into four source files' comments and the Sketch tab's popover.

Wave 3 blocked at its first gate (`SketchSelect` bypassed the sentinel; the Sketch tab misdescribed the effect-off case) and passed on re-review after `d84d124`.

Wave 4 was "Sketchy carries its own sketch layer". Dropped: Sketchy is an ordinary theme, and its name is a coincidence rather than a binding to Sketch mode. A sketchstyle applies to any theme, so shipping one baked into that file would assert a design connection that does not exist. Wave 4 now carries the bake-flag findings the Wave 2 and Wave 3 gates raised, which needed a home once the original wave went away.

Wave 6 blocked at its first gate: the new Open pill was a dead control on the full-page components route, where `ThemePanel` renders outside the view switcher, and a shipped skill reference still named the old two-word view label. It passed on re-review after `04f7f0c`, which gated both pills on `showComponentsLink` and took the two-word form out of the shipped skills. `c979c0b` then pinned the gate in `ThemePanel.test.ts`, whose harness already mounted the panel with the prop false.

Wave 6 was inserted after Wave 5 and before the preview work, which moved to Wave 7. The three parts of a theme now share the word "preset" with the themes themselves, and the preview wave should be written in the settled vocabulary rather than renamed after the fact.

The orchestrator updates this table after each review gate: `Not started` to `In progress` to `Done` (or `Blocked`, with a one-line reason under the table). Record the short commit SHA.

Wave 1 is invisible on its own. Waves 1 and 2 together are the feature. Cutting after Wave 2 leaves a coherent product: the sketch layer round-trips through themes, but an unsaved dial move is silent. Cutting between 1 and 2 leaves a field nothing writes.

---

## The problem

The sketch dials live in four localStorage keys (`sketchStore.ts:18`): `lt.sketchEnabled`, `lt.sketchSettings`, `lt.sketchPreset`, `lt.sketchBaseline`. Browser-scoped and origin-scoped. They survive a reload on one machine and nothing else sees them. The only thing that reaches disk is an explicit **Save current**, which writes `data/sketch-presets/<slug>.json`: a named look you can pick again, bound to no theme.

So a look that includes a sketch layer is not a look anyone can hand over. Open the same theme on another machine, or after clearing site data, and the drawing is gone with no record that it was ever part of the design. `themeFileApi.ts:263` states the original rationale, that a sketch look is a draft effect never opened as a document nor published. That was right while Sketch mode was a way to look at the page. It stopped being right once the dials became a design decision. Any theme can wear any sketchstyle, and which one it wears is part of the look.

The layer already behaves like part of the theme. It reads `--{stem}-surface`, `-border` and `-radius` off whatever theme is active and redraws them. It is stored like a scratch setting and used like a design decision.

## The fix

A theme carries its sketch layer by value, the way it already carries `colorsAndType` and `componentConfigs`:

```jsonc
{
  "name": "Autumn",
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
7. **The data tree is live app state.** No wave writes to `src/live-tokens/data/`. Every wave leaves it clean; restore per the recipe in `CLAUDE.md` before committing, and run `node scripts/check-production-is-default.mjs`.
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

## Wave 4 — the bake flag follows the gesture

**Goal:** `liveMovedSinceBake` reports a moved look when the user moved it, and only then.

**Executor:** Sonnet.

This wave replaces the original Wave 4, which shipped a sketch layer inside `themes/sketchy.json`. That is dropped: Sketchy is an ordinary theme whose name coincides with the feature, and a sketchstyle applies to any theme, so baking one into that file would state a relationship that is not there. Nothing in this plan now writes to `src/live-tokens/data/`.

What lands instead are three findings the Wave 2 and Wave 3 gates raised against one mechanism. They were parked on the old Wave 4 because a shipped theme carrying a sketch made the first of them unconditional. Without that theme they are rarer, not gone: any theme a user saves with a sketch layer reaches the same paths.

Files: `src/editor/core/sketch/sketchStore.ts`, `src/editor/core/productionPulse.ts`, `src/editor/core/sketch/sketchStore.test.ts`.

1. Move `liveMovedSinceBake.set(true)` off the `sketchEnabled` subscription (`sketchStore.ts:323`) and onto the gesture boundary in `setSketchEnabled`, beside the one already in `updateSketchSettings`. Wave 3 put it in the subscription because that is what the plan said; a subscription fires for things that are not gestures. The move closes two false positives the gate confirmed: boot's `openThemeSketch` on an untouched browser raises the flag with nothing clearing it, and a peer document's Apply raises this document's flag through the storage echo. It should also retire the `sketchEnabledHydrated` first-tick guard, which exists only to paper over the first of those.

2. Preset picks genuinely move the look off the bake, and today nothing records it: `selectSketchPreset` (`:189`) and `selectUserSketchPreset` (`:206`) write `sketchSettings` directly rather than through `updateSketchSettings`. Picking a preset while the effect is on replaces every dial and repaints, so it gets the flag.

   Two limits on that, both corrections to an earlier draft of this item. `saveCurrentAsSketchPreset` (`:217`) is **not** in the set: it rewrites `label` only, and `sameLook` defines `label` and `blurb` as outside the look, so flagging there makes the Sketch row read in sync while Adopt reads unpublished. And every writer in the set flags only while the effect is on. `liveSketch()` returns `undefined` while it is off, so nothing done to the dials then can reach a theme or a bake, and the preset grid stays interactive with the effect off. That gate belongs on `updateSketchSettings` too, which has the same defect from Wave 3; three of four gated is the inconsistency this plan warns against elsewhere.

3. `productionPulse.ts:37` lists its writers exhaustively and the list predates this branch. Its value is that it is exhaustive, so bring it current.

4. `SketchTab.svelte:262` tells the user to "Save it in the Theme panel", but Save is disabled while the protected Default theme is open (`ThemePanel.svelte:774`) and the gesture there is Save As. RJC 9 keeps Default free of a sketch layer, so this is the state anyone hits who turns Sketch on with Default open. Name the gesture that is actually available. Read the panel's own disabled condition rather than assuming which one applies.

5. `hasPersistedSketchState()` (`sketchStore.ts:48`) returns a module-level flag read once at import, so a document that adopts a peer's change through the storage handshake (`:344`) keeps a stale `false` until it reloads. The gate found a sub-second window: flip the page's sketch select while the overlay iframe is between its import and `themes/active` resolving, and the iframe's boot reconcile overwrites the choice and echoes it back. Re-read `TOUCHED_KEY` in the function instead of returning the cached flag.

Tests: a preset pick while the effect is on sets `liveMovedSinceBake`; `openThemeSketch` does not; the storage-echo path does not raise it in a document that did not act.

**Verification:** `npm run test`, `npm run check`. `git status --short src/live-tokens/data` empty. Manual, for the user: with a saved sketched theme open, reload and confirm the Theme panel does not claim the look is unpublished before you touch anything; move a dial and confirm it does.

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

## Wave 6 — the sketchstyle, named as one thing

**Goal:** one noun for the drawing, in the code, on the screen, in the route and on disk. Two save gestures that cannot be mistaken for each other.

**Executor:** Sonnet.

Waves 1 to 5 gave a theme three parts and left the third sharing a word with the other two. "Preset" already names the nine shipped Themes, and `ThemePanel.svelte:650` calls the colors-and-type files presets too. So "sketch preset" distinguishes nothing: the seven built-in looks, the user's saved ones and a whole theme are all presets. The word also names a provenance rather than a thing, and Waves 1 to 5 turned these dials into a design decision a theme carries by value.

**Sketchstyle**, one word. Not "style", which floats free beside "theme" and leaves the containment unstated. The compound names the thing and cannot decay into the vaguer word.

### Reserved judgment calls for this wave

1. **One word, everywhere.** "Sketchstyle" in copy, `SketchStyle` in code, `sketch-styles` on disk and in the route. Never "sketch style", never a bare "style".

   Two shipped labels are already the loose form and both change. The editor's fourth view reads **Sketch Style** (`EditorViewSwitcher.svelte:35` and `:104`, shipped on `main`) and becomes **Sketchstyle**. The Theme panel's part row reads **Sketch** (`ThemePanel.svelte:861`) and becomes **Sketchstyle** too, so the row, the view and the field `Theme.sketchStyle` all say the same word. The three parts of a theme then read Colors & Type, Components, Sketchstyle.

   The toggle inside the view stays **Sketch mode**. It names the mode, which is a separate thing from the drawing the mode paints, and it is the one place the shorter word is correct.

2. **The theme field renames with the rest.** `Theme.sketch` becomes `Theme.sketchStyle`, matching `colorsAndType`, which spells its whole noun. The field is branch-only and absent from `main`, so it has never shipped: this costs nothing today and would cost a schema migration after release.

3. **The directory and route are a real rename; the localStorage keys are mostly not.** `data/sketch-presets/` and `/sketch-presets` shipped in 0.57.0 and are published through 0.62.0, so they need a migration. Of the five browser keys only `lt.sketchPreset` states the wrong noun. Rename that one to `lt.sketchStyleName`, where losing a stored selection degrades to "adjusted from a sketchstyle" and self-heals on the next pick. Leave `lt.sketchEnabled`, `lt.sketchSettings`, `lt.sketchBaseline` and `lt.sketchTouched` alone: a browser key is a private encoding, its name is not the one in dispute, and renaming it would destroy a user's live dials to gain nothing anyone can read.

### The sweep

| Now | After |
|---|---|
| `SketchSettings` | `SketchStyle` |
| `hydrateSketchSettings` | `hydrateSketchStyle` |
| `SKETCH_PRESETS` | `SKETCH_STYLES` |
| `DEFAULT_SKETCH_PRESET` | `DEFAULT_SKETCH_STYLE` |
| `sketchPresets.ts` | `sketchStyles.ts` |
| `sketchPresetService.ts` | `sketchStyleService.ts` |
| `SketchPresetFile`, `SketchPresetMeta` | `SketchStyleFile`, `SketchStyleMeta` |
| `slugifySketchPreset` | `slugifySketchStyle` |
| `listSketchPresets`, `loadSketchPreset`, `saveSketchPreset`, `deleteSketchPreset` | the same verbs on `SketchStyle` |
| `sketchPreset` (store) | `sketchStyleName` |
| `selectSketchPreset` | `selectSketchStyle` |
| `selectUserSketchPreset` | `selectSavedSketchStyle` |
| `saveCurrentAsSketchPreset` | `saveCurrentSketchStyle` |
| `deleteUserSketchPreset` | `deleteSavedSketchStyle` |
| `userSketchPresets`, `refreshUserPresets` | `savedSketchStyles`, `refreshSavedSketchStyles` |
| `USER_PRESET_PREFIX` | `USER_STYLE_PREFIX`, value `'user:'` unchanged (RJC 3) |
| `Theme.sketch`, `themeSketch`, `openThemeSketch`, `liveSketch` | `Theme.sketchStyle`, `themeSketchStyle`, `openThemeSketchStyle`, `liveSketchStyle` |
| `dataPaths.sketchPresetsDir` | `sketchStylesDir` |
| `themeFileApi.sketchPresets.test.ts` | `themeFileApi.sketchStyles.test.ts` |

`sketchOffLook` keeps its name. It matches `componentsOffLook`, which is the panel's own vocabulary for the same idea.

`sketchSettings` and `updateSketchSettings` keep theirs, settled at the Wave 6 gate. The word in dispute was "preset", never "settings", and "settings" names something real: the live dial buffer, whose browser key RJC 3 deliberately keeps. The store is that key's in-memory face, so the two agreeing is the point. The type it holds is `SketchStyle`, the theme's field is `sketchStyle`, and `liveSketchStyle()` is the accessor that crosses between them, so the boundary is named on both sides.

The 24 files carrying an affected identifier: `src/app/SketchSelect.svelte`, `src/editor/core/productionPulse.ts`, the seven files under `src/editor/core/sketch/`, `src/editor/core/themes/themeInit.test.ts`, `src/editor/core/themes/themeTypes.ts`, `src/editor/docs/content/sketch-mode.md`, `src/editor/docs/content/where-themes-live.md`, `src/editor/docs/content.generated.ts` (generated), `src/editor/ui/sketch/SketchPreview.svelte`, `src/editor/ui/sketch/SketchTab.svelte`, `vite-plugin/files/dataPaths.ts`, `vite-plugin/themeFileApi.ts`, `vite-plugin/themeFileApi.sketchPresets.test.ts`, `vite-plugin/themeFileApi.themes.test.ts`, `vite-plugin/themes/normalizeTheme.ts`, `vite-plugin/themes/normalizeTheme.test.ts`. Locate by symbol; the list is a census, not a permission slip.

1. **The code sweep**, per the table. Mechanical, and the definition of done is greppable (see Verification).

   `EditorViewSwitcher.svelte` is not in the census below because it carries no affected identifier, only the label. Sweep it anyway, and grep for the two-word form across `src` rather than trusting the identifier list.

   Two comments call the effect a draft look and are named nowhere else, so a symbol sweep would leave them: `sketchStore.ts:232` ("the effect is a draft look") and the one near `sketchStore.ts:300` ("not worth surfacing for a draft look"). Waves 1 to 5 made both false. The Wave 5 gate found them.

2. **The disk and route rename, with a migration.** `dataPaths.ts` gains `sketchStylesDir: sub('sketch-styles')`; the route table serves `/sketch-styles`. `migrateData` already carries a rename pipeline (`renames`, `planLegacyRenames`, `applyLegacyRenames`, `migrateData.ts:199`); add the directory to it.

   This is a plain rename and not the 0.48 layout hazard. The files inside keep their shape, and no writer aimed at the new name can destroy one under the old, so **boot must not refuse a pre-rename tree** the way `legacyLayout.ts` does. Boot warns, `npx live-tokens migrate` renames. Read `legacyLayout.ts` first to see why the harder treatment was warranted there, and do not copy it.

   `dataPaths.ts:36` calls the directory "a draft-look artifact". Waves 1 to 5 made that false. Correct it.

   One path leads from the soft warning into a hard refusal, found at the gate and left standing: warn, then save a sketchstyle, and `ensureDir` creates `sketch-styles/` with a file in it, so `applyLegacyRenames` afterwards refuses a destination that exists and holds files. The error names the collision and destroys nothing, so it stays a known path rather than a defect. Do not soften `applyLegacyRenames` to accommodate it.

3. **The two Save gestures, named apart.** In `SketchTab.svelte`: **Save current** becomes **Save as sketchstyle…**, the `Saved` band label becomes **Saved sketchstyles**, and the name field's placeholder and `aria-label` become "Sketchstyle name". The Theme panel's **Save** keeps its name. No screen then shows two buttons called Save for one set of dials.

   The tab's info popover (`SketchTab.svelte:246`) currently explains the Theme panel's Save. Keep that sentence, and add nothing: the popover explains where the dials are kept, which is the question the two buttons raise.

4. **The Theme panel's Sketch row points back.** The row prints `$sketchSettings.label`, the live label, not the one the theme holds. `sameLook` excludes `label`, so renaming a sketchstyle through **Save as sketchstyle…** leaves the row reading in sync while naming something the theme's own object does not carry. The Wave 5 gate found it. Fix it while you are in the row, or record why not.

   Give the row an **Open** pill matching the Components row (`ThemePanel.svelte:846`) that opens the Sketchstyle view, so the panel names the tab as well as the tab naming the panel. Read how `canOpenComponents` and `openComponents` resolve before wiring it. If the Sketch tab is not reachable by that mechanism, leave the row as it is and report why, rather than inventing a second navigation path.

5. **Docs.** `sketch-mode.md` (its "## The presets" heading and every mention of the directory), `where-themes-live.md`, and any chapter naming the old path. Then `npm run sync:docs`. Never hand-edit `content.generated.ts`.

6. **CHANGELOG.** Fold into the unreleased entry Wave 5 opened: the rename, the directory move, and that `npx live-tokens migrate` performs it.

**Verification:** `npm run test`, `npm run check`, `npm run check:docs-content`, `npm run check:preset-themes`.

The greppable gate:

```sh
grep -rnE "sketch-presets|SketchPreset|sketchPreset|SKETCH_PRESETS|\bSketchSettings\b" src vite-plugin bin .claude/skills
grep -rn "Sketch Style" src .claude/skills README.md
```

Both return only the migration's own record of the retired name. The word boundary on `SketchSettings` is load-bearing: without it the pattern matches `updateSketchSettings`, which keeps its name deliberately (see the note under the table). The second grep covers the labels, which carry no identifier and would otherwise pass a symbol sweep; `.claude/skills` is in `package.json` `files`, so it ships and counts as user-facing copy.

**The one data-tree exception.** This repo tracks `src/live-tokens/data/sketch-presets/hatchsurface.json`, so this wave renames a tracked file. Use `git mv`; the rename is the deliverable and invariant 7 does not cover it. Nothing else under `src/live-tokens/data/` may move, and `node scripts/check-production-is-default.mjs` must still pass.

Manual, for the user: open the Sketch tab, confirm the saved sketchstyle survived the rename and still loads, and save a new one; confirm the Theme panel row and the tab agree on its name.

---

## Wave 7 — the preview honours the theme's sketchstyle

**Goal:** picking a theme in the Theme Picker shows that theme's sketch layer, and leaving the picker puts back what was there before.

**Executor:** Sonnet. Not started, and it starts after Wave 6: write it in the settled vocabulary rather than renaming it afterwards. Everything below is specification, not applied work.

Waves 1 to 5 covered apply and boot. Preview was never asked the question, so `src/editor/core/preview/lookPreview.ts` has no sketchstyle handling at all: previewing a sketched theme shows its colors under whatever drawing the previously applied theme left painted. Two themes' looks on screen at once, which is the one thing a preview exists to prevent. The Wave 5 gate found this; it is a gap in the feature rather than a defect in anything that shipped.

Files: `src/editor/core/preview/lookPreview.ts`, and its tests. Read `lookPreview.ts` in full before writing anything; the mechanism below is stated as a requirement, not as a diff.

**The trap, and the reason this is not a two-line change.** `openThemeSketchStyle` (`sketchStore.ts`, named by Wave 6) overwrites the live buffer, which is right for applying a theme (RJC 6) and wrong for previewing one. Browsing the picker must not destroy unsaved dials. So preview needs a transient path that paints without writing `sketchSettings`, `sketchBaseline`, `sketchStyleName` or `themeSketchStyle`, and restores the live look on leave. Establish how `lookPreview` already does this for colors and type and follow that shape rather than inventing a second mechanism.

1. Preview a theme carrying a sketchstyle: paint it. Preview one carrying none: paint crisp, even if the applied theme is sketched. Absent means off here too (invariant 3).
2. Leaving the preview restores exactly the pre-preview state, including an unsaved dial the user had moved. Pin this: it is the failure that would cost real work.
3. `liveMovedSinceBake` and `sketchOffLook` must not move during a preview. A preview is not a gesture and nothing about the open theme changed (Wave 4's rule).
4. The overlay iframe and the host page must agree during a preview, the way they do on apply.

**Verification:** `npm run test`, `npm run check`. `git status --short src/live-tokens/data` empty. Manual: with unsaved dials, browse several themes in the picker and confirm the dials come back untouched on leave; preview a sketched theme and a crisp one in sequence and confirm neither leaks into the other.

**Doc consequence.** `themes-workflow.md:104-106` says picking a theme shows it on the page as a preview. That over-promises today and becomes true when this lands. Check it, and the Wave 5 prose around it, rather than assuming.

---

## Open decision: how far the attached sketchstyle reaches

Settled and built on this branch: a sketchstyle is attached to a theme. `Theme.sketchStyle` (`Theme.sketch` until Wave 6 renames it) is optional, absent or `null` means no layer, and a theme carrying one paints it when you load it. Every theme on disk has none today, and a theme written before this change keeps meaning none (RJC 1, RJC 2). Nothing here needs revisiting.

What is not settled is how far that attachment reaches. Three surfaces, two of them still short:

1. **The page and the editor.** Done. Load applies it, Save folds it in, an unsaved dial reads as off the theme.
2. **The Theme Picker preview.** Specified as Wave 7, not built. Squarely inside the model this plan built.
3. **A production build.** Not done, and deliberately so. See below.

Wave 7 answers 2. Only 3 stays open, and it is the same question asked of the surface with the highest cost: when a theme carries an effect layer, does a built site honour it.

## The second move, not in this plan

Whether Adopt bakes the layer. Once a theme carries a sketchstyle, "the production theme is sketchy and the built site is not" is two truths in one document, so the eventual answer is probably yes. It is a separate piece of work with its own evidence to gather:

- **How it ships.** The layer builds an SVG filter bank and injects it into the document (`sketchLayer.ts:1087`), so a static stylesheet is not enough on its own. Either the bake emits a `sketch.generated.css` whose filters are data-URI SVG refs, or the package exports a small runtime the consumer's entry calls with the production theme's settings. The first keeps the consumer's app untouched; the second is honest about needing JS.
- **What it costs.** Filters on every drawn part, on every page. Measure before committing.
- **Who opts in.** A consumer who adopts a sketched theme without wanting a sketched build needs a way to say so, and that is a new piece of public API surface.

Do not start it inside this plan. The model above was chosen so that the second move is a bake step reading a field that already exists, not a re-model.
