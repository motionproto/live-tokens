---
name: live-tokens-fix-findings
description: Fix every finding of check-page and check-component in an existing @motion-proto/live-tokens project until both exit 0. Called with the fix list by live-tokens-check-compliance. Use when the user asks to fix the project. Edits the files the checkers name. Updates tokens.css only through the migration command.
---

# Fixing the findings of check-page and check-component

Fix every finding of `check-page` and `check-component` until both exit 0. `check-page` checks pages. Every component comes from the catalogue, every prop is declared, and every value in page CSS is a design token. `check-component` checks authored components. Every token names a semantic property, and its default is the design token that property reads. Update `tokens.css` only through the migration command. That command also heals the data tree, and with `--write` rewrites the route references it lists. When live-tokens-check-compliance hands over a fix list, the user's choices in it stand.

## Workflow

When `check-page` is an unknown command, upgrade `@motion-proto/live-tokens` first.

1. Run `npx live-tokens migrate --check` to see the plan, then `npx live-tokens migrate` to apply it. `--tokens <path>` names a tokens.css in an unusual place.
2. Run both checkers with `--json`. Each finding carries a `rule`, a file, and a line.
   ```sh
   npx live-tokens check-page --json
   npx live-tokens check-component --json
   ```
3. Group the findings by rule.
4. Take the largest error group first, then the remaining errors. Take warnings only when the repair scope includes warnings.
5. Fix every finding in the group with its section: Color by role, Geometry by scale, or The remaining rules.
6. Run both checkers again. When repairable findings remain in scope, return to step 3. When no token fits a remaining finding, leave it and continue to the reply with its reason.
7. When the errors are clear, run both checkers with `--strict`. Report what `--strict` adds. Clear warnings within the existing request. Otherwise ask whether to clear the warnings now.
8. When the repair scope includes warnings, return to step 3 with `--strict`. When strict checks pass or the user defers warnings, continue to the reply.
9. Reply with:
   - the changes by rule, each with its count and any visible shift
   - the findings left, each with its reason and any config entry the user chose
   - both checker commands with their exit codes

`check-page <path>` scopes a run to one page. `check-component <id>` scopes a run to one component: its runtime, its editor, and its registration. The checkers read tokens.css from its default location.

When `package.json` has no `check:design` script, add `"check:design": "live-tokens check-page && live-tokens check-component"`. When both checkers exit 0, prepend `npm run check:design &&` to the existing build command. Preserve its other build steps.

## Scope

- Add no token to `tokens.css`. Map a literal with no matching token to the nearest existing token by role. When no token fits, leave the finding and say so.
- When the user has chosen to lower a rule's severity, record it in `live-tokens.config.json` under `"checks": { "rules": { "<rule>": "warn" } }`. `--off=<rule>` silences a rule for one run only.
- When the nearest token differs from the literal, use the token and name the shift in the report, such as `14px` to `--space-16`.

## Color by role

`color-literal` is a judgement finding. The replacement is the token for the role the color plays. The theme moves every role together. `npx live-tokens tokens --scale <name>` prints a scale's names and values, with `--json` for data.

| Literal | Token | Notes |
| --- | --- | --- |
| Text on a surface | `--text-primary` through `--text-disabled` | The neutral text scale. `--text-<family>` for a family color. |
| Light text on a dark chip | `--text-inverted` | No AA guarantee. |
| A surface fill | `--surface-<family>-<level>` | The role names the family: `neutral` for chrome, `brand` for emphasis, `danger` for status. |
| A stroke | `--border-<family>-<level>` | Levels run `faint` to `strong`. |
| A translucent layer that dims what is behind it | `--scrim-low`, `--scrim`, `--scrim-high` | Behind a modal. |
| A translucent wash on a surface | `--tint-low`, `--tint`, `--tint-high` | A hover state. |
| Any other translucent color | The role's token at an opacity: `color-mix(in srgb, var(--surface-brand) 80%, transparent)` | The editor reads that form. |
| Fully transparent | `--color-transparent` | |
| A gradient | `--gradient-*` | Or compose one from surface tokens. |

## Geometry by scale

`dimension-literal` is a mechanical finding. A size, such as a hero's height, is layout. Leave it.

