# Component terminology

**Execution model.** The plan runs unattended as a Workflow with a heartbeat
monitor. See Execution below. Each wave is one `wave-executor` on the model
the Status table names, reviewed by one `wave-reviewer` on Opus. Every wave
has a listed definition of done: a rename map, a grep that returns nothing,
and the gate set. Opus takes the four waves whose rename crosses the editor's
kind map or the `set-geometry` engine; Sonnet takes the rest.

## Goal and scope

One concept, one word, across the shipped components, the editor, the CLI,
and the skills. The rule is the one `docs/terminology.md` states. The audit
in Current behavior measured the drift on 2026-09-13 at a823f7b across three
layers of every shipped component: the catalogue entry, the `Props`
interface with its value unions, and the semantic properties declared in
`:global(:root)`. This plan lands every proposal the audit made, in the
audit's order: catalogue text, then one property word per wave with its
migration, then one prop axis per wave with its breaking changelog entry,
then the rules recorded once.

`src/editor/core/components/aliasKinds.ts` is the map of the drift. Every
synonym its suffix lists accept is a name this plan unifies, after which that
spelling leaves the list. A picker that needs no synonym list is the
definition of done for the property layer.

In scope: the 26 runtime files under `src/system/components/`, their editors
under `src/editor/component-editor/`, the 26 shipped configs under
`src/live-tokens/data/component-configs/`, the nine preset themes under
`src/live-tokens/data/themes/`, the component-config migrations, the
contract suites under `src/testing/contracts/`, `aliasKinds.ts` and
`adjustAliases.ts` with their tests, the editor's `TokenLayout.svelte` and
`variantScales.ts`, `bin/check-component.mjs`, the create-component and
set-geometry skills with their references and atlas trees,
`src/system/styles/CONVENTIONS.md`, `docs/terminology.md`,
`docs/design-system-compliance-briefing.md`, and the changelog.

Out of scope: the editor preview hooks (`forceHover`, `forceHoverValue`,
`forceHoverPart`, `forceFocus`, the `force-hover` class), which wait for
their own plan; editor chrome such as `UIPillButton`'s `size="compact"`; the
anchor phrase "hairline rules" in the set-geometry references, which is an
anchor name shared across four files; and everything under Left as it is.

## Status

| Wave | Deliverable | Lane | Model | Budget | Status | Commit |
|---|---|---|---|---|---|---|
| 1 | Catalogue text | main | Sonnet | 30 min | Done | 79ee7a1 |
| 2 | active means pressed: selected on RadioButton, TabBar, SideNavigation | main | Opus | 120 min | Done | 8c77a91 |
| 3 | One hairline: divider and thickness retire | main | Opus | 150 min | Done | 1adf39e |
| 4 | One indicator: accent retires as a part | main | Opus | 90 min | Done | c9df741 |
| 5 | SectionDivider background to surface | main | Sonnet | 60 min | Done | f64f340 |
| 6 | CornerBadge prefix is its id | main | Sonnet | 60 min | Done | 45903d7 |
| 7 | Toggle label-text to label | main | Sonnet | 45 min | Done | 4135823 |
| 8 | Callback casing | main | Sonnet | 45 min | Done | e548af3 |
| 9 | open everywhere | main | Sonnet | 60 min | Done | 32256a6 be07238 |
| 10 | Size values default and small | main | Sonnet | 45 min | Done | aaf3ee4 |
| 11 | TabBar value, SideNavigation title | main | Sonnet | 45 min | Done | c1a5998 |
| 12 | Badge and CornerBadge brand | main | Opus | 90 min | Blocked | bc22fc9 e15820a e481bd2 |
| 13 | The rules | main | Sonnet | 60 min | Not started | |

