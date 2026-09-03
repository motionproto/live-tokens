# The skill atlas ships from the package

Branch off `main` as `skill-atlas-in-package`. Five waves, each a single commit
unit executable by a sub-agent with only this doc and the two repos. Waves are
strictly sequential; each ends green. Waves 1 through 4 run in this repo.
Wave 5 runs in `../live-tokens-online` and needs a published release first.

**Execution model.** A fresh session orchestrates from this doc and writes no
wave code itself. Each wave runs in a `wave-executor` sub-agent on **Sonnet**.
The review gate after each wave (`wave-reviewer`) runs at the orchestrator's
tier. The manual halves of each wave's verification belong to the user; the
executor runs only the automated commands and reports the manual checklist as
pending.

**Precondition.** At the time of writing, this tree carries the layout-laws
edit to `live-tokens-build-page` (SKILL.md, `references/layout-sources.md`,
the pick-component row, CHANGELOG, `skillTrees.ts`, and
`docs/build-page-gap-analysis.md`). Commit that as its own commit before
Wave 1. `../live-tokens-online` carries uncommitted atlas work in
`src/skill-atlas/`, `scripts/skill-atlas-review.py`, and
`docs/skill-atlas-review/`. That work is the source Waves 1 and 3 copy from.
Do not commit, stash, reset, or checkout over it; Wave 5 removes it after the
port has shipped. If either tree is dirty in any other way, stop and report.
(That online work was committed there as `05b338e` during the Wave 1 run,
outside the executor's tool calls and byte-identical to what Wave 1 copied.
Waves 3 and 5 read it from `main` rather than from the working tree.)

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 1 | Atlas component and sync script move into `src/editor/skill-atlas` | wave-executor | Done | `9ba882c` |
| 2 | Skill text ships as a generated module | wave-executor | Done | `1a45f87` |
| 3 | Trees merged, digests stamped, `src/app/skill-atlas` deleted | wave-executor | Done | `76b8808` + fixes `1f9f069`, `c1c3642`, `e06da57` |
| 4 | `./skill-atlas` export, gates, docs, changelog | wave-executor | Done | `14d9db4` |
| 5 | Online mounts the export and deletes its copy | wave-executor | In progress | |

The orchestrator updates this table after each review gate: `Not started` to
`In progress` to `Done` (or `Blocked`, with a one-line reason appended under
the table). Record the short commit SHA.

0.73.0 published from CI on 2026-09-03 (tag `v0.73.0`, run 33749355677),
carrying Wave 4's export. Wave 5 runs against it.

Waves 1 through 3 change nothing a consumer sees. Wave 4 is the release. If
the run is cut short after Wave 3, the repo is coherent: one atlas, in the
shipped tree, mounted only by this repo's dev app.

## The problem

The atlas exists twice. `src/app/skill-atlas/` in this repo is mounted by the
dev app, reads `.claude/skills` by relative raw import, and is not in the
tarball. `../live-tokens-online/src/skill-atlas/` is a fork that reads the
skills out of `node_modules`, is the deployed public page, and has moved ahead
of this repo: labelled edges, reference tabs in the source pane, a digest per
tree that fails the check when a rewrite survives the anchors, wrapped titles,
decision titles as questions, and a review script with flag rules. The two
trees also disagree on nodes: the online build-page tree was recast around
decisions, and this repo's build-page tree gained the layout nodes.

Every skill edit here breaks the online atlas on the next upgrade unless the
trees are ported by hand. The STE rewrite of all eight skills is next, and it
touches every anchor, so the port has to happen first and the atlas has to
live once.

## The feature

The atlas lives in `src/editor/skill-atlas/`, which `files` already ships.
The package gains a `./skill-atlas` export that resolves to
`SkillAtlas.svelte`. Skill text reaches the component through a generated
module, `skillSources.generated.ts`, built from `.claude/skills` by a sync
script and gated by a check, the way `src/editor/docs/content.generated.ts`
is. The sync and check scripts for the trees carry the online digest logic.
This repo's dev app mounts the component from source. The online site mounts
it from the package on its existing `/skills` route and deletes its copy, its
alias, its scripts, and its review output.

## Reserved judgment calls (already decided, do not re-litigate)

1. **Location and export name.** `src/editor/skill-atlas/`, exported as
   `./skill-atlas`, with a hand-written `SkillAtlas.svelte.d.ts` beside it
   like `Docs.svelte.d.ts`. The `svelte`, `types`, and `default` conditions
   all point at the `.svelte` file, matching `./docs`.
