# Closeout plan: theme completeness

Companion to `docs/theme-completeness-audit.md` and
`docs/plans/theme-completeness.md`. The six waves of that plan are executed and
green on branch `theme-completeness`. A final review on 2026-08-20 verified the
audit and the executed tree against each other; this plan carries the four
residuals the review found.

Status: proposal. Nothing here is implemented.

---

## Part 0 — Final review

### What was verified

- **Data.** All eight theme files carry 25 components and 1237 aliases at
  `schemaVersion` 4 with a current `componentSchemaVersion`.
- **Suite.** 3621 tests green, `npm run check` clean, and all of
  `check:production-is-default`, `check:preset-themes`,
  `check:component-defaults`, `check:docs-content` pass.
  `seed-preset-theme.mjs autumn` refuses without `--force`, as designed.
- **Spot checks.** Fifteen claims about the executed end state hold: capture
  without the delta filter (`themeService.ts:154`), the seeder and the
  committed-file check, two-layer live resolution with `ComponentLiveSource`
  narrowed to `'working' | 'theme'` (`themeFileApi.ts:991`), the
  `migrateEmbeddedKey` guard (`normalizeTheme.ts:201`), per-alias fill with
  `filled` reporting (`normalizeTheme.ts:248`), the rewritten
  `Theme.componentConfigs` doc comment, the inverted preset test, the CI
  data-checks step, the five `--space-2` baseline pins
  (`scripts/baselineSpacePaddingPins.test.ts`), the repaired `generate-theme`
  resolution chain (`bin/generate-theme.mjs:113`), and the ThemePanel fill
  notice plus the 422 copy naming the theme generator skill.

### Verdict

The executed architecture is sound. The audit's central claim was right, and
the execution plan's Part 0 amendments made it stronger: completeness enforced
once at the normalize boundary rather than in five writers, fill per alias
rather than per component, presets frozen behind an invariant check rather than
re-derived, and the component-migration path reaching the server before the
freeze widened. No finding below touches the architecture. All four are
loose ends.

### Findings

1. **The audit doc contradicts itself.** Line 7 still reads "Status: analysis
   and proposal. Nothing here is implemented." while the closing Status section
   says Executed. The body also states proposals 1 through 3 in their original
   form, which execution amended: the fill landed at `normalizeTheme`, not as a
   `captureLook` change plus a dated migration; padding was not converted to a
   hand-authored table (RJC 7); the check asserts invariants instead of
   regenerating and diffing. Open question 3 carries a BUILT note; the
   proposals themselves carry nothing.

2. **CHANGELOG owes the entry.** The Unreleased section holds only the earlier
   space-floor work. Nothing covers complete themes, `schemaVersion` 4, the
   one-time boot migration, the seeder, or the check. This is a consumer-facing
   schema bump; the entry is required before release.

3. **One delta-era comment survived the sweep.** `vite-plugin/themeFileApi.ts:378`
   in the production bake path still says "A component the theme does not
   carry is on its default, so the source .svelte is authoritative and nothing
   is emitted for it." Under complete themes that describes a branch a
   normalized production theme can no longer reach. It slipped end-state
   verification item 5 because it never uses the word "delta".

4. **The first-generation gradient loss is real and unfixed.** Confirmed at
   `themeFileApi.ts:653-665`: `extractAliasDeclarations` recovers `var()` and
   `color-mix()` forms only, and the structured-alias carry-forward is gated on
   a prior local `default.json` existing. On a fresh local configs directory,
   the first generation of a component whose `:global(:root)` bakes a
   `{kind:'gradient'}` alias drops it. The execution plan flagged this under
   "Found during execution" and deferred it. Now that Wave 2's fill freezes
   whatever the derivation produces into every theme, the gap is worth closing
   before merge.

---

## Reserved judgment calls

1. **Historical CHANGELOG entries stay as written.** `CHANGELOG.md:196` and
   `:331` advertise `npm run generate:preset-themes`, which no longer exists.
   They were true at their release and release notes are a record. The new
   Unreleased entry states the replacement; nothing rewrites history.

2. **The audit doc gets annotations, not a rewrite.** It is a record of the
   analysis as made. Fix the contradicting status line and add one "Executed
   as:" line to each of the three proposals, pointing at the execution plan's
   Part 0. Leave the measurements, the tables, and the argument untouched.

3. **The bake keeps its per-alias diff** (execution plan RJC 5). Wave 1 may
   delete the absent-component branch under the stale comment only if it is
   provably unreachable from every `regenerateTokensCss` call site. If any
   path can hand it a theme that skipped `normalizeTheme`, the branch stays
   and only the comment changes.

4. **The gradient fix makes the derivation total; it does not add a fallback.**
   `default.json` is the derivation product of `:global(:root)`, so the
   derivation should succeed for every alias kind the format allows. The
   preferred mechanism is parsing the baked gradient literal back to the
   structured form. Another carry-forward source would be one more layer of
   the machinery-for-cases-that-never-occur kind. If parsing proves
   infeasible, stop and report rather than substituting a fallback.

---

## Invariants

1. `tokens.generated.css` byte-identical across every wave.
2. Data-tree hygiene per project `CLAUDE.md`: any wave that exercises the
   generator restores `_active.json`, `_production.json`,
   `tokens.generated.css`, `fonts.css`, and deletes stray `_working.json`
   before committing. `check-production-is-default` green after every wave.
