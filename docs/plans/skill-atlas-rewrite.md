# Skill atlas rewrite

The Skill Atlas (`src/editor/skill-atlas/`, exported as `./skill-atlas`,
mounted at `/skills` on the online site) draws one tree per skill. The nine
skills were rewritten between 2026-09-04 and 2026-09-07 (method in
`skill-simplification.md`), and every tree now cites text that moved or is
gone. `check:skill-atlas` fails on 259 lines across all nine trees, and it is
in `prepublishOnly`, so no release ships until the trees are rewritten.

This document says what a tree is for, the shape of each rewritten tree, and
how to write them.

## What a tree is for

A tree is the decision tree a user walks, in order, to make a plan. The user
reads the trigger, answers each decision, and collects the steps on the path.
The steps on the path are the plan. The skill's prose is one click away from
each card, so the card states the decision and the source pane holds the
reasoning.

The renderer already supports this. A node has a `kind`, a `row`, a `title`,
a `desc`, and a line range into SKILL.md held by an `anchor`. An edge joins
two nodes; a `label` on the edge is the answer that selects that branch; a
`back` edge is a re-run loop. Rows run top to bottom, so "in order" means: every
edge that is not `back` goes from a lower row to a higher one.

| Kind | The card is | Edges out |
|---|---|---|
| `trigger` | The request that starts the skill, from the description | one |
| `decide` | A question the user answers | one per answer, each labelled |
| `ask` | A question with the answers listed as chips (pick-component's families) | one per answer |
| `step` | An action the user or the model takes | one |
| `cli` | A command | `exit 0` and `exit 1`, or one |
| `gate` | The failure branch of a command | a `back` edge to the command |
| `ok` | The success branch of a command | one |
| `ref` | A `references/*.md` the step reads | one |
| `chipset` | One step whose parts are listed as chips | one |
| `hand` | The next skill | none |
| `done` | The end state | none |

Rules for a tree:

1. The nodes follow the skill's sections in order. A section that is a
   numbered list yields one node per step. A section that is a table yields
   one `chipset` node with one chip per row, or one `ask` node when the rows
   are answers.
2. Every `decide` and `ask` node has two or more outgoing edges, and each
   edge's `label` is an answer that appears in the skill's text.
3. Every node cites a range. The `anchor` is the first 60 characters of the
   range's first line after its list marker; `anchorEnd` closes a range longer
   than one line.
4. The `trigger` node's `desc` is the description's trigger sentences.
5. A `hand` node names the skill the description routes to.
6. No title or chip label uses a banned word: look, band, box, place, report
   card, unsaved.
7. The tree's `digest` is restamped by `sync:skill-atlas` after the nodes are
   written.

## The trees

Each entry lists the nodes in row order. A decision shows its answers as
`label → target`. Chips are the rows of the table the node cites. Node ids
keep the tree's prefix (`ct-`, `sc-`, `st-`, `sg-`, `pk-`, `cp-`, `cc-`,
`cc2-`, `ff-`); `create-page` moves from `bp-` to `cp-`.

### create-theme (18 stale lines)

The tree's shape holds. Titles change: "Define or refine a whole look" and
"Look complete" and "Verify the whole look" drop "look". Anchors re-point to
the rewritten sentences. No node is added or removed.

### set-colors (19), set-type (21), set-geometry (34)

The three set skills share one shape: trigger, anchor reference, the input
file, the CLI, gate and ok, report, verify. Their SKILL.md bodies were
rewritten first and have not changed since, so the drift is anchors only.
Two nodes go: set-type's "Say it is unsaved" (`st-tell`) and set-geometry's
"Offer the undo" (`sg-tell`) cite sentences the rewrite removed (no user
actions; the product streams the result). Their edges join the neighbours.

### pick-component (45)

The trigger, the catalogue step, and the family fan-out hold. The seven
`ask` nodes are re-pointed at the rewritten families, and their chips are the
rows of each family's table:

- Action family: Button, IconButton, InlineEditActions.
- Single-selection family: SegmentedControl, TabBar, RadioButton, MenuSelect.
- Text entry: Input, the selection family, Slider.
- On and off: Toggle, SegmentedControl, RadioButton pair.
- Container family: Card, Panel, CollapsibleSection, Dialog.
- Message family and Display family: as the rewritten file lists them.

`pk-cat` "Scan the catalogue" becomes "Run the catalogue", citing the
`npx live-tokens components` sentence. The two `hand` nodes stay.

### create-page (34), rewritten as a new tree

The old tree follows the old file (pick-component first, bands, density,
seven safeguards). The rewritten file has a different order, so the tree is
new:

1. `cp-trig` trigger: a page, a route, or a change to a page's layout.
2. `cp-components` chipset: Components, one chip per bullet.
3. `cp-tokens` chipset: Tokens, one chip per bullet.
4. `cp-type` step: Type, citing the table. Chips: one per element row.
5. `cp-size` step: Size.
6. `cp-emphasis` step: Emphasis.
7. `cp-spacing` chipset: Spacing, one chip per position row.
8. `cp-layout` decide: "Which layout matches the reader's task?" Five
   answers, one per row of the Page layouts table: stacked sections, main
   with a supporting pane, list with detail, grid of equals, single column.
   Each answer lands on `cp-grid`. The answers are the plan's first decision,
   so this node is the tree's fan-out.
9. `cp-grid` step: Grid, citing the four placement steps.
10. `cp-separation` step: Separation, chips for the layer table.
11. `cp-containers` chipset: Containers by purpose, one chip per bullet.
12. `cp-route` decide: "How does App.svelte wire routes?" `LiveTokensRouter →
    cp-router`, `manual overlay → cp-overlay`.
