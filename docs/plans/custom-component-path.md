# The custom-component path: next steps from the Slider exercise

A resume document. The Slider (v0.69.0) was built by following
`live-tokens-create-component` end to end as a test of user-generated
components. The static gate passed on the first run; every real defect was
caught by the two runtime contracts a consumer does not have. This records
what is still open for a consumer authoring a component, in the order to take
it. Background: `docs/design-system-compliance-audit.md`.

## State at hand-off (v0.72.0, released)

- Static checker `check-component` holds naming, defaults, registration,
  imports, `disabled-is-terminal`, and `phantom-editor-token`.
- `live-tokens report` states the facts a check needs, including tokens a
  component declares that nothing in its file reads.
- `live-tokens components` and `tokens` are the registry as a query;
  `componentDirs` extends discovery; `getComponentRegistryEntries` is public.
- Skills: pick, build-page, create-component, check-compliance, fix-findings
  all read the query rather than a list.
- The consumer `../live-tokens-online` is clean under `--strict`, installs
  0.68.1, has one unpushed local commit, and no `.claude/skills`.

## 1. A runtime contract a consumer can run — DONE, one part deferred

Shipped as `checkRegistryEntry` in `src/editor/component-editor/contract.ts`,
behind the subpath `@motion-proto/live-tokens/component-editor/contract`. It
takes one `RegistryEntry` and returns a violation line per failure; an empty
array is the pass. `registryContract.test.ts` is now that call over
`builtInRegistry`, and `contract.test.ts` runs it against a fixture project so
a helper that resolved nothing could not let all 26 components pass vacuously.
`references/contract-tests.md` in create-component carries the consumer's test
file, and `check:smoke-install` resolves the subpath off the real tarball,
because no build reaches an export only a test file imports.

Two things the factoring changed from the plan as written:

- It is a subpath, not the `component-editor` barrel. The assertions read the
  runtime `.svelte` and `default.json` off disk, and `node:fs` in the browser
  barrel would follow every consumer into their bundle.
- `describe.each(getComponentRegistryEntries())` is wrong in a consumer. The
  registry always carries the shipped entries, whose `sourceFile` paths are
  relative to the package root; unfiltered, every built-in fails on a path that
  does not exist in the consumer's project. The recipe filters on
  `origin === 'custom'`.

**Deferred: the render contract as a Playwright spec in the `create` template.**
The template ships no test tooling at all, and the render contract needs a
browser install, a running editor page, and a seeded data dir. That is a large
dependency to hand every scaffold before one real consumer component has been
held to it. Step 3 scaffolds an app with a custom component for the sketch
opt-in; write the consumer's registry-contract test there first, which also
gives the first real run of the helper outside this repo, and decide about
Playwright with that in hand.

## 2. Bare `-width`, `-height`, `-size` get a colour picker — DONE

`KIND_RULES` now carries a `length` kind holding the three, placed last among
the geometry rules so `-border-width`, `-divider-height`, `-icon-size` and the
rest claim their token first. The picker is `UIPaddingSelector` in single
non-splittable mode — the one `-gap` already uses, reading the `--space-*`
scale — rather than a new `VariantScaleEntry`, because a panel width comes off
the same scale a gap does. `aliasKinds.test.ts` pins the competing pairs;
`rawKind` had no test before, which is how the three sat under `surface`.

The suffix vocabulary did not change, so `check:skills` stayed green on its
own; `references/token-naming.md` now says what the fall-through is.

`adjust` does not take the kind. Its ladders are density and shape — rounder,
thicker, denser. A panel's width or an avatar's size is a component dimension,
and moving it on "space it out" would be a surprise. No shipped component
declares an editable bare length, so the kind changes nothing there today.

## 2a. The SectionDivider title outline — DONE, removed

Found while doing 2: `--sectiondivider-{lg,md,sm}-title-outline-width` ends in
`-width` with nothing more specific matching, which raised the question of what
picker it should take. The answer turned out to be none.

Correction to the finding as first written: the row was not drawing a palette.
The outline tokens are `hidden: true` in `stateTokens`, so TokenLayout never
rendered them; they reached the user only through `TypeEditor`, which named
`BORDER_WIDTH` explicitly. `rawKind` was wrong about them and nothing was
reading `rawKind`.

