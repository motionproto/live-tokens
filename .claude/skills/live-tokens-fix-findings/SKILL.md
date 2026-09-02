---
name: live-tokens-fix-findings
description: Bring an existing @motion-proto/live-tokens project into line with its design system by running check-page and check-component, reading the findings, and fixing each by rule until both exit 0. Use when the user asks to make the build pass, fix the design-system errors or warnings, clean up the literals, replace hex or pixel values with tokens, make a page or component themeable, audit the site or a file against the design system, or asks why check:design fails. Not for building a new page (live-tokens-build-page) or a new component (live-tokens-create-component), which run the same gate as their last step, and not for a single token edit (use the editor).
---

# Fixing what the checkers report

Two checkers hold a project to its design system. `check-page` holds pages:
every component comes from the catalogue and is passed only the props it
declares, and every value in page CSS is a theme token. `check-component`
holds authored components: every token names a semantic property and its
default is the theme token that property reads. A page or component that
passes repaints when the theme changes. One that does not has opted out of the
system silently, and these findings are where.

This skill is the loop for code that already exists. Run the checker, fix one
rule at a time, run it again, and stop only when both exit 0.

## Reach the checkers

```sh
npx live-tokens check-page --json           # every page under src/
npx live-tokens check-component --json      # every component authored under src/system/components
```

- **Unknown command.** The installed package predates the checkers. Upgrade
  `@motion-proto/live-tokens`, then run `npx live-tokens migrate --check` and
  apply what it plans with `--write`; `--tokens <path>` names a tokens.css that
  sits somewhere other than the four default locations.
- **No `check:design` script.** A project scaffolded by `create` has one. Add
  it to any other project's `package.json`:
  `"check:design": "live-tokens check-page && live-tokens check-component"`.
  Once it passes, gate the build: `"build": "npm run check:design && vite build"`.
- **A file, not the project.** `check-page src/pages/Home.svelte` and
  `check-component <id>` scope a run when the user names one thing.

## The loop

1. Run with `--json`. Each finding carries a stable `rule`, a file, and a line.
2. Group by rule. Take errors before warnings, and the rule with the most
   findings first, because one recipe clears the whole group.
3. Apply that rule's recipe, below, to every finding in the group.
4. Run again. New findings can appear as old ones clear: a token you reached
   for may not exist, or a moved import may land somewhere the rule now sees.
5. Stop at exit 0. Then run once with `--strict` and report what it adds, so
   the user can decide whether warnings are worth clearing now.

Three things the loop never does:

- **Silence a rule to pass.** `--off=<rule>` is for a single run while
  working. A severity the project wants changed goes in
  `live-tokens.config.json` under `"checks": { "rules": { "<rule>": "warn" } }`,
  with the reason in the commit, and only when the user has made that call.
- **Mint a token.** A literal with no token behind it is remapped to the
  nearest existing token by role. No new `--surface-*`, `--text-*`, or
  `--space-*` is added to `tokens.css` to match a value the page happened to
  use. If nothing fits, say so and leave the finding.
- **Change what the page looks like without saying so.** Most remaps land on
  the same value. When the nearest token differs, `14px` to `--space-16` or a
  55% black to `--scrim`, name the shift in the report.

## Colour by role, never by hue

`color-literal` is the finding that takes judgement. The replacement is the
token for what the colour *does*, not the token that happens to be closest in
hue, because the theme will move every role together and the page must move
with it. Read `tokens.css` for the names; the families are fixed.

| The literal is | Token family | Notes |
| --- | --- | --- |
| Text on a surface | `--text-primary`, `-secondary`, `-tertiary`, `-muted`, `-disabled` | The neutral scale. Family colour is `--text-accent`, `--text-success`, and so on. |
| Light text on a dark chip over the page | `--text-inverted` | The one flip; no AA guarantee. |
| A box's fill | `--surface-<family>-<level>` | `neutral` for chrome; `brand`, `accent`, `special` for emphasis; `info`, `success`, `warning`, `danger` for status. |
| A stroke | `--border-<family>-<level>` | `faint`, `subtle`, base, `medium`, `strong` in the neutral family. |
| A translucent layer that dims what is behind it | `--scrim-low`, `--scrim`, `--scrim-high` | Behind a modal, under a floating control. |
| A translucent wash on a surface | `--tint-low`, `--tint`, `--tint-high` | Hover, an active tab, a code chip's background. |
| Fully transparent | `--color-transparent` | Never `transparent` inside a component default. |
| A gradient | `--gradient-*` | Or compose one from surface tokens. |

