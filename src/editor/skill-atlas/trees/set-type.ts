import type { SkillTree } from '../types';

export const setType: SkillTree = {
  "id": "live-tokens-set-type",
  "digest": "sha256:0c8d26a16313f9ee",
  "title": "set-type",
  "tagline": "Set Typefaces from Google Fonts",
  "nodes": [
    {
      "id": "st-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Choose or pair font families",
      "desc": "Changes type only. For a request that also names color or geometry, read live-tokens-create-theme.",
      "lines": [3, 3],
      "anchor": "description: Set a live-tokens theme's type: a Google Fonts "
    },
    {
      "id": "st-anchor",
      "row": 1,
      "kind": "ref",
      "title": "Read the type anchor",
      "desc": "An anchor's entry overrides the Voice table.",
      "lines": [14, 14],
      "anchor": "Read the type intent and any anchor live-tokens-create-theme",
      "reference": "references/type-anchors.md"
    },
    {
      "id": "st-input",
      "row": 2,
      "kind": "step",
      "title": "Write the input file",
      "desc": "A display family and a body family go in one file.",
      "lines": [15, 15],
      "anchor": "Choose the pairing and write it to `scratch/font-pairing.jso"
    },
    {
      "id": "st-body",
      "row": 3,
      "kind": "step",
      "title": "Choose the body face first",
      "desc": "The body face carries most of the words, so choose it first and the display face against it.",
      "lines": [30, 34],
      "anchor": "## Choose the body face first",
      "anchorEnd": "The shipped text styles ask the display face for 600 and the"
    },
    {
      "id": "st-matrix",
      "row": 4,
      "kind": "chipset",
      "title": "Compare font construction",
      "desc": "Classify each candidate by construction, so the pair contrasts on purpose.",
      "lines": [36, 50],
      "anchor": "## The font matrix",
      "anchorEnd": "Many faces sit between columns. When one straddles, say so a"
    },
    {
      "id": "st-voice",
      "row": 5,
      "kind": "chipset",
      "title": "Match the type voice",
      "desc": "Each voice maps to a display and a body construction.",
      "lines": [52, 66],
      "anchor": "## Voice",
      "anchorEnd": "Match the type to the design direction the color came from. "
    },
    {
      "id": "st-shortcuts",
      "row": 6,
      "kind": "step",
      "title": "Choose a quiet pairing",
      "desc": "A superfamily or one family across weights keeps the type quiet.",
      "lines": [68, 75],
      "anchor": "## Shortcuts",
      "anchorEnd": "**Serif display over sans body** when nothing else decides i"
    },
    {
      "id": "st-risks",
      "row": 7,
      "kind": "step",
      "title": "Check the pairing",
      "desc": "Check x-height parity, small sizes, the download count, and no shared face across themes.",
      "lines": [77, 82],
      "anchor": "## Watch for",
      "anchorEnd": "**Sets of themes.** No two share a display face or a body fa"
    },
    {
      "id": "st-cli",
      "row": 8,
      "kind": "cli",
      "title": "Run set-type",
      "desc": "The command verifies each family on Google Fonts and reports missing weights.",
      "lines": [16, 16],
      "anchor": "Run `npx live-tokens set-type scratch/font-pairing.json`. It",
      "command": "npx live-tokens set-type scratch/font-pairing.json"
    },
    {
      "id": "st-fail",
      "row": 9,
      "kind": "gate",
      "title": "Correct the input file",
      "desc": "A family not on Google Fonts fails the run. Fix the file and run again.",
      "lines": [17, 17],
      "anchor": "Read the report. Name a missing weight and offer an alternat"
    },
    {
      "id": "st-pass",
      "row": 9,
      "kind": "ok",
      "title": "Command passes",
      "desc": "Both families resolve.",
      "lines": [17, 17],
      "anchor": "Read the report. Name a missing weight and offer an alternat"
    },
    {
      "id": "st-report",
      "row": 11,
      "kind": "step",
      "title": "Read the report",
      "desc": "A missing weight matters only for the body face: 400, 700, or italic.",
      "lines": [17, 17],
      "anchor": "Read the report. Name a missing weight and offer an alternat"
    },
    {
      "id": "st-reply",
      "row": 12,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Report the two families, their construction, and any missing weight.",
      "lines": [18, 18],
      "anchor": "Reply with the two families, the form model behind each, the"
    },
    {
      "id": "st-scope",
      "row": 13,
      "kind": "step",
      "title": "Preserve the other dimensions",
      "desc": "Only the fonts change. Color, shape, and the type scale carry forward.",
      "lines": [84, 86],
      "anchor": "## Scope",
      "anchorEnd": "Type only. Color, component aliases, shape, and the type sca"
    },
    {
      "id": "st-verify",
      "row": 14,
      "kind": "done",
      "title": "Verify the type",
      "desc": "The CLI passes, each URL matches the family's weights, and the app shows the new type.",
      "lines": [88, 93],
      "anchor": "## Verify",
      "anchorEnd": "To revert, run the previous pairing file, or load the open t"
    }
  ],
  "edges": [
    {
      "to": "st-anchor",
      "from": "st-trig"
    },
    {
      "to": "st-input",
      "from": "st-anchor"
    },
    {
      "to": "st-body",
      "from": "st-input"
    },
    {
      "to": "st-matrix",
      "from": "st-body"
    },
    {
      "to": "st-voice",
      "from": "st-matrix"
    },
    {
      "to": "st-shortcuts",
      "from": "st-voice"
    },
    {
      "to": "st-risks",
      "from": "st-shortcuts"
    },
    {
      "to": "st-cli",
      "from": "st-risks"
    },
    {
      "to": "st-fail",
      "from": "st-cli",
      "label": "exit 1"
    },
    {
      "to": "st-pass",
      "from": "st-cli",
      "label": "exit 0"
    },
    {
      "to": "st-cli",
      "from": "st-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "st-report",
      "from": "st-pass"
    },
    {
      "to": "st-reply",
      "from": "st-report"
    },
    {
      "to": "st-scope",
      "from": "st-reply"
    },
    {
      "to": "st-verify",
      "from": "st-scope"
    }
  ]
};
