# Component catalogue entry

**Execution model.** The plan runs unattended as a Workflow with a heartbeat
monitor. See Execution below. Each wave is one `wave-executor` on the model
the Status table names, reviewed by one `wave-reviewer` on Opus. Both waves
have a listed definition of done, so Sonnet takes both.

## Goal and scope

A component owns its catalogue entry, and nothing copies it by hand. The
entry is the component's description plus its usage guidance: what it is,
what to use it for, what not to use it for, and what each guidance-bearing
prop's values mean. Today the runtime file's leading HTML comment is the
single source. The CLI reads it from source through `descriptionOf` in
`bin/lib/catalogue.mjs`, and `missing-description` in
`bin/check-component.mjs` checks that the comment exists. That comment cannot
reach the running editor: the Svelte compiler drops it, and
`registerComponent` receives only a path string.

After this plan the runtime file exports its catalogue entry as code, from a
`<script module>` block, typed as `CatalogueEntry`. Every reader imports that
export. The built-in registry imports it from each shipped component file. A
consumer's `registerComponent` call imports it from the consumer's component
file. The CLI reads the same export statically, the way it reads `component`
and `allTokens` from editor files. `missing-description` checks the export.
`components <id>` prints its fields. The HTML comment is deleted.

The field that holds the description is named `description`, the term Style
Dictionary, the DTCG token format, and Figma all use for a plain-text
statement of purpose. Neither format defines a property for usage guidance;
both would put it in a metadata bag (`attributes`, `$extensions`). This plan
keeps `useFor` and `notFor` first-class instead, since they are the fields a
skill reads to choose a component.

Decided 2026-09-13 against the earlier proposal of a hand-typed
`RegistryEntry.description` field. That field is a second copy, and it
drifts. The Deferred section of `docs/check-compliance-simplification.md`
records the decision.

In scope: the 26 shipped runtime files under `src/system/components/`, the
beacon fixtures under `scripts/fixtures/component-tests/beacon/`,
`src/editor/component-editor/registry.ts` and its scaffolding types, the two
public entry points, `bin/lib/catalogue.mjs`, `bin/check-component.mjs`, the
bin tests, the registry contract test, the create-component and fix-findings
skills, their atlas trees, `docs/compliance-checks.md`, and the changelog.

Out of scope: validating `props` keys against declared props, a consumer-side
identity check under `--tests`, a `deprecated` field, and any editor UI that
shows the entry.

## Status

| Wave | Deliverable | Lane | Model | Budget | Status | Commit |
|---|---|---|---|---|---|---|
| 1 | The export, its type, the registry import, the CLI reader, the tests | main | Sonnet | 120 min | Done | ce2d14c |
| 2 | Skills, references, docs, atlas, changelog | main | Sonnet | 60 min | Done | 7e90e01 |

## Execution

The `workflow-execution` skill, user-level, runs the plan from the Status
table, arms the heartbeat monitor, and stops with a resume point when a wave
cannot be approved. Start it from a fresh session with:

```
/workflow-execution docs/plans/component-catalogue-entry.md
```

The commit prefix is `Catalogue W` from the Commit-unit protocol and the
heartbeat slug is `component-catalogue-entry` from the file name. The
longest background command in the plan is the consumer gate,
`check:smoke-component-tests`, at thirteen minutes. Any command that may pass
ten minutes runs in the background. No agent polls, sleeps in a loop, or greps
the process table for its own pattern. Run `npm run build:testing` before the
consumer gate: `src/testing-js/` is gitignored build output the tarball
ships, and no gate rebuilds it.

**Operators.** Sonnet takes both waves. The reviewer is Opus.

**Escalation.** An executor that returns `incomplete` or `blocked`, dies, or
stays blocked after its one repair pass is rerun on the next model up the
ladder Sonnet, Opus, Fable, with a fresh budget and the resume point or the
review's findings in its prompt. A wave that reaches Fable is reviewed by
Fable. After Fable the run stops with the resume point.