13. `cp-router` step, `cp-overlay` step, both to `cp-lazy`.
14. `cp-lazy` step: `lazy`, `site.css` per page, `source`, the reserved
    namespace.
15. `cp-check` hand: live-tokens-check-compliance, with `cp-fix` hand to
    live-tokens-fix-findings and a `back` edge "repeat until clean".
16. `cp-verify` chipset: the Verify list, one chip per line.
17. `cp-read` done: the distance and close reading.

### create-component (29), rewritten as a new tree

The old tree follows the old recipe. The rewritten file is a sequence with
two decisions:

1. `cc-trig` trigger.
2. `cc-model` step: Design model, chips for the two-layer table.
3. `cc-inspect` chipset: Source inspection, one chip per numbered step.
4. `cc-map` step: the property map.
5. `cc-name` chipset: the name shape, one chip per segment bullet.
6. `cc-align` step: "Name a role as the shipped component names it."
7. `cc-runtime` step: Runtime component, citing the `:global(:root)` block.
8. `cc-intrinsic-q` decide: "Does a property carry a structural choice?"
   `yes → cc-intrinsics` (ref, `references/intrinsics.md`), `no → cc-states`.
9. `cc-states` step: Variants and states, chips for the three-kind table.
10. `cc-editor` step: Component editor, chips for its three parts.
11. `cc-linked-q` decide: "Do variants share a value?" `yes → cc-linked`
    (ref, `references/linked-siblings.md`), `no → cc-register`.
12. `cc-register` step: Registration.
13. `cc-sketch` ref: `references/sketch-mode.md`.
14. `cc-overlay-q` decide: "Is any layer position: fixed?" `yes → cc-portal`
    (ref, `references/fixed-overlays.md`), `no → cc-check`.
15. `cc-check` cli: `check-component --strict --json`; `cc-fail` gate with a
    `back` edge; `cc-pass` ok.
16. `cc-rules` chipset: the rule-to-section table, one chip per row.
17. `cc-contract` ref: `references/contract-tests.md`.
18. `cc-editor-check` chipset: the in-editor list, one chip per line.
19. `cc-place` hand: live-tokens-create-page.

### check-compliance (27) and fix-findings (32)

Both files were rewritten under the Workflow shape (one numbered list, then
domain sections). The trees follow the Workflow list step for step:

- check-compliance: trigger, `report` cli with its upgrade gate, one chipset
  for the report's sections, the drill-down decide, the classification step
  (mechanical, judgement, deliberate), the deliberate decide, the reply
  chipset, and the `hand` to fix-findings. `cc2-why` "Keep the audit
  read-only" goes; the description carries "Edits no file".
- fix-findings: trigger, migrate step, both checkers cli with the upgrade
  gate and the clean ok, group-by-rule step, the fix-order decide (largest
  error group, remaining errors, warnings), three recipe nodes (Colour by
  role chipset, Geometry by scale chipset, The remaining rules chipset) each
  citing its table, the rerun gate with a `back` edge, the `--strict` decide,
  the reply step, and `done`. `ff-why`, `ff-never`, `ff-script`, and `ff-ver`
  cite sections the rewrite removed and go.

## Method

One tree at a time, in the order above, each as one commit "atlas: <skill>".

1. Read the current SKILL.md in full. Write the node list on paper first,
   in row order, with each node's range as line numbers from the file.
2. Write the nodes and edges into `skillTrees.ts`. Set `anchor` and
   `anchorEnd` from the text; leave `lines` at the numbers read in step 1.
3. Run `npm run sync:skill-atlas`. It derives `lines` from the anchors,
   restamps the digest, and refuses an anchor it cannot find. Fix every
   refusal by re-pointing the node.
4. Run `npx vitest run scripts/lib/skillAtlas.test.ts` and
   `npm run check:skill-atlas`.
5. Open `/skills` in the app and read the rendered tree: every card's title
   against its chips, every branch label against the question, and the path
   from trigger to done as a plan. A title from one section over chips from
   another passes every check and reads as a contradiction; only this read
   catches it.
6. Commit the tree with the regenerated `skillTrees.ts`.

Three traps from the last atlas run (memory `project_skill_atlas_in_package`):

- Node-id diffing does not prove a merge lost nothing; chips have no ids.
  Compare ranges.
- An anchor that still matches is not a safe range. A heading anchor whose
  paragraph moved lets the sync stretch the range over other nodes' lines.
  Every range's `anchorEnd` is checked against the file by eye once.
- A title and its chip labels can each be correct and contradict each other.

## Acceptance

- `npm run check:skill-atlas` exits 0 for all nine trees.
- Every node has a `lines` range; every `decide` and `ask` node has two or
  more labelled edges; every `hand` node names a skill in `.claude/skills`.
- No non-`back` edge goes from a higher row to a lower one.
- The grep in `skill-simplification.md` returns nothing over `skillTrees.ts`
  titles, descs, and chip labels.
- `npm run check:skill-sources` and `check:skills` stay green.
- Walking each tree from trigger to done in the browser yields the plan the
  skill's Workflow or section order states, with no step the skill lacks and
  no skill step the tree skips.

## Out of scope

- The two open items from the atlas-in-package plan (the `missing-source`
  rule on package-mounted routes; the `SvelteComponent`-class `.d.ts` files)
  are unchanged by this rewrite.
- The online site's `.claude/skills` copies are refreshed by `setup-claude`
  on the next upgrade, outside this plan.
