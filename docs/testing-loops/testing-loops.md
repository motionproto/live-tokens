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

**RELOAD TEST — Claude wrote this line at 17:13. Tell me whether Typora shows it, and I'll remove it.**

[← Back to demo](/demo)

<!-- contents -->
1. [Skills and CLI Checks](#skills)
2. [Testing pages and components](#test-runs)
3. [Build and check a page](#walkthrough)
4. [Rule reference](#reference)

# Validating Skill Output

Livetoken includes Claude skills that create pages and components. The results of these skills are checked with CLI commands to validate the output against the design system. This create an inner feedback loop that mirrors the testing you would have in a build process - A deterministic layer with a pass/fail result rather than an interprative LLM response/

The first step enforces design token usage. Then generations are checked against their test definitions. The checks repair any issues that do not require a judgment call and logs errors for the more complex problems. It returns a report containing all of the fixes and the necessary judgment calls. The skill makes the fixes that need judgment, then runs the checks again until they pass.

## Skills and CLI Checks{#skills}

### Skills use the CLI to check thier work

The CLI checks verify that the skill output uses the design system and works correctly in the browser. They cover token use, component behavior, and page layout. Skills make design decisions and the CLI verifies the code.

The package includes eight skills, and one setup command copies them into your project.

<!-- cards -->

- **Build skills**: *create-page* and *create-component* finish by testing their result in a browser. They repair each problem the tests find and test again until everything passes. *pick-component* only recommends a component and changes no file.
- **Check skills**: *check-compliance* checks the code of every page and component in the project against the design system. The checks bring the project's tokens up to date and make the routine repairs. The skill repairs the rest.
- **Theme skills**: *set-colors*, *set-type*, and *set-geometry* apply their changes through the CLI, which checks each change first. It holds colors to WCAG AA contrast, confirms that each font is available, reports missing weights, and rejects geometry it cannot apply. *create-theme* runs all three and saves the result as a theme.

### Checkers Fix or Report Problems

The page checker confirms that a page uses components from the catalogue, passes only the props each component declares, and takes its colors, spacing, and type from design tokens. The component checker confirms that each editable value is a named property that reads a design token, and that the component's editor controls and registration match it.

Each problem goes back to the skill as a finding. A finding names the rule, file, and line, and carries guidance for the repair. Its repair level tells the skill what to do:

<!-- definitions -->
- Automatic: The checker made the repair itself.
- Choice: The skill chooses a repair that suits the design or task.
- Authored: The skill writes code to resolve the finding.

The checkers have every design token and every property each component declares, so they catch a reference to any name that does not exist. The skill makes its repairs and runs the checks again.

## Testing pages and components {#test-runs}

When a skill creates a component or a page, the checker reviews the code against the design system and then tests the result. For a component, Vitest checks its registration and callbacks, and Playwright checks the component in the editor. For a page, Playwright checks the page in the browser.

![Each checker starts its own test run on a temporary copy of the project data. The component checker runs Vitest for registration and callbacks, and Playwright for the component in the editor. The page checker runs Playwright for the page at its route. The skill fixes the findings and runs the checks again until every check passes.](figure-1-testing-loop.svg)

**Figure 1. The testing loop.** Each checker starts its own test run. Each run works on a copy of the project data, so the project’s own data stays untouched. The runner reports failures and missing results as findings.

### Vitest checks component setup

Vitest runs registry and behavior checks without a browser. The registry checks confirm that each component has a registration and a default value for every editable property. The behavior checks trigger DOM events and verify the arguments each callback receives.

### Playwright checks components in the editor

Each component has a test contract. It defines the component’s parts, states, and expected response to a theme change. Playwright uses it to check editor controls, rendering, pointer and keyboard input, save and reload, themes, and Sketch mode.

The theme check previews a theme and verifies the expected values. It then cancels the preview and checks that the original values return.

### Playwright checks pages in the browser

Playwright opens each page at every viewport in the testing settings. It checks component appearance, text styles, contrast, grid alignment, and overflow. When a rule does not apply, the run records why. For example, the grid rule applies at widths of 768px and above.

### Every expected result must arrive

The runner matches each test result to its rule. A missing result fails the run. So do setup failures and missing test tools, regardless of rule settings.

## Build and check a page {#walkthrough}

Start with the component catalogue. If the page needs a new component, build and check that component first. Then assemble the page, run the checks, and review the layout.

![To create a page, read the project, plan the sections, and match each need to a component. When the catalogue lacks a component, write one and check it until it passes. Assemble the page, then verify it with the page checker, which makes the automatic repairs and tests the page in a browser. Each remaining finding returns to assembly with its guidance until every check passes.](figure-2-page-workflow.svg)

**Figure 2. The page workflow.** Follow the left path to build a page. Take the right branch to create and check a new component, then return to page assembly. Make each repair from its guidance and run the check again until it passes, then review the page yourself.

1. **Read the project.** Read the route table, the column count, and the component catalogue.
2. **Plan sections, then columns.** Give each purpose its own section. Take column spans from the layout that fits the reader's task.
3. **Choose components.** Start with the catalogue. Use *pick-component* to choose between similar components and *create-component* to add one.
4. **Check the new component.** Run the component checker with its tests. It makes the automatic repairs and returns the findings that remain. Repair each one from its guidance and check again until everything passes.
5. **Assemble the page.** Use components at their defaults, design tokens in page CSS, one text style per element, and a route that names its source file.
6. **Verify.** Run the page checker with its tests. It makes the automatic repairs, tests the page in a browser, and returns the findings that remain. Repair each one from its guidance and check again until everything passes.
7. **Review by eye.** Check the heading hierarchy, line lengths, alignment, and placement of the primary action. Confirm that the page reads clearly and supports the reader’s task.

## Rule reference {#reference}

Expand a group to read its rules. The [warn] label marks a warning by default. A strict run treats it as an error.

#### Page code · 19 rules

| Rule | Description |
| --- | --- |
| tokens-migration | An additive migration would add design tokens `tokens.css` lacks. The checker applies it automatically. |
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
| tokens-migration | An additive migration would add design tokens `tokens.css` lacks. The checker applies it automatically. |
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

Source: .claude/skills, bin/, src/testing, and scripts/ at v0.79.0.
