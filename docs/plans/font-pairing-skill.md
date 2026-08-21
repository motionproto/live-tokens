# Execution plan: font pairing skill and `live-tokens set-fonts`

Branch off `main` as `font-pairing`. Five waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green.

**Execution model.** A fresh Opus session orchestrates from this doc and writes no wave code itself. Each wave runs in a `wave-executor` sub-agent on **Sonnet**. The review gate after each wave (`wave-reviewer`) runs at the orchestrator's tier (Opus). The manual halves of each wave's verification belong to the user; the executor runs only the automated commands and reports the manual checklist as pending.

**Precondition:** a clean working tree. Never stash, reset, or checkout over uncommitted changes; if the tree is dirty, stop and report.

Line numbers date from `0.55.1`. From Wave 2 on, locate by the cited symbol or string, and stop only if the symbol itself is gone.

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 1 | Promote the stamping engine out of `scripts/` into TS + a tsup entry | Opus (main) | Done | uncommitted |
| 2 | URL negotiation, family verification, weight-coverage report | Opus (main) | Done | uncommitted |
| 3 | `bin/set-fonts.mjs` and the CLI verb | Opus (main) | Done | uncommitted |
| 4 | The `live-tokens-pair-fonts` skill | Opus (main) | Done | uncommitted |
| 5 | Docs, changelog, cross-references | Opus (main) | Done | uncommitted |

Executed in one session at the user's request rather than wave-by-wave with
sub-agents.

The orchestrator updates this table after each review gate: `Not started` to `In progress` to `Done` (or `Blocked`, with a one-line reason appended under the table). Record the short commit SHA.

Waves 1 and 2 ship nothing on their own. Wave 3 makes the feature usable by hand; Wave 4 makes it usable by asking. Cutting after Wave 3 leaves a coherent product (a CLI verb, no skill); cutting between 3 and 4 does not.

---

## The feature

`live-tokens generate-theme` builds a whole color identity from a mood brief and says so in its own description: "Changes color assignments only, never fonts." `bin/generate-theme.mjs:162-163` carries `fontSources` and `fontStacks` forward from the live state untouched. Type is the half of a theme's identity that no skill can currently move, so every pairing to date was hand-specified.

This adds the missing half: a brief naming a mood or a pairing intent goes in, and the two faces a theme is recognised by come out, verified against Google Fonts and stamped into the open buffer.

Everything the write needs already exists. `ColorsAndType` carries `fontSources[]` and `fontStacks[]` (`src/editor/core/themes/themeTypes.ts:93-124`), four stack variables (`--font-display`, `--font-sans`, `--font-serif`, `--font-mono`), each a fallback chain of project, system, and generic slots. `scripts/lib/presetFonts.mjs` already performs the exact stamp for the seven preset themes. What is missing is a path a consumer can reach and the type knowledge to choose well.

## Reserved judgment calls (already decided, do not re-litigate)

1. **A separate verb and a separate skill, not an extension of `generate-theme`.** Regenerating a theme replaces its whole color state, so folding type in means you cannot retune fonts without re-rolling color, or shift color without re-rolling type. The trigger vocabularies are disjoint too: "warmer palette" and "more editorial type" are different requests, and skill descriptions route better when they stay apart.

2. **`set-fonts` writes `colors-and-type/_working.json`, the unsaved buffer.** This is the `adjust` precedent (`bin/adjust.mjs` header), not the `generate-theme` one. A retype is an unsaved edit the user keeps by saving the open theme. It follows that `set-fonts` never writes a theme file, never activates anything, and has no `--no-activate` flag; reject that flag with the same message `adjust` uses (`bin/cli.mjs:133-138`).

3. **The buffer holds a whole document, so read live and write whole.** `handleSetWorkingColorsAndType` (`vite-plugin/themeFileApi.ts:1232`) takes a complete `ColorsAndType` and clears the buffer when it matches what is saved. The CLI mirrors that: resolve the live colors-and-type (working, then open theme, then package default), stamp fonts into a copy, and write the whole document back; if the result equals the saved document, delete `_working.json` instead of writing it.

