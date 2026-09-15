# Component contract assessment

Assessment date: 15 September 2026. Package: `@motion-proto/live-tokens` 0.79.0. Nothing in this document is applied.

Revised the same day in `component-contract.md`, which is the plan: `accessibleName` is dropped, the query verb gains `--family` and `--fields`, and the catalogue stays read at query time. Where the two differ, the plan is current.

## Summary

Live Tokens already holds most of a component contract. It is spread over five surfaces, and only the decision part is prose. The recommendation is to grow the existing per-component `catalogue` entry with four declared fields, derive everything else from code and tests, and let `components <id> --json` print the whole contract. The existing file, verb, and type carry it.

The proposition refines to this in our architecture:

- Tokens say what values exist (`tokens --json`, `:global(:root)`, `default.json`).
- Code says what can be configured: props, their unions, and their defaults (`Props`, parsed by `components <id>`).
- Tests say what a component is made of and does: parts, states, role, and behavior (`src/testing/contracts/<id>.ts`).
- The catalogue entry says how to decide. This is the layer to grow.

The one concrete test of the result is the criterion in the brief: given a natural-language requirement, the agent chooses the shipped component and variant without inventing a component. An eval case set measures it. A static test measures only that the contract is complete and internally consistent.

## What Live Tokens already has

| Contract concern | Where it lives | Form | Machine-readable | Enforced by |
|---|---|---|---|---|
| Intent | `catalogue.description` in the runtime file's `<script module>` | string | Yes, `components --json` | `missing-description`, `RegistryEntry.catalogue` is required |
| Use when | `catalogue.useFor` | one prose sentence | As text | `missing-description` |
| Alternatives | `catalogue.notFor`, which names the sibling in parentheses; the seven family tables in `pick-component/SKILL.md` | prose | No | Nothing checks that the entry and the skill agree |
| Props, variants, sizes | The `Props` interface and `as const` arrays such as `calloutVariants` | TypeScript | Yes: `props[{name, type, values}]` and `variants` | `unknown-prop`, `unknown-prop-value`, `control-size` |
| Prop guidance | `catalogue.props` | string per prop | Yes | Registry test: each key names a declared prop |
| Anatomy | `parts` in `src/testing/contracts/<id>.ts`; the property grammar `--<id>[-<variant>][-<part>][-<state>]-<property>` | selectors; names | Test layer only | Contract tests |
| States | The semantic property names; the editor's state tabs; `states[]` in the contract test | names | Test layer only | `state-after-property`, `disabled-is-terminal` |
| Role and keyboard | `interaction.role`, `INTERACTIVE_ROLES`, `behavior` cases | test data | Test layer only | `contract-interaction`, `contract-behavior` |
| Themeable values | Semantic properties and `component-configs/<id>/default.json` | CSS and JSON | Yes, `tokens --json` | Registry contract, `default-not-token` |
| Structural options | `intrinsics` on Card, Image, SectionDivider editors | `IntrinsicSpec` | In process | `intrinsicsContract.test.ts` |
| Page rules | `bin/rules/componentUse.mjs` | rule id, severity, repair, guidance | Yes, `check-page --json` | `multiple-primary`, `danger-without-dialog`, `native-control`, `property-override` |
| Composition | "Containers by purpose" in `create-page/SKILL.md:75-83` | prose | No | The create-page verify checklist |
| Accessibility | `label: string` required on RadioButton; the create-page verify checklist | code; prose | Partly | TypeScript |

Two observations follow.

Variants, states, anatomy, and keyboard pattern, four of the seven fields in the brief's hypothesis, already exist as code or test data. Declaring them again would create a second source that drifts. The 7 September audit found that drift between skill prose and CLI behaviour in twenty rows.

The decision fields are the ones with no data form. `notFor` carries the alternative and its condition in one sentence, and the picker skill carries the same pairs again in seven tables. Nothing reads either as data, and nothing checks them against each other. The 9 September guidance assessment listed "suitability of component choice" as a review obligation that no check covers.

## The gap, walked through one requirement

"Let the user choose one country." An agent with today's surfaces:

1. Runs `components --json` and reads all 26 entries. There is no family index, so it cannot ask for the single-selection candidates alone.
2. Finds MenuSelect: "single selection from a set too long to sit in a row, dropped from a Button." Finds RadioButton: "a choice the reader reviews as text before committing to a larger form." Finds the thresholds "2 to 4" and "2 to 7" only in the skill table, and only if the skill fired.
3. Extracts the alternative from "(SegmentedControl)" inside prose.
4. Looks for the label requirement and finds nothing. MenuSelect has no `label` prop. The create-page skill says "dropped from a Button", so the Button carries the name, and no entry says so.
5. Finds no searchable select and no multiple-selection component. The catalogue is closed, and the entry is silent on a requirement that falls outside it. `unknown-component` catches an import of an invented component; it catches hand-rolled markup only through `native-control`, which covers `<button>`, `<input>`, and `<select>`.

The agent can reach MenuSelect from this. It cannot do so reliably, because steps 2 to 5 each ask it to infer.

## Recommendation

Grow `CatalogueEntry`. It is already the declared, per-component, in-source, statically parsed surface that the registry requires, the CLI prints, the checker enforces, and consumers author. The DTCG plan's phase 6 moves it out of `<script module>` into a TypeScript module, and the new fields move with it.

Keep its name. "Contract" already names two things here: the registry contract in `component-editor/contract.ts` and the browser and behavior contract in `src/testing/componentContract.ts`. In this document, "component contract" means the whole record that `components <id> --json` prints. The catalogue entry is its declared part.