2. **No owned route.** `LiveTokensRouter` does not claim a path for the atlas.
   A consumer mounts it on a route of its own, as the online site does at
   `/skills`. Owning `/live-tokens/skills` is a later decision.
3. **Generated sources, not raw imports.** A relative `?raw` import from a
   file inside `node_modules` is a bundler-dependent path, and
   `docs/docs-loading-bug.md` records the last time that bit. The generated
   module is a plain ES module of string literals and has no such dependency.
   It is checked in, regenerated by `sync:skill-sources`, and gated by
   `check:skill-sources` in `prepublishOnly` ahead of `check:skill-atlas`.
4. **Glob, sorted.** The generator lists every `SKILL.md` and every
   `references/*.md` under `.claude/skills`, sorted. The online loader named
   each reference file by hand so an upgrade would surface a missing import;
   here the skills and the generator are one repo and one prepublish, so the
   glob is the check.
5. **Online trees win.** Where both trees describe a skill, the online tree
   is the base: its titles, labels, references, and digests. Nodes that exist
   only in this repo's tree are added to it, with their edges. No node is
   dropped without a line in the wave report saying which and why.
6. **The review script ports as it is.** `scripts/skill-atlas-review.py`
   comes across unchanged apart from paths, and writes to
   `scratch/skill-atlas-review/` (gitignored). Rewriting it in Node is not
   part of this plan.
7. **Version.** A new export is a minor bump. Wave 4 records it under
   `Unreleased`; the release itself is the user's call and goes through CI.

## Global invariants (reviewer checklist)

1. **One authoring source.** `.claude/skills/*` is the only place skill text
   is written. `skillSources.generated.ts` is derived, and `check:skill-sources`
   fails on drift.
2. **Shipped code imports shipped code.** Nothing under `src/editor/skill-atlas/`
   imports from `src/app/`. Component imports are relative paths into
   `src/system/components/`, and `navigate` comes from its source module in
   `src/editor/`, never from the package's own bare specifier.
3. **The check holds digests from Wave 3 on.** `check:skill-atlas` passes and
   every tree carries a `digest` that matches its `SKILL.md`.
4. **The dev app still renders the atlas** at the same route it does today,
   from `src/editor/skill-atlas/SkillAtlas.svelte`.
5. **The data tree is untouched.** No wave writes under `src/live-tokens/data/`.
6. `npm run check` clean, `npm run test` green, and `npm run check:skills`,
   `check:skill-atlas`, `check:skill-sources` OK at every wave boundary.
7. Nothing pushed, tagged, or published by an executor.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing;
never commit red. Commit message `Skill atlas W<n>: <summary>` plus the
standard co-author trailer. Do not push, tag, or release. Stop after each wave
for review. If reality contradicts this plan (a cited file is missing, a check
pins conflicting behavior), stop and report rather than improvise.

Never stash, reset, or checkout over uncommitted changes in either repo.

## Wave 1 — the component moves into the shipped tree

Source: `../live-tokens-online/src/skill-atlas/` (working tree, not HEAD).

1. Create `src/editor/skill-atlas/` and copy `SkillAtlas.svelte`,
   `TreeNodeCard.svelte`, `SourcePane.svelte`, and `types.ts` from the online
   working tree. Do not copy `skillTrees.ts` (Wave 3) or `skillSources.ts`
   (Wave 2).
2. Rewrite imports. `@motion-proto/live-tokens/components/<X>.svelte` becomes
   the relative path to `src/system/components/<X>.svelte`. `navigate` from
   `@motion-proto/live-tokens` becomes a relative import of the module
   `src/editor/index.ts` re-exports it from. `./skillSources` stays as a name;
   Wave 2 supplies it. Until then, add a one-line stub `skillSources.ts`
   exporting an empty `skillDocs` and the `SKILL_DOC` constant with the same
   types the online file declares, so the wave compiles.
3. Replace `scripts/sync-skill-atlas.mjs` with the online version, with
   `ATLAS` pointing at `src/editor/skill-atlas/skillTrees.ts` and `SKILLS` at
   `.claude/skills`. Keep the online comments about the digest. The script
   will fail until Wave 3 moves the trees; that is expected, and the wave
   report says so.
4. Copy `scripts/skill-atlas-review.py` with its `src` path updated to
   `src/editor/skill-atlas/skillTrees.ts` and its output directory changed to
   `scratch/skill-atlas-review/`.
5. Leave `src/app/skill-atlas/` and the dev app route untouched this wave.

**Verification.** `npm run check` (svelte-check covers the new files).
`npm run test`. `check:skill-atlas` is expected red this wave with a message
naming the missing trees file; record that in the report.