4. **Family name in, URL negotiated out. No bundled catalogue.** `googleUrlForName` (`ProjectFontsSection.svelte:118`) requests `ital,wght@0,100..900;1,100..900`, and its comment records the trap: single-weight static families such as GFS Didot reject the range axis with 400. `PRESET_FONTS` shows the resolution already applied by hand, with Mystery Quest and DM Serif Display persisted bare and the rest carrying explicit ranges. The engine negotiates that ladder instead of guessing.

5. **~~A 200 from `fonts.googleapis.com` is the verification.~~ Superseded during Wave 2 — see below.** The original decision, inherited from the comment at `scripts/lib/presetFonts.mjs:6-8`, was that the API answers 400 for a weight a family does not have, so a passing URL proves the weights are real.

   **That is false.** Probing the live API showed the API silently drops enumerated weights a family lacks and still answers 200: `Mystery+Quest:wght@400;700` returns 200 with only weight 400 in the CSS. It answers 400 only for a family that does not exist, or for a *range* the family's axis cannot serve.

   The replacement: **the returned CSS is the verification, not the status code.** One discovery request enumerates every weight on the 100-to-900 ladder in both styles; the API answers 200 for any real family and the CSS it returns is a census of what that family actually has. The persisted URL is then built from the census and confirmed with a second request. This still replaces `src/data/google-fonts.json`, which `scripts/fetch-google-fonts.ts` targets and which has never existed in the tree.

6. **Stamped source ids are deterministic, never random.** `buildSourceFromUrl` mints `src_<kind>_<random>` (`fontParse.ts:149`), which would make every re-run accumulate a new source. Stamped ids follow the preset convention: `src_google_<slug>`, so re-running replaces rather than piles up.

7. **Display and body are the default scope.** `--font-display` and `--font-sans` are what `fontPairingLabel` calls the theme's identity (`fontPairing.ts:3-7`) and what the presets stamp. Serif and mono are optional keys in the brief; when absent their stacks and sources are left exactly as they are.

8. **Weight gaps warn, never fail.** Browsers synthesize or round a missing weight, so a family without the exact weight a token asks for is a quality note, not a broken theme. Contrast this with `generate-theme`, where an unmet AA floor exits 1.

9. **The body face is the anchor, chosen first.** Tim Brown's rule: make the body text typeface the anchor, because it carries the majority of the content and because text faces survive small sizes while display faces rarely do (Appendix A.1). So the skill picks `--font-sans` against the brief, then picks `--font-display` against that face. The naive order, a striking heading face chosen first with a body face fitted to it, is the one this reverses.

10. **The skill chooses; the CLI never guesses.** `set-fonts` takes family names, exactly as `generate-theme` takes seeds rather than a mood. No mood string, no "surprise me" mode, no heuristic family lookup in `bin/`. The judgment lives in the skill where it can be read and argued with.

## Global invariants (reviewer checklist)

- **Color is untouched.** `cssVariables`, `editorConfigs`, `harmonyAxes`, and `gradients` come out of a `set-fonts` run identical to what went in. A test asserts this on a real preset document.
- **Write scope.** The only file written is `colors-and-type/_working.json` (or deleted, per decision 3). Never `tokens.css`, never `tokens.generated.css`, never `fonts.css`, never `themes/*.json`, never `themes/_active.json` or `_production.json`, never a named colors-and-type file, never `default.json`.
- **Fallbacks survive.** Rewriting a stack replaces its project slot and keeps every system and generic slot behind it, the `rewriteStack` contract in `presetFonts.mjs`.
- **Untouched stacks keep their sources.** The source garbage collection drops only sources no remaining stack references. `sunset.json` carries a Typekit Fira Code and a Google GFS Didot behind its mono and serif stacks; a display-and-body retype must leave both in place.
- **One stamping implementation.** After Wave 1, `stampPresetFonts` and the CLI share the promoted engine. No second copy of the stack-rewrite or GC logic.
- **The CLI imports compiled JS.** `bin/*.mjs` loads `dist-plugin/...`, never a TS source, and fails with the "Build the plugin first" message when the entry is absent (`bin/adjust.mjs:30-38`).
- **Tests never hit the network.** The fetcher is injected; suites pass with no connectivity.
- **No new theme tokens** and no schema bump. `fontSources` and `fontStacks` already exist at `schemaVersion` 4, so no migration is owed.
- `npm run check:editor-font-isolation` and `npm run check:preset-themes` stay green.
- Any run that exercises the generator or editor restores the data tree per `CLAUDE.md` before the wave ends, verified with `node scripts/check-production-is-default.mjs`.