### Proposed schema

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
  /** Sibling id -> the condition that makes the sibling right instead. Replaces `notFor`. */
  alternatives: Record<string, string>;
  /** Rules of use. An entry with `rule` names the checker rule that enforces it. */
  constraints?: Array<string | { rule: string; text: string }>;
  /** Where the accessible name comes from. */
  accessibleName: { prop: string } | { from: string } | { none: string };
  /** Keyed by prop name; the value explains that prop's values. */
  props?: Record<string, string>;
};
```

Everything else is derived and printed beside it:

| Printed field | Source | Exists today |
|---|---|---|
| `props`, `variants` | `Props` interface | Yes |
| `tokens` | `:global(:root)` and `default.json` | Yes |
| `parts`, `states` | The semantic property names, parsed against the grammar | New, no new dependency |
| `role` | `interaction.role` in the shipped contract | Later; the CLI would import the compiled testing bundle lazily |

`family` is a closed union of the seven picker headings. `alternatives` replaces `notFor` because the two say the same thing and one of them is data. `constraints` links prose to enforcement, so the agent knows which rules the checker will catch and which it must honour itself. `accessibleName` is the one accessibility fact that is per component; `{ prop }` is verified against the declared props the way `props` keys are today.

### Where it lives

- Declared: the `catalogue` export in `src/system/components/<Name>.svelte`, unchanged location.
- Parsed: `catalogueOf` in `bin/lib/catalogue.mjs` grows from string-literal fields to a literal subset: strings, arrays of strings, and one-level objects of strings. About forty lines.
- Typed: `CatalogueEntry` in `scaffolding/types.ts`; the `satisfies` clause on every entry keeps the shape exact.
- Verified: `registryContract.test.ts` gains three assertions. Every `alternatives` key is a registered id. Every `constraints[].rule` is a rule id in `PAGE_RULES` or `COMPONENT_RULES`. `accessibleName.prop` names a declared prop.
- Cross-checked: `check:skills` compares each component's `family` with the picker skill's family tables in both directions, the way it already compares anchor keys and the suffix vocabulary.
- Printed: `components <id> --json` prints the entry and the derived fields. `components --family single-selection` prints one family, which is the call the picker skill makes.

### Example entries

MenuSelect:

```ts
export const catalogue = {
  description: 'A list of options with one checked.',
  family: 'single-selection',
  useFor: 'single selection from a set too long to sit in a row, dropped from a Button.',
  alternatives: {
    segmentedcontrol: 'two to four inline alternatives that switch views of the same data',
    radiobutton: 'a form-style list the reader reads in full before committing',
    input: 'an answer the page cannot list',
  },
  constraints: [
    'One value. The catalogue has no multiple-selection component; a request for several values goes to create-component.',
    'It renders open. The Button that opens it is the control on the page.',
  ],
  accessibleName: { from: 'the Button that opens it' },
  props: {
    role: '`listbox` for a select; `menu` for a command menu.',
  },
} satisfies CatalogueEntry;
```

RadioButton:

```ts
export const catalogue = {
  description: 'A form row that selects one option.',
  family: 'single-selection',
  useFor: 'a choice the reader reviews as text before committing to a larger form.',
  alternatives: {
    segmentedcontrol: 'an inline switch between views',
    toggle: 'a setting that takes effect at once',
    menuselect: 'options that would overflow the form',
  },
  constraints: ['One row per option. The rows share one group and one selected value.'],
  accessibleName: { prop: 'label' },
} satisfies CatalogueEntry;
```

Callout:

```ts
export const catalogue = {
  description: 'A standing message that sits inside a section.',
  family: 'messaging',
  useFor: 'something the reader must know about the content around it.',
  alternatives: {
    notification: 'feedback about something that just happened',
    tooltip: 'a note that hangs off one element',
    dialog: 'a decision the page cannot continue without',
  },
  accessibleName: { none: 'a static box; its text is the content' },
  props: {
    variant: '`info` notes, `success` confirms, `warning` cautions, `danger` flags harm.',
  },
} satisfies CatalogueEntry;
```

Button, to show a constraint with a rule:

```ts
constraints: [
  { rule: 'multiple-primary', text: 'One primary Button per page.' },
  { rule: 'danger-without-dialog', text: 'A danger Button confirms in a Dialog.' },
],
```

The country requirement under these entries: `components --family single-selection --json` returns four entries. The set is long, so MenuSelect's condition holds and the SegmentedControl threshold fails. The constraint says one value, so a multiple-selection reading is rejected. The accessible name comes from the opening Button, so the page gets a labelled Button and a MenuSelect with `role="listbox"`, `items`, and `value`. A request for several countries matches no `useFor` in the family and routes to create-component. Every step reads a field.

## Relation to DESIGN.md and DTCG

DTCG carries no component semantics. The catalogue entry should never ride in `$extensions`; a token file is the wrong carrier, and a DTCG tool would only preserve it. The DTCG report's phase 6 already moves `catalogue` into TypeScript modules, and this schema is designed to move with it.

DESIGN.md, from the spec at `google-labs-code/design.md/docs/spec.md`:

- Front matter holds `colors`, `typography`, `rounded`, `spacing`, and a `components` map with eight properties: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. Variants and states are key suffixes such as `button-primary-hover`.
- It has no field for intent, usage, anatomy, states, accessibility, or constraints. An unknown component property is accepted with a warning. No extension mechanism is documented.
- The markdown body has eight ordered sections. "Components" and "Do's and Don'ts" are prose, and the spec says the tokens are normative and the prose gives context. No consumer parses the prose.

| Catalogue field | DESIGN.md destination | Round trip |
|---|---|---|
| `description`, `useFor`, `alternatives` | Prose in "Components" | Export only |
| `constraints` and the page rules | Prose in "Do's and Don'ts" | Export only |
| Semantic properties | `components` map, eight names where they fit; the rest as accepted-with-warning keys | Lossy |
| Variants and states | Key suffixes | Lossy: eight properties per key |
| `family`, `alternatives` as data, rule links, `accessibleName`, `props` guidance, intrinsics, parts, behavior | Extension | None |

So the export is one function over the contract, and the import is a brief for create-theme. Sequence the DESIGN.md export after the contract. The DTCG report put it first because it was cheap; with the contract in place, its two prose sections come from data, which is the reason to wait.

## What the existing architecture already covers

- Variants and sizes come from `Props`, and `unknown-prop-value` rejects a value outside the union. Do not declare them.
- States come from the property names, and two naming rules police them. Do not declare them.
- Anatomy comes from the contract's `parts` and the naming grammar. Do not declare it.
- Keyboard pattern follows from the ARIA role, which the contract's `interaction.role` declares and `behavior` cases prove. Do not declare it.
- Eight page and component-use rules already enforce constraints with guidance and a repair level. The contract cites them by id.
- The skill atlas is a navigation index that cites SKILL.md by line. It carries no decision data and needs no new node kind. A picker skill edit still needs `sync:skill-atlas` and `sync:skill-sources`.

## Risks of over-specification

1. **A second source for derived facts.** A declared `variants` or `states` list drifts from the code within a release. Derive them.
2. **Enumeration in `useFor`.** A list of situations invites literal matching and grows without bound. Keep one condition per entry and one per alternative, phrased as the question that separates them. The eval's negative cases give over-reach a cost.
3. **Constraints that restate rules.** Two wordings of `multiple-primary` will disagree. A constraint with a rule id carries one sentence and defers to the rule's `guidance`.
4. **Prose that contradicts the implementation.** The 7 September audit found twenty such rows between skills and the CLI. Every field that names a code object is verified by a test; the sentence fields stay short and the eval is their truth test.
5. **Composition as a matrix.** Twenty-six components give 676 pairs. The real pair rules are few: a danger action confirms in a Dialog, a MenuSelect opens from a Button, a form's secondary fields sit in a CollapsibleSection. They fit in `constraints` on the component that owns the rule. A `composition` field waits until an eval failure asks for it.
6. **Vocabulary drift.** `check:cli-strings` and `docs/terminology.md` govern the new CLI strings and the entry text. "Contract" stays reserved for the two existing contracts.
7. **A breaking change for consumers.** Replacing `notFor` with `alternatives` and requiring `family` and `accessibleName` breaks every custom component's `satisfies` clause, and `missing-description` reports it. The shipped 26 convert mechanically. This follows the project's practice of vocabulary changes under a breaking heading.

## Smallest useful first iteration

| Order | Change | Acceptance evidence |
|---|---|---|
| 1 | `CatalogueEntry` gains `family`, `alternatives`, `constraints`, `accessibleName`; `notFor` goes. The 26 shipped entries convert, with the conditions taken from the picker tables. | `svelte-check` passes; the registry contract test's three new assertions pass on all 26. |
| 2 | `catalogueOf` parses the literal subset. `components <id> --json` prints the new fields and `parts` and `states` derived from the property names. `components --family <name>` prints one family. | `bin/lib/catalogue.test.ts` covers a nested object, an array, and a non-literal value that is silently absent. |
| 3 | `check:skills` compares `family` with the picker skill's tables both ways. The picker skill's tables cite the CLI call where they can. Run both atlas syncs. | `check:skills`, `check:skill-atlas`, `check:skill-sources` pass; SKILL.md stays under 250 lines. |
| 4 | `missing-description` names the missing field. The create-component skill's catalogue section shows the full entry. | A runtime with the old shape reports the field. |
| 5 | An `outcome-pick-component` eval: about twelve requirements with the expected id and props, including three negatives: several values, a searchable set, and a destructive confirmation. Graded on the id, the variant, and no invented component. | The case set runs under `claude plugin eval .claude` with the baseline arm, and the score is recorded in `.claude/evals/README.md`. The README records that no case has run yet. |
| 6 | DESIGN.md export from the contract and the resolved theme, with `design.md lint` as a gate. | Deferred to the DTCG plan's revised order. |

Steps 1 to 3 are one release. Step 5 is the measurement the brief asks for, and it is the only evidence that the fields carry decision value. Everything after it waits on what it shows.

## Sources read

- `.claude/skills/live-tokens-pick-component/SKILL.md`, `live-tokens-create-page/SKILL.md`, `live-tokens-create-component/SKILL.md`
- `src/system/components/*.svelte` catalogue exports; `src/editor/component-editor/scaffolding/types.ts`; `registry.ts`; `contract.ts`
- `bin/cli.mjs`, `bin/lib/catalogue.mjs`, `bin/rules/componentUse.mjs`, `bin/rules/componentStructure.mjs`
- `src/testing/componentContract.ts` and `src/testing/contracts/{menuselect,radiobutton,callout,dialog}.ts`
- `src/editor/skill-atlas/types.ts` and `trees/pick-component.ts`
- `docs/dtcg-migration-report.md`, `docs/plans/llm-guidance-architecture-assessment.md`, `docs/plans/cli-skill-alignment.md`, `docs/plans/build-page-gap-analysis.md`
- `.claude/evals/README.md`
- [DESIGN.md repository](https://github.com/google-labs-code/design.md) and [specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