What made the feature worth removing was its cost. The outline was the only
reason the title was an SVG `<text>` rather than an element, and that SVG
carried a `getBBox()` viewBox with four `$state` fields, a per-instance
`MutationObserver` on the document's inline style (`feMorphology`'s `radius` and
`feFlood`'s `flood-color` are non-presentation attributes that cannot read a CSS
var, so `syncFilter()` read the computed values back and pushed them on by
hand), `document.fonts` listeners to re-measure after a webfont landed, a random
filter id per instance, `role="img"` + `aria-label` in place of real text, and a
sketch carve-out. It shipped transparent in the default and all eight presets,
and the trap-out it was built for is done by the layout: the `through-label`
hairlines flank `.title-inline` in a flex row, so no rule ever runs behind the
glyphs.

Removed: the six tokens, the SVG in both the dev and pruned branches, the whole
`<script>` body below `$props()`, and the `outlineWidthVariable` /
`outlineColorVariable` plumbing on `TypeGroupConfig`, `TypeEditor`, `StateBlock`
and `VariantGroup`, which had no other declarer. The runtime went 657 lines to
518. `2026-09-02-sectiondivider-drop-title-outline` drops the keys at
component-config v25 to v26; the eight presets and every `default.json` are
re-stamped. `sectionDividerReactive.test.ts` went with the machinery it tested;
four other tests that used an outline token as a convenient fixture now use
`-hairline-color`. Both e2e suites pass, including the sectiondivider render
contract.

The sketch worry did not materialise. The title was explicitly crisp before
(`--sketch-icon-off: none` on the SVG) and is crisp now, because the layer
leaves body type alone.

## 3. The consumer sketch opt-in — mechanically done, visual pass owed

A scaffolded app under the scratchpad (`create`, then the packed tarball as its
dependency) carries a throwaway `StatTile`: `sketch-chip` on the root, the five
`--sketch-*` values on the frame, the `:hover` / `.force-hover` pair repainting
fill and stroke, and an inner `.stattile-header` with its own five, a
`transparent` stroke and the frame's ink as its hatch colour.
`check-component stattile --strict` was clean on the first run.

Install from a packed tarball, not `file:` at the working tree. A link leaves
the package outside the app's root, and Vite denies the registry's
`Badge.svelte?raw` reads under `server.fs.allow`. That failure is an artifact of
the link and would never reach a real consumer, so it is worth not chasing.

What is left is the checklist at the end of `references/sketch-mode.md`, which is
seven visual assertions and needs the browser: drawn in every variant, wearing
its own colours, hover repaints while the wobble holds still, hatch ink belongs
to the component, nothing torn, and every trace gone when it is switched off.

## 4. Upgrade the consumer and run the skills there — DONE, commit not made

`../live-tokens-online` is on 0.71.0. The plan said 0.68.1; it was already part
way to 0.70.0 in an uncommitted working tree, and that work is carried forward,
not disturbed. `setup-claude` installed all eight skills, `check:design` is a
script and `build` is gated on it, `sync:skill-atlas` re-pointed 21 ranges
against the 0.71.0 skills, and its Claude section now matches ours byte for byte
at eight skills. `svelte-check` 0 errors, `npm run build` green through the new
gate.

The report on a project that is not this one: no pending migrations, 1318 of
1318 declared tokens read, 0 custom components, both checkers 0/0 and 0 under
`--strict`.

Nothing is committed there. The tree now holds the earlier uncommitted work plus
this pass, an untracked `.claude/`, and an untracked `component-configs/slider/`
that 0.71.0's Slider derived. Whether `.claude/` is committed at all is a
consumer decision: `setup-claude` rewrites it on every upgrade.

## 4a. `live-tokens components` counted a component nothing else knew — DONE

`components` reported 27 shipped while the registry held 26 and
`check-component` covered 26. The extra was `FloatingTokenTags`, the demo's hero
animation: no `:global(:root)` block, no editor, no registry entry, no row in
pick-component's Catalogue.