## Commit-unit protocol

One commit per wave, message `wave N: <summary>`. Each wave ends with `npm test` and `npm run check` green plus the wave's own listed checks. The executor reports the manual checklist as pending rather than performing it.

---

## Wave 1 — promote the stamping engine

Move the stamp out of `scripts/` so a shipped CLI can reach it.

- Add `src/editor/core/fonts/applyFontPairing.ts`: pure, no I/O, no network. It takes a `ColorsAndType` and a pairing (`{ display?, body?, serif?, mono? }`, each `{ name, url, weights? }`) and returns a new document with sources stamped and stacks rewritten. Port `sourceFor`, `rewriteStack`, and the unreferenced-source GC from `scripts/lib/presetFonts.mjs:63-126` verbatim in behavior, including the comment explaining why displaced sources must be dropped. Source ids follow decision 6.
- Return a change report alongside the document: which variables moved, from which family to which, and which sources were dropped. `formatAdjustResult` is the shape to match.
- Add `vite-plugin/fontPairing/index.ts` as a tsup entry re-exporting `applyFontPairing`, `parseGoogleFontsUrl`, and `resolveDataDirs`, following `vite-plugin/adjust/index.ts`. Register it in `tsup.config.ts`.
- Rewire `scripts/lib/presetFonts.mjs` so `stampPresetFonts` delegates to the compiled engine and keeps only the `PRESET_FONTS` table and the `src_preset_` id prefix. `scripts/check-preset-themes.mjs:89` and `:120` keep working unchanged.

**Verification.** `npm test`, `npm run build:plugin`, `npm run check:preset-themes`. A new unit suite covers: stacks rewritten with fallbacks intact, unreferenced sources dropped, referenced serif and mono sources kept, re-running with the same pairing being a no-op, and color fields byte-identical.

## Wave 2 — negotiate and verify the URL

- Add `src/editor/core/fonts/googleFontsUrl.ts` with a URL ladder for a family name: the full `ital,wght@0,100..900;1,100..900` range, then `wght@100..900`, then bare `?family=Name&display=swap`. It takes an injected `fetch`-shaped function, returns the first candidate that answers 200 along with the families and weights parsed out of the response, and reports every rejection so the caller can say why. Reuse `parseGoogleFontsUrl` and `parseFontFaceText` (`fontParse.ts`); the CSS2 response is `@font-face` text, so weights come back from the second parser.
- Move `googleUrlForName` out of `ProjectFontsSection.svelte:118` into this module and have the component call it, so the editor and the CLI build identical URLs. Keep the comment about single-weight families; it is the reason the ladder exists.
- Add a weight-coverage check built on `fontWeightAvailability.ts`: given the stamped document, report each `-font-weight` token whose paired `-font-family` resolves to a family lacking that weight. Warnings only, per decision 8.

**Verification.** `npm test` with a stubbed fetcher covering: a variable family accepted at the first rung, a single-weight family falling through to bare, a nonexistent family exhausting the ladder, and a weight-gap warning firing. No network access in any test.

## Wave 3 — `bin/set-fonts.mjs` and the CLI verb

