# The catalogue entry carries the decision

Plan of 2026-09-15. Nothing below is applied. The analysis behind it is
`component-contract-assessment.md`; where this plan differs from that
document, this plan is current.

An agent that builds a page has to choose the shipped component a requirement
calls for, configure it from its declared props, and stay inside the rules of
the design system. Today the facts it needs sit in five places, and the two
that carry the decision are prose: the `catalogue` export's `notFor` sentence
and the seven family tables in the picker skill. This plan makes the catalogue
entry the one declared source of decision facts, derives everything else from
code and tests, and turns `components` into the query the skills run. An eval
measures whether the result changes what an agent chooses.

## Ground truth

Measured against the tree on 2026-09-15, package 0.79.0.

**Where the facts sit.**

| Fact | Holder | Read by |
|---|---|---|
| What the component is, when to use it, what to use instead | `catalogue` in the runtime's `<script module>`: `description`, `useFor`, `notFor`, `props?` (`scaffolding/types.ts:7-14`) | `catalogueOf` (`bin/lib/catalogue.mjs:92-122`), the registry (`registry.ts:6-56`) |
| Props, unions, defaults | The `Props` interface and `as const` arrays | `componentProps` in `tokenVocabulary.mjs`; `unknown-prop`, `unknown-prop-value` |
| Parts, states, role, behavior | `src/testing/contracts/<id>.ts` | The contract runner only |
| Page rules | `bin/rules/componentUse.mjs`: `unknown-component`, `unknown-prop`, `unknown-prop-value`, `control-size`, `multiple-primary`, `danger-without-dialog`, `native-control`, `property-override` | `check-page` |
| The decision tests | `live-tokens-pick-component/SKILL.md`, seven `## <Name> family` sections, four as tables and three as lists | The agent |
| Container and emphasis rules | `live-tokens-create-page/SKILL.md:75-83, 120-128` | The agent |

**The duplication.** Every `notFor` names its sibling in parentheses, and the
picker's tables name the same pairs with a condition. Nothing reads either as
data, and nothing checks them against each other. The 7 September audit found
twenty rows of the same kind of drift between skills and the CLI.

**The query verb.** `components [id] [--json]` (`bin/cli.mjs:262-269`) calls
`describeComponents` (`bin/lib/catalogue.mjs:167-190`), which walks
`src/system/components` plus every `componentDirs` entry at call time
(`componentInventory`, `tokenVocabulary.mjs:206-259`), a project's own copy
winning by id. There is no generated file. The output per component is `id`,
`name`, `origin`, `file`, `registered`, `catalogue`, `variants`, `props`,
`tokens`.

| Measurement | Value |
|---|---|
| `components --json`, 26 components | 179 KB |
| The same without `tokens` | 22 KB |
| `tokens` entries across the 26 | 1312 |
| Node startup | 30 ms |
| `loadVocabulary` plus `describeComponents`, warm | 50 ms |
| `components --json`, end to end | 90 ms |

**The parser.** `catalogueOf` reads `key: <string literal>` pairs and one
nested `props` object. An array or a nested object under any other key is
silently absent.

**The tests that pin the entry.** `registryContract.test.ts:51-59`: the
registry imports the runtime's own `catalogue`, and every `props` key names a
declared prop. `missing-description` (`bin/rules/componentStructure.mjs:36-41`)
reports a runtime with no export or a required field that is not a string
literal.

**`componentDirs` is already checked.** A runtime under a configured directory
resolves in `check-component` through `componentInventory`
(`bin/check-component.mjs:109-111`), with tests at
`bin/check-component.test.ts:398-420`. The sentence at
`live-tokens-create-component/SKILL.md:104`, "check-component does not check
it", is stale.

**The evals.** `.claude/evals/README.md` records that no case has ever run:
`claude plugin eval` answered "currently in early access" on 2026-09-02.
`trigger-confusable-pair` tests only that the picker skill fires.

**Accessible names in the code.** IconButton requires `ariaLabel: string` and
RadioButton requires `label: string`. Input, Toggle, Slider, and Dialog
declare `label` or `title` as optional with an empty default.

## Target model

- **Three holders.** The runtime file owns what the component is and how to
  decide (`Props` and `catalogue`). The contract test owns what it is made of
  and does (`parts`, `states`, `interaction.role`, `behavior`). The rule
  modules own every enforced constraint with one `guidance` wording.
- **One reader.** `components <id>` joins the three. `components --family
  <name>` returns the candidates for one need. Skills, the editor, and any
  later exporter consult this and nothing else.
- **Skills hold procedure.** The picker names the seven families and the query
  to run. Create-page keeps its layout guidance and cites rule ids. Neither
  restates a component fact.