Run of 2026-09-13 stopped at Wave 12, `blocked after repair`, at the top of
the ladder. Waves 1 to 11 approved on their model. Wave 12 escalated from
Opus to Fable and was reviewed by Fable; the re-review's one blocking finding
(the create-component SKILL.md table still naming Badge's `primary`) was
fixed by hand in e481bd2. Wave 12 resumes at its review gate with `reviewOnly`
and the three commits above; Wave 13 has not run.

## Execution

The `workflow-execution` skill, user-level, runs the plan from the Status
table, arms the heartbeat monitor, and stops with a resume point when a wave
cannot be approved. Start it from a fresh session with:

```
/workflow-execution docs/component-terminology-audit.md
```

The commit prefix is `Terminology W` from the Commit-unit protocol and the
heartbeat slug is `component-terminology-audit` from the file name. No
command in this plan passes ten minutes; `npm test` is the longest at a few
minutes. No agent polls, sleeps in a loop, or greps the process table for its
own pattern.

**The gate set.** Every wave runs these green before it commits:

```sh
npm test
npm run check
npm run build:plugin && npm run check:preset-themes
npm run check:component-defaults
npm run check:production-is-default
npm run check:pages
npm run check:cli-strings
npx live-tokens check-component <id> --tests    # once per touched id, never the batch
```

A wave that edits a `SKILL.md` or a `references/*.md` also runs
`npm run sync:skill-atlas && npm run sync:skill-sources`, then
`check:skills`, `check:skill-atlas`, and `check:skill-sources`. A wave that
edits a chapter under `src/editor/docs/content/` runs `npm run sync:docs`
and `check:docs-content`.

**The retired-spelling grep.** Each wave's Verify names a pattern. The
command is:

```sh
git grep -n -E -- '<pattern>' -- . ':!src/editor/core/themes/migrations' ':!CHANGELOG.md' ':!docs/plans' ':!docs/component-terminology-audit.md' ':!temp'
```

It returns nothing when the wave is done. Migrations keep the old names as
their input, the changelog names them as history, plans and worksheets are
records, and this file lists them as findings.

**Operators.** Opus takes Waves 2, 3, 4, and 12. Sonnet takes the rest. The
reviewer is Opus.

**Escalation.** An executor that returns `incomplete` or `blocked`, dies, or
stays blocked after its one repair pass is rerun on the next model up the
ladder Sonnet, Opus, Fable, with a fresh budget and the resume point or the
review's findings in its prompt. A wave that reaches Fable is reviewed by
Fable. After Fable the run stops with the resume point.

## Current behavior

Measured on 2026-09-13 at a823f7b, after the catalogue entry plan and its
follow-up. The census script tabulated each property's prefix, its part
segments, its state segments, and its kind suffix; the props and the entries
were read by hand. Version is 0.78.0. `CURRENT_COMPONENT_SCHEMA_VERSION` is
27, every shipped config carries `"schemaVersion": 27`, and every preset
carries `"componentSchemaVersion": 27`. The last property rename,
`2026-09-07-stroke-role-renames.ts`, is the shape every migration here
follows: a per-component rename map, a pure key rename, values unchanged.

### Cost classes

| Class | What a rename touches |
|---|---|
| **Text** | One catalogue sentence. A changelog line. |
| **Prop** | A public prop name or value. A `### Changed (breaking)` changelog entry, the create-component skill where it states the convention, and every consumer call site. Pre-1.0, so no migration. |
| **Property** | A semantic property name. The runtime file, the editor's `allTokens`, the shipped config, the nine preset themes, a component-config migration in `src/editor/core/themes/migrations/`, the contract suite, and the `aliasKinds.ts` suffix that then goes. |

### Words with two senses

The most expensive class of drift: a reader who learned the word on one
component reads it wrong on the next.

#### primary

| Component | Sense |
|---|---|
| Button, IconButton | emphasis: the one primary action per page |
| Badge, CornerBadge | the brand color family; the token is `--surface-brand` |
| the text scale | a level: `--text-primary`, `--text-secondary`, `--text-tertiary` |

Keep the first and the third; both are conventions a reader brings in.
Rename the Badge and CornerBadge variant `primary` to `brand`, so the
variant says what its token says. Wave 12.

#### active

| Component | Sense |
|---|---|
| Button, IconButton | pressed, from `:active` |
| RadioButton (prop and properties), TabBar, SideNavigation | selected |
| MenuSelect, SegmentedControl | selected, already named `selected` |

`selected` wherever the word means selection. `active` survives as the
pressed interaction state only, and the terminology doc's interaction states
row gains it. Wave 2.

#### accent

| Component | Sense |
|---|---|
| Badge, CornerBadge | the accent color family |
| SideNavigation | the bar beside the current item: `--sidenavigation-item-active-accent` |
| Callout | the stripe on the leading edge: `--callout-info-accent-width` |

The bar and the stripe are indicators, the word MenuSelect and TabBar
already use (`--menuselect-selected-indicator`, `--tabbar-*-indicator`).
Wave 4.

#### The graphic line and its width

| Name in use | Components |
|---|---|
| `-divider` for the line's color | Dialog, Table, TabBar; SegmentedControl says `-divider-color` |
| `-hairline-color` for the line's color | SectionDivider, CollapsibleSection |
| `-hairline` for the line's position, an intrinsic | SectionDivider |
| `-thickness` for the width | CollapsibleSection, SectionDivider, SegmentedControl, TabBar (eight names) |
| `-divider-width` for the width | Dialog, Table |
| `-border-width` for a border's width | twenty-five components |
| `divider` as a variant value | CollapsibleSection, 26 properties under `--collapsiblesection-divider-` |

`aliasKinds.ts` reads `-divider-width`, `-divider-thickness`,
`-hairline-thickness`, and `-thickness` as one kind, `divider-width`; the
`set-geometry` engine and skill expose that kind name. One part,
hairline, the term the terminology doc defines, and one kind for its width.
Wave 3. The word "divider" then names the SectionDivider component only.

#### panel

TabBar's entry says "two to seven panels the reader moves between" and
SideNavigation's says "switching panels inside one page (TabBar)", while
Panel is a component. "views", the word SegmentedControl's entry already
uses. Wave 1.

#### hint

Tooltip's entry is "A hint that appears on an element on hover or focus" and
Callout's says "a hint that hangs off one element (Tooltip)". Input has a
`hint` prop and a `--input-hint` property for the line under the field. Keep
Input's `hint`; Tooltip becomes "a note". Wave 1.

#### default

Four uses: a variant value on Card and Image, a size value on five
components, the rest-state segment in nine token sets, and the prefix
`--table-default-*` on Table. Keep all four. Table's editor declares
`variants: ['default']`, so its segment is the variant model at work.

### Prop splits

| Axis | Spellings in use | Decision | Wave |
|---|---|---|---|
| size values | `default \| small` on Badge, Button, IconButton, CornerBadge, SegmentedControl; `default \| compact` on Card; `normal \| compact` on Notification | `default \| small` on all seven. Card and Notification carry no `-compact-` properties, so the rename is the prop and its CSS class. | 10 |
| open state | `show` on Dialog; `open` on Tooltip and SideNavigation; `expanded` on CollapsibleSection, with four `-expanded-` properties | `open` everywhere. The `-expanded-` segment becomes `-open-`. | 9 |
| selection | `checked` on Toggle; `active` on RadioButton; `selectedTab` on TabBar; `value` on SegmentedControl, MenuSelect, Slider | `checked` stays: it is the native checkbox word. RadioButton takes `selected`. TabBar's `selectedTab` becomes `value`, matching SegmentedControl and MenuSelect, which hold the same kind of id. | 2, 11 |
| callback casing | `ontabChange` on TabBar; `onSave`, `onCancel` on InlineEditActions; lowercase `onclick`, `onchange`, `oninput`, `ontoggle`, `onclose`, `ondismiss`, `onrangechange` elsewhere | Lowercase `on` plus the event: `onchange`, `onsave`, `oncancel`. | 8 |
| main text | `label` on Callout, CollapsibleSection, Input, ProgressBar, RadioButton, Slider, Toggle; `title` on Card, Dialog, Notification, SectionDivider; `text` on Tooltip; `titleLabel` on SideNavigation | `label` names a control, `title` heads content, `text` is body copy. Only `titleLabel` falls outside it; it becomes `title`. | 11, 13 |
| secondary text | `description` on Notification and SectionDivider; `hint` on Input; a `summary` snippet on CollapsibleSection | Keep. A description sits under a title, a hint under a field, a summary beside a header. Record the three. | 13 |
| no chrome | `bare` on Card drops the header; `chromeless` on CollapsibleSection drops the frame | Keep. They remove different parts, and one word would hide that. Record both. | 13 |
| size naming | Image `banner \| medium \| compact` by role and adjective; SectionDivider `lg \| md \| sm` by scale step | Keep. Record the rule: a step name where only size differs, a role name where the value means something. | 13 |
| editor preview hooks | `forceHover` on Image; `forceHoverValue` on MenuSelect and SegmentedControl; `forceHoverPart` and `forceActivePart` on SideNavigation; `forceFocus` on Input; a `class="force-hover"` convention on CodeSnippet, Slider, Toggle | Deferred to its own plan, except `forceActivePart`, which names the selected state and follows Wave 2. | 2 |
| hover intrinsics | `hoverTint` on six; `hover` on Card; `zoom` on Image | Keep. Record the rule: an interaction intrinsic is named for what it does. | 13 |

### Semantic property splits

**Prefix.** CornerBadge declares `--corner-badge-*` for the id `cornerbadge`,
forty names. Every other prefix is the id verbatim, and
`bin/check-component.mjs` carries a `kebabOf` exception for it. Wave 6.

**The color of a text part.** Two forms name the same thing: the bare part
(`--card-default-title`, `--callout-info-label`, `--dialog-body`,
`--input-hint`, `--progressbar-value`, `--sectiondivider-md-eyebrow`) and the
part plus `-text` (`--toggle-label-text`, `--toggle-disabled-label-text`).
The bare part is the color, and `-font-*` are its type. Wave 7 renames
Toggle's two; Wave 13 records the rule.

**Fill.** SectionDivider says `-background` (three names) where twenty-three
components say `-surface`. Wave 5.

**The main text part across components.** `-text` on eleven components,
`-label` on eight, `-title` on five. Read against the prop rule, the split
resolves: `-text` is the text of a control the reader presses, `-label` is
text beside a control or a header's text, and `-title` heads content. No
property falls outside it. Wave 13 records the rule.

### Catalogue text

| Component | Now | After Wave 1 |
|---|---|---|
| Panel | "a block of copy that reads as one region" | "a block of copy that forms one section" |
| Panel | "a modal surface (Dialog)" | "a modal window (Dialog)" |
| CollapsibleSection | "`divider` rules a line under the header" | "`divider` draws a hairline under the header" |
| TabBar | "two to seven panels the reader moves between" | "two to seven views the reader moves between" |
| SideNavigation | "switching panels inside one page (TabBar)" | "switching views inside one page (TabBar)" |
| Tooltip | "A hint that appears on an element on hover or focus." | "A short note that appears on an element on hover or focus." |
| Callout | "a hint that hangs off one element (Tooltip)" | "a note that hangs off one element (Tooltip)" |

### Where each name lives today

- A property name appears in the runtime file's `:global(:root)` and its
  `var()` reads, the editor's `allTokens` (`variable:` strings, `groupKey`
  and `label` strings, state lists), `component-configs/<id>/default.json`,
  every preset under `themes/`, and `src/testing/contracts/<id>.ts`.
