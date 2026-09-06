---
name: live-tokens-fix-findings
description: Fix every finding of check-page and check-component in an existing @motion-proto/live-tokens project until both exit 0. Called with the fix list by live-tokens-check-compliance. Use when the user asks to fix the project. Edits the files the checkers name. Leaves tokens.css as it is.
---

# Fixing the findings of check-page and check-component

Fix every finding of `check-page` and `check-component` until both exit 0. `check-page` checks pages. Every component comes from the catalogue, every prop is declared, and every value in page CSS is a design token. `check-component` checks authored components. Every token names a semantic property, and its default is the design token that property reads. Never edit `tokens.css`. When live-tokens-check-compliance hands over a fix list, the user's choices in it stand.

## Workflow

When `check-page` is an unknown command, upgrade `@motion-proto/live-tokens` first.

1. Run `npx live-tokens migrate --check`, then `--write`.
2. Run both checkers with `--json`. Each finding carries a `rule`, a file, and a line.
   ```sh
   npx live-tokens check-page --json
   npx live-tokens check-component --json
   ```
3. Group the findings by rule.
4. Take the errors first, the rule with the most findings before the rest.
5. Fix every finding in the group with its section: Colour by role, Geometry by scale, or The remaining rules.
6. Run both checkers again. When a finding remains, return to step 3.
7. Run both checkers with `--strict`. Report what `--strict` adds. Ask the user whether to clear the warnings now.
8. When the user chooses to clear the warnings, return to step 3 with `--strict`.
9. Reply with:
   - the changes by rule, each with its count and any visible shift
   - the findings left, each with its reason and any config entry the user chose
   - both checker commands with their exit codes

`check-page <path>` and `check-component <id>` scope a run to one file. `--tokens <path>` names a tokens.css outside the default locations.

When `package.json` has no `check:design` script, add `"check:design": "live-tokens check-page && live-tokens check-component"`. When both checkers exit 0, gate the build with `"build": "npm run check:design && vite build"`.

## Scope

- Add no token to `tokens.css`. Map a literal with no matching token to the nearest existing token by role. When no token fits, leave the finding and say so.
- When the user has chosen to lower a rule's severity, record it in `live-tokens.config.json` under `"checks": { "rules": { "<rule>": "warn" } }`. `--off=<rule>` silences a rule for one run only.
- When the nearest token differs from the literal, use the token and name the shift in the report, such as `14px` to `--space-16`.

## Colour by role

`color-literal` is a judgement finding. The replacement is the token for the role the colour plays. The theme moves every role together. `npx live-tokens tokens --family <name>` prints a family's names and values, with `--json` for data.

| Literal | Token | Notes |
| --- | --- | --- |
| Text on a surface | `--text-primary` through `--text-disabled` | The neutral text scale. `--text-<family>` for a family colour. |
| Light text on a dark chip | `--text-inverted` | No AA guarantee. |
| A box's fill | `--surface-<family>-<level>` | The role names the family: `neutral` for chrome, `brand` for emphasis, `danger` for status. |
| A stroke | `--border-<family>-<level>` | Levels run `faint` to `strong`. |
| A translucent layer that dims what is behind it | `--scrim-low`, `--scrim`, `--scrim-high` | Behind a modal. |
| A translucent wash on a surface | `--tint-low`, `--tint`, `--tint-high` | A hover state. |
| Any other translucent colour | The role's token at an opacity: `color-mix(in srgb, var(--surface-brand) 80%, transparent)` | The editor reads that form. |
| Fully transparent | `--color-transparent` | |
| A gradient | `--gradient-*` | Or compose one from surface tokens. |

## Geometry by scale

`dimension-literal` is a mechanical finding. A size, such as a hero's height, is layout. Leave it.

| Literal | Token | Notes |
| --- | --- | --- |
| Spacing | `--space-<px>` | `npx live-tokens tokens --family space` prints the steps. Round to the nearest step. |
| A stroke width | `--border-width-1`, `-2`, `-4` | Also for `outline`. |
| A corner | `--radius-sm` through `--radius-4xl`, or `--radius-full` | |
| A shadow | `--shadow-sm` through `--shadow-xl` | Replace the whole value. |
| Part of a `calc()` | The token inside the calc | `calc(var(--space-64) * -2 + var(--space-8))` |
| A duration or easing | `--duration-*`, `--ease-*` | No rule reports it. Fix it while in the file. |
| A `blur()` | `--blur-*` | No rule reports it. Fix it while in the file. |

## The remaining rules

| Rule | Fix |
| --- | --- |
| `unknown-token` | Search `tokens.css` for the stem. When a contract-family name is gone, `npx live-tokens migrate --check` names the rename. |
| `raw-text-axis` | Set every axis from one text style, `-font-family` through `-letter-spacing`. `npx live-tokens tokens --family heading` prints one style family. The families are `heading`, `body`, `editorial`, and `code`. Rewrite a `font:` shorthand the same way. |
| `unknown-component` | Read **live-tokens-pick-component** for the shipped component that fits. When none fits, author one with **live-tokens-create-component**. |
| `unknown-prop` | `npx live-tokens components <id>` prints the declared props and their values. Map the prop to one of them, or delete it. |
| `unknown-prop-value` | Use a value from the union the message lists. |
| `control-size` | Delete the `size` prop. The shipped default is the page's size. When that default is wrong for the project, retune the component in `/live-tokens/components`. |
| `multiple-primary` | Keep the most important action `variant="primary"`. Make every other Button `secondary`, or `outline` for a tertiary action. |
| `danger-without-dialog` | Open a `Dialog` from the danger Button and run the action from the Dialog's confirm. When the action destroys nothing saved, the Button is `outline`. |
| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` for the page grid. `calc(var(--columns-count) - 2)` for a sub-grid spanning fewer columns. |
| `site-css-in-main` | Delete the import from `main.ts`. Add it to each page's `<script>`. Page CSS then stays off the editor routes. |
| `missing-source` | Add `source: 'src/...'` to the route entry. |
| `reserved-route` | Move the route out of `/live-tokens/*`. |
| `deep-import` | Import from `@motion-proto/live-tokens`, `/component-editor`, or `/components/<Name>.svelte`. |
| `unknown-suffix`, `state-after-property`, `disabled-is-terminal` | Rename the token to the name a shipped component uses for the same role. The vocabulary and the state model are in **live-tokens-create-component**. |
| `color-literal`, `unknown-token-ref`, `default-not-token` (component) | Make the `:global(:root)` default read a design token, composed when needed. Declare a structural keyword, such as `start`, in the editor's `intrinsics`. |
| `phantom-editor-token`, `phantom-link` | The editor names a token the runtime never declares, or one font helper spans several slots. Fix the editor file by the recipe in **live-tokens-create-component**. |
| `invalid-id`, `missing-file`, `missing-root-block`, `no-tokens`, `missing-component-const`, `missing-all-tokens`, `missing-registration` | Wire the component as the recipe in **live-tokens-create-component** wires it. |
