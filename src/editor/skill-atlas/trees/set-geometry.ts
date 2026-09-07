import type { SkillTree } from '../types';

export const setGeometry: SkillTree = {
  "id": "live-tokens-set-geometry",
  "digest": "sha256:fbe78a12bbd4791a",
  "title": "set-geometry",
  "tagline": "Set Spacing, Corner Radius, Line Weight",
  "nodes": [
    {
      "id": "sg-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Set shape and spacing",
      "desc": "Changes geometry only. For a request that also names color or type, read live-tokens-create-theme.",
      "lines": [3, 3],
      "anchor": "description: Set a live-tokens theme's geometry: corner radi"
    },
    {
      "id": "sg-anchor",
      "row": 1,
      "kind": "ref",
      "title": "Read the geometry anchor",
      "lines": [14, 14],
      "anchor": "Read the geometry intent and the anchor, when live-tokens-cr",
      "reference": "references/geometry-anchors.md",
      "n": "1"
    },
    {
      "id": "sg-input",
      "row": 2,
      "kind": "step",
      "title": "Write the input file",
      "desc": "An operation is global or targeted, and it sets a step or shifts by steps.",
      "lines": [15, 15],
      "anchor": "Write the ops file to `scratch/geometry-ops.json`.",
      "n": "2",
      "chips": [
        {
          "label": "Input format",
          "lines": [25, 42],
          "anchor": "## The ops file",
          "anchorEnd": "`full` (radius shifts only): admits `--radius-full` as the t"
        }
      ]
    },
    {
      "id": "sg-idioms",
      "row": 3,
      "kind": "chipset",
      "title": "Translate geometry intent",
      "lines": [44, 69],
      "anchor": "## Idioms",
      "anchorEnd": "Magnitude follows the qualifier. \"Slightly\" or \"a bit\" is 1 ",
      "chips": [
        {
          "label": "pill",
          "lines": [50, 50],
          "anchor": "| pill, capsule | radius `set: \"--radius-full\"`, plus the pa"
        },
        {
          "label": "sharp",
          "lines": [51, 51],
          "anchor": "| sharp, square corners | radius `set: \"--radius-none\"`, or "
        },
        {
          "label": "rounded, one component",
          "lines": [52, 52],
          "anchor": "| rounded (a named component) | radius `shift: 2` |"
        },
        {
          "label": "softer, global",
          "lines": [53, 53],
          "anchor": "| softer, rounder (global) | radius `shift: 1` to `2`, no `f"
        },
        {
          "label": "harder",
          "lines": [54, 54],
          "anchor": "| harder, sharper | radius `shift: -1` to `-2` |"
        },
        {
          "label": "more or less round",
          "lines": [55, 55],
          "anchor": "| increase the radius, less round, more round | radius `shif"
        },
        {
          "label": "airier",
          "lines": [56, 56],
          "anchor": "| space it out, airier, breathing room | padding and gap `sh"
        },
        {
          "label": "denser",
          "lines": [57, 57],
          "anchor": "| tighter, denser, more compact | padding and gap `shift: -1"
        },
        {
          "label": "thicker or thinner borders",
          "lines": [58, 58],
          "anchor": "| thicker, thinner borders | border-width `shift: 1` or `-1`"
        }
      ]
    },
    {
      "id": "sg-controls",
      "row": 4,
      "kind": "step",
      "title": "Compact containers before controls",
      "lines": [71, 94],
      "anchor": "## Compact containers before controls",
      "anchorEnd": "] }"
    },
    {
      "id": "sg-scales",
      "row": 5,
      "kind": "step",
      "title": "Apply scales and floors",
      "lines": [97, 109],
      "anchor": "## Scales",
      "anchorEnd": "The floor guards `-padding` only. A 2px gap between an icon "
    },
    {
      "id": "sg-cli",
      "row": 6,
      "kind": "cli",
      "title": "Run set-geometry",
      "lines": [16, 16],
      "anchor": "Run `npx live-tokens set-geometry scratch/geometry-ops.json`",
      "command": "npx live-tokens set-geometry scratch/geometry-ops.json",
      "n": "3"
    },
    {
      "id": "sg-fail",
      "row": 7,
      "kind": "gate",
      "title": "Correct the input file",
      "lines": [18, 18],
      "anchor": "When the CLI exits 1, fix the op or the input the message na",
      "n": "5"
    },
    {
      "id": "sg-pass",
      "row": 7,
      "kind": "ok",
      "title": "Command passes",
      "lines": [17, 17],
      "anchor": "Read the report. It lists every changed alias, old and new, "
    },
    {
      "id": "sg-report",
      "row": 9,
      "kind": "step",
      "title": "Read the report",
      "lines": [17, 17],
      "anchor": "Read the report. It lists every changed alias, old and new, ",
      "n": "4"
    },
    {
      "id": "sg-reply",
      "row": 10,
      "kind": "step",
      "title": "Reply with the result",
      "lines": [19, 19],
      "anchor": "Reply with every alias that moved and any skip worth naming.",
      "n": "6"
    },
    {
      "id": "sg-scope",
      "row": 11,
      "kind": "step",
      "title": "Preserve the other dimensions",
      "lines": [111, 113],
      "anchor": "## Scope",
      "anchorEnd": "Geometry only. Color, type, saved themes, and `tokens.css` a"
    },
    {
      "id": "sg-verify",
      "row": 12,
      "kind": "done",
      "title": "Verify the geometry",
      "lines": [115, 121],
      "anchor": "## Verify",
      "anchorEnd": "To revert, run the inverse ops, or load the open theme to di",
      "chips": [
        {
          "label": "Expected changes",
          "lines": [117, 117],
          "anchor": "The CLI exits 0 and the report lists the expected changes, w"
        },
        {
          "label": "Rendered geometry",
          "lines": [118, 118],
          "anchor": "The app shows the new shape on each changed component."
        },
        {
          "label": "Control padding",
          "lines": [119, 119],
          "anchor": "Buttons still read as buttons: the label has room at both en"
        },
        {
          "label": "Component buffers",
          "lines": [120, 120],
          "anchor": "`component-configs/<id>/_working.json` exists for every comp"
        },
        {
          "label": "Revert",
          "lines": [121, 121],
          "anchor": "To revert, run the inverse ops, or load the open theme to di"
        }
      ]
    }
  ],
  "edges": [
    {
      "to": "sg-anchor",
      "from": "sg-trig"
    },
    {
      "to": "sg-input",
      "from": "sg-anchor"
    },
    {
      "to": "sg-idioms",
      "from": "sg-input"
    },
    {
      "to": "sg-controls",
      "from": "sg-idioms"
    },
    {
      "to": "sg-scales",
      "from": "sg-controls"
    },
    {
      "to": "sg-cli",
      "from": "sg-scales"
    },
    {
      "to": "sg-fail",
      "from": "sg-cli",
      "label": "exit 1"
    },
    {
      "to": "sg-pass",
      "from": "sg-cli",
      "label": "exit 0"
    },
    {
      "to": "sg-cli",
      "from": "sg-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "sg-report",
      "from": "sg-pass"
    },
    {
      "to": "sg-reply",
      "from": "sg-report"
    },
    {
      "to": "sg-scope",
      "from": "sg-reply"
    },
    {
      "to": "sg-verify",
      "from": "sg-scope"
    }
  ]
};