- `bin/check-component.mjs` reads the `suffix:` arrays out of
  `aliasKinds.ts` by regex, so a deleted spelling becomes a naming finding on
  a consumer's component the same day.
- The `set-geometry` engine's `AdjustKind` union in `adjustAliases.ts` names
  `divider-width` and `accent-width`; the set-geometry skill documents them
  as ops-file `kind` values; `check-component.mjs` maps them to the
  `border-width` scale; `TokenLayout.svelte` lays the picker out by kind.
- `src/editor/core/sketch/sketchLayer.ts` maps `.tab.active` to the stem
  `tabbar-active`.
- `UIPaletteSelector.svelte` carries a `GRADIENT_DENYLIST` of three
  `--radiobutton-*-surface` names that no file declares.
- `migrateComponentConfig` runs `runMigrations` on string-valued aliases
  only; object-valued gradient slots pass through
  `renameSectionDividerObjectSlots`, which emits the three
  `--sectiondivider-<size>-background` keys.
- Editors mount consumers of the props: `RadioButtonEditor` passes `active`,
  `TabBarEditor` passes `selectedTab` and a Svelte 4 `on:tabChange`
  listener, `SideNavigationEditor` passes `titleLabel` and `forceActivePart`,
  `InlineEditActionsEditor` passes `onSave` and `onCancel`. Outside the
  editors: `SkillAtlas.svelte` (`selectedTab`, `ontabChange`, a
  `--tabbar-bar-divider` override), `TreeNodeCard.svelte`
  (`size="compact"` on Card), `Docs.svelte` (`titleLabel`), and the contract
  suites. The template, `src/app`, the docs chapters, and the e2e fixtures
  pass none of the renamed props.

## Reserved judgment calls (already decided, do not re-litigate)

1. **The hairline's three properties.** The line's color is
   `-hairline-color`, its width `-hairline-width`, its inset
   `-hairline-inset`. The audit proposed bare `-hairline` for the color;
   SectionDivider's `--sectiondivider-<size>-hairline` is its position
   intrinsic (`above-label`, `through-label`, and so on), and
   CollapsibleSection and SectionDivider already say `-hairline-color`. The
   intrinsic keeps its name.

2. **CollapsibleSection's variant `divider` becomes `hairline`.** The
   variant names the line it draws, and the plan's end state is that
   "divider" names the SectionDivider component only. Its 26 properties move
   from `--collapsiblesection-divider-` to `--collapsiblesection-hairline-`.
   Prop cost; the changelog records it.

3. **Kind names follow their members.** In `aliasKinds.ts`, `divider-width`
   becomes `hairline-width` with the one suffix `-hairline-width`;
   `divider-inset` becomes `hairline-inset` with `-hairline-inset`;
   `accent-width` becomes `indicator-width` with `-indicator-width`.
   `divider-height` becomes `track-height` with `-track-height`, since no
   shipped property ends in `-divider-height` and its only members are
   ProgressBar's and Slider's tracks. `AdjustKind` in `adjustAliases.ts`,
   the kind-to-scale map in `check-component.mjs`, the kind lists in
   `TokenLayout.svelte`, and the set-geometry skill follow. No alias for an
   old kind name anywhere: an ops file that says `divider-width` is wrong
   after Wave 3, and the changelog says so.

4. **Synonym deletion is each wave's definition of done.** After a rename,
   the retired suffix leaves `KIND_RULES`, `aliasKinds.test.ts`,
   `references/token-naming.md`, and `CONVENTIONS.md` in the same commit.
   Wave 3 deletes `-divider`, `-divider-width`, `-divider-thickness`,
   `-hairline-thickness`, `-thickness`, `-divider-height`, `-divider-inset`,
   and `-inset`. Wave 4 deletes `-accent` and `-accent-width`. Wave 5
   deletes `-background`. No other suffix moves. `-color` stays: it is the
   hairline color's suffix.

5. **Migrations.** One per Property wave, in
   `src/editor/core/themes/migrations/2026-09-13-<short-name>.ts`, exported
   as `componentMigration_2026_09_13_<camelName>`, registered in `index.ts`,
   `appliesTo: 'component-config'`, `fromVersion` the
   `CURRENT_COMPONENT_SCHEMA_VERSION` before the wave and `toVersion` one
   more. Each is a pure key rename with an explicit per-component map, the
   shape of `2026-09-07-stroke-role-renames.ts`. Each gets two tests in
   `migrations.test.ts`: the rename with an idempotency assertion, and a
   test that it fires only for its components. Every
   `component-configs/*/default.json` `schemaVersion` and every preset's
   `componentSchemaVersion` moves to the new value in the same commit,
   which is what `check:preset-themes` requires.

6. **Data files are edited in place.** Keys are renamed where they stand, in
   the configs and the nine presets, preserving key order and formatting.
   Values never change. `git diff` on a data file shows renamed keys and the
   stamp and nothing else. No generator re-runs over a preset.

7. **Object-valued slots follow the rename.** Wave 5 also renames the three
   gradient slots in `renameSectionDividerObjectSlots` and any object-valued
   `--sectiondivider-<size>-background` a theme carries, since
   `migrateComponentConfig` never passes objects through the runner.

8. **Names that mirror a renamed name follow it.** A runtime CSS class that
   mirrors a renamed prop or state (`class:active` on RadioButton, `.compact`
   on Card), an editor `groupKey`, `label`, or state-list string that carries
   the retired word, a contract case label, a test fixture, and the sketch
   layer's stem and selector all take the new word. DOM attributes keep
   theirs: `aria-expanded` stays. Internal component state such as
   SideNavigation's `expandedSections` is the executor's call.

9. **`forceActivePart` becomes `forceSelectedPart`** in Wave 2, on the
   runtime prop and in `SideNavigationEditor`'s `deriveForce`. The preview
   hook convention stays deferred. The state's name follows the rename.

