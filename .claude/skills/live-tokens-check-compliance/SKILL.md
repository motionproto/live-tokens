---
name: live-tokens-check-compliance
description: Check an existing @motion-proto/live-tokens project against its design system and report, without changing a file: which tokens each component reads, which page renders which component, what the two checkers find, and a list of recommended fixes handed to live-tokens-fix-findings. Use when the user asks to check, audit, validate, or review the project, a page, or a component against the design system; asks how compliant it is, what is off, or what it would take to make the build pass; or wants a look before an upgrade. Not for making the changes (live-tokens-fix-findings), and not for a single token (use the editor).
---

# Checking a project against its design system

The answer to "check this project" is a report. Every fact in it comes from one command; the reading of those facts, and what fixing them would cost, is yours. This skill edits nothing. When the user wants the changes made, that is **live-tokens-fix-findings**, and this report is what it starts from.

## Workflow

1. Run `npx live-tokens report --json`. It always exits 0: it is a reading, not a gate. Unknown command means the installed package predates it; upgrade `@motion-proto/live-tokens` first.
2. Read each section against the table below. For every rule with findings, say in a line what the rule holds and whether the fix is mechanical or a judgement.
3. Where a finding looks deliberate, name the config entry that would record the decision, and leave the decision to the user.
4. Report in the order under Summary, each line carrying its count, and end by handing the list to **live-tokens-fix-findings**. Do not start applying fixes here, even one-liners, because the user asked how things stand.

`npx live-tokens components <id>` and `npx live-tokens tokens --family <name>` (both take `--json`) answer any question the report raises about one component or one scale.

## The report's sections

| Section | Fact | When it is not clean |
| --- | --- | --- |
| `migrations` | Whether `tokens.css` is behind the installed package | A stale file shows up downstream as unknown tokens. This is the first fix, and it is one command: `npx live-tokens migrate --check`, then `--write` (`--tokens <path>` for a tokens.css in an unusual place). |
| `components[].unread` | Tokens a component declares that nothing in its file reads | An editor row that edits nothing. Each is a token to wire into the CSS or to remove. |
| `components[].registered` | A component file with no `bootLiveTokens` or `registerComponent` entry | It renders on the page but has no editor. |
| `components[].described` | Whether the runtime file has the header comment the picker reads | Without one, `live-tokens components` cannot say what it is for. |
| `usage.byPage` | Which catalogue component each page renders, and how many times | A page rendering none is either chrome or hand-rolled markup that a shipped component covers. |
| `usage.unusedShipped` | Shipped components no page renders | Information, not a finding. |
| `usage.customUnregistered`, `usage.customUnused` | The project's own components that are unregistered or unused | Dead or half-wired work. |
| `findings.pages`, `findings.components` | Both checkers' findings by rule, under the project's severities and again with every warning counted as an error | The errors are what fails the build today; the strict count is what a fully tokenized project would fail. |

## Mechanical or judgement

- **Mechanical**: a spacing literal to its nearest `--space-*` step, a stroke to `--border-width-*`, a hardcoded column count to `var(--columns-count)`, `site.css` moved out of `main.ts`, a route given its `source`. Name any visible shift, such as a `14px` margin becoming `16px`.
- **Judgement**: a colour literal mapped by the role it plays rather than its hue, a raw type axis set from a text style, a prop the component does not declare mapped or dropped. Say what the choice is, not what you would pick.

## Deliberate findings

A translucent overlay on an app shell, or a layout size the project owns, may be a decision rather than a miss. Say so and name the entry that would record it: `"checks": { "rules": { "<rule>": "warn" } }` in `live-tokens.config.json`. Where a whole file is not a themed surface at all, hand-tuned artwork or vendored CSS, the entry is `"checks": { "exclude": ["src/art/hero.css"] }`: a project-relative path, a directory covering what is under it, and naming the file on the command line still checks it. Prefer the narrower one: an exclusion drops one file, a severity change drops a rule everywhere. Recording either is the user's call, not yours.

## Summary

1. Migrations pending, and the one command that clears them.
2. What fails the build now: errors by rule, with the files.
3. What the strict count adds: warnings by rule.
4. Components: unread tokens, unregistered, undescribed.
5. Usage: what each page renders, and what is used nowhere.
6. Recommended fixes, in the order **live-tokens-fix-findings** would take them: migrations, then the largest group of errors, then the rest, then warnings. Mark each as mechanical or judgement.

End with the hand-off: "Run live-tokens-fix-findings to apply these", or the subset the user chooses.
