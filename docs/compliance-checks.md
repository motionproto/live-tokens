# Compliance checks

Every rule and check behind the counts in `docs/compliance-loop.html`, drawn from `bin/`, `src/testing/`, and `scripts/` at v0.78.0. Rules marked (warn) default to a warning; every other rule defaults to an error.

## check-page, static (17)

1. `unknown-component`: an import names a component the catalogue does not hold.
2. `unknown-prop`: a component receives a prop it does not declare.
3. `unknown-prop-value`: a prop receives a value outside the set the component accepts.
4. `deep-import`: an import reaches into package internals.
5. `unknown-token`: a `var()` names something that is neither a design token, a semantic property, nor declared in the file.
6. `color-literal`: a CSS value paints a literal colour where a design token belongs.
7. `reserved-route`: a route sits inside `/live-tokens/*`.
8. `site-css-in-main`: `main.ts` imports `site.css`.
9. `raw-text-axis`: one type axis is set on its own, or with an absolute literal like `16px`, instead of from a text style bundle.
10. `dimension-literal` (warn): spacing, stroke, or radius is written as a raw dimension.
11. `hardcoded-columns` (warn): a grid spells out `repeat(N, 1fr)` with four or more columns.
12. `missing-source` (warn): a route entry has no `source`.
13. `control-size` (warn): the page sets `size` on a shipped component.
14. `multiple-primary` (warn): the page holds more than one primary Button.
15. `danger-without-dialog` (warn): a danger Button appears with no Dialog imported.
16. `native-control` (warn): a bare button, input, select, or textarea is used. Hidden inputs are allowed.
17. `property-override` (warn): the page redeclares a component's semantic property.

## page-\*, rendered (5)

These run at each screen size in the testing settings, by default 1280×900 and 390×844.

1. `page-component-paint`: each contracted part of a shipped component paints what its semantic property resolves to.
2. `page-text-style`: each run of text outside a component matches one shipped text style on every axis.
3. `page-contrast`: each text and surface pair meets WCAG AA. That means 4.5:1 for body text, and 3:1 at 24px or at 18.66px bold.
4. `page-grid`: the page draws a `--columns-count` grid, and section edges sit on column lines within 1px. It reports "inapplicable" below 768px.
5. `page-overflow`: nothing scrolls sideways, no box overflows its width, and no component extends past the element that clips it.

## check-component, static (17)

1. `invalid-id`: the id holds anything other than lowercase letters and digits.
2. `missing-file`: the runtime or editor file is absent.
3. `missing-root-block`: the runtime has no `:global(:root)` block.
4. `no-tokens`: that block declares no `--<id>-*` property.
5. `state-after-property`: a state follows the property in a name (`-surface-hover`).
6. `disabled-is-terminal`: a name pairs `disabled` with a state that never paints.
7. `unknown-suffix`: a name ends in a suffix the editor has no picker for.
8. `phantom-editor-token`: an editor row names a property the runtime never declares.
9. `color-literal`: a default is a literal colour.
10. `missing-component-const`: the editor lacks `const component = '<id>'`.
11. `missing-all-tokens`: the editor does not export `allTokens`.
12. `deep-import`: the runtime, editor, or registration imports package internals.
13. `missing-registration`: nothing under `src/` registers the id.
14. `unknown-token-ref`: a default reads a name that is neither a design token nor one of the component's own properties.
15. `default-not-token`: a default has no token behind it and no declared intrinsic.
16. `phantom-link` (warn): a type-group font helper links every slot's fonts into one.
17. `dimension-literal` (warn): a default pins a raw dimension.

## contract-\*, rendered (10)

