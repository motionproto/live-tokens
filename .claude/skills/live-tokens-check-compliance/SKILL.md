---
name: live-tokens-check-compliance
description: Check an existing @motion-proto/live-tokens project against the design system and fix it until check-page and check-component both exit 0. Checks for correct use of components, properties, and tokens. Runs both checkers, which bring tokens.css up to the installed package, apply every auto repair, and return each remaining finding with its own guidance, repair level, and details. Use when the user asks to check, audit, or review the project. Use when the user asks to fix the project or to make the build's design checks pass. Edits the files the checkers name. Changes tokens.css only through its migrations.
---

# Checking and fixing a project's adherence to live-tokens

Check the project, then fix every finding of `check-page` and `check-component` until both exit 0. `check-page` checks pages. Every component comes from the catalogue, every prop is declared, and every value in page CSS is a design token. `check-component` checks the project's own components. Every token names a semantic property, and its default is the design token that property reads. Every finding carries its own `guidance`, and the repair follows it.

Both checkers are static. They read the project's source, never open a browser, and never mount a runtime. `npx live-tokens check-page <file> --tests` proves a page's rendered paint, and `npx live-tokens check-component <id> --tests` proves a component's declared behavior. **live-tokens-create-page** and **live-tokens-create-component** run those, one file or one id at a time, and their findings carry guidance the same way.

## Workflow

1. Run both checkers with `--json`. Each first brings `tokens.css` up to the installed package by applying every additive migration, then applies every finding whose `repair` is `auto`, checks again, and returns the fixes it applied in `fix.applied` beside the findings that remain. A pending breaking migration returns as a `tokens-breaking-migration` finding, since it renames design tokens the project may read. A fix in `fix.skipped` found its text moved, and the next run applies it. `--no-fix` reports without editing, for a build or CI.
   ```sh
   npx live-tokens check-page --json
   npx live-tokens check-component --json
   ```
2. Read what remains. Each finding carries the fields under Finding fields, with a `repair` of `choice` or `authored`.
3. Group the findings by rule. Take the largest error group first, then the remaining errors. Take warnings only when the repair scope includes warnings.
4. Make every repair in the group from its `guidance`, within Scope below.
5. Run both checkers again. When repairable findings remain in scope, return to step 3. When no token fits a remaining finding, leave it and continue to the reply with its reason.
6. When the errors are clear, run both checkers with `--strict`. Report what `--strict` adds. Clear warnings within the existing request. Otherwise ask whether to clear the warnings now.
7. When the repair scope includes warnings, return to step 3 with `--strict`. When strict checks pass or the user defers warnings, continue to the reply.
8. Reply with:
    - the fixes the checkers applied, each with its count and any visible shift
    - the remaining changes by rule, each with its count and any visible shift
    - the findings left, each with its reason and any config entry the user chose
    - both checker commands with their exit codes

`check-page <path>` scopes a run to one page. `check-component <id>` scopes a run to one component: its runtime, its editor, and its registration. The checkers read tokens.css from its default location.

## Finding fields

Every finding from both checkers, under each checker's `--json`:

| Field | Value |
| --- | --- |
| `rule`, `severity`, `file`, `line`, `message` | What the finding is and where. |
| `guidance` | How to make the repair: the token for the role or the scale step, the command that prints the candidates, or the section of a create skill that owns the fix. |
| `repair` | `auto`, `choice`, or `authored`. See Repair levels. |
| `exception` | The narrower config entry that records a decision to leave the finding as it is: `{ "checks": { "exclude": ["<file>"] } }` for a page or CSS file, otherwise `{ "checks": { "rules": { "<rule>": "warn" } } }`. Applying it steps the rule down one level, error to warn and warn to off. |
| `details` | Per-rule data the message already states in prose, such as the accepted values behind `unknown-prop-value` or the nearest design-token candidates behind `dimension-literal`. Absent when a rule has nothing to add. |

## Repair levels

Every finding's `repair` says what moving it costs.

- **`auto`.** The value determines the fix, such as a spacing literal with one nearest design-token step. The checkers apply it and list it in `fix.applied`.
- **`choice`.** A role or an ambiguous value determines the fix, such as a color literal and the role it plays, or a spacing literal tied between two steps. `details` lists the candidates, and `guidance` says how to pick one.
- **`authored`.** New code is the fix: a runtime that has to start behaving, an editor schema that has to name a token, a route that has to move. `guidance` names what to write. No candidate list applies.

## Scope

- Add no token to `tokens.css`. Map a literal with no matching token to the nearest existing token by role. When no token fits, leave the finding and say so.
- When the nearest token differs from the literal, use the token and name the shift in the reply, such as `14px` to `--space-16`.
- Apply a `tokens-breaking-migration` finding with `npx live-tokens migrate`, after `npx live-tokens migrate --check` prints the plan. `--tokens <path>` names a tokens.css in an unusual place, and `--write` also rewrites the route references the plan lists. Name each renamed design token in the reply.
- Any finding, at any repair level, can stay as a deliberate exception when the user chooses to keep it. Record that decision in the config entry its `exception` field names, and prefer the narrower entry. When the user has chosen to lower a rule's severity, record it in `live-tokens.config.json` under `"checks": { "rules": { "<rule>": "warn" } }`. `--off=<rule>` silences a rule for one run only.
