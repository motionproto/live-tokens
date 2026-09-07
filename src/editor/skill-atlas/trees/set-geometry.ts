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
      "desc": "An anchor's entry overrides the idiom table.",
      "lines": [14, 14],
      "anchor": "Read the geometry intent and the anchor, when live-tokens-cr",
      "reference": "references/geometry-anchors.md"
    },
    {
      "id": "sg-input",
      "row": 2,
      "kind": "step",
      "title": "Write the input file",
      "desc": "Each op is global or targeted, and sets a step or shifts by steps.",
      "lines": [15, 15],
      "anchor": "Write the ops file to `scratch/geometry-ops.json`."
    },
    {
      "id": "sg-idioms",
      "row": 3,
      "kind": "chipset",
      "title": "Translate geometry intent",
      "desc": "Each idiom maps to ops on radius, padding, gap, or border width.",
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
      "desc": "A step costs a control more than a container. Spend extra steps on the containers by name.",
      "lines": [71, 94],
      "anchor": "## Compact containers before controls",
      "anchorEnd": "] }"
    },
    {
      "id": "sg-scales",
      "row": 5,
      "kind": "step",
      "title": "Apply scales and floors",
      "desc": "Radius and space move along fixed scales, and a control's padding has a floor.",
      "lines": [97, 109],
      "anchor": "## Scales",
      "anchorEnd": "The floor guards `-padding` only. A 2px gap between an icon "
    },
    {
      "id": "sg-cli",
      "row": 6,
      "kind": "cli",
      "title": "Run set-geometry",
      "desc": "The command writes a buffer for every component the ops change.",
      "lines": [16, 16],
      "anchor": "Run `npx live-tokens set-geometry scratch/geometry-ops.json`",
      "command": "npx live-tokens set-geometry scratch/geometry-ops.json"
    },
    {
      "id": "sg-fail",
      "row": 7,
      "kind": "gate",
      "title": "Correct the input file",
      "desc": "Exit 1 names the op or the input to fix.",
      "lines": [18, 18],
      "anchor": "When the CLI exits 1, fix the op or the input the message na"
    },
    {
      "id": "sg-pass",
      "row": 7,
      "kind": "ok",
      "title": "Command passes",
      "desc": "Every op applied, or was skipped with a reason.",
      "lines": [17, 17],
      "anchor": "Read the report. It lists every changed alias, old and new, "
    },
    {
      "id": "sg-report",
      "row": 9,
      "kind": "step",
      "title": "Read the report",
      "desc": "The report lists every alias that moved and every skip with its reason.",
      "lines": [17, 17],
      "anchor": "Read the report. It lists every changed alias, old and new, "
    },
    {
      "id": "sg-reply",
      "row": 10,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Report every alias that moved and any skip worth naming.",
      "lines": [19, 19],
      "anchor": "Reply with every alias that moved and any skip worth naming."
    },
    {
      "id": "sg-scope",
      "row": 11,
      "kind": "step",
      "title": "Preserve the other dimensions",
      "desc": "Only geometry changes. Color, type, and saved themes carry forward.",
      "lines": [111, 113],
      "anchor": "## Scope",
      "anchorEnd": "Geometry only. Color, type, saved themes, and `tokens.css` a"
    },
    {
      "id": "sg-verify",
      "row": 12,
      "kind": "done",
      "title": "Verify the geometry",
      "desc": "The app shows the new shape and buttons still read as buttons.",
      "lines": [115, 121],
      "anchor": "## Verify",
      "anchorEnd": "To revert, run the inverse ops, or load the open theme to di"
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
