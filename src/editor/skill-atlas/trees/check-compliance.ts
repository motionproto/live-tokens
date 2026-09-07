import type { SkillTree } from '../types';

export const checkCompliance: SkillTree = {
  "id": "live-tokens-check-compliance",
  "digest": "sha256:61c6a9c224cc8556",
  "title": "check-compliance",
  "tagline": "Check to Ensure Live Tokens Is Used",
  "nodes": [
    {
      "id": "cc2-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Review design-system compliance",
      "desc": "Use when the user asks to check, audit, or review the project.",
      "lines": [3, 3],
      "anchor": "description: Report an existing project's adherence to @moti"
    },
    {
      "id": "cc2-run",
      "row": 1,
      "kind": "cli",
      "title": "Generate the compliance report",
      "lines": [14, 14],
      "anchor": "Run `npx live-tokens report --json`.",
      "command": "npx live-tokens report --json",
      "n": "1"
    },
    {
      "id": "cc2-upgrade",
      "row": 2,
      "kind": "gate",
      "title": "Route the dependency upgrade",
      "desc": "Invoke live-tokens-fix-findings for the dependency upgrade, then resume the audit.",
      "lines": [12, 12],
      "anchor": "When `report` is an unknown command, route the dependency up"
    },
    {
      "id": "cc2-sections",
      "row": 3,
      "kind": "chipset",
      "title": "Read the report sections",
      "lines": [15, 15],
      "anchor": "Read each section of the report with the Report sections tab",
      "n": "2",
      "chips": [
        {
          "label": "migrations",
          "lines": [28, 28],
          "anchor": "| `migrations` | Whether `tokens.css` is behind the installe"
        },
        {
          "label": "findings.pages, findings.components",
          "lines": [29, 29],
          "anchor": "| `findings.pages`, `findings.components` | Both checkers' f"
        },
        {
          "label": "components[].unread",
          "lines": [30, 30],
          "anchor": "| `components[].unread` | Tokens a component declares and ne"
        },
        {
          "label": "components[].registered",
          "lines": [31, 31],
          "anchor": "| `components[].registered` | Whether the component has a `b"
        },
        {
          "label": "components[].described",
          "lines": [32, 32],
          "anchor": "| `components[].described` | Whether the runtime file has th"
        },
        {
          "label": "usage.byPage",
          "lines": [33, 33],
          "anchor": "| `usage.byPage` | Which component each page imports, and ho"
        },
        {
          "label": "usage.unusedShipped",
          "lines": [34, 34],
          "anchor": "| `usage.unusedShipped` | Shipped components no page renders"
        },
        {
          "label": "usage.customUnregistered, usage.customUnused",
          "lines": [35, 35],
          "anchor": "| `usage.customUnregistered`, `usage.customUnused` | The pro"
        }
      ]
    },
    {
      "id": "cc2-drill-q",
      "row": 4,
      "kind": "decide",
      "title": "Inspection details",
      "desc": "Does the finding need component or scale details?",
      "lines": [16, 16],
      "anchor": "When a finding needs component or scale details, run the mat"
    },
    {
      "id": "cc2-component",
      "row": 5,
      "kind": "cli",
      "title": "Inspect the component",
      "lines": [22, 22],
      "anchor": "For one component, run `npx live-tokens components <id>`. Fo",
      "command": "npx live-tokens components <id> --json"
    },
    {
      "id": "cc2-scale",
      "row": 5,
      "kind": "cli",
      "title": "Inspect the scale",
      "lines": [22, 22],
      "anchor": "For one component, run `npx live-tokens components <id>`. Fo",
      "command": "npx live-tokens tokens --family <name> --json"
    },
    {
      "id": "cc2-classify",
      "row": 7,
      "kind": "chipset",
      "title": "Classify the findings",
      "lines": [17, 17],
      "anchor": "Classify each finding as Mechanical, Judgement, or Deliberat",
      "n": "4",
      "chips": [
        {
          "label": "Mechanical",
          "lines": [41, 41],
          "anchor": "**Mechanical.** The value determines the token, such as a sp"
        },
        {
          "label": "Judgement",
          "lines": [42, 42],
          "anchor": "**Judgement.** A role determines the token, such as a color "
        },
        {
          "label": "Deliberate",
          "lines": [43, 43],
          "anchor": "**Deliberate.** The finding records a decision, such as a la"
        }
      ]
    },
    {
      "id": "cc2-deliberate-q",
      "row": 8,
      "kind": "decide",
      "title": "Finding class",
      "desc": "Does the finding require a deliberate config decision?",
      "lines": [17, 17],
      "anchor": "Classify each finding as Mechanical, Judgement, or Deliberat"
    },
    {
      "id": "cc2-deliberate",
      "row": 9,
      "kind": "step",
      "title": "Name the narrower config entry",
      "lines": [43, 43],
      "anchor": "**Deliberate.** The finding records a decision, such as a la"
    },
    {
      "id": "cc2-reply",
      "row": 10,
      "kind": "chipset",
      "title": "Reply in report order",
      "lines": [18, 18],
      "anchor": "Reply with the findings of each section in the table's order",
      "n": "5",
      "chips": [
        {
          "label": "migrations",
          "lines": [28, 28],
          "anchor": "| `migrations` | Whether `tokens.css` is behind the installe"
        },
        {
          "label": "findings.pages, findings.components",
          "lines": [29, 29],
          "anchor": "| `findings.pages`, `findings.components` | Both checkers' f"
        },
        {
          "label": "components[].unread",
          "lines": [30, 30],
          "anchor": "| `components[].unread` | Tokens a component declares and ne"
        },
        {
          "label": "components[].registered",
          "lines": [31, 31],
          "anchor": "| `components[].registered` | Whether the component has a `b"
        },
        {
          "label": "components[].described",
          "lines": [32, 32],
          "anchor": "| `components[].described` | Whether the runtime file has th"
        },
        {
          "label": "usage.byPage",
          "lines": [33, 33],
          "anchor": "| `usage.byPage` | Which component each page imports, and ho"
        },
        {
          "label": "usage.unusedShipped",
          "lines": [34, 34],
          "anchor": "| `usage.unusedShipped` | Shipped components no page renders"
        },
        {
          "label": "usage.customUnregistered, usage.customUnused",
          "lines": [35, 35],
          "anchor": "| `usage.customUnregistered`, `usage.customUnused` | The pro"
        }
      ]
    },
    {
      "id": "cc2-fix-list",
      "row": 11,
      "kind": "step",
      "title": "List the recommended fixes",
      "lines": [19, 19],
      "anchor": "List the recommended fixes, each marked with its finding cla",
      "n": "6"
    },
    {
      "id": "cc2-handoff",
      "row": 12,
      "kind": "hand",
      "title": "live-tokens-fix-findings",
      "lines": [20, 20],
      "anchor": "End with the hand-off: run **live-tokens-fix-findings** on t",
      "n": "7"
    }
  ],
  "edges": [
    {
      "to": "cc2-run",
      "from": "cc2-trig"
    },
    {
      "to": "cc2-upgrade",
      "from": "cc2-run",
      "label": "unknown command"
    },
    {
      "to": "cc2-run",
      "from": "cc2-upgrade",
      "label": "resume audit",
      "back": true
    },
    {
      "to": "cc2-sections",
      "from": "cc2-run",
      "label": "report"
    },
    {
      "to": "cc2-drill-q",
      "from": "cc2-sections"
    },
    {
      "to": "cc2-component",
      "from": "cc2-drill-q",
      "label": "component"
    },
    {
      "to": "cc2-scale",
      "from": "cc2-drill-q",
      "label": "scale"
    },
    {
      "to": "cc2-classify",
      "from": "cc2-drill-q",
      "label": "continue with classification"
    },
    {
      "to": "cc2-classify",
      "from": "cc2-component"
    },
    {
      "to": "cc2-classify",
      "from": "cc2-scale"
    },
    {
      "to": "cc2-deliberate-q",
      "from": "cc2-classify"
    },
    {
      "to": "cc2-deliberate",
      "from": "cc2-deliberate-q",
      "label": "Deliberate"
    },
    {
      "to": "cc2-reply",
      "from": "cc2-deliberate-q",
      "label": "Mechanical"
    },
    {
      "to": "cc2-reply",
      "from": "cc2-deliberate-q",
      "label": "Judgement"
    },
    {
      "to": "cc2-reply",
      "from": "cc2-deliberate"
    },
    {
      "to": "cc2-fix-list",
      "from": "cc2-reply"
    },
    {
      "to": "cc2-handoff",
      "from": "cc2-fix-list"
    }
  ]
};
