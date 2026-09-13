import type { SkillTree } from '../types';

export const checkCompliance: SkillTree = {
  "id": "live-tokens-check-compliance",
  "digest": "sha256:ff17fbdf4dea2b8c",
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
      "desc": "Every finding already carries its fix slug, repair level, and details.",
      "lines": [16, 16],
      "anchor": "Run `npx live-tokens report --json`."
    },
    {
      "id": "cc2-sections",
      "row": 2,
      "kind": "chipset",
      "title": "Read the report sections",
      "desc": "The report's own key order, from project facts to usage.",
      "lines": [17, 17],
      "anchor": "Read the report in its own key order: `project`, `migrations",
      "chips": [
        {
          "label": "Pending token migrations",
          "lines": [26, 26],
          "anchor": "| Pending token migrations (`migrations`) | Whether `tokens."
        },
        {
          "label": "Component facts",
          "lines": [27, 27],
          "anchor": "| Component facts (`components[]`) | Every component the pro"
        },
        {
          "label": "Checker findings by rule",
          "lines": [28, 28],
          "anchor": "| Checker findings by rule (`findings.pages`, `findings.comp"
        },
        {
          "label": "Components each page renders",
          "lines": [29, 29],
          "anchor": "| Components each page renders (`usage.byPage`) | Which comp"
        },
        {
          "label": "Shipped components no page renders",
          "lines": [30, 30],
          "anchor": "| Shipped components no page renders (`usage.unusedShipped`)"
        },
        {
          "label": "Project components unused",
          "lines": [31, 31],
          "anchor": "| Project components unused (`usage.customUnused`) | The pro"
        }
      ]
    },
    {
      "id": "cc2-reply",
      "row": 3,
      "kind": "step",
      "title": "Reply with the findings",
      "desc": "Every finding carries rule, severity, file, line, message, fix, repair, exception, and details.",
      "lines": [18, 18],
      "anchor": "Reply with the findings of each section, each with its count"
    },
    {
      "id": "cc2-classify",
      "row": 4,
      "kind": "chipset",
      "title": "List the recommended fixes",
      "desc": "Ordered auto, then choice, then authored, per Repair levels.",
      "lines": [19, 19],
      "anchor": "List the recommended fixes, ordered `auto`, then `choice`, t",
      "chips": [
        {
          "label": "auto",
          "lines": [49, 49],
          "anchor": "**`auto`.** The value determines the fix, such as a spacing "
        },
        {
          "label": "choice",
          "lines": [50, 50],
          "anchor": "**`choice`.** A role or an ambiguous value determines the fi"
        },
        {
          "label": "authored",
          "lines": [51, 51],
          "anchor": "**`authored`.** The user's own words are the fix: a runtime "
        }
      ]
    },
    {
      "id": "cc2-handoff",
      "row": 5,
      "kind": "hand",
      "title": "live-tokens-fix-findings",
      "desc": "End with the hand-off: run it on the list, or on the subset the user chooses.",
      "lines": [20, 20],
      "anchor": "End with the hand-off: run **live-tokens-fix-findings** on t"
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
      "to": "cc2-reply",
      "from": "cc2-sections"
    },
    {
      "to": "cc2-classify",
      "from": "cc2-reply"
    },
    {
      "to": "cc2-handoff",
      "from": "cc2-classify"
    }
  ]
};
