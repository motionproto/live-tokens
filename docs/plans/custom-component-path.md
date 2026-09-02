# The custom-component path: next steps from the Slider exercise

A resume document. The Slider (v0.69.0) was built by following
`live-tokens-create-component` end to end as a test of user-generated
components. The static gate passed on the first run; every real defect was
caught by the two runtime contracts a consumer does not have. This records
what is still open for a consumer authoring a component, in the order to take
it. Background: `docs/design-system-compliance-audit.md`.

## State at hand-off (v0.71.0)

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

## 1. A runtime contract a consumer can run

The gap that matters most. `registryContract.test.ts` catches a row that
renders nothing and a token missing from `default.json`; the render contract
catches a token that never repaints. Both are first-party only.

- Factor the registry contract's five assertions into a helper exported from
  `@motion-proto/live-tokens/component-editor`, taking a `RegistryEntry`, so a
  consumer's vitest is `describe.each(getComponentRegistryEntries())` plus one
  call. The assertions use `setComponentAlias` and the slice; read the test
  before deciding what the helper's surface needs.
- Decide whether to ship the render contract as a Playwright spec the `create`
  template carries under `tests/`. It needs the editor page and a data dir;
  `tests/e2e/support/editor.ts` shows the boot. Probably a second step.
- Point create-component's verification section at the helper.

## 2. Bare `-width`, `-height`, `-size` get a colour picker

`KIND_RULES` in `src/editor/core/components/aliasKinds.ts` lists the three
under the `surface` kind, so `--widget-panel-width` renders `UIPaletteSelector`.
The vocabulary documents them as geometry. Give them a length kind: read
`SELECTOR_REGISTRY` in `TokenLayout.svelte` for the pickers that exist
(`divider-height`, `divider-width`, `gap`, `padding`), pick or add one, and
re-run `check:skills`, which holds the suffix list in three places. The
`adjust` CLI reads the same table; check whether a length kind should join its
ladders. SideNavigation's panel widths are the shipped case to test with.

## 3. The consumer sketch opt-in is untested

A consumer joins the sketch layer with one of four reserved classes and five
`--sketch-*` values (`references/sketch-mode.md`). The Slider joined through a
first-party `PartSpec` row instead, so the reserved-class path has never been
exercised. Author a throwaway consumer component in a scaffolded app
(`npm run check:smoke-create` shows the scaffold), give it `sketch-surface`,
switch sketch mode on, and walk the checklist at the end of the reference.

## 4. Upgrade the consumer and run the skills there

`../live-tokens-online` installs 0.68.1. Upgrade to 0.71.0, run
`setup-claude`, add `check:design` to its `package.json`, and run
`live-tokens report`. Then ask "check this project" in that repo: it is the
first real run of check-compliance with the skills installed, and of the
registry query on a project that is not this one. Push its local commit.

## 5. The evals

`.claude/evals/` holds ten cases, three of them outcome cases with a
deterministic `tool_used` grader. `claude plugin eval` refuses on this account
as early access. When it opens, run `outcome-component-from-brief` first: it
is the Slider exercise as a graded case.

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