- **The catalogue entry.**

```ts
export type CatalogueFamily =
  | 'action' | 'single-selection' | 'text-entry' | 'on-off'
  | 'container' | 'messaging' | 'display';

export type CatalogueEntry = {
  /** One sentence: what the component is. */
  description: string;
  /** The picker family. One per component. */
  family: CatalogueFamily;
  /** The condition that makes this component the right one. */
  useFor: string;
  /** Sibling id -> the condition that makes the sibling right instead. */
  alternatives: Record<string, string>;
  /** Rules of use. An entry with `rule` names the checker rule that enforces it. */
  constraints?: Array<string | { rule: string; text: string }>;
  /** Keyed by prop name; the value explains that prop's values. */
  props?: Record<string, string>;
};
```

## Decisions

**1. Derived facts are never declared. Decided 2026-09-15.** Variants, sizes,
states, parts, role, and keyboard pattern come from `Props`, the property
names, and the contract test. The entry holds only what no code or test says.

**2. No `accessibleName` field. Decided 2026-09-15.** Its `{ prop }` form
restates `Props`, its `{ none }` form restates the contract's inapplicable
interaction, and its `{ from }` form is a composition constraint. Where a name
is required and the type allows its absence, the fix is the type.

**3. `alternatives` replaces `notFor`. Decided 2026-09-15.** The two say the
same thing and one is data. This breaks every consumer's `satisfies` clause,
and `missing-description` names the missing field.

**4. The catalogue is read at query time. Decided 2026-09-15.** The walk costs
50 ms of a 90 ms call. A generated file would need a sync script and a drift
gate. A cache, if a measurement ever asks for one, lives in the dev server's
memory or under `node_modules/.cache/`.

**5. The name stays "catalogue". Decided 2026-09-15.** "Contract" already
names the registry contract (`component-editor/contract.ts`) and the browser
contract (`src/testing/componentContract.ts`).

**6. The eval baseline.** Wave 0 authors the case and tries to run it. If the
runner still refuses, the wave records that and the plan proceeds. **Reserved
for the user:** whether to hold Wave 1 until a baseline exists.

## Invariants

1. **Every declared name is verified.** Each `alternatives` key is a
   registered id, each `constraints[].rule` is a rule id in `PAGE_RULES` or
   `COMPONENT_RULES`, each `props` key is a declared prop, and `family` is in
   the closed union. `registryContract.test.ts` fails otherwise.
2. **The picker and the entries agree.** `check:skills` fails when a family
   heading in the picker skill names no `CatalogueFamily` member, or a member
   has no heading, or a shipped entry's `family` is outside the union.
3. **Rule guidance lives once.** A skill or an entry cites a rule by id and
   never rewords its `guidance`.
4. **Skills stay in sync.** After any `SKILL.md` or `references/*.md` edit,
   run `npm run sync:skill-atlas` and `npm run sync:skill-sources`.
   `check:skills`, `check:skill-atlas`, `check:skill-sources`, and
   `check:cli-strings` pass at the end of every wave. Each `SKILL.md` stays
   under 250 lines.
5. **Entry text follows the writing rules:** active voice, no em dashes, and
   no pairing a statement with its rejected opposite. One condition per
   `useFor` and per alternative, phrased as the question that separates them.
6. **No new tokens.** `tokens.css` changes only through `npx live-tokens migrate`.
7. **The data tree is untouched.** A wave that runs the editor or `--tests`
   restores `src/live-tokens/data` per `CLAUDE.md`.
8. **The engine loads lazily.** `bin/engineLoadsLazily.test.ts` stays green.
9. **Consumer breaks land under a breaking heading** in the Unreleased
   `CHANGELOG.md` section.

## Out of scope

- A `composition` field. The few real pair rules fit in `constraints` on the
  component that owns them. A matrix waits for an eval failure that asks for it.
- Splitting `loadVocabulary` for catalogue-only queries. The whole walk is
  50 ms; a split saves less than the call's Node startup.
- A `/api/live-tokens/components` route and an in-memory cache in the dev
  server. Cheap once `describeComponents` is exported, and it waits for a
  caller.
- `role`, `parts`, and `states` printed by `components`. Parts and states can
  be parsed from the property names; role needs the compiled testing bundle.
  Both wait for a query that needs them.
- The DESIGN.md export. It becomes one function over the entry and the
  resolved theme, sequenced in the DTCG report's revised order.
- Making `label` required on Input, Toggle, and Slider, and `title` on Dialog.
  A breaking change for its own release.
- An MCP server. The CLI plus `--json` is host-neutral and is what the skills
  teach.
