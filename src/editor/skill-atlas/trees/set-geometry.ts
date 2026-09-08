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
      "desc": "Sets a theme's shape and spacing: corner radius, padding, gap, and border width, each moved along its scale per component.",
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
      "title": "Write the geometry",
      "desc": "One file of changes, each global or targeted, setting a step or shifting by steps. Each idiom maps to a set of them, and every scale has a floor.",
      "lines": [15, 15],
      "anchor": "Write the ops file to `scratch/geometry-ops.json`.",
      "chips": [
        {
          "label": "Idioms",
          "lines": [44, 69],
          "anchor": "## Idioms",
          "anchorEnd": "Magnitude follows the qualifier. \"Slightly\" or \"a bit\" is 1 "
        },
        {
          "label": "Compact containers before controls",
          "lines": [71, 94],
          "anchor": "## Compact containers before controls",
          "anchorEnd": "] }"
        },
        {
          "label": "Scales",
          "lines": [97, 101],
          "anchor": "## Scales",
          "anchorEnd": "An alias off the subset spends its first step reaching the s"
        },
        {
          "label": "Floors",
          "lines": [103, 109],
          "anchor": "## Floors",
          "anchorEnd": "The floor guards `-padding` only. A 2px gap between an icon "
        }
      ]
    },
    {
      "id": "sg-cli",
      "row": 3,
      "kind": "cli",
      "title": "Run set-geometry",
      "desc": "The command writes a buffer for every component the ops change.",
      "lines": [16, 16],
      "anchor": "Run `npx live-tokens set-geometry scratch/geometry-ops.json`"
    },
    {
      "id": "sg-fail",
      "row": 4,
      "kind": "gate",
      "title": "Correct the geometry",
      "desc": "Exit 1 names the op or the input to fix.",
      "lines": [18, 18],
      "anchor": "When the CLI exits 1, fix the op or the input the message na"
    },
    {
      "id": "sg-reply",
      "row": 5,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Report every alias that moved and any skip worth naming.",
      "lines": [17, 19],
      "anchor": "Read the report. It lists every changed alias, old and new, ",
      "anchorEnd": "Reply with every alias that moved and any skip worth naming."
    },
    {
      "id": "sg-verify",
      "row": 6,
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
      "to": "sg-fail",
      "from": "sg-cli",
      "label": "exit 1"
    },
    {
      "to": "sg-cli",
      "from": "sg-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "sg-input",
      "from": "sg-anchor"
    },
    {
      "to": "sg-cli",
      "from": "sg-input"
    },
    {
      "to": "sg-reply",
      "from": "sg-cli",
      "label": "exit 0"
    },
    {
      "to": "sg-verify",
      "from": "sg-reply"
    }
  ]
};
