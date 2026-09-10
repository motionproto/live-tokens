---
name: live-tokens-check-compliance
description: Report an existing project's adherence to @motion-proto/live-tokens from one run of npx live-tokens report. Checks for correct use of components, properties, and tokens. The report names the tokens each component reads, the component each page renders, the findings of both checkers, and the recommended fixes. Called as the verification step by live-tokens-create-page and live-tokens-create-component. Use when the user asks to check, audit, or review the project. Edits no file. Hands the fix list to live-tokens-fix-findings.
---

# Checking a project's adherence to live-tokens

Run `npx live-tokens report`. The CLI prints a report with the sections in the Report sections table. Say what each finding means and what the fix would cost. When live-tokens-create-page or live-tokens-create-component calls this skill, lead with the findings on the file it built. Edit no file. When the user wants the fixes applied, hand the fix list to **live-tokens-fix-findings**.

`report` never runs the component contract suites. The `check-component` test run does, and it is what live-tokens-create-component calls to validate a component's runtime behavior.

`report` stays static for pages too. The `check-page` test run is what live-tokens-create-page calls for a rendered page, in a browser against the project's own route, and it reports `page-component-paint`, `page-text-style`, `page-contrast`, `page-grid`, and `page-overflow` findings the same way `report`'s static findings read: by rule, with a fix.

## Workflow

When `report` is an unknown command, route the dependency upgrade to **live-tokens-fix-findings**. Resume the audit after the upgrade.

1. Run `npx live-tokens report --json`.
2. Read each section of the report with the Report sections table.
3. When a finding needs component or token scale details, run the matching inspection command below. Otherwise continue with classification.
4. Classify each finding as Mechanical, Judgement, or Deliberate. For Deliberate findings, name the narrower config entry.
5. Reply with the findings of each section in the table's order, each with its count.
6. List the recommended fixes, each marked with its finding class, in the order **live-tokens-fix-findings** takes them.
7. End with the hand-off: run **live-tokens-fix-findings** on the list, or on the subset the user chooses.

For one component, run `npx live-tokens components <id>`. For one token scale, run `npx live-tokens tokens --scale <name>`. Both take `--json`.

## Report sections

| Section | Contents | Fix |
| --- | --- | --- |
| Pending token migrations (`migrations`) | Whether `tokens.css` is behind the installed package. `status` is `pending`, `none pending`, `no tokens.css`, or `unavailable`. A stale file shows downstream as unknown tokens. | Fix this first. Run `npx live-tokens migrate --check` to see the plan, then `npx live-tokens migrate` to apply it. `--write` also rewrites the route references the plan lists. `--tokens <path>` names a tokens.css in an unusual place. |
| Checker findings by rule (`findings.pages`, `findings.components`) | Both checkers' findings by rule under the project's severities, and one strict total with every warning as an error. Errors fail the build today. The strict total is what a fully tokenized project would fail. | Classify each finding under Finding classes. |
| Tokens a component never reads (`components[].unread`) | Tokens a component declares and never reads. Each is an editor row that edits nothing. | Wire each token into the CSS, or remove it. No checker rule covers this, so confirm with a second `report` run. |
| Component registration (`components[].registered`) | Whether the component has a `bootLiveTokens` or `registerComponent` entry. Without one it renders with no editor. | Register it. |
| Component usage comment (`components[].described`) | Whether the runtime file has the header comment the picker reads. Without one, `live-tokens components` cannot say what the component is for. | Add the comment. No checker rule covers this, so confirm with a second `report` run. |
| Components each page renders (`usage.byPage`) | Which component each page imports, and how many times the page renders it. | When a page renders none, say whether it is chrome or markup that a shipped component covers. |
| Shipped components no page renders (`usage.unusedShipped`) | Shipped components no page renders. | None. Information only. |
| Project components unregistered or unused (`usage.customUnregistered`, `usage.customUnused`) | The project's own components that are unregistered or unused. | Register or delete each. `check-component` sees a component only under `src/system/components`, so confirm with a second `report` run. |

## Finding classes

Every finding is one of three. Say which.

- **Mechanical.** The value determines the token, such as a spacing literal and its nearest `--space-*` step. When the fix shifts a rendered value, name the shift.
- **Judgement.** A role determines the token, such as a color literal and the role it plays. Say what the options are. Ask the user to choose.
- **Deliberate.** The finding records a decision, such as a layout size the project owns. Name the config entry that would record the decision. Leave the decision to the user. To lower a rule's severity everywhere, the entry is `"checks": { "rules": { "<rule>": "warn" } }` in `live-tokens.config.json`. To drop one file that is not a themed surface, the entry is `"checks": { "exclude": ["src/art/hero.css"] }`. The path is project-relative, and a directory covers what is under it. Prefer the narrower entry.