## Current behavior

Measured on 0.78.0 at 96a3c62.

- All 26 shipped runtime files open with an HTML comment. Every comment has
  a `Use for:` line and a `Not for:` line. Five carry one more labelled line:
  `Emphasis:` in Button and IconButton, `Variant:` in CollapsibleSection and
  Image, `Level:` in SectionDivider. Each of those five describes the values
  of one prop.
- Four runtime files already have a `<script module lang="ts">` block:
  Badge, Callout, CornerBadge, Slider. It exports variant lists and types.
- `RegistryEntry` in `registry.ts` has no description field. `builtInRegistry`
  imports each editor as `import XEditor, { allTokens as xTokens } from
  './XEditor.svelte'`. `RegisterComponentEntry` is `Omit<RegistryEntry,
  'origin'>`.
- `descriptionOf(source)` in `catalogue.mjs` parses the comment into lines,
  one per labelled line, and `describeComponents` emits `description` as that
  string. `formatComponents` prints the lines under the id.
- `missing-description` tests `/^\s*<!--[\s\S]*?-->/` on the runtime source.
  Severity `warn`, `fix: 'runtime'`, `repair: 'authored'`.
- The beacon fixture's `register.ts` passes `id`, `label`, `icon`,
  `sourceFile`, `editorComponent`, and `schema`. `template/src/registerComponents.ts`
  registers nothing.
- `bin/catalogue.test.ts` and `bin/check-component.test.ts` write comment
  fixtures. `bin/check-component.test.ts` has a `missing-description` describe
  block at its `widget` helper.
- The create-component skill's "Runtime component" section shows the comment
  block. The atlas tree `trees/create-component.ts` cites it with the chip
  "Usage comment", anchored on "Open the file with an HTML comment". The
  fix-findings skill's `missing-description` row says "Add the header comment
  the catalogue reads", and `trees/fix-findings.ts` anchors on it.
  `docs/compliance-checks.md` item 5 says "opens with no HTML comment".

## Reserved judgment calls (already decided, do not re-litigate)

1. **The shape.** In `src/editor/component-editor/scaffolding/types.ts`:

   ```ts
   export type CatalogueEntry = {
     /** One sentence: what the component is. */
     description: string;
     useFor: string;
     notFor: string;
     /** Keyed by prop name; the value explains that prop's values. */
     props?: Record<string, string>;
   };
   ```

   The five extra labelled lines migrate into `props`: Button and IconButton
   `Emphasis:` become `props.variant`; CollapsibleSection and Image
   `Variant:` become `props.variant`; SectionDivider `Level:` becomes
   `props.level`. The `<Id>.svelte.` prefix and the label words are dropped
   from the text; the sentences are otherwise moved verbatim.

2. **The export.** Each runtime file's `<script module lang="ts">` block
   exports `export const catalogue = { ... } satisfies CatalogueEntry;`. The
   block is the first thing in the file. A file that has the block adds the
   export to it, first. Shipped files import the type by relative path with
   `import type`. The skill shows a consumer the public form,
   `import type { CatalogueEntry } from '@motion-proto/live-tokens'`. The
   type is exported from the root entry point and from `/component-editor`.

3. **The registry field is required.** `RegistryEntry.catalogue:
   CatalogueEntry`, with no optional marker and no default. `builtInRegistry`
   imports it from each runtime file, `import { catalogue as cardCatalogue }
   from '../../system/components/Card.svelte'`, beside the editor import.
   This is a type-level break for a consumer's `registerComponent` call; the
   changelog records it under `### Changed (breaking)`, as Wave 6 of the
   compliance plan did for `tests/contracts.ts`. Pre-1.0; no migration.

4. **Identity, not equality.** `registryContract.test.ts` asserts, for every
   built-in entry, that `entry.catalogue` is the same object the runtime
   module exports, with `toBe`. A copied literal fails this test.