- `runSetFonts({ briefPath, dryRun, verify })` following `runAdjust` (`bin/adjust.mjs:102`): load the compiled engine, resolve the data dirs, read the live colors-and-type through the working, theme, default fallback, negotiate and verify each named family, stamp, and write per decision 3.
- Brief shape, all keys optional except that at least one must be present:

```json
{
  "display": "Fraunces",
  "body": "Nunito Sans",
  "serif": "EB Garamond",
  "mono": "Fira Code"
}
```

  A value may also be an object `{ "name": "...", "url": "..." }` to pin an exact URL and skip negotiation for that slot.
- Flags: `--dry-run` prints the report and writes nothing; `--no-verify` skips the network entirely and **requires an explicit URL per family**, rather than persisting an unverified guess. (Deviation from the original wording, forced by the corrected decision 5: the first ladder rung 400s for most families, so persisting it unverified would write a dead URL.) Reject `--no-activate` per decision 2.
- `formatSetFontsResult` prints the pairing, each variable's before and after, dropped sources, weight warnings, and the reminder that the edit is unsaved until the user saves the open theme.
- Wire into `bin/cli.mjs`: the `import`, the subcommand comment block at the top, the `USAGE` entry alongside `adjust`, the dispatch branch, and a `SAMPLE_PROMPTS` entry at `:232`.

**Verification.** `npm test` including a new `bin/set-fonts.test.ts` mirroring `bin/adjust.test.ts`, driven against a temp data tree with a stubbed fetcher: writes the buffer, clears it when the result matches saved, honors `--dry-run`, refuses `--no-activate`, and touches no other file. **Manual:** with the dev server running, `npx live-tokens set-fonts` a real pairing, reload, confirm the page retypes and the editor's Fonts section shows the new families with their fallbacks intact, then restore the data tree.

## Wave 4 — the `live-tokens-pair-fonts` skill

`.claude/skills/live-tokens-pair-fonts/SKILL.md`, structured like `live-tokens-generate-theme`: workflow first, then the knowledge that makes the choice good.

- **Description** triggers on pairing and type requests and disclaims color, the mirror of `generate-theme`'s font disclaimer. Cover: pair fonts, font pairing, choose a typeface, change the fonts, make the type more editorial or friendlier or more technical, a serif for headings, a display font for this theme.
- **Workflow.** Write a brief to a scratch path, run `npx live-tokens set-fonts`, read the report, tell the user to reload and look, offer refinements as a new brief. The one-line facts that belong here: the edit is unsaved until they save the open theme, and Google Fonts is the pool because it is freely licensable and URL-loadable.
- **The knowledge**, drawn from Appendix A and structured the way that appendix is: the anchor-first process (A.1), the font matrix as the actual decision rule (A.2), the screen gate every candidate must pass (A.3), and the shortcuts with their caveat attached (A.4). Write it as instruction, not as a reading list; the appendix carries the sources so the skill does not have to.
- **State the reasoning in the output.** The skill names each face's form model and gives the matrix verdict when it proposes a pairing, so the user can disagree with the argument rather than just the result. This is the type-side equivalent of `generate-theme` printing a contrast report.
- **Distinctness rule**, ported from `check-preset-themes.mjs:120-125`: when pairing across a set of themes, no two share a display or a body face.
- Add a cross-reference line to `live-tokens-generate-theme` pointing here for type, and check `live-tokens-adjust-shape-space` for a sibling list that needs the same entry.

**Verification.** `npx live-tokens setup-claude --force` into a scratch consumer copies the new skill and prints its sample prompt. **Manual:** the user asks for a pairing in prose and confirms the skill triggers and the theme retypes.

## Wave 5 — docs, changelog, cross-references