3. No new theme tokens, no accent colors, no em-dashes in user-facing copy.
4. RJC 3 of the execution plan stands: nothing is ever dropped from a theme
   file.

## Commit-unit protocol

One wave, one commit, on branch `theme-completeness`. Run the wave's
verification green before committing; never commit red. Message
`Themes closeout W<n>: <summary>` plus the standard trailer. No push, no tag,
no release. Stop after each wave for review. If reality contradicts this plan,
stop and report.

---

## Wave 1 — the record catches up

**Goal:** the documents tell the truth about the executed state.

**Executor:** Sonnet (`wave-executor`). **Reviewer:** Sonnet (`wave-reviewer`).

Files: `docs/theme-completeness-audit.md`, `CHANGELOG.md`,
`vite-plugin/themeFileApi.ts`.

1. **Audit doc.** Replace line 7 with a status line that matches the closing
   section: executed via `docs/plans/theme-completeness.md`, see the closing
   Status. Add one "Executed as:" line to each of the three proposals (RJC 2):
   proposal 1 executed as a per-alias fill at the normalize boundary with a
   `THEME_SCHEMA_VERSION` bump, no dated migration; proposal 2 superseded by
   execution-plan RJC 7, padding stayed a relative op as seeding input;
   proposal 3 executed as `check-preset-themes.mjs`, which asserts invariants
   on the committed files and never re-derives.

2. **CHANGELOG.** Add to Unreleased, under Changed: themes are complete
   documents at `schemaVersion` 4 (every component, every alias, by value;
   boot migrates and fills local themes once; an incomplete imported theme is
   filled from the current defaults and the fill is reported in the Theme
   panel); the preset generator is gone, replaced by
   `seed-preset-theme.mjs <slug>` for new presets and `check:preset-themes`
   guarding the shipped seven. Under Fixed: `generate-theme` no longer
   inherits gaps from an incomplete open theme (the live path gained the
   missing default layer), and a pre-rename alias key in an old theme is
   migrated before the bake instead of being emitted verbatim into
   `tokens.generated.css`. Historical entries untouched (RJC 1).

3. **The bake comment.** Rewrite `themeFileApi.ts:378` for the completeness
   model: the per-alias diff exists to keep consumer CSS small, and the
   authority for an equal-to-default value is the component source. Apply
   RJC 3 of this plan to the branch beneath it.

**Verification:** `npm test`, `npm run check`, `npm run check:preset-themes`,
`npm run check:docs-content`, and a grep over `src/ vite-plugin/ bin/ scripts/`
for "delta encoding", "delta encoded", and "is on its default" finding nothing
outside legacy-v1 test names.

---

## Wave 2 — the derivation becomes total

**Goal:** a first local generation of `default.json` preserves structured
gradient aliases, so the derivation from `:global(:root)` is total and the
carry-forward at `themeFileApi.ts:653` stops being load-bearing.

**Executor:** Opus (`wave-executor`); the mechanism needs a design decision.
**Reviewer:** Opus reads the diff directly.

1. Survey what exists before writing anything: the editor authors
   `{kind:'gradient'}` aliases and serializes them to CSS, so check
   `src/editor` and the alias parsers for an existing gradient parser or
   serializer to invert. Route through it; never inline a new regex
   (the color-opacity precedent: one parser module, one owner).

2. Extend `extractAliasDeclarations` (or its caller) to recover a gradient
   literal into the structured form. The committed
   `component-configs/panel/default.json` holds the reference output for
   `--panel-stage-surface`.

3. Decide the fate of the `existingAliases` carry-forward. If the derivation
   is now total for every kind the format allows, the carry-forward is dead
   and goes. If some structured kind remains unrecoverable, it stays, and the
   comment names exactly which kind still needs it.

**Tests**

- The round-trip that pins totality: for each of the 25 components, deriving
  `default.json` into a fresh directory with no prior file produces aliases
  deep-equal to the committed file. This is the real deliverable; it also
  catches any other lossy kind, now and later.
- The targeted regression: first generation of `panel` with no prior local
  file carries `--panel-stage-surface` as a structured gradient.

**Verification:** `npm test`, `npm run check`,
`check-production-is-default`, `git status` clean under
`src/live-tokens/data` (invariant 2; the regeneration exercise must restore).

---

## Wave 3 — merge gate

No agents. Two user decisions, in order:

1. Optional manual pass from the execution plan that automation cannot cover:
   load a deliberately gutted theme in the running editor and confirm the
   Theme panel's fill notice and the 422 copy read well. The automated tests
   cover the logic; this checks the words and the chrome.
2. Merge `theme-completeness` to local `main`. No push, no tag, no release;
   pushing triggers CI publish and stays the user's call.

---

## Orchestration

Write-then-execute, per the project's split: this plan is the artifact.
Start a fresh Opus orchestrator session pointed at this file. Opus
orchestrates and does not implement. Per wave: dispatch the executor with the
wave section plus the invariants and the commit-unit protocol, run the
verification, dispatch the reviewer, commit, report, and stop for the user's
go-ahead. Waves run in order; Wave 2 touches files Wave 1 edits, so never
concurrently. Keep the dev server down during Wave 2's regeneration exercise.
