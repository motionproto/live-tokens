---
name: live-tokens-check-compliance
description: Report an existing project's adherence to @motion-proto/live-tokens from one run of npx live-tokens report. Checks for correct use of components, properties, and tokens. Every finding carries its own fix slug, repair level, and details, so the whole picture comes from one call. Called as the verification step by live-tokens-create-page and live-tokens-create-component. Use when the user asks to check, audit, or review the project. Edits no file. Hands the fix list to live-tokens-fix-findings.
---

# Checking a project's adherence to live-tokens

Run `npx live-tokens report --json`. Every finding it returns already carries its `fix` slug, its `repair` level, and, where a rule has one, `details`. Present the report in its own order and hand the chosen scope to **live-tokens-fix-findings**. Edit no file.

When live-tokens-create-page or live-tokens-create-component calls this skill, lead with the findings on the file it built.

The report is static. It reads the project's source; it never opens a browser and never mounts a runtime. A component's declared behavior and a page's rendered paint are proven elsewhere, by the test runs **live-tokens-create-component** and **live-tokens-create-page** call directly, and their findings reach a skill the same way: by rule, with a fix.

## Workflow

1. Run `npx live-tokens report --json`.
2. Read the report in its own key order: `project`, `migrations`, `components`, `findings.pages`, `findings.components`, `usage`.
3. Reply with the findings of each section, each with its count.
4. List the recommended fixes, ordered `auto`, then `choice`, then `authored`, per Repair levels below.
5. End with the hand-off: run **live-tokens-fix-findings** on the list, or on the subset the user chooses.

## Report sections

| Section | Contents |
| --- | --- |
| Pending token migrations (`migrations`) | Whether `tokens.css` is behind the installed package. `status` is `pending`, `none pending`, `no tokens.css`, or `unavailable`. A stale file shows downstream as unknown tokens. Lead with this: it explains findings elsewhere. |
| Component facts (`components[]`) | Every component the project has, each with `id`, `origin`, `file`, `registered`, and `tokens` (the count of semantic properties it declares). No `name`, `unread`, or `described`; a component's unread tokens and missing description are the `unread-token` and `missing-description` findings below, not facts here. |
| Checker findings by rule (`findings.pages`, `findings.components`) | Both checkers' findings by rule under the project's severities, and one strict total with every warning as an error. Errors fail the build today. The strict total is what a fully tokenized project would fail. |
| Components each page renders (`usage.byPage`) | Which component each page imports, and how many times the page renders it. When a page renders none, say whether it is chrome or markup that a shipped component covers. |
| Shipped components no page renders (`usage.unusedShipped`) | Information only. |
| Project components unused (`usage.customUnused`) | The project's own components no page renders. No `customUnregistered`; an unregistered project component is now the `missing-registration` finding above. |

## Finding fields

Every finding from both checkers, under `report --json`:

| Field | Value |
| --- | --- |
| `rule`, `severity`, `file`, `line`, `message` | What the finding is and where. |
| `fix` | The slug naming the section of **live-tokens-fix-findings** that repairs it. |
| `repair` | `auto`, `choice`, or `authored`. See Repair levels. |
| `exception` | The narrower config entry that records a decision to leave the finding as it is: `{ "checks": { "exclude": ["<file>"] } }` for a page or CSS file, otherwise `{ "checks": { "rules": { "<rule>": "warn" } } }`. Applying it steps the rule down one level, error to warn and warn to off. |
| `details` | Per-rule data the message already states in prose, such as the accepted values behind `unknown-prop-value` or the nearest design-token candidates behind `dimension-literal`. Absent when a rule has nothing to add. |

## Repair levels

Every finding's `repair` says what moving it costs.

- **`auto`.** The value determines the fix, such as a spacing literal with one nearest design-token step. **live-tokens-fix-findings** applies it and reports the shift.
- **`choice`.** A role or an ambiguous value determines the fix, such as a color literal and the role it plays, or a spacing literal tied between two steps. `details` lists the candidates. Ask the user to choose.
- **`authored`.** The user's own words are the fix: a runtime that has to start behaving, an editor schema that has to name a token, a route that has to move. No candidate list applies.

Any finding, at any repair level, can instead stay as a deliberate exception: the user chooses to keep it, recorded in the config entry its `exception` field names. Prefer the narrower entry.
