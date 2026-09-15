import type { SkillTree } from '../types';

export const checkCompliance: SkillTree = {
  "id": "live-tokens-check-compliance",
  "digest": "sha256:7ea9c74741740d5c",
  "title": "check-compliance",
  "tagline": "Check and Fix a Project's Use of Live Tokens",
  "nodes": [
    {
      "id": "cc2-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Check and fix design-system compliance",
      "desc": "Checks for correct use of components, properties, and tokens, and fixes the project until both checkers exit 0.",
      "lines": [3, 3],
      "anchor": "description: Check an existing @motion-proto/live-tokens pro"
    },
    {
      "id": "cc2-run",
      "row": 1,
      "kind": "cli",
      "title": "Generate the compliance report",
      "desc": "One run reads the whole project: pending migrations, component facts, findings, and usage.",
      "lines": [14, 14],
      "anchor": "Run `npx live-tokens report --json`. Read it in its own key "
    },
    {
      "id": "cc2-sections",
      "row": 2,
      "kind": "chipset",
      "title": "Read the report sections",
      "desc": "The report's own key order, from project facts to usage.",
      "lines": [37, 46],
      "anchor": "## Report sections",
      "anchorEnd": "| Project components unused (`usage.customUnused`) | The pro",
      "chips": [
        {
          "label": "Pending token migrations",
          "lines": [41, 41],
          "anchor": "| Pending token migrations (`migrations`) | Whether `tokens."
        },
        {
          "label": "Component facts",
          "lines": [42, 42],
          "anchor": "| Component facts (`components[]`) | Every component the pro"
        },
        {
          "label": "Checker findings by rule",
          "lines": [43, 43],
          "anchor": "| Checker findings by rule (`findings.pages`, `findings.comp"
        },
        {
          "label": "Components each page renders",
          "lines": [44, 44],
          "anchor": "| Components each page renders (`usage.byPage`) | Which comp"
        },
        {
          "label": "Shipped components no page renders",
          "lines": [45, 45],
          "anchor": "| Shipped components no page renders (`usage.unusedShipped`)"
        },
        {
          "label": "Project components unused",
          "lines": [46, 46],
          "anchor": "| Project components unused (`usage.customUnused`) | The pro"
        }
      ]
    },
    {
      "id": "cc2-migrate",
      "row": 3,
      "kind": "cli",
      "title": "Run the token migrations",
      "desc": "Bring tokens.css up to the installed package and heal the data tree. A stale file shows as unknown tokens.",
      "lines": [15, 15],
      "anchor": "Run `npx live-tokens migrate --check` to see the plan, then "
    },
    {
      "id": "cc2-check",
      "row": 4,
      "kind": "cli",
      "title": "Run both checkers",
      "desc": "Each applies every auto repair, checks again, and returns the fixes beside the findings that remain.",
      "lines": [16, 20],
      "anchor": "Run both checkers with `--json`. Each first applies every fi",
      "anchorEnd": "```"
    },
    {
      "id": "cc2-read",
      "row": 5,
      "kind": "chipset",
      "title": "Read what remains",
      "desc": "Every finding left carries its guidance and a repair of choice or authored.",
      "lines": [21, 21],
      "anchor": "Read what remains. Each finding carries the fields under Fin",
      "chips": [
        {
          "label": "guidance",
          "lines": [55, 55],
          "anchor": "| `guidance` | How to make the repair: the token for the rol"
        },
        {
          "label": "repair",
          "lines": [56, 56],
          "anchor": "| `repair` | `auto`, `choice`, or `authored`. See Repair lev"
        },
        {
          "label": "exception",
          "lines": [57, 57],
          "anchor": "| `exception` | The narrower config entry that records a dec"
        },
        {
          "label": "details",
          "lines": [58, 58],
          "anchor": "| `details` | Per-rule data the message already states in pr"
        }
      ]
    },
    {
      "id": "cc2-group",
      "row": 6,
      "kind": "step",
      "title": "Group findings by rule",
      "desc": "Errors first, largest group first. Warnings only when the repair scope includes them.",
      "lines": [22, 22],
      "anchor": "Group the findings by rule. Take the largest error group fir"
    },
    {
      "id": "cc2-repair",
      "row": 7,
      "kind": "chipset",
      "title": "Repair from guidance",
      "desc": "Every repair follows its finding's guidance, within the scope rules.",
      "lines": [23, 23],
      "anchor": "Make every repair in the group from its `guidance`, within S",
      "chips": [
        {
          "label": "choice",
          "lines": [65, 65],
          "anchor": "**`choice`.** A role or an ambiguous value determines the fi"
        },
        {
          "label": "authored",
          "lines": [66, 66],
          "anchor": "**`authored`.** New code is the fix: a runtime that has to s"
        },
        {
          "label": "No new tokens",
          "lines": [70, 70],
          "anchor": "Add no token to `tokens.css`. Map a literal with no matching"
        },
        {
          "label": "Name the shift",
          "lines": [71, 71],
          "anchor": "When the nearest token differs from the literal, use the tok"
        },
        {
          "label": "Deliberate exceptions",
          "lines": [72, 72],
          "anchor": "Any finding, at any repair level, can stay as a deliberate e"
        }
      ]
    },
    {
      "id": "cc2-rerun",
      "row": 8,
      "kind": "cli",
      "title": "Rerun both checkers",
      "desc": "Run both checkers again to see what remains.",
      "lines": [24, 24],
      "anchor": "Run both checkers again. When repairable findings remain in "
    },
    {
      "id": "cc2-repeat",
      "row": 9,
      "kind": "gate",
      "title": "Regroup the remaining findings",
      "desc": "Findings a token can fix go back through grouping.",
      "lines": [24, 24],
      "anchor": "Run both checkers again. When repairable findings remain in "
    },
    {
      "id": "cc2-unresolved",
      "row": 9,
      "kind": "step",
      "title": "Record the unresolved findings",
      "desc": "A finding no token fits stays, and the reply says why.",
      "lines": [70, 70],
      "anchor": "Add no token to `tokens.css`. Map a literal with no matching"
    },
    {
      "id": "cc2-strict",
      "row": 10,
      "kind": "cli",
      "title": "Run strict checks",
      "desc": "Strict mode counts every warning as an error.",
      "lines": [25, 25],
      "anchor": "When the errors are clear, run both checkers with `--strict`"
    },
    {
      "id": "cc2-warnings",
      "row": 11,
      "kind": "decide",
      "title": "Warning scope",
      "desc": "Warnings are cleared when the request includes them. Otherwise the user chooses.",
      "lines": [25, 26],
      "anchor": "When the errors are clear, run both checkers with `--strict`",
      "anchorEnd": "When the repair scope includes warnings, return to step 5 wi"
    },
    {
      "id": "cc2-warning-loop",
      "row": 12,
      "kind": "gate",
      "title": "Include warnings in the repair scope",
      "desc": "The warnings go back through grouping, with --strict on every run.",
      "lines": [26, 26],
      "anchor": "When the repair scope includes warnings, return to step 5 wi"
    },
    {
      "id": "cc2-build",
      "row": 13,
      "kind": "step",
      "title": "Gate the existing build",
      "desc": "check:design runs both checkers with --no-fix, and the build runs it first once both exit 0.",
      "lines": [76, 76],
      "anchor": "When `package.json` has no `check:design` script, add `\"chec"
    },
    {
      "id": "cc2-reply",
      "row": 14,
      "kind": "chipset",
      "title": "Reply with the results",
      "desc": "The report's picture, the fixes the checkers applied, the remaining changes by rule, the findings left with their reasons, and both exit codes.",
      "lines": [28, 33],
      "anchor": "Reply with:",
      "anchorEnd": "both checker commands with their exit codes"
    },
    {
      "id": "cc2-done",
      "row": 15,
      "kind": "done",
      "title": "Results complete",
      "desc": "Both checkers pass, or every finding left has a reason.",
      "lines": [28, 33],
      "anchor": "Reply with:",
      "anchorEnd": "both checker commands with their exit codes"
    }
  ],
  "edges": [
    {
      "from": "cc2-trig",
      "to": "cc2-run"
    },
    {
      "from": "cc2-run",
      "to": "cc2-sections"
    },
    {
      "from": "cc2-sections",
      "to": "cc2-migrate"
    },
    {
      "from": "cc2-migrate",
      "to": "cc2-check"
    },
    {
      "from": "cc2-check",
      "to": "cc2-read",
      "label": "findings"
    },
    {
      "from": "cc2-check",
      "to": "cc2-strict",
      "label": "exit 0"
    },
    {
      "from": "cc2-read",
      "to": "cc2-group"
    },
    {
      "from": "cc2-group",
      "to": "cc2-repair"
    },
    {
      "from": "cc2-repair",
      "to": "cc2-rerun"
    },
    {
      "from": "cc2-rerun",
      "to": "cc2-repeat",
      "label": "repairable findings"
    },
    {
      "from": "cc2-repeat",
      "to": "cc2-group",
      "label": "return to step 5",
      "back": true
    },
    {
      "from": "cc2-rerun",
      "to": "cc2-unresolved",
      "label": "no token fits"
    },
    {
      "from": "cc2-unresolved",
      "to": "cc2-reply"
    },
    {
      "from": "cc2-rerun",
      "to": "cc2-strict",
      "label": "errors clear"
    },
    {
      "from": "cc2-strict",
      "to": "cc2-warnings",
      "label": "warnings"
    },
    {
      "from": "cc2-strict",
      "to": "cc2-build",
      "label": "strict checks pass"
    },
    {
      "from": "cc2-warnings",
      "to": "cc2-warning-loop",
      "label": "repair scope includes warnings"
    },
    {
      "from": "cc2-warnings",
      "to": "cc2-build",
      "label": "user defers warnings"
    },
    {
      "from": "cc2-warning-loop",
      "to": "cc2-group",
      "label": "use --strict",
      "back": true
    },
    {
      "from": "cc2-build",
      "to": "cc2-reply"
    },
    {
      "from": "cc2-reply",
      "to": "cc2-done"
    }
  ]
};