## Wave 2 — skill text as a generated module

1. Write `scripts/sync-skill-sources.mjs` modelled on `scripts/sync-docs.mjs`:
   same `--write` / `--check` / dry-run contract, same header comment shape.
   It walks `.claude/skills/<skill>/SKILL.md` and
   `.claude/skills/<skill>/references/*.md`, sorted, and emits
   `src/editor/skill-atlas/skillSources.generated.ts` with:
   - `export const SKILL_DOC = 'SKILL.md' as const;`
   - `export const skillDocs: Record<string, Record<string, string[]>>`, keyed
     by the short skill id (`live-tokens-` prefix stripped, matching the tree
     keys), then by the path the skills themselves write (`SKILL.md`,
     `references/x.md`), with the file split into lines and the trailing
     newline removed, exactly as the online `skillSources.ts` does.
2. Replace the Wave 1 stub `skillSources.ts` with a re-export of the
   generated module, so the component's import path does not change.
3. Add `sync:skill-sources` and `check:skill-sources` to `package.json`, and
   put `check:skill-sources` in `prepublishOnly` directly before
   `check:skill-atlas`.
4. Run `sync:skill-sources --write` and commit the generated file.
5. Tests: a `skillSources.test.ts` beside the generator's output that asserts
   every directory under `.claude/skills` is a key, every key's `SKILL.md` is
   present, and each `references/*.md` on disk is present under its skill.
   Load the generated module directly; it is plain TypeScript.

**Verification.** `npm run check`, `npm run test`, `npm run check:skill-sources`.
Edit one word in a reference file, confirm `check:skill-sources` fails, revert.

## Wave 3 — one set of trees

1. Copy `../live-tokens-online/src/skill-atlas/skillTrees.ts` (working tree)
   to `src/editor/skill-atlas/skillTrees.ts`.
2. Diff node ids per tree against `src/app/skill-atlas/skillTrees.ts`. For
   each node present only in this repo's tree, add it to the online-based
   tree with its edges, in online edge shape (`{ from, to, label?, back? }`),
   placing it by row where its anchor text sits in the current skill. At the
   time of writing the known set is build-page's `bp-laws`, `bp-bands`,
   `bp-contain`, `bp-density`; the executor recomputes the set and lists it in
   the report, with any node it chose not to carry and why (judgment call 5).
3. Run `npm run sync:skill-atlas`. A range whose anchor text is gone must be
   re-pointed by hand to the text the node now means; the sync refuses it
   and names it. Then `--write` to stamp digests.
4. Run `python3 scripts/skill-atlas-review.py` and clear every flag it raises
   for the merged trees, using the flag rules in its README output.
5. Delete `src/app/skill-atlas/` entirely. Point the dev app's atlas route in
   `src/app/App.svelte` at `../editor/skill-atlas/SkillAtlas.svelte` and set
   its `source` to that path.

6. Carried forward from the Wave 1 review gate:
   - **Close the vacuous-pass gap in `scripts/sync-skill-atlas.mjs`.** Its
     check loop iterates `Object.values(trees)`, so an empty or partial trees
     file passes clean, and the script is in `prepublishOnly`. Add a coverage
     assertion that every directory under `.claude/skills` has a tree keyed to
     it, the way `check:skills` enumerates them, and confirm it fails on a
     deliberately removed tree before reverting.
   - **Point the layout nodes at the reference document.** The generated
     module now carries `references/layout-sources.md`, so the build-page
     tree's `bp-laws` / `bp-bands` / `bp-contain` / `bp-density` nodes can
     open it. Use that exact key.
   - **Give the masthead its own typography.** Wave 1 dropped the
     `site.css` import (correctly, under invariant 2), which leaves the
     `<h1>` in `SkillAtlas.svelte` as the only element with no scoped token
     rule. Style it with the heading-xl token set so the component owns its
     type the way `Docs.svelte` does. Do not reinstate `site.css`: Wave 5
     mounts the component through a bare package import with nowhere to
     attach it.

**Verification.** `npm run check`, `npm run test`, `npm run check:skill-atlas`
OK with digests. Manually: open the dev app's atlas route, walk every skill
tab, confirm each node highlights the right lines in the source pane, the
reference tabs open for generate-theme and create-component, and the labelled
branches and back-edges draw, and the masthead heading renders at heading-xl.
Reference tabs now sort alphabetically rather than in the reading order the
online hand-written list used; confirm that order reads acceptably. Restoring
reading order would be a plan amendment, not an executor's call.

### Open for the user after Wave 4