10. **The three dead denylist entries go.** `GRADIENT_DENYLIST` in
    `UIPaletteSelector.svelte` names `--radiobutton-default-surface`,
    `--radiobutton-hover-surface`, and `--radiobutton-active-surface`; no
    runtime, editor, or config declares them. Wave 2 deletes the three
    entries and keeps the set.

11. **The prefix rule has no exception.** Wave 6 deletes `kebabOf`, the
    `kebab` parameter, and the two-prefix loop from `extractTokensForId` in
    `check-component.mjs`, and the docstring that explains them. A property
    starts with the id verbatim. `bin/check-component.test.ts` gains a case:
    a runtime whose properties use the hyphenated form gets a naming
    finding.

12. **Callback names.** `onchange` on TabBar, `onsave` and `oncancel` on
    InlineEditActions. `TabBarEditor`'s `on:tabChange={(e) => … e.detail}`
    listener is rewritten to `onchange={(id) => …}`.

13. **`open` everywhere.** Dialog's `show` becomes `open` and stays
    `$bindable`. CollapsibleSection's `expanded` becomes `open`, and its four
    `-expanded-` properties become `-open-`.

14. **Size values.** Card and Notification declare `'default' | 'small'`.
    Notification's default value is `'default'`. The class is `.small`.

15. **`brand`.** `BadgeVariant` lists `brand` where it listed `primary`, in
    the same position. The migration renames `--badge-primary-*` and
    `--cornerbadge-primary-*` keys only; values such as `--surface-brand`
    are already right. `--button-primary-*` and `--iconbutton-primary-*`
    are untouched, and the test proves it.

16. **Catalogue text.** Wave 1 changes the seven sentences in the table and
    nothing else in any entry. Later waves change a `props` sentence only
    where a renamed value appears in it: `divider` to `hairline` in Wave 3,
    `primary` to `brand` in Wave 12.

17. **Changelog.** Every Property and Prop wave adds its entry under
    `## Unreleased`, `### Changed (breaking)`, in the style of the entries
    already there: bold lead sentence, what breaks for a consumer, what the
    migration does on load. Wave 1 adds one line under `### Changed`. No
    version bump. No em-dash.

18. **Vocabulary.** The terminology doc gains the rules in Wave 13 and the
    interaction-state row in Wave 2. Retired words go in the retired tables
    with their replacement. The create-component skill gains one paragraph
    of prop rules and keeps its existing sentences where they already state
    a rule.

## Global invariants (reviewer checklist)

1. One word. The wave's retired-spelling grep returns nothing.
2. Values never change. Every migration is a pure key rename; the diff of
   every data file shows renamed keys and the version stamp only;
   `check:component-defaults` is green without a `sync`.
3. Every migration has its two tests and moves every config and preset
   stamp. `check:preset-themes` is green.
4. The synonym list only shrinks. No suffix or prefix is added to
   `aliasKinds.ts` beyond `-hairline-width`, `-hairline-inset`,
   `-indicator-width`, and `-track-height` as kind renames; a deleted
   spelling is not re-added anywhere, and no alias for an old kind name
   exists.
5. No new design token, no `tokens.css` change, no new rule id, no new
   `--surface-*`, `--text-*`, or `--color-*` token.
6. Every public break is in the changelog under `### Changed (breaking)` in
   the same commit.
7. A skill or reference edit is followed by both syncs, and `check:skills`,
   `check:skill-atlas`, and `check:skill-sources` are green. A rendered
   atlas card's title and its chips agree.
8. The gate set is green before each commit.
9. The data tree changes only in renamed keys and stamps.
   `themes/_active.json`, `themes/_production.json`,
   `tokens.generated.css`, and `fonts.css` are untouched;
   `check:production-is-default` passes; no `_working.json` exists.
10. `check-component --tests` runs for each touched id, one id at a time,
    never the omitted-id batch.
11. Comments in code state a why that is not obvious, or do not exist.
12. Nothing pushed, tagged, or released.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing;
never commit red. Commit message `Terminology W<n>: <summary>` plus the
standard co-author trailer. The plan's Status row may land as its own commit
under the same prefix. Do not push, tag, or release. Stop after each wave
for review. If reality contradicts this plan (a cited file is missing, a
check pins conflicting behavior, a name the plan lists is absent), stop and
report.

Never stash, reset, or checkout over uncommitted changes.

## Property rename recipe

Waves 2 through 7, 9, and 12 each rename semantic properties. Each of them
does all of the following for its names, and its Do paragraph adds what is
particular to it.

1. Runtime file: the `:global(:root)` declarations, every `var()` read,
   every SCSS list or mixin argument, and every class that mirrors the name.
2. Editor file: `allTokens` entries, `variable:` strings, `groupKey` and
   `label` strings, and state or variant lists.
3. `component-configs/<id>/default.json`: rename the keys in place.
4. The nine presets `themes/{autumn,default,halloween,midnight-study,ocean,royal-velvet,sketchy,spring-meadow,sunset}.json`:
   rename the keys in place under `componentConfigs.<id>`.
5. The migration, per judgment call 5, with its two tests.
6. Every config `schemaVersion` and every preset `componentSchemaVersion`
   to the new `CURRENT_COMPONENT_SCHEMA_VERSION`.
7. `src/testing/contracts/<id>.ts`.
8. Any file the retired-spelling grep still hits.
9. The changelog entry, per judgment call 17.
10. The gate set, with `check-component <id> --tests` for each touched id.

## Wave 1: catalogue text

**Files.** `src/system/components/Panel.svelte`,
`src/system/components/CollapsibleSection.svelte`,
`src/system/components/TabBar.svelte`,
`src/system/components/SideNavigation.svelte`,
`src/system/components/Tooltip.svelte`,
`src/system/components/Callout.svelte`, `CHANGELOG.md`.

**Do.**

- Replace the seven sentences in the Catalogue text table, verbatim.
- Add one line under `## Unreleased`, `### Changed`: the catalogue reads
  "views" for what TabBar switches, "a note" for Tooltip, "section" for
  what Panel frames, and "a modal window" for Dialog.

**Verify.** `npm test` green. `npx live-tokens components` prints the new
sentences for the six components. `git grep -n -E "reads as one region|rules a line under|panels the reader|switching panels|A hint that appears|a hint that hangs|a modal surface" src/system/components`
returns nothing. `git diff --stat` shows the six runtime files and the
changelog only.

## Wave 2: active means pressed