1. `contract-registry` (Vitest): the registration is sound, declared, and seeded.
2. `contract-listed`: the component appears in its registry group.
3. `contract-alias` (three tests): every part and shipped alias is declared, every alias resolves, and set, update, and remove reach the document root.
4. `contract-states`: the preview renders the state being edited.
5. `contract-interaction`: the component answers the pointer and the keyboard.
6. `contract-persist`: an edit survives a save and a reload, and Reset returns the saved config.
7. `contract-theme`: a theme preview reaches the paint, and cancelling it restores every value.
8. `contract-sketch`: every painted part is drawn in Sketch mode.
9. `contract-render`: the runtime preview repaints every property on its declared part.
10. `contract-missing`: the run names a component with no contract.

## tests-\*, never silenceable (3)

1. `tests-not-installed`: `@playwright/test`, `vitest`, or `happy-dom` is missing.
2. `tests-setup`: the isolated run could not be prepared, a tool exited before reporting, or a worker crashed.
3. `tests-incomplete`: a run passed its deadline, collected nothing, or left a component and rule pair with no result.

## Registry checks under Vitest (8)

These have no rule ids in the code, so the names below are descriptive. The suite lives in `src/testing/registry.contract.ts`.

1. The run selects at least one component.
2. Every component authored under `src/system/components` is registered.
3. `sourceFile` resolves to a real file, and the schema is not empty.
4. No variable is declared twice.
5. Every editable token is declared in `:global(:root)`.
6. Every editable token is seeded in `component-configs/<id>/default.json`.
7. A token with a minimum opacity seeds at or above it.
8. One alias survives a round trip through the editor store.

## Token contract scales (25)

Listed in `bin/lib/tokenVocabulary.mjs` as `CONTRACT_SCALES`.

surface, text, border, color, space, radius, font, line-height, letter-spacing, shadow, blur, icon-size, scrim, tint, columns, heading, body, editorial, eyebrow, code, easing, duration, zoom, gradient, stroke

## Component contracts (26)

One file per component in `src/testing/contracts/`.

badge, button, callout, card, codesnippet, collapsiblesection, cornerbadge, dialog, iconbutton, image, imagelightbox, inlineeditactions, input, menuselect, notification, panel, progressbar, radiobutton, sectiondivider, segmentedcontrol, sidenavigation, slider, tabbar, table, toggle, tooltip

## check:skills (25)

Each is one `errors.push` in `scripts/lib/skillChecks.mjs`. Its test pins the count at 25.

1. Every skill directory holds a SKILL.md.
2. The frontmatter name matches the directory.
3. The frontmatter carries a description.
4. The body stays under 250 lines.
5. No code fence runs past 40 lines.
6. Every code fence closes.
7. Every `references/` file the skill names exists.
8. The skill names every `references/` file.
9. Every `live-tokens <verb>` the skill mentions is a command the CLI accepts.
10. A skill that documents a command names every flag the CLI offers on it.
11. No flag the CLI dropped survives in the prose.
12. No flag is attributed to a command that does not take it.
13. Every sibling skill named is bundled.
14. Every skill has a `SAMPLE_PROMPTS` entry.
15. No heading promises an N-step recipe.
16. Every command the CLI accepts is run by some skill or listed as exempt.
17. Every command listed as exempt still exists in the CLI.
18. Every skill `SAMPLE_PROMPTS` names is bundled.
19. The design directions index exists.
20. The colour, type, and geometry anchor files exist.
21. Every anchor in a dimension file appears in the index.
22. Every anchor the index names exists in some dimension file.
23. The token-naming reference exists.
24. It lists every suffix `check-component` accepts.
25. It lists no suffix `check-component` rejects.

## Smoke runs (4)

Each packs the real tarball and installs it into a throwaway project outside the repository.

1. `check:smoke-install`: a minimal Vite app installs the tarball and builds.
2. `check:smoke-create`: `live-tokens create` scaffolds an app that installs and builds.
3. `check:smoke-component-tests`: two projects built from the template validate a component they authored with `check-component --tests`.
4. `check:smoke-page-tests`: a project built from the template runs `check-page --tests` on a clean page, then on the same page with a deliberate `site.css` override.
