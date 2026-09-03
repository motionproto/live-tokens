# Scratch files

Write throwaway files (theme briefs, test scripts, one-off outputs) to `scratch/` at the repo root. It is gitignored. `temp/` holds tracked worksheets; do not put disposable files there. Delete any temporary file you place outside `scratch/` before finishing.

# The data tree is live app state

The editor and the dev server write into `src/live-tokens/data/` and `src/system/styles/fonts.css`. `live-tokens set-colors`, `live-tokens set-type`, `live-tokens set-geometry`, and `live-tokens save-theme` write into `src/live-tokens/data/`. Loading a theme clears unsaved `_working.json` deltas and sets `themes/_active.json`; live reads fall through to that theme. Adopt sets `themes/_production.json` and rewrites `tokens.generated.css` and `fonts.css`. `save-theme` writes `themes/<slug>.json` and, unless it is passed `--no-activate`, sets `themes/_active.json` to it.

When you exercise the generator or the editor as a test, restore that state before you finish. Skip the restore only when the data change is the deliverable.

```sh
git restore src/live-tokens/data/themes/_active.json src/live-tokens/data/themes/_production.json
git restore src/live-tokens/data/tokens.generated.css src/system/styles/fonts.css
find src/live-tokens/data -name '_working.json' -delete
git status --short src/live-tokens/data   # then delete untracked theme files the run created
```

`node scripts/check-production-is-default.mjs` verifies the tree afterward.

# CI runs tests before the plugin is built

`dist-plugin/` does not exist when `npm test` runs in CI. A `.mjs` module that a test imports must load the compiled engine lazily, inside the function that needs it, never at module top. `bin/engineLoadsLazily.test.ts` enforces it. To reproduce CI locally, move `dist-plugin/` aside and run the suite.

# Editing a skill moves the Skill Atlas

`src/editor/skill-atlas/skillTrees.ts` cites `.claude/skills/*/SKILL.md` by line
number. The numbers are derived from anchor text. The skills also ship to the
atlas as a generated module, `skillSources.generated.ts`. So after any edit to a
SKILL.md or a `references/*.md`, including adding or removing a line, run both:

```sh
npm run sync:skill-atlas
npm run sync:skill-sources
```

`check:skill-atlas` and `check:skill-sources` are both in `prepublishOnly` and
fail on drift, so skipping either sync surfaces at release rather than at
commit. The atlas sync repairs a range that moved; it refuses a range whose
anchor text is gone, which means that node has to be re-pointed by hand.

Renaming or moving a node also needs a look at the rendered card. A title and
its chip labels can each be correct and still contradict each other, and every
check passes on that.