**Files.** `src/system/components/RadioButton.svelte`,
`src/system/components/TabBar.svelte`,
`src/system/components/SideNavigation.svelte`,
`src/editor/component-editor/RadioButtonEditor.svelte`,
`src/editor/component-editor/TabBarEditor.svelte`,
`src/editor/component-editor/SideNavigationEditor.svelte`,
`src/live-tokens/data/component-configs/{radiobutton,tabbar,sidenavigation}/default.json`,
the nine presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-selected-state.ts` (new),
`src/editor/core/themes/migrations/index.ts`,
`src/editor/core/themes/migrations/migrations.test.ts`,
`src/testing/contracts/{radiobutton,tabbar,sidenavigation}.ts`,
`src/editor/core/sketch/sketchLayer.ts`,
`src/editor/ui/UIPaletteSelector.svelte`,
`src/editor/component-editor/scaffolding/buildTypeGroupTokens.test.ts`,
`docs/terminology.md`, `CHANGELOG.md`.

**Do.** Follow the recipe for these names, with the `-active-` segment
becoming `-selected-`:

- RadioButton: the nine `--radiobutton-active-*` properties. The prop
  `active` becomes `selected`; `class:active` becomes `class:selected`, and
  the `&.active` rule follows.
- TabBar: the fourteen `--tabbar-active-*` properties. `tabStateNames` in
  the editor reads `selected`. The `.tab.active` class becomes
  `.tab.selected`, and `sketchLayer.ts` maps `.tab.selected` to the stem
  `tabbar-selected`.
- SideNavigation: every `--sidenavigation-{title,section,item,footer}-active-*`
  property. `STATEFUL_STATES` in the editor reads `selected`.
  `forceActivePart` becomes `forceSelectedPart` on the runtime prop and in
  `deriveForce`, per judgment call 9. The `.active` classes on `.sn-title`,
  `.sn-section-header`, `.sn-item`, and the footer follow.
- `RadioButtonEditor`'s `forceActive` and its three `active={…}` props
  become `forceSelected` and `selected={…}`.
- Delete the three dead `GRADIENT_DENYLIST` entries, per judgment call 10.
- The `buildTypeGroupTokens.test.ts` fixture for sidenavigation reads
  `selected`.
- The migration renames the `-active-` segment for `radiobutton`, `tabbar`,
  and `sidenavigation` only. Button's and IconButton's
  `--button-outline-active-*` are the pressed state and never move; the
  only-fires-for test uses one of them.
- `docs/terminology.md`, Component vocabulary, the interaction state row:
  "Default, hover, or active (pressed), a segment inside a property name
  such as `--button-outline-hover-surface`. Selected is a component state.
  A state is never a token."
- Changelog, breaking: RadioButton's `active` prop is `selected`;
  SideNavigation's `forceActivePart` is `forceSelectedPart`; the
  `-active-` properties of RadioButton, TabBar, and SideNavigation are
  `-selected-`, renamed on load.

**Verify.** The gate set, with `check-component` `--tests` for
`radiobutton`, `tabbar`, and `sidenavigation`. The retired-spelling grep
for `--(radiobutton|tabbar|sidenavigation)-[a-z-]*-active` and for
`forceActivePart|forceActive\b` returns nothing.
`git grep -n 'active=' src/system/components/RadioButton.svelte src/editor/component-editor/RadioButtonEditor.svelte`
returns nothing. `git grep -n -- '--button-outline-active-surface' src/system/components/Button.svelte`
still hits. The migration test's idempotency assertion passes.

## Wave 3: one hairline

**Files.** `src/system/components/{Dialog,Table,TabBar,SegmentedControl,CollapsibleSection,SectionDivider}.svelte`,
`src/editor/component-editor/{Dialog,Table,TabBar,SegmentedControl,CollapsibleSection,SectionDivider}Editor.svelte`,
`src/live-tokens/data/component-configs/{dialog,table,tabbar,segmentedcontrol,collapsiblesection,sectiondivider}/default.json`,
the nine presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-hairline.ts` (new),
`migrations/index.ts`, `migrations/migrations.test.ts`,
`src/testing/contracts/{dialog,table,tabbar,segmentedcontrol,collapsiblesection,sectiondivider}.ts`,
`src/editor/core/components/aliasKinds.ts`,
`src/editor/core/components/aliasKinds.test.ts`,
`src/editor/core/components/adjustAliases.ts`,
`src/editor/core/components/adjustAliases.test.ts`,
`src/editor/component-editor/scaffolding/TokenLayout.svelte`,
`src/editor/ui/variantScales.ts`, `bin/check-component.mjs`,
`src/editor/skill-atlas/SkillAtlas.svelte`,
`.claude/skills/live-tokens-set-geometry/SKILL.md`,
`.claude/skills/live-tokens-set-geometry/references/geometry-anchors.md`,
`.claude/skills/live-tokens-create-component/references/token-naming.md`,
`.claude/skills/live-tokens-create-component/references/sketch-mode.md`,
`src/editor/skill-atlas/trees/set-geometry.ts` and
`trees/create-component.ts` where an anchor moved,
`src/editor/skill-atlas/skillSources.generated.ts`,
`src/system/styles/CONVENTIONS.md`, `CHANGELOG.md`.

**Do.** Follow the recipe for these names, per judgment calls 1 and 2:

- Dialog: `--dialog-{header,footer}-divider` to `-hairline-color`;
  `--dialog-{header,footer}-divider-width` to `-hairline-width`.
- Table: `--table-default-{header,row,column}-divider` to `-hairline-color`;
  the three `-divider-width` to `-hairline-width`.
- TabBar: `--tabbar-bar-divider` to `--tabbar-bar-hairline-color`;
  `--tabbar-bar-divider-thickness` to `--tabbar-bar-hairline-width`. The
  override in `SkillAtlas.svelte` follows.
- SegmentedControl: `--segmentedcontrol-divider-color` to
  `--segmentedcontrol-hairline-color`; `-divider-thickness` to
  `-hairline-width`; `-divider-inset` to `-hairline-inset`;
  `--segmentedcontrol-small-divider-thickness` to `-small-hairline-width`;
  `-small-divider-inset` to `-small-hairline-inset`.
- CollapsibleSection: the 26 `--collapsiblesection-divider-*` properties to
  `--collapsiblesection-hairline-*`, and within them `-hairline-thickness`
  to `-hairline-width`. The prop union reads
  `'chromeless' | 'hairline' | 'container'`, the class `variant-hairline`,
  `VARIANTS` in the editor follows, the contract's variant label follows,
  and the catalogue `props.variant` sentence reads "`hairline` draws a line
  under the header".
- SectionDivider: `--sectiondivider-{lg,md,sm}-hairline-thickness` to
  `-hairline-width`. `-hairline` and `-hairline-color` stay.
- `aliasKinds.ts`, per judgment calls 3 and 4: the kinds `hairline-width`,
  `hairline-inset`, and `track-height` with their one suffix each; delete
  `-divider` from the surface list; the `TokenKind` union follows; the
  comment above `KIND_RULES` names border, hairline, and indicator as the
  three stroke roles. `aliasKinds.test.ts` cases follow.
- `adjustAliases.ts`: `AdjustKind` and the scale map read `hairline-width`.
  `adjustAliases.test.ts` follows. `TokenLayout.svelte` and
  `variantScales.ts` read the new kind names. `check-component.mjs` maps
  `hairline-width` to `border-width` and `hairline-inset` to `space`.
- Editor `label` strings read "hairline width" and "hairline color";
  `groupKey` strings that carry `divider` carry `hairline`.