| Literal | Token | Notes |
| --- | --- | --- |
| Spacing | `--space-<px>` | `npx live-tokens tokens --scale space` prints the steps. Round to the nearest step. |
| A stroke width | `--border-width-1`, `-2`, `-4` | Also for `outline`. |
| A corner | `--radius-sm` through `--radius-4xl`, or `--radius-full` | |
| A shadow | `--shadow-sm` through `--shadow-xl` | Replace the whole value. |
| Part of a `calc()` | The token inside the calc | `calc(var(--space-64) * -2 + var(--space-8))` |
| A duration or easing | `--duration-*`, `--ease-*` | No rule reports it. Fix it while in the file. |
| A `blur()` | `--blur-*` | No rule reports it. Fix it while in the file. |

## The remaining rules

| Rule | Fix |
| --- | --- |
| `unknown-token` | Search `tokens.css` for the stem. When a contract-family name is gone, `npx live-tokens migrate --check` lists the migration that adds the current name. |
| `raw-text-axis` | Set every axis from one text style, `-font-family` through `-letter-spacing`. `npx live-tokens tokens --scale heading` prints one text style. The text styles are `heading`, `body`, `editorial`, and `code`. Rewrite a `font:` shorthand the same way. |
| `unknown-component` | Read **live-tokens-pick-component** for the shipped component that fits. When none fits, author one with **live-tokens-create-component**. |
| `unknown-prop` | `npx live-tokens components <id>` prints the declared props and their values. Map the prop to one of them, or delete it. |
| `unknown-prop-value` | Use a value from the union the message lists. |
| `control-size` | Delete the `size` prop. The shipped default is the page's size. When that default is wrong for the project, retune the component in `/live-tokens/components`. |
| `multiple-primary` | Keep the action that completes the main task `primary`. A Button with no `variant` counts as `primary`. Use `secondary` for supporting or related actions and `outline` for unrelated or informational actions. |
| `danger-without-dialog` | Open a `Dialog` from the danger Button or IconButton and run the action from the Dialog's confirm. The rule fires once per page, when the page imports no Dialog. For other actions, assign emphasis by the action's relationship to the main task. |
| `native-control` | Replace the native element with the shipped component the message names: Button or IconButton, Input, MenuSelect. |
| `property-override` | Delete the declaration from the page. Retune the component's token for the whole project at `/live-tokens/components`. |
| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` for the page grid. `calc(var(--columns-count) - 2)` for a sub-grid spanning fewer columns. |
| `site-css-in-main` | Delete the import from `main.ts`. Add it to each page's `<script>`. Page CSS then stays off the editor routes. |
| `missing-source` | Add `source: 'src/...'` to the route entry. |
| `reserved-route` | Move the route out of `/live-tokens/*`. |
| `deep-import` | Import from `@motion-proto/live-tokens`, `/component-editor`, or `/components/<Name>.svelte`. |
| `fix: property-name` | Rename the token to the name a shipped component uses for the same role. The vocabulary and the state model are in **live-tokens-create-component**. |
| `fix: property-token` | Make the `:global(:root)` default read a design token, composed when needed. Declare a structural keyword, such as `start`, in the editor's `intrinsics`. |
| `fix: runtime` | Wire the component as the recipe in **live-tokens-create-component** wires it. |
| `fix: runtime-defaults` | Make the `:global(:root)` default the value Reset should restore, per the Runtime component section of **live-tokens-create-component**. |
| `fix: editor` | The editor names a token the runtime never declares, or a property targets the wrong part. Fix the editor's schema, states, or preview props by the Component editor section of **live-tokens-create-component**. |
| `fix: registration` | Register the component in the shared module the Registration section of **live-tokens-create-component** wires up, importable by the app and by `check-component --tests`. |
| `fix: sketch` | Add the missing Sketch part or marker, per the Sketch mode and overlays section of **live-tokens-create-component**. |
| `fix: tooling` | Install the named package (`@playwright/test`, `vitest`, or `happy-dom`) as a devDependency, then `npx playwright install chromium` for a missing browser. A bad path or config is named in the message; fix it and rerun `check-component <id> --tests`. |
| `fix: coverage` | A contract obligation never ran to a result. Add the missing contract, or find why the suite skipped it, then rerun. |

A `tests-*` finding names a problem with the run itself: the tool, the path, or a missing contract. Fix what the message names and rerun `check-component <id> --tests --json` until every applicable rule passes with no rule left `--off`.