The smoke-install check proves the `./skill-atlas` subpath resolves from the
tarball and that `skillSources.generated.ts` ships beside it, which is what
the plan asked for. It does not compile the atlas: the smoke consumer's
`App.svelte` mounts only `<Editor />`, so the bundler-boundary failure class
that judgment call 3 cites (`docs/docs-loading-bug.md`) goes unexercised.
Adding `import SkillAtlas from '@motion-proto/live-tokens/skill-atlas'` and
`<SkillAtlas />` to the smoke consumer would prove the `skillSources`
re-export chain compiles from `node_modules`. Two lines, the user's call.

A second, wider one. A hand-written sibling `.d.ts` is authoritative for
every importer of its `.svelte` file, this repo's own code included. Wave 4
had to type `SkillAtlas.svelte.d.ts` as Svelte 5 `Component` rather than the
`SvelteComponent` class `Docs.svelte.d.ts` uses, because the class form has
no call signature and `RouteEntry.lazy` demands one. `Docs.svelte.d.ts`,
`Editor.svelte.d.ts`, `ComponentEditorPage.svelte.d.ts`, and
`ColorsPage.svelte.d.ts` all still carry the class form. Nothing breaks
today, because the router renders them as component tags. Any consumer that
mounts one through a `pages` route entry hits the error. Converting all four
is a follow-up outside this plan.

### Open for the user after Wave 3

Online's recast of `bp-ver` into three checker nodes leaves lines 99 and 101
of `live-tokens-build-page/SKILL.md` (the "read it band by band" and "look
from a distance" paragraphs, both from the layout-laws edit) opening from no
node. Judgment call 5 gives online the node, so adding one for the by-eye
verification step is new authoring and a plan amendment, not an executor's
call. Unresolved; the atlas is coherent without it.

## Wave 4 — the export, its gates, and the docs

1. `package.json` `exports["./skill-atlas"]` with `svelte`, `types`, and
   `default` conditions on `./src/editor/skill-atlas/SkillAtlas.svelte`, and a
   `SkillAtlas.svelte.d.ts` with no props, shaped like `Docs.svelte.d.ts`.
2. `scripts/smoke-install.sh`: prove the subpath and the generated module
   reach the tarball. The cheapest check that does both is the standard here;
   the executor reads the script and follows the pattern the contract subpath
   uses at its "Resolving the contract subpath" step, adjusted for a `.svelte`
   target if `require.resolve` cannot take the `svelte` condition.
3. `check:no-tooling-imports` and `check:no-style-imports`: run them and fix
   anything the new folder trips.
4. User guide: in the chapter that documents `setup-claude` and the skills,
   add a short section that says the atlas is a component, the export path,
   and a three-line route entry a consumer adds. Regenerate with
   `npm run sync:docs`.
5. `CHANGELOG.md` under `Unreleased`, `### Added`: the export, what the atlas
   is, that the online site is its first consumer, and that the skill text
   and trees are gated by `check:skill-sources` and `check:skill-atlas` with
   digests.

**Verification.** `npm run check`, `npm run test`, `npm run check:smoke-install`,
`npm run check:docs-content`, and the full `prepublishOnly` chain once,
followed by the data-tree restore recipe from `CLAUDE.md` if it left the tree
dirty. The user releases through CI.

## Wave 5 — the online site displays the package's atlas

Runs in `../live-tokens-online` after the release is on npm.

1. `npm install @motion-proto/live-tokens@<released>`.
2. In `src/App.svelte`, the `/skills` entry's `lazy` becomes
   `() => import('@motion-proto/live-tokens/skill-atlas')`; drop its `source`
   or point it at the package path, whichever the overlay's Page Source
   handles for package routes today (check `/docs` for the precedent).
3. Delete `src/skill-atlas/`, the `@lt-skills` alias in `vite.config.ts`,
   `scripts/sync-skill-atlas.mjs`, `scripts/skill-atlas-review.py`,
   `docs/skill-atlas-review/`, and the `sync:skill-atlas` /
   `check:skill-atlas` npm scripts. This is the first point at which the
   uncommitted online work may go; it is now in this repo's history.
4. Edit the site's `check` script before deleting the scripts it calls. It
   currently runs `svelte-check ... && node scripts/sync-skill-atlas.mjs`,
   which breaks the moment step 3 removes that file. The plan's step 3 list
   omitted it.
5. `npm run build` and `npm run check:design` (or whatever the site's
   checker script is named) green.

**Verification.** `npm run dev`, open `/skills`, walk every tab as in Wave 3.
Confirm the source pane shows the installed package's skills and not a copy.
Commit on the online repo with the same protocol.