- set-geometry `SKILL.md`, the `kind` line: `hairline-width` moves
  hairlines; the sentence about dividers, hairline rules, and `-thickness`
  aliases goes. `geometry-anchors.md` line 10 names `hairline-width`.
- `token-naming.md`: delete the rows `-divider`, `-thickness`,
  `-hairline-thickness`, `-divider-width`, `-divider-thickness`,
  `-divider-height`, `-divider-inset`, and `-inset`; add `-hairline-color`,
  `-hairline-width`, and `-hairline-inset`; the fall-through paragraph
  names `-hairline-width` where it named `-divider-height`. `sketch-mode.md`
  reads `--mywidget-hairline-color`.
- `CONVENTIONS.md`: delete the `-thickness` row; the paragraph below the
  table keeps its `groupKey` sentence and loses the thickness and
  SegmentedControl sentences.
- The migration renames for `dialog`, `table`, `tabbar`, `segmentedcontrol`,
  `collapsiblesection`, and `sectiondivider`.
- Changelog, breaking: the properties, renamed on load; CollapsibleSection
  `variant="divider"` is `variant="hairline"`; `check-component` no longer
  accepts `-thickness`, `-divider`, `-divider-width`, `-divider-thickness`,
  `-hairline-thickness`, `-divider-height`, `-divider-inset`, or `-inset`;
  the `set-geometry` op kind `divider-width` is `hairline-width`.
- Both skill syncs.

**Verify.** The gate set, with `check-component` `--tests` for the six ids,
and the skill checks. The retired-spelling grep for
`-divider(-|\b)|-thickness\b|divider-(width|height|inset)|'-inset'` returns
nothing. `git grep -n -E "kind: '(divider|hairline)-width'" src bin`
hits `hairline-width` only. `bin/set-geometry.test.ts` and
`bin/geometry.test.ts` pass, and the set-geometry skill's `kind` line names
`hairline-width` and no `divider-width`. The rendered set-geometry atlas
card's title and chips agree.

## Wave 4: one indicator

**Files.** `src/system/components/{SideNavigation,Callout}.svelte`,
`src/editor/component-editor/{SideNavigation,Callout}Editor.svelte`,
`src/live-tokens/data/component-configs/{sidenavigation,callout}/default.json`,
the nine presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-indicator.ts` (new),
`migrations/index.ts`, `migrations/migrations.test.ts`,
`src/testing/contracts/{sidenavigation,callout}.ts`,
`src/editor/core/components/aliasKinds.ts`,
`src/editor/core/components/aliasKinds.test.ts`,
`src/editor/core/components/adjustAliases.ts`,
`src/editor/core/components/adjustAliases.test.ts`,
`src/editor/component-editor/scaffolding/TokenLayout.svelte`,
`bin/check-component.mjs`,
`.claude/skills/live-tokens-set-geometry/SKILL.md`,
`.claude/skills/live-tokens-create-component/references/token-naming.md`,
`src/editor/skill-atlas/trees/set-geometry.ts` where an anchor moved,
`src/editor/skill-atlas/skillSources.generated.ts`, `CHANGELOG.md`.

**Do.** Follow the recipe for these names:

- SideNavigation: every `--sidenavigation-{title,section,item,footer}-{default,hover,selected}-accent`
  to `-indicator`, and each `-accent-width` to `-indicator-width`. Editor
  `groupKey` strings such as `title-accent-width` read
  `title-indicator-width`; labels already say "indicator width".
- Callout: `--callout-{info,success,warning,danger}-accent-width` to
  `-indicator-width`. The editor label "accent edge width" reads "indicator
  width"; its `groupKey` follows; its kind list reads `indicator-width`.
- `aliasKinds.ts`, per judgment calls 3 and 4: the kind `indicator-width`
  with the one suffix `-indicator-width`; delete `-accent` from the surface
  list and `-accent-width` from the kind; the ordering comment about
  `-accent-width` before `-accent` goes with them. `aliasKinds.test.ts`
  follows.
- `adjustAliases.ts`: `AdjustKind` and the scale map read
  `indicator-width`; its test follows. `TokenLayout.svelte` follows.
  `check-component.mjs` maps `indicator-width` to `border-width`.
- set-geometry `SKILL.md`, the `kind` line: `indicator-width` moves
  indicators.
- `token-naming.md`: delete the rows `-accent` and `-accent-width`; the
  `-indicator-width` row no longer says "moved with `-accent-width`".
- The migration renames for `sidenavigation` and `callout`.
- Changelog, breaking: the properties, renamed on load; `check-component`
  no longer accepts `-accent` or `-accent-width`; the `set-geometry` op kind
  `accent-width` is `indicator-width`.
- Both skill syncs.

**Verify.** The gate set, with `check-component` `--tests` for
`sidenavigation` and `callout`, and the skill checks. The retired-spelling
grep for `--(sidenavigation|callout)-[a-z-]*accent` and for
`'-accent'|'-accent-width'|accent-width` returns nothing. `--badge-accent-*`,
`--cornerbadge-accent-*`, `--surface-accent`, `--text-accent`, and
`--border-accent` are the accent color family and still hit a plain grep.

## Wave 5: SectionDivider background to surface

**Files.** `src/system/components/SectionDivider.svelte`,
`src/editor/component-editor/SectionDividerEditor.svelte`,
`src/live-tokens/data/component-configs/sectiondivider/default.json`, the
nine presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-sectiondivider-surface.ts`
(new), `migrations/index.ts`, `migrations/migrations.test.ts`,
`src/editor/core/themes/migrateComponentConfig.ts`,
`src/editor/core/themes/migrateComponentConfig.test.ts`,
`src/editor/core/store/gradientSource.test.ts`,
`src/testing/contracts/sectiondivider.ts`,
`src/editor/core/components/aliasKinds.ts`,
`src/editor/core/components/aliasKinds.test.ts`,
`.claude/skills/live-tokens-create-component/references/token-naming.md`,
`src/editor/skill-atlas/skillSources.generated.ts`, `CHANGELOG.md`.

**Do.** Follow the recipe for `--sectiondivider-{lg,md,sm}-background` to
`--sectiondivider-{lg,md,sm}-surface`. Then:

- Per judgment call 7, `renameSectionDividerObjectSlots` emits the three
  `-surface` keys, and treats an object-valued `--sectiondivider-<size>-background`
  as a family gradient and renames it. Its test in
  `migrateComponentConfig.test.ts` covers a string slot, an object slot, and
  a re-run on migrated output.
- `gradientSource.test.ts` uses the `-surface` name.
- `aliasKinds.ts`: delete `-background` from the surface list;
  `aliasKinds.test.ts` follows. `token-naming.md`: delete the
  `-background` row.
- The migration renames for `sectiondivider`.
- Changelog, breaking: the three properties, renamed on load;
  `check-component` no longer accepts `-background`.
- Both skill syncs.