5. **The CLI parse is bounded.** `catalogueOf(source)`, replacing
   `descriptionOf`, finds `export const catalogue = {` inside a
   `<script module` block and reads to the matching `}`. A field is
   `key: <string literal>` where the literal uses single, double, or backtick
   quotes; a backtick literal may span lines; no `${}`, no concatenation, no
   identifier. `props` is one nested object of such fields. Whitespace inside
   a literal collapses to single spaces, as the comment parser did. A
   required field that is absent or not in that form is a
   `missing-description` finding whose message names the field,
   `Widget.svelte: catalogue has no useFor`. A file with no export gets the
   message `has no catalogue export. Say what Widget is for, and what it is
   not for`. The comment is never consulted.

6. **`missing-description` keeps its id and its row.** The rule still means
   the component has no description. Severity `warn`, `fix: 'runtime'`,
   `repair: 'authored'`. No new rule id; the id is shipped in the report
   JSON contract, the skills, and the atlas.

7. **Output shape.** `describeComponents` emits `catalogue` as the object,
   or `null` when the file has no export; the string `description` key it
   emits today goes away. `formatComponents` prints, under the id,
   `description`, then `Use for: …`, `Not for: …`, then one `<prop>: …` line
   per `props` key in source order. The list form prints the same four kinds
   of line it prints today. Any JSON contract snapshot that carries
   `description` updates to `catalogue`.

8. **The comment is deleted.** No file keeps both. Badge, Callout,
   CornerBadge, and Slider already carry a module script and seed their
   defaults correctly, so the block is known safe for the config seeding and
   `check:component-defaults` stays green.

9. **No validation of `props` keys** against the component's declared props,
   and no consumer-side identity check. Presence is checked statically;
   identity is checked for shipped components only.

10. **Vocabulary.** The skills and docs say "catalogue entry" for the object
    and "description" for its first field. The chip in
    `trees/create-component.ts` is relabelled "Catalogue entry". The word
    "comment" leaves every sentence that describes the entry.

## Global invariants (reviewer checklist)

1. One source. No catalogue text exists outside the runtime file's export:
   not in `registry.ts`, not in a register call, not in a skill's catalogue.
2. The registry imports, never copies. Invariant 1's guard is judgment call
   4's identity test.
3. No fallback. The CLI never reads a comment, and the type has no default.
4. The catalogue's visible text for the 26 shipped components is unchanged
   except for the dropped `<Id>.svelte.` prefix and the label words.
5. No new design token, no `tokens.css` change, no new rule id.
6. Every gate green before each commit: `npm test`, `npm run check`,
   `check:component-defaults`, `check:skills`, `check:cli-strings`,
   `check:skill-atlas`, `check:skill-sources`, `check:pages`, and
   `check:smoke-component-tests` after `npm run build:testing`.
7. The data tree is untouched: `node scripts/check-production-is-default.mjs`
   passes and `git status` shows nothing under `src/live-tokens/data/`.
8. Comments in code state a why that is not obvious, or do not exist.
9. Nothing pushed, tagged, or released.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing;
never commit red. Commit message `Catalogue W<n>: <summary>` plus the
standard co-author trailer. The plan's Status row may land as its own commit
under the same prefix, as the compliance plan did. Do not push, tag, or
release. Stop after each wave for review. If reality contradicts this plan
(a cited file is missing, a check pins conflicting behavior), stop and
report.

Never stash, reset, or checkout over uncommitted changes.

## Wave 1: the export, its type, the registry import, the CLI reader, the tests

**Files.** `src/editor/component-editor/scaffolding/types.ts`,
`src/editor/component-editor/registry.ts`, `src/editor/index.ts`,
`src/editor/component-editor/index.ts`, the 26 files under
`src/system/components/*.svelte` that are not editors,
`scripts/fixtures/component-tests/beacon/Beacon.svelte`,
`scripts/fixtures/component-tests/beacon/BeaconTwin.svelte`,
`scripts/fixtures/component-tests/beacon/register.ts`,
`bin/lib/catalogue.mjs`, `bin/check-component.mjs`, `bin/lib/report.mjs`
(its comment at line 54), `bin/catalogue.test.ts`,
`bin/check-component.test.ts`, `src/editor/component-editor/registryContract.test.ts`.