Two things were wrong, and both are fixed.

The field lied. `describeComponents` took `origin === 'shipped'` to mean
registered, because a shipped component is registered by the package rather than
by the project and so never appears in the project's own `registerComponent`
scan. `builtInIds` now parses the package's frozen registry — the same parse
`check-component` already had, now shared rather than duplicated — so
`registered` is computed the same way for every origin. A discovered component
registered nowhere reports `registered: false`, prints `(NOT registered)`, and
the summary line says how many are out of the catalogue.

The file was in the wrong place. It moved to `src/demo/`, which takes it out of
the published package, the query and the count. That is a breaking removal of
`@motion-proto/live-tokens/components/FloatingTokenTags.svelte`.

**Done in 0.72.0.** live-tokens-online was the only importer. It vendors the two
files into `src/showcase/`, with `../system/backdrop` and
`../system/components/MenuSelect.svelte` repointed at their public specifiers,
and carries the `checks.exclude` entry for the art stylesheet.

The move had a consequence worth recording: `src/system` is exempt from page
discovery and `src/demo` is not, so 284 lines of hand-tuned animation CSS met
`check-page --strict` for the first time and produced 31 errors. The gradients
are the artwork. Tokenizing them would change the hero; downgrading
`color-literal` would weaken the gate for every real page. So
`"checks": { "exclude": [...] }` now names paths that discovery skips, a file or
a directory, while an explicitly named file is still checked. That is the
narrow entry the check-compliance skill can point at when a whole file is not a
themed surface, and it is the same shape a consumer needs for vendored CSS.

Staging a component's release on `registered: false` does not follow from this.
`missing-registration` is an error in `check-component`, so an unregistered
component fails the gate rather than sitting quietly outside the catalogue.
Making that a supported state is a separate decision about that rule.

## 4b. The consumer on 0.72.0

`../live-tokens-online` installs 0.72.0 and builds green through `check:design`.
`report` there: 26 components, matching the registry for the first time; 1312 of
1312 declared tokens read; both checkers 0/0 and 0 under `--strict`. The
vendored `FloatingTokenTags.svelte` now reads as one of its pages rather than as
a catalogue component, which is what it always was.

Two upgrade signals its atlas is built to raise, both answered: `setup-claude
--force` was needed for the changed skills, and `skillSources.ts` lists
reference files one by one so a new one surfaces as a missing import —
`references/contract-tests.md` was the new one. `cc-test`'s anchor and `desc`
were re-pointed at the rewritten verification step.

Its data tree is still at component-config v25 with the six dropped
`-title-outline-*` keys. That is not an action: the migration applies the next
time the editor loads that config, which is what it is for.

Its atlas is behind on content in a way this upgrade did not cause and did not
fix: no `check-compliance` tree at all, and a `fix-findings` tree from before
the 0.71.0 rewrite. That drift dates from 0.70.0. Porting the two trees is its
own pass, and its atlas is a fork of ours with a per-tree digest and
`@lt-skills` imports, so it is a content merge rather than a file copy.

Nothing is committed there.

## 5. The evals — still gated

`.claude/evals/` holds ten cases, three of them outcome cases with a
deterministic `tool_used` grader. `claude plugin eval` now exists as a command
and prints its usage, so the earlier "refuses" is narrower than it was: the
target resolution and `--eval-dir` are documented. Running one still answers
"`plugin eval` is currently in early access". Retry after that opens, and run
`outcome-component-from-brief` first: it is the Slider exercise as a graded
case, and section 3's `StatTile` is a second worked answer to compare against.

## Traps recorded on the way

- A first-party component must be filled into the eight presets under its
  own slug in derived key order, and two tests pin the catalogue count.
- The render probe reads elements and `::before`/`::after` only; a vendor
  pseudo-element thumb is invisible to it.
- An editor row gated on `stateName === 'hover'` renders nothing when the
  editor's state is `hover option` or `Title / Hover`. Four editors had this.
- The e2e harness exercises a gate through `data-token-variables` and a
  `role="switch"`, puts the gate back after probing, and skips
  `.ui-token-selector.locked`.