**Verify.** The gate set, with `check-component sectiondivider --tests`, and
the skill checks. The retired-spelling grep for
`-background\b` over `src bin .claude docs/*.md` returns nothing except
`renameSectionDividerObjectSlots`'s historical source keys
(`--sectiondivider-canvas-background`, `--sectiondivider-color-canvas-background`),
which are migration input. A theme whose `--sectiondivider-md-background`
holds a gradient object loads with the gradient under `-surface`; the new
test proves it.

## Wave 6: CornerBadge prefix is its id

**Files.** `src/system/components/CornerBadge.svelte`,
`src/editor/component-editor/CornerBadgeEditor.svelte`,
`src/live-tokens/data/component-configs/cornerbadge/default.json`, the nine
presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-cornerbadge-prefix.ts` (new),
`migrations/index.ts`, `migrations/migrations.test.ts`,
`src/testing/contracts/cornerbadge.ts`, `bin/check-component.mjs`,
`bin/check-component.test.ts`,
`docs/design-system-compliance-briefing.md`, `CHANGELOG.md`.

**Do.** Follow the recipe for the forty `--corner-badge-*` properties to
`--cornerbadge-*`. Then:

- Per judgment call 11, delete `kebabOf`, the `kebab` parameter, and the
  two-prefix loop from `extractTokensForId`, with the docstring that
  explains them. Add the test case.
- `docs/design-system-compliance-briefing.md` line 353 no longer describes
  the hyphenated form.
- The migration renames for `cornerbadge`. The `2026-05-25` cornerbadge
  migration and its tests are untouched; they pin their own output.
- Changelog, breaking: the properties, renamed on load; a property must
  start with the component id verbatim, and `check-component` no longer
  accepts the hyphenated form.

**Verify.** The gate set, with `check-component cornerbadge --tests`. The
retired-spelling grep for `corner-badge` returns nothing. `npx live-tokens
check-component cornerbadge` reports no naming finding. The new
`check-component.test.ts` case passes.

## Wave 7: Toggle label-text to label

**Files.** `src/system/components/Toggle.svelte`,
`src/editor/component-editor/ToggleEditor.svelte`,
`src/live-tokens/data/component-configs/toggle/default.json`, the nine
presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-toggle-label.ts` (new),
`migrations/index.ts`, `migrations/migrations.test.ts`,
`src/testing/contracts/toggle.ts`, `CHANGELOG.md`.

**Do.** Follow the recipe for `--toggle-label-text` to `--toggle-label` and
`--toggle-disabled-label-text` to `--toggle-disabled-label`. No suffix
leaves `aliasKinds.ts`: `-label` is already the color of a label and
`-text` stays for the components whose text part is `text`. Changelog,
breaking: the two properties, renamed on load.

**Verify.** The gate set, with `check-component toggle --tests`. The
retired-spelling grep for `--toggle-[a-z-]*label-text` returns nothing.

## Wave 8: callback casing

**Files.** `src/system/components/TabBar.svelte`,
`src/system/components/InlineEditActions.svelte`,
`src/editor/component-editor/TabBarEditor.svelte`,
`src/editor/component-editor/InlineEditActionsEditor.svelte`,
`src/editor/skill-atlas/SkillAtlas.svelte`,
`src/testing/contracts/{tabbar,inlineeditactions}.ts`,
`.claude/skills/live-tokens-create-component/SKILL.md`,
`src/editor/skill-atlas/trees/create-component.ts` where an anchor moved,
`src/editor/skill-atlas/skillSources.generated.ts`, `CHANGELOG.md`.

**Do.**

- TabBar: `ontabChange` becomes `onchange`. InlineEditActions: `onSave` and
  `onCancel` become `onsave` and `oncancel`. Every caller follows, including
  the two `SkillAtlas.svelte` mounts and the editors, per judgment call 12.
- The contracts' behavior cases name the new props.
- `SKILL.md`, in the Runtime component section, one sentence: a callback
  prop is `on` followed by the event name, all lowercase, as in `onchange`,
  `onclose`, and `onsave`.
- Changelog, breaking: the three props.
- Both skill syncs.

**Verify.** The gate set, with `check-component` `--tests` for `tabbar` and
`inlineeditactions`, and the skill checks. The retired-spelling grep for
`ontabChange|onSave|onCancel|on:tabChange` returns nothing. The TabBar
demo in the editor still switches tabs: `TabBarEditor` passes `onchange`
and the contract's callback case fires with the tab id.

## Wave 9: open everywhere

