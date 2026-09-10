import type { SkillTree } from '../types';

export const checkCompliance: SkillTree = {
  "id": "live-tokens-check-compliance",
  "digest": "sha256:6ec5bd44eeee644c",
  "title": "check-compliance",
  "tagline": "Check to Ensure Live Tokens Is Used",
  "nodes": [
    {
      "id": "cc2-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Review design-system compliance",
      "desc": "Checks for correct use of components, properties, and tokens.",
      "lines": [3, 3],
      "anchor": "description: Report an existing project's adherence to @moti"
    },
    {
      "id": "cc2-run",
      "row": 1,
      "kind": "cli",
      "title": "Generate the compliance report",
      "desc": "Provides a report of fixes for the fix-findings skill",
      "lines": [8, 8],
      "anchor": "Run `npx live-tokens report`. The CLI prints a report with t"
    },
    {
      "id": "cc2-sections",
      "row": 2,
      "kind": "chipset",
      "title": "Read the report sections",
      "desc": "Fixes in the report are listed by section.",
      "lines": [19, 19],
      "anchor": "Read each section of the report with the Report sections tab",
      "chips": [
        {
          "label": "Pending token migrations",
          "lines": [32, 32],
          "anchor": "| Pending token migrations (`migrations`) | Whether `tokens."
        },
        {
          "label": "Checker findings by rule",
          "lines": [33, 33],
          "anchor": "| Checker findings by rule (`findings.pages`, `findings.comp"
        },
        {
          "label": "Tokens a component never reads",
          "lines": [34, 34],
          "anchor": "| Tokens a component never reads (`components[].unread`) | T"
        },
        {
          "label": "Component registration",
          "lines": [35, 35],
          "anchor": "| Component registration (`components[].registered`) | Wheth"
        },
        {
          "label": "Component usage comment",
          "lines": [36, 36],
          "anchor": "| Component usage comment (`components[].described`) | Wheth"
        },
        {
          "label": "Components each page renders",
          "lines": [37, 37],
          "anchor": "| Components each page renders (`usage.byPage`) | Which comp"
        },
        {
          "label": "Shipped components no page renders",
          "lines": [38, 38],
          "anchor": "| Shipped components no page renders (`usage.unusedShipped`)"
        },
        {
          "label": "Project components unregistered or unused",
          "lines": [39, 39],
          "anchor": "| Project components unregistered or unused (`usage.customUn"
        }
      ]
    },
    {
      "id": "cc2-drill-q",
      "row": 3,
      "kind": "decide",
      "title": "Get details",
      "desc": "A finding may need more about one component or one token scale, such as space or color.",
      "lines": [20, 20],
      "anchor": "When a finding needs component or token scale details, run t",
      "chips": [
        {
          "label": "component",
          "lines": [26, 26],
          "anchor": "For one component, run `npx live-tokens components <id>`. Fo"
        },
        {
          "label": "token scale",
          "lines": [26, 26],
          "anchor": "For one component, run `npx live-tokens components <id>`. Fo"
        },
        {
          "label": "continue with classification",
          "lines": [21, 21],
          "anchor": "Classify each finding as Mechanical, Judgement, or Deliberat"
        }
      ]
    },
    {
      "id": "cc2-component",
      "row": 4,
      "kind": "cli",
      "title": "Inspect the component",
      "desc": "Shows one component's props and usage.",
      "lines": [26, 26],
      "anchor": "For one component, run `npx live-tokens components <id>`. Fo"
    },
    {
      "id": "cc2-scale",
      "row": 4,
      "kind": "cli",
      "title": "Inspect the token scale",
      "desc": "Shows every token in one scale, such as space or color, with its value.",
      "lines": [26, 26],
      "anchor": "For one component, run `npx live-tokens components <id>`. Fo"
    },
    {
      "id": "cc2-classify",
      "row": 6,
      "kind": "chipset",
      "title": "Classify the findings",
      "desc": "Mechanical maps a value to an existing token.\nJudgement asks the user to decide.\nDeliberate records a decision the project made.",
      "lines": [21, 21],
      "anchor": "Classify each finding as Mechanical, Judgement, or Deliberat"
    },
    {
      "id": "cc2-handoff",
      "row": 7,
      "kind": "hand",
      "title": "live-tokens-fix-findings",
      "desc": "Reply with the findings and the fixes, in the order the repair skill takes them, and hand it the list.",
      "lines": [22, 24],
      "anchor": "Reply with the findings of each section in the table's order",
      "anchorEnd": "End with the hand-off: run **live-tokens-fix-findings** on t"
    }
  ],
  "edges": [
    {
      "to": "cc2-run",
      "from": "cc2-trig"
    },
    {
      "to": "cc2-sections",
      "from": "cc2-run"
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
      "label": "token scale"
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
      "to": "cc2-handoff",
      "from": "cc2-classify"
    }
  ]
};