A `var(--x, #fff)` fallback is not a finding. A named colour is: `white` and
`rebeccapurple` are literals like any hex.

## Geometry by scale

`dimension-literal` fires only on the geometry the theme owns: padding,
margin, gap, border and outline widths, inset offsets, radius, and shadow.
Sizing (a hero's height, a max content width, a `minmax()` floor) is layout
and is never reported, so leave it.

| The literal is | Token | Notes |
| --- | --- | --- |
| Padding, margin, gap, an offset | `--space-<px>` | Steps: 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128. Round to the nearest step and name the shift. |
| A stroke width | `--border-width-1`, `-2`, `-4` | Also for `outline`. |
| A corner | `--radius-sm` through `-4xl`, `--radius-full` | |
| A shadow | `--shadow-sm` through `-xl` | Replace the whole value, never one offset. |
| Part of a `calc()` | The token inside the calc | `calc(var(--space-64) * -2 + var(--space-8))` |

While in the file, motion values take `--duration-*` and `--ease-*` even
though no rule reports them, and a `blur()` takes `--blur-*`.

## Every other rule

| Rule | Fix |
| --- | --- |
| `unknown-token` | A typo or a rename. Search `tokens.css` for the stem. A contract-family name (`--surface-…`, `--text-…`) that is gone was renamed: `npx live-tokens migrate --check` names the migration. |
| `raw-text-axis` | Set the whole axis set from one text style: `--heading-xl` through `-sm`, `--body-md`, `--body-sm`, `--editorial-*`, `--eyebrow`, `--code`, each carrying `-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`. A `font:` shorthand is rewritten the same way. `em`, `%`, and a unitless line-height are relative and fine. |
| `unknown-component` | Not in the catalogue. Read **live-tokens-pick-component** for the shipped one that fits, or author it with **live-tokens-create-component**. |
| `unknown-prop` | The component drops it at runtime. Read its `interface Props` in `node_modules/@motion-proto/live-tokens/src/system/components/<Name>.svelte` and either map it to a declared prop or delete it. A `class` on a component that declares none does nothing. |
| `unknown-prop-value` | Pick a value from the union the message lists. |
| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` for the page grid; `calc(var(--columns-count) - 2)` for a sub-grid spanning fewer page columns. A two-up or three-up is a layout and is not reported. |
| `site-css-in-main` | Delete the import from `main.ts` and add it to each page's `<script>`, so page CSS never reaches the editor routes. |
| `missing-source` | Add `source: 'src/...'` to the route entry so Page Source can open it. |
| `reserved-route` | Move the route out of `/live-tokens/*`; the package owns that namespace. |
| `deep-import` | Import from `@motion-proto/live-tokens` or `/component-editor` or `/components/<Name>.svelte`, never from `/src/`. |
| `unknown-suffix`, `state-after-property`, `disabled-is-terminal` | Rename the token. Borrow the name a shipped component uses for the same role; the vocabulary and the state model are in **live-tokens-create-component**. |
| `color-literal`, `unknown-token-ref`, `default-not-token` (component) | The `:global(:root)` default reads a theme token, composed if needed. A structural keyword (`start`, `contain`) is declared in the editor's `intrinsics`. |
| `phantom-editor-token`, `phantom-link` | The editor names a token the runtime never declares, or a bare font helper spans slots. Both are editor fixes; see the same skill. |
| `missing-registration`, `missing-file`, `missing-root-block` | The component is not wired the way the recipe in **live-tokens-create-component** wires it. |

## Report

Say what changed by rule, one line per rule with the count and any visible
shift. Say what was left and why, with the config entry if the user chose to
lower a severity. End with the two commands and their exit codes.

## Verify

Open `/live-tokens/editor` in dev and change a surface colour and a spacing
step. Every file the loop touched should repaint. One that does not still
holds a literal the checker cannot see, which is worth reporting as a gap in
the checker rather than patching around.