**Files.** `src/system/components/Dialog.svelte`,
`src/system/components/CollapsibleSection.svelte`,
`src/system/components/SideNavigation.svelte` (its inner
CollapsibleSection mount),
`src/editor/component-editor/{Dialog,CollapsibleSection}Editor.svelte`,
`src/live-tokens/data/component-configs/collapsiblesection/default.json`,
the nine presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-collapsiblesection-open.ts`
(new), `migrations/index.ts`, `migrations/migrations.test.ts`,
`src/testing/contracts/{dialog,collapsiblesection}.ts`, `CHANGELOG.md`.

**Do.** Per judgment call 13:

- Dialog: `show` becomes `open`, still `$bindable(false)`; every read and
  the `{#if}` follow.
- CollapsibleSection: `expanded` becomes `open`; `class:expanded` becomes
  `class:open`; `aria-expanded` stays. Follow the recipe for
  `--collapsiblesection-chromeless-expanded-padding`,
  `--collapsiblesection-container-expanded-padding`,
  `--collapsiblesection-container-expanded-surface`, and
  `--collapsiblesection-hairline-expanded-padding`, each `-expanded-` to
  `-open-`. Editor state labels follow. SideNavigation's inner mount passes
  `open=`.
- The migration renames for `collapsiblesection`.
- Changelog, breaking: Dialog `show` is `open`; CollapsibleSection
  `expanded` is `open`; the four properties, renamed on load.

**Verify.** The gate set, with `check-component` `--tests` for `dialog` and
`collapsiblesection`. The retired-spelling grep for
`\bshow\b` over `src/system/components/Dialog.svelte src/editor/component-editor/DialogEditor.svelte src/testing/contracts/dialog.ts`
and for `expanded` over the CollapsibleSection runtime, editor, config, and
contract returns nothing except `aria-expanded`.

## Wave 10: size values default and small

**Files.** `src/system/components/Card.svelte`,
`src/system/components/Notification.svelte`,
`src/editor/component-editor/{Card,Notification}Editor.svelte` where they
pass a size, `src/editor/skill-atlas/TreeNodeCard.svelte`,
`src/testing/contracts/{card,notification}.ts` where they pass a size,
`CHANGELOG.md`.

**Do.** Per judgment call 14:

- Card: `size?: 'default' | 'small'`; `class:small={size === 'small'}`; the
  `.card.compact` rules become `.card.small`.
- Notification: `size?: 'default' | 'small'` with default `'default'`;
  `class:small`; the `&.compact` rule becomes `&.small`.
- `TreeNodeCard.svelte` passes `size="small"`.
- Changelog, breaking: Card `size="compact"` is `size="small"`; Notification
  `size="normal"` is `size="default"` and `size="compact"` is `size="small"`.

**Verify.** The gate set, with `check-component` `--tests` for `card` and
`notification`. The retired-spelling grep for `compact|'normal'` over
`src/system/components/Card.svelte src/system/components/Notification.svelte src/editor/skill-atlas src/testing/contracts/card.ts src/testing/contracts/notification.ts`
returns nothing. `UIPillButton`'s `size="compact"` in
`RadialShapePad.svelte` is editor chrome and stays.

## Wave 11: TabBar value, SideNavigation title

**Files.** `src/system/components/TabBar.svelte`,
`src/system/components/SideNavigation.svelte`,
`src/editor/component-editor/{TabBar,SideNavigation}Editor.svelte`,
`src/editor/skill-atlas/SkillAtlas.svelte`, `src/editor/docs/Docs.svelte`,
`src/testing/contracts/{tabbar,sidenavigation}.ts`, `CHANGELOG.md`.

**Do.**

- TabBar: `selectedTab` becomes `value`. Every caller follows.
- SideNavigation: `titleLabel` becomes `title`; `titleHref` stays. Every
  caller follows. The contract's part keys that read `titleLabel` follow,
  per judgment call 8.
- Changelog, breaking: the two props.

**Verify.** The gate set, with `check-component` `--tests` for `tabbar` and
`sidenavigation`. The retired-spelling grep for `selectedTab|titleLabel`
returns nothing.

## Wave 12: Badge and CornerBadge brand

**Files.** `src/system/components/Badge.svelte`,
`src/system/components/CornerBadge.svelte`,
`src/editor/component-editor/{Badge,CornerBadge}Editor.svelte`,
`src/live-tokens/data/component-configs/{badge,cornerbadge}/default.json`,
the nine presets, all 26 config stamps,
`src/editor/core/themes/migrations/2026-09-13-badge-brand.ts` (new),
`migrations/index.ts`, `migrations/migrations.test.ts`,
`src/testing/contracts/{badge,cornerbadge}.ts`,
`src/editor/component-editor/scaffolding/buildTypeGroupTokens.test.ts`,
`.claude/skills/live-tokens-create-component/SKILL.md`,
`src/editor/skill-atlas/trees/create-component.ts` where an anchor moved,
`src/editor/skill-atlas/skillSources.generated.ts`, `CHANGELOG.md`.

**Do.** Per judgment call 15, follow the recipe for the thirteen
`--badge-primary-*` properties to `--badge-brand-*` and the three
`--cornerbadge-primary-*` properties to `--cornerbadge-brand-*`. Then:

- `BadgeVariant` and the exported variant list read `brand` in `primary`'s
  position; both `$variants` SCSS lists follow; the `badge-{variant}` class
  renders `badge-brand`.
- Both catalogue `props.variant` sentences read "`brand`, `accent`, …".
- The contracts' variant lists and paint helpers read `brand`.
- `buildTypeGroupTokens.test.ts` line 17 reads `--badge-brand-text`.
- `SKILL.md` line 98's example reads `--badge-brand-text`.
- The migration renames keys for `badge` and `cornerbadge` only; the
  only-fires-for test uses `--button-primary-surface`.
- Changelog, breaking: `variant="primary"` on Badge and CornerBadge is
  `variant="brand"`; the properties, renamed on load. Button's and
  IconButton's `primary` are unchanged.
- Both skill syncs.

**Verify.** The gate set, with `check-component` `--tests` for `badge` and
`cornerbadge`, and the skill checks. The retired-spelling grep for
`--(badge|cornerbadge)-primary` and for `'primary'` over
`src/system/components/Badge.svelte src/system/components/CornerBadge.svelte src/testing/contracts/badge.ts src/testing/contracts/cornerbadge.ts`
returns nothing. `git grep -n -- '--button-primary-surface' src/system/components/Button.svelte`
still hits.

## Wave 13: the rules

**Files.** `docs/terminology.md`,
`.claude/skills/live-tokens-create-component/SKILL.md`,
`src/editor/skill-atlas/trees/create-component.ts` where an anchor moved,
`src/editor/skill-atlas/skillSources.generated.ts`, `CHANGELOG.md`.

**Do.** Per judgment call 18:

- `docs/terminology.md`, Component vocabulary, add rows, each one line in
  the table's style: **label, title, text** (a prop: `label` names a
  control, `title` heads content, `text` is body copy); **description,
  hint, summary** (a description sits under a title, a hint under a field,
  a summary beside a header); **open** (the one prop for an open state);
  **value** (the prop that holds a selection's id); **size** (values
  `default` and `small`); **callback prop** (`on` plus the event name,
  lowercase); **hairline properties** (`-hairline-color`,
  `-hairline-width`, `-hairline-inset`); **indicator** (the bar or stripe
  that marks the current item; `-indicator`, `-indicator-width`); **a text
  part's color** (its bare name; `-font-*` hang off it); **fill**
  (`-surface`, in every component); **prefix** (the component id verbatim);
  **step name, role name** (a step name where only size differs, a role name
  where the value means something: Image's `banner`); **interaction
  intrinsic** (named for what it does: `hoverTint`, `hover`, `zoom`);
  **bare, chromeless** (Card's `bare` drops the header; CollapsibleSection's
  `chromeless` drops the frame).
- `docs/terminology.md`, a retired table under Component vocabulary:
  in the two-column form the doc's other retired tables use, with "Use
  instead" as the second column: `divider` (as a property word or a
  `set-geometry` op kind) to hairline; `accent` (for an indicator) to
  indicator; `thickness`
  to width; `background` (as a suffix) to surface; `active` (for selection)
  to selected; `expanded` and `show` to open; `compact` and `normal` (as
  size values) to small and default; `selectedTab` to value; `titleLabel`
  to title; `primary` (as a Badge variant) to brand; `--corner-badge-` to
  `--cornerbadge-`.
- `SKILL.md`: one paragraph in the Design model section stating the prop
  rules (label, title, text; open; value; size values; the callback
  sentence Wave 8 added moves here if it reads better there). The property
  rules the skill already states, the prefix, the bare part as the color,
  and `-surface` for a fill, stay where they are and are not repeated.
- Changelog, under `### Changed`: one line that the terminology doc and the
  create-component skill record the component naming rules.
- Both skill syncs.

**Verify.** `check:skills`, `check:skill-atlas`, `check:skill-sources`, and
`check:cli-strings` exit 0. Each new term appears in the terminology doc's
tables exactly once. The rendered create-component atlas card's title and
chips agree. `npm test` green.

## Left as it is

The Button and text-scale senses of `primary`; `default` in all four uses;
`bare` beside `chromeless`; `description`, `hint`, and `summary`; Image's
variant names; `hoverTint`, `hover`, and `zoom`; the preview hooks other than
`forceActivePart`, which wait for their own plan; `UIPillButton`'s
`size="compact"`, which is editor chrome; the anchor phrase "hairline rules"
in `geometry-anchors.md`, which is an anchor name `check:skills` pins across
four files; and the historical source keys inside
`renameSectionDividerObjectSlots`, which are migration input.
