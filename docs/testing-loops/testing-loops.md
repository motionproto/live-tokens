<!--
Exported from src/demo/TestingLoops.svelte. Edit the text here, then ask
Claude to sync it back into the page.

Markup:
- `code` is inline code, **bold** is strong text, and *italic* is a skill name.
- [warn] is the warning badge.
- {#id} on a heading is the anchor the contents list jumps to.
- A "cards" comment marks the three skill cards. A "definitions" comment marks a term list.
- Level-four headings are the collapsible rule groups.
- An image is a figure. Its alt text is the diagram's screen-reader description, and the paragraph under it with the bold lead is the caption. Edit the diagram itself in its SVG file.
-->

[← Back to demo](/demo)

<!-- contents -->
1. [Adding CLI verification ](#tokens)
2. [Skills and checkers](#skills)
3. [Testing pages and components](#test-runs)
4. [Build and check a page](#walkthrough)
5. [Rule reference](#reference)

# Validating Skill Output

Livetoken includes Claude skills that create pages and components. The results of these skills are checked with CLI commands to validate the output against the design system. This create an inner feedback loop that mirrors the testing you would have in a build process - A deterministic layer with a pass/fail result rather than an interprative LLM response/

The first step enforces design token usage. Then generations are checked against their test definitions. The checks repair any issues that do not require a judgment call and logs errors for the more complex problems. It returns a report containing all of the fixes and the necessary judgment calls. The skill makes the fixes that need judgment, then runs the checks again until they pass.

## Skills and CLI Checks{#skills}

### Skills use the CLI to check thier work

The CLI checks verify that the skill output uses the design system and works correctly in the browser. They cover token use, component behavior, and page layout. Skills make design decisions and the CLI verifies the code.

The package includes eight skills. Run `npx live-tokens setup-claude` to add them to your project.

<!-- cards -->

- **Build skills**: *create-page* builds a page from the component catalogue. It calls *pick-component* to choose a component and *create-component* to write a new one.
- **Check skills**: *check-compliance* runs both checkers on the project, which bring tokens.css up to the installed package and apply every automatic repair. It repairs each remaining finding from its guidance and runs the checkers again until they pass.
- **Theme skills**: *create-theme* passes color, type, and geometry tasks to *set-colors*, *set-type*, and *set-geometry*.

### Checkers report problems

`check-page` checks page code. `check-component` checks a component's code, editor controls, and registration. Use `report` to list findings from both across the project. It always exits `0`.

Each finding identifies the rule, file, and line, and carries guidance for the repair. Its repair level tells the skill what to do:

<!-- definitions -->
- `auto`: The checker applies the repair itself.
- `choice`: Choose a repair based on the design or task.
- `authored`: Write code to resolve the finding.

The checkers read the token names in `tokens.css` and the properties each component declares. They report references to unknown names. Skills read these findings with `--json`, apply the fixes, and run the checks again.

Set rule severity in `live-tokens.config.json`. Add `--strict` to treat warnings as errors, or `--tests` to run the test suites below. A checker exits with code `0` when it passes.

## Testing pages and components {#test-runs}

When a skill creates a component or a page, it calls CLI commands to validate the result. Each command checks the code against the design tokens. With `--tests`, `check-component` also runs Vitest on the component’s registration and callbacks, and Playwright on the component in the editor. `check-page` runs Playwright on the page in the browser.

![With --tests, each checker starts its own test run on a temporary copy of the project data. check-component runs Vitest for registration and callbacks, and Playwright for the component in the editor. check-page runs Playwright for the page at its route. The skill fixes the findings and runs the checks again until every check passes.](figure-1-testing-loop.svg)

**Figure 1. The testing loop.** Each checker starts its own test run. Each run works on a copy of the project data, so the project’s own data stays untouched. The runner reports failures and missing results as findings.

### Vitest checks component setup

Vitest runs registry and behavior checks without a browser. The registry checks confirm that each component has a registration and a default value for every editable property. The behavior checks trigger DOM events and verify the arguments each callback receives.

### Playwright checks components in the editor

Each component has a test contract. It defines the component’s parts, states, and expected response to a theme change. Playwright uses it to check editor controls, rendering, pointer and keyboard input, save and reload, themes, and Sketch mode.

The theme check previews a theme and verifies the expected values. It then cancels the preview and checks that the original values return.

### Playwright checks pages in the browser

Playwright opens each page at every viewport in the testing settings. It checks component appearance, text styles, contrast, grid alignment, and overflow. When a rule does not apply, the report explains why. For example, the grid rule applies at widths of 768px and above.

### Every expected result must arrive

The runner matches each test result to its rule. A missing result fails the run. So do setup failures and missing test tools, regardless of rule settings.

## Build and check a page {#walkthrough}

Start with the component catalogue. If the page needs a new component, build and check that component first. Then assemble the page, run the checks, and review the layout.

![To create a page, read the project, plan the sections, and match each need to a component. When the catalogue lacks a component, write one and check it until it passes. Assemble the page, then verify it with one check-page command that applies the automatic repairs and tests the page in a browser. Each remaining finding returns to assembly with its guidance until the command exits 0.](figure-2-page-workflow.svg)

**Figure 2. The page workflow.** Follow the left path to build a page. Take the right branch to create and check a new component, then return to page assembly. Make each repair from its guidance and run the check again until it passes, then review the page yourself.

1. **Read the project.** Read the route table, `--columns-count`, and the catalogue from `npx live-tokens components`.
2. **Plan sections, then columns.** Give each purpose its own section. Take column spans from the layout that fits the reader's task.
3. **Choose components.** Start with the catalogue. Use *pick-component* to choose between similar components and *create-component* to add one.
4. **Check the new component.** Run `check-component <id> --tests --strict --json`. It applies every `auto` repair and returns the findings that remain. Make each repair from its guidance and run the command again until it exits `0`.
5. **Assemble the page.** Use components at their defaults, design tokens in page CSS, one text style per element, and a route with a `source`.
6. **Verify.** Run `check-page <file> --tests --strict --json`. It applies every `auto` repair, tests the page in a browser, and returns the findings that remain. Make each repair from its guidance and run the command again until it exits `0`.
7. **Review by eye.** Check the heading hierarchy, line lengths, alignment, and placement of the primary action. Confirm that the page reads clearly and supports the reader’s task.

## Rule reference {#reference}

Expand a group to read its rules. The [warn] label marks a warning by default. Add `--strict` to treat it as an error.

#### Page code · 19 rules

| Rule | Description |
| --- | --- |
| tokens-migration | An additive migration would add design tokens `tokens.css` lacks. A run without `--no-fix` applies it. |
| tokens-breaking-migration | A breaking migration that renames, removes, or rewrites design tokens in `tokens.css` is pending. |
| unknown-component | An import names a component outside the catalogue. |
| unknown-prop | A component receives a prop it does not declare. |
| unknown-prop-value | A prop receives a value outside the set the component accepts. |
| deep-import | An import reaches into package internals. Import from a public entry point. |
| unknown-token | A `var()` reference uses an unknown token name. |
| color-literal | A color value uses a literal instead of a design token. |
| reserved-route | A route uses the reserved `/live-tokens/*` namespace. |
| site-css-in-main | `main.ts` imports `site.css`, which leaks it into the editor routes. |
| raw-text-axis | A font size, family, weight, line height, or letter spacing uses a value outside a text style. |
| dimension-literal [warn] | A spacing, stroke, radius, or shadow value uses a literal instead of a token. |
| hardcoded-columns [warn] | A grid uses `repeat(N, 1fr)` with four or more columns. Use `--columns-count`. |
| missing-source [warn] | A route has no `source`, so Page Source cannot open it. |
| control-size [warn] | The page sets `size` on a shipped component. |
| multiple-primary [warn] | The page uses more than one primary Button. |
| danger-without-dialog [warn] | The page has a danger Button or IconButton and no Dialog. |
| native-control [warn] | A bare `<button>`, `<input>`, `<select>`, or `<textarea>` replaces a shipped control. |
| property-override [warn] | The page redeclares a component's semantic property for one instance. |

#### Page browser tests · 5 rules

| Rule | Description |
| --- | --- |
| page-component-paint | Each component part renders the value of its semantic property. |
| page-text-style | Text outside components matches a complete text style from the design system. |
| page-contrast | Text outside components meets WCAG AA against its surface. |
| page-grid | Section edges align to column lines at 768px and wider. |
| page-overflow | Content stays inside its container, and the page scrolls only vertically. |

#### Component code · 22 rules

| Rule | Description |
| --- | --- |
| tokens-migration | An additive migration would add design tokens `tokens.css` lacks. A run without `--no-fix` applies it. |
| tokens-breaking-migration | A breaking migration that renames, removes, or rewrites design tokens in `tokens.css` is pending. |
| invalid-id | The id contains characters other than lowercase letters and digits. |
| missing-file | The runtime or editor file is missing. |
| missing-root-block | The runtime has no `:global(:root)` block. |
| no-tokens | The `:global(:root)` block declares no `--<id>-*` property. |
| missing-description [warn] | The runtime's `catalogue` export is missing or lacks a required field. |
| unread-token [warn] | The runtime declares a property and never reads it. |
| state-after-property | A property name places the state after the property. Use `-hover-surface`. |
| disabled-is-terminal | A property name combines `disabled` with another state. The component cannot render that combination. |
| unknown-suffix | A property name uses a suffix the editor cannot edit. |
| phantom-editor-token | An editor row names a property the runtime never declares. |
| color-literal | A default is a literal color. |
| missing-component-const | The editor lacks `const component = '<id>'`. |
| missing-all-tokens | The editor does not export `allTokens`. |
| deep-import | A component file imports from package internals. |
| missing-registration | Nothing under `src/` registers the id. |
| unknown-token-ref | A default references an unknown token name. |
| default-not-token | A default lacks both a design token and a declared intrinsic. |
| phantom-link [warn] | A font helper spans several slots without a derivation, which links their fonts. |
| dimension-literal [warn] | A default uses a raw dimension where a space, radius, or border-width token belongs. |
| config-token | A default config references an unknown token name. |

#### Component tests · 11 rules

| Rule | Description |
| --- | --- |
| contract-registry | Vitest. The component has a valid registration, property declarations, and default values. |
| contract-behavior | Vitest. Callback props receive the arguments each case expects. |
| contract-listed | Playwright. The component appears in its registry group. |
| contract-alias | Playwright. The component declares every part and alias, each alias resolves, and each edit reaches the document root. |
| contract-states | Playwright. The preview renders the state the editor selects. |
| contract-interaction | Playwright. The component responds to pointer and keyboard input. |
| contract-persist | Playwright. An edit survives save and reload, and Reset restores the saved config. |
| contract-theme | Playwright. A theme preview updates the component, and Cancel restores the original values. |
| contract-sketch | Playwright. Sketch mode draws every visible part. |
| contract-render | Playwright. The runtime preview applies each property to the correct part. |
| contract-missing | Playwright. The named component has no contract. |

#### Test runner · 3 rules

| Rule | Description |
| --- | --- |
| tests-not-installed | `@playwright/test`, `vitest`, or `happy-dom` is missing, or Playwright’s Chromium is not installed. |
| tests-setup | The run could not start, found nothing to check, or a tool crashed before it wrote a report. |
| tests-incomplete | A run timed out, collected no tests, or left a component and rule pair without a result. |

<!-- NOTES, open questions for this page:
- "Review by eye" (walkthrough step 7) and Figure 2's "Read the page yourself".
  Leaning toward removing both. The create-page skill says "Open the page at
  the width it is built for" but gives it no browser or screenshot, so the
  model mostly reads the source and imagines the layout. Options discussed:
  measure line length, bottom alignment, focus order, and heading order in
  the page tests; save a screenshot per viewport from check-page --tests for
  the visual items; keep only the judgment items in the skill. Revisit after
  the intro paragraph is settled.
  -->

---

Source: .claude/skills, bin/, src/testing, and scripts/ at v0.78.0.