- Releasing. `CHANGELOG.md` entries stay under Unreleased.

## Agents and workflow runs

Each wave runs in three steps: execute, verify, review. The waves run in order
in one working tree, since Waves 1 to 3 all touch the skills and regenerate
`skillSources.generated.ts`.

| Wave | Execute | Verify | Review | Gate |
|---|---|---|---|---|
| 0 Eval baseline | `wave-executor` | none | `wave-reviewer` reads the case against the README's documented layout | automatic; a refused run is recorded |
| 1 The entry decides | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 2 Skills hold procedure | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 3 Guidance corrections | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 4 Eval after | `wave-executor` | none | `wave-reviewer` compares the two runs | **the user** reads the result |

**Saved workflow.** Copy `.claude/workflows/check-fix-wave.js` to
`contract-wave.js` with `PLAN` set to this file and the ledger prefix below.
`check-fix-all.js` is the model for a `contract-all.js` that runs Waves 0 to 3
in order. Wave 4 runs on its own after the user has read Wave 0's outcome.

**Ledger.** Every executor commits with the subject prefix `Contract W<n>:`.
`git log --grep "Contract W"` is the record the reviewer reads.

**Control flow for one wave** is the same as in
`check-and-fix-unification.md`: execute returns units, gates, oddities, and a
resume point; verify runs the wave's commands with one fix round; review
returns APPROVE or BLOCK with one fix round, and blocks when an oddity needs
the user.

## Wave 0: eval baseline

1. Author `.claude/evals/outcome-pick-component/prompt.md` in the documented
   layout, with `runs: 3`, `allowed_tools: [Bash, Read, Glob, Grep]`, and no
   write tools. The prompt asks for the component, its variant, and its props
   for each of twelve requirements, in one answer, and forbids writing files.
2. The twelve requirements cover every family at least once and carry three
   negatives: a choice of several countries (nothing shipped fits; the answer
   routes to create-component), a searchable city list (the same route, which
   the picker already names), and a destructive confirmation (Dialog with a
   danger Button, so `danger-without-dialog` is honoured). Write the expected
   id and props for each in `graders/expected.md` as a table.
3. Write `graders/criteria.md` (`type: llm`): PASS when every row names the
   expected component id, a variant from its union where the requirement
   fixes one, and no component the catalogue lacks. FAIL on any invented
   component, any prop the `Props` interface does not declare, or a multiple
   selection answered with MenuSelect.
4. Write `graders/check-run.md` (`type: tool_used`, `Bash`,
   `input_match: 'live-tokens components'`, `min: 1`): the answer counts only
   if the catalogue was consulted.