**Do.**

- Add `CatalogueEntry` per judgment call 1 and export it from both entry
  points per judgment call 2.
- In each of the 26 runtime files and both beacon fixtures, move the comment
  into the `catalogue` export per judgment calls 1 and 2, then delete the
  comment. Beacon's register call passes `catalogue` imported from
  `Beacon.svelte`.
- Add the required field to `RegistryEntry` and the 26 imports to
  `builtInRegistry` per judgment call 3.
- Replace `descriptionOf` with `catalogueOf` per judgment call 5, and update
  `describeComponents` and `formatComponents` per judgment call 7.
- Rewrite the `missing-description` check per judgment call 5 and delete the
  comment that introduces it; its why is the finding's message.
- Update the fixtures in both bin tests to the export form. Extend the
  `missing-description` describe block: no export; export with `useFor`
  missing; `useFor` given as an identifier; a backtick literal spanning lines
  that parses. Add a `catalogue.test.ts` case for `props` printing as
  `<prop>: …`.
- Add the identity test per judgment call 4.

**Verify.** `npm test` green, including the new cases. `npm run check` 0
errors. `npx live-tokens components` on this repo prints 26 components with
their four kinds of line and no `<Id>.svelte.` prefix; `components button`
prints `variant: one primary per page; …`. `npx live-tokens report --json`
carries zero `missing-description` findings. `check:component-defaults`,
`check:pages`, and `check:cli-strings` green. `npm run build:testing` then
`check:smoke-component-tests` green: beacon is registered with its catalogue
entry and reports no `missing-description`. `git grep -n '^<!--'
src/system/components scripts/fixtures/component-tests` returns nothing.

## Wave 2: skills, references, docs, atlas, changelog

**Files.** `.claude/skills/live-tokens-create-component/SKILL.md`,
`.claude/skills/live-tokens-fix-findings/SKILL.md`,
`src/editor/skill-atlas/trees/create-component.ts`,
`src/editor/skill-atlas/trees/fix-findings.ts`,
`src/editor/skill-atlas/skillSources.generated.ts`,
`docs/compliance-checks.md`, `CHANGELOG.md`, and any other file
`git grep -n -i 'comment' .claude/skills docs/*.md bin/cli.mjs README.md`
shows describing the component description.

**Do.**

- In the create-component skill's "Runtime component" section, replace the
  comment block with the `<script module>` `catalogue` export, shown with
  the public type import, and state judgment call 5's literal rule in one
  sentence. The registration snippet imports and passes `catalogue`. The
  section on `components` output says the export is what it prints.
- In fix-findings, the `missing-description` row says to add the `catalogue`
  export with `description`, `useFor`, and `notFor`, and that the finding's
  message names a missing field.
- `docs/compliance-checks.md` item 5 describes the export.
- Changelog: `### Changed (breaking)` for the required registry field and
  the deleted comment, `### Added` for the export and the type. No em-dash.
- Re-point the two atlas nodes whose anchor text is gone: the chip in
  `trees/create-component.ts` relabelled per judgment call 10, and the
  `missing-description` row in `trees/fix-findings.ts`. Then
  `npm run sync:skill-atlas` and `npm run sync:skill-sources`.

**Verify.** `check:skills`, `check:skill-atlas`, `check:skill-sources`, and
`check:cli-strings` exit 0. `git grep -n -i 'HTML comment\|header comment\|description comment' .claude/skills docs/*.md src/editor/skill-atlas/trees bin/cli.mjs README.md`
returns nothing. The rendered chip title and its label agree.