- A fonts section in `src/editor/docs/content/themes-workflow.md` (or its own chapter if that one is already long): what the four stack variables mean, that the editor's Fonts section and `set-fonts` write the same buffer, and that `fonts.css` is regenerated from the production theme on Adopt (`themeFileApi.ts:481`), so a pairing does not ship until then. Run `npm run sync:docs`.
- `CHANGELOG.md` entry for the verb and the skill.
- README and `bin/cli.mjs` usage text consistent with the shipped flags.
- **Decide `scripts/fetch-google-fonts.ts`.** Done: read in full, the only surviving references were its own, and it was deleted. It regenerated `src/data/google-fonts.json`, a file that never existed in the tree and that nothing imported; the corrected decision 5 makes a bundled catalogue permanently unnecessary.

**Verification.** `npm run check:docs-content`, `npm test`, `npm run check`.

---

## Out of scope

- Non-Google sources. `css-url`, `typekit`, and `font-face` stay editor-only; the skill can still tell a user to paste one.
- Self-hosted delivery (Fontsource, Bunny Fonts). Both serve the same OFL corpus through a different loader, and the existing `css-url` kind already accepts them.
- Type scale, tracking, and text styles. This moves families, nothing else.
- Any font decision reaching production. Adopt remains the only door.

---

# Appendix A: type-pairing principles and sources

Research backing Wave 4. The skill teaches this; the plan records where it came from so a reviewer can check it and a later editor can argue with it.

## A.1 The process: anchor first

From Tim Brown, *A Pocket Guide to Combining Typefaces* (Five Simple Steps, 2013), the deepest free treatment of the subject.

1. **Have real goals.** Brown's opening move is that goals give you "the authority to eliminate type combinations that might be perfectly acceptable in a different scenario." A mood brief is exactly that authority. Without it, every pairing is defensible and none is chosen.
2. **Choose an anchor typeface, and make it the body face.** His reasoning is two-part: body text is most of the content, and "text faces are built to withstand a variety of settings, whereas display faces can rarely be used at small sizes or at coarse resolutions." Decision 9 above.
3. **Let the anchor choice be emotional, then background-check it.** Feeling first, technical check second, in that order.
4. **Explore loosely, then narrow by setting real type.** Brown warns specifically against researching each candidate before trying it: "absorbing more typefaces before you try them tends to psychologically lock you into a combination before you are happy with it, visually."
5. **Judge at four distances.** This is the part that turns taste into procedure:
   - **Texture** (super-macro): squint until words become gray masses. Compare typographic color. If a heading's gray is indistinguishable from the body's gray, the hierarchy fails before anyone reads a word.
   - **Rhythm** (macro): the repeating volumes of black and white through a line.
   - **Proportion** (micro): x-height, extender length, character width, aperture size, stroke contrast. Shared proportion is what lets everything else differ.
   - **Shape** (super-micro): geometric construction versus the movement of a writing implement.
6. **Compatibility is not similarity.** Brown's example, which is the whole idea in one line: "a square and a circle are very different shapes, but both are strict geometric forms that have more in common with one another than either has with a more calligraphic shape."

Source: https://blog.typekit.com/wp-content/uploads/2016/04/combiningtypefaces.pdf

## A.2 The decision rule: the font matrix

Indra Kupferschmid's classification, presented on Google Fonts Knowledge as the font matrix and explained accessibly by Oliver Schöndorfer. This is the one framework in the research that yields an actual rule rather than a sensibility, which makes it the right spine for a skill.

Two layers. The **skeleton** is the underlying form model; the **flesh** is contrast and serif treatment laid over it.

Skeleton, the three form models:

| Form model | Construction | Reads as |
|---|---|---|
| **Dynamic** | diagonal stress, open apertures, calligraphic origin | open, warm, humane, timeless |
| **Rational** | vertical stress, closed apertures, drawn rather than written | orderly, reserved, elegant, authoritative |
| **Geometric** | monolinear, circle-and-line construction | technical, modern, systematic, sober |

Flesh: how much stroke contrast, and whether serifs are present and of what kind. Linear sans at one end, high-contrast serif at the other, slabs and low-contrast serifs in between.

The rules that follow:

- **Same column, different flesh: reliable.** Same skeleton under different surfaces. Helvetica and Bodoni are both rational; one is a linear sans, the other a contrasting serif. Same bones, different clothes.
- **Same row, different column: the failure case.** Two faces with the same flesh but different skeletons look superficially alike and fight underneath. This is the trap the matrix exists to name, and it is the reason "just pick two sans-serifs" goes wrong so often.
- **Far apart in both: works, deliberately.** When the difference is unmistakable, the pairing reads as a decision rather than an accident.
- **The system is a lens, not a law.** Kupferschmid says so herself; many faces sit between columns (Roboto is "rather rational"). The skill should classify with a stated confidence and fall back to A.1's four distances when a face straddles.

Sources: https://fonts.google.com/knowledge/choosing_type/pairing_typefaces_based_on_their_construction_using_the_font_matrix and https://pimpmytype.com/font-matrix/

**Note for the Wave 4 executor.** The Google Fonts Knowledge pages render client-side and cannot be read by a plain fetch; the matrix content above came from the Pimp my Type explainer and search summaries. Verify against the Knowledge article in a browser before quoting it as Google's wording.

## A.3 The screen gate

Domain constraints the matrix does not cover. Every candidate passes these before the pairing question is even asked.

- **Body face criteria**, following Typewolf's body-text test: regular, italic and bold present; low-to-moderate stroke contrast; large counters; open apertures; large x-height. A face failing any of these is a display face, whatever its name says.
- **x-height sets apparent size.** At one token size, a large-x-height face reads bigger and holds up smaller. This matters directly in our model, where both faces are set from the same size scale, so a mismatch shows up as a heading that looks weak next to its own body text.
- **Single-weight families are display-only.** They are common and legitimate: Mystery Quest and DM Serif Display are both single-weight in the shipped presets. They are also exactly the families that reject the range axis with 400, which is what Wave 2's URL ladder handles.
- **Print faces are not screen faces.** Delicate serifs and high stroke contrast turn muddy at small sizes.
- **Every family and weight is a request.** Prefer a variable range over enumerated weights, and prefer two families over three.
- **Butterick's measurable band**, for sanity-checking the result rather than choosing the face: 15 to 25px body on the web, line spacing 120 to 145% of size, measure 45 to 90 characters. Our token scale governs these, so the skill's job is to notice when a chosen face pushes them out of band, not to set them.

Sources: https://www.typewolf.com/google-fonts and https://practicaltypography.com/summary-of-key-rules.html

## A.4 The shortcuts, and why they are shortcuts

Brown lists the standard advice, then names its cost: it "makes adequate combinations easy to identify. But it also robs us of the opportunity to truly understand why a combination works or doesn't, and can lead to a false sense of completion." The skill should carry both halves, the shortcut and the caveat.

- **Use a superfamily.** Verified Google Fonts superfamilies with both sans and serif siblings: Alegreya, Ancizar, IBM Plex, Inria, Merriweather, Noto, PT, Roboto, Source. Guaranteed harmony, at the cost of a quiet pairing.
- **Use one family across weights and widths.** Legitimate, not a failure of nerve.
- **Same designer or foundry.** Shared drawing habits do most of the work.
- **Same historical period.** Cheap coherence.
- **Serif with sans** as the default when nothing else decides it.

The Adobe article adds one framing worth keeping: aim for the space between too similar and too different, where similarity carries x-height, weight, angles, curves and mood, and contrast carries width and classification.

Sources: https://anthonyhobday.com/sideprojects/googlefontsfamilies/ and https://adobe.design/ideas/three-secrets-to-font-pairing

## A.5 What the presets already demonstrate

`scripts/lib/presetFonts.mjs` is a worked example of most of the above, and Wave 4 should mine it for the skill's illustrations rather than inventing new pairs. Cinzel with Lato is far-apart-in-both. EB Garamond with Montserrat is dynamic serif against geometric sans. Fraunces with Nunito Sans is same-column, both dynamic, one a contrasting soft serif and the other a linear humanist sans. Every one of them is display-plus-body, and every URL in the table was verified against the API by hand, which is the practice Wave 2 automates.