5. Add the row to the README's case table. Try `claude plugin eval .claude
   --case outcome-pick-component`. Record the outcome, or the refusal with
   its date, under the README's "These cases have never been run" paragraph.

**Reserved for review.** Whether a requirement's expected answer is the one
the picker skill gives today. The reviewer walks each row through the skill's
family test. A row the skill cannot answer is a finding against the row, and
the executor rewrites it.

**Done when** the case directory holds `prompt.md` and three graders, the
README lists it, and the README records the run or the refusal.

## Wave 1: the entry decides

1. In `scaffolding/types.ts`, add `CatalogueFamily` and change `CatalogueEntry`
   to the target shape. `notFor` goes. Export both from the two barrels that
   export `CatalogueEntry` today.
2. Convert the 26 shipped entries. `family` follows the picker's section that
   names the component. Each `alternatives` condition is the sibling's test
   from the picker table or list, in the entry's own words where the table's
   cell is a fragment. `constraints` carries what the picker or create-page
   states about that component alone: Button gets `multiple-primary` and
   `danger-without-dialog` by rule id; MenuSelect states one value and that
   the Button that opens it is the control on the page; Panel, Card, and
   CollapsibleSection take their container-by-purpose sentence.
3. Extend `catalogueOf` to a literal subset: string values, arrays of strings
   and of `{ rule, text }` objects, and one-level objects of strings. A value
   outside the subset stays silently absent, as today.
4. `describeComponents` prints `family`, `alternatives`, and `constraints`.
   `describeLines` prints `Family:`, `Use for:`, one `Instead:` line per
   alternative, and one `Rule:` line per constraint, with the rule id in
   brackets when it has one.
5. Add `--family <name>` and `--fields <a,b,c>` to `components`, parsed in
   `parseCheckFlags` beside `--json`. `--family` filters the list and rejects
   a name outside the union with the seven names in the message. `--fields`
   selects top-level keys of each entry. The list form omits `tokens` unless
   `--fields` names it; the id form prints everything, as today. Document
   both flags in the usage text at `bin/cli.mjs:60-64`.
6. `missing-description` reports a missing `family` or `alternatives`, an
   `alternatives` key that is not a component id, and a `family` outside the
   union. Its guidance names the four fields.
7. `registryContract.test.ts` gains the three assertions of invariant 1. It
   imports `PAGE_RULES` and `COMPONENT_RULES` from `bin/rules` for the rule
   ids.
8. `bin/catalogue.test.ts` covers an array value, a nested object, a
   `{ rule, text }` entry, a non-literal value that is absent, `--family` on a
   fixture with two families, `--fields` selecting two keys, and the list
   form omitting `tokens`.
9. `CHANGELOG.md`, Unreleased. Changed (breaking): `CatalogueEntry` requires
   `family` and `alternatives`, and `notFor` is gone. Added: `components
   --family` and `--fields`.

**Reserved for review.** A condition that loses the picker's meaning while
moving into an entry. The reviewer reads each `alternatives` value beside the
picker's cell for that pair. An entry whose `family` differs from the section
that names the component.

**Done when** `git grep -n "notFor" -- src bin template .claude` prints
nothing, `node bin/cli.mjs components --family single-selection --json`
prints exactly SegmentedControl, TabBar, RadioButton, and MenuSelect, and
`npx vitest run bin src/editor/component-editor` passes.

## Wave 2: skills hold procedure

1. Rewrite `live-tokens-pick-component/SKILL.md`. Keep the trigger
   description, the seven family headings, and "Nothing fits". Under each
   family heading, one sentence says what need the family serves. The tables
   and the bulleted tests go. A "Procedure" section says: name the family,
   run `npx live-tokens components --family <name> --json`, read each
   candidate's `useFor`, `alternatives`, and `constraints`, choose the one
   whose condition the requirement meets, and when none does, follow "Nothing
   fits". Mention `--fields`, or add `components --fields` to `OMITTED_FLAGS`
   in `scripts/lib/skillChecks.mjs`, so the flag check passes.
2. In `scripts/lib/skillChecks.mjs`, add the cross-check of invariant 2. Read
   the union from `scaffolding/types.ts` the way `KIND_RULES` is read from
   `aliasKinds`, and pass the file in from `scripts/check-skills.mjs`. Read
   each shipped entry's `family` through `catalogueOf`.
3. Rewrite the pick-component atlas tree. The seven `chipset` nodes become
   one `cli` node for the query and one `step` node for reading the answer.
   Re-point every `lines` range by hand where the anchor text is gone, then
   run both syncs.
4. In `live-tokens-create-page/SKILL.md`, replace "Containers by purpose" and
   the emphasis rules with a sentence that points at `components <id>` for a
   component's constraints, and a `## Rules the checker enforces` list that
   names `multiple-primary`, `danger-without-dialog`, `control-size`, and
   `native-control` by id with no rewording. Layout guidance stays.
5. In `scripts/lib/skillChecks.mjs`, verify every id under a `## Rules the
   checker enforces` heading against the rule tables.
6. In `live-tokens-create-component/SKILL.md:106-118`, show the full entry
   with `family`, `alternatives`, and one constraint, and say that
   `alternatives` keys are component ids the registry test verifies.
7. Run `npm run sync:skill-atlas` and `npm run sync:skill-sources`.

**Reserved for review.** A picker family sentence that restates a component's
condition. A create-page sentence that rewords a rule's guidance. The reviewer
reads the two skills against invariant 3.

**Done when** `check:skills` fails on a fixture whose picker lacks one family
heading and passes on the tree, the four skill gates pass, and
`git grep -n "Not for\|notFor" -- .claude/skills` prints nothing.

## Wave 3: guidance corrections

1. `live-tokens-create-component/SKILL.md:104`: a `componentDirs` component is
   listed, reported, and checked. Cite `check-component <id>`.
2. `missing-description`'s guidance and the `components` usage text read the
   same vocabulary as the entry: "family", "alternative", "constraint".
   `check:cli-strings` passes.
3. `docs/terminology.md` gains the three words with one line each.
4. Run both syncs.

**Done when** `git grep -n "does not check it" -- .claude/skills` prints
nothing and the four skill gates pass.

## Wave 4: eval after

1. Run `claude plugin eval .claude --case outcome-pick-component` with the
   same `runs` as Wave 0.
2. Record both scores and the baseline arm in the README's case table, with
   the date and the package version.

**Reserved for the user.** Whether the difference justifies the composition
field, the `role` output, or the DESIGN.md export, each listed as out of scope
above.

**Done when** the README holds the two results side by side.
