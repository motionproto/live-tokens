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
      "desc": "Sets a theme's fonts: a Google Fonts pairing for the display and body stacks, verified for the weights the text styles need.",
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
      "title": "Write the font pairing",
      "desc": "A display family and a body family in one file. The body face comes first, and the display face contrasts with it and matches the voice.",
      "lines": [15, 15],
      "anchor": "Choose the pairing and write it to `scratch/font-pairing.jso",
      "chips": [
        {
          "label": "Choose the body face first",
          "lines": [30, 34],
          "anchor": "## Choose the body face first",
          "anchorEnd": "The shipped text styles ask the display face for 600 and the"
        },
        {
          "label": "The font matrix",
          "lines": [36, 50],
          "anchor": "## The font matrix",
          "anchorEnd": "Many faces sit between columns. When one straddles, say so a"
        },
        {
          "label": "Voice",
          "lines": [52, 66],
          "anchor": "## Voice",
          "anchorEnd": "Match the type to the design direction the color came from. "
        },
        {
          "label": "Shortcuts",
          "lines": [68, 75],
          "anchor": "## Shortcuts",
          "anchorEnd": "**Serif display over sans body** when nothing else decides i"
        },
        {
          "label": "Watch for",
          "lines": [77, 82],
          "anchor": "## Watch for",
          "anchorEnd": "**Sets of themes.** No two share a display face or a body fa"
        }
      ]
    },
    {
      "id": "st-cli",
      "row": 3,
      "kind": "cli",
      "title": "Run set-type",
      "desc": "The command verifies each family on Google Fonts and reports missing weights.",
      "lines": [16, 16],
      "anchor": "Run `npx live-tokens set-type scratch/font-pairing.json`. It"
    },
    {
      "id": "st-fail",
      "row": 4,
      "kind": "gate",
      "title": "Correct the font pairing",
      "desc": "A family not on Google Fonts fails the run. Fix the file and run again.",
      "lines": [17, 17],
      "anchor": "Read the report. Name a missing weight and offer an alternat"
    },
    {
      "id": "st-reply",
      "row": 5,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Report the two families, their construction, and any missing weight.",
      "lines": [17, 18],
      "anchor": "Read the report. Name a missing weight and offer an alternat",
      "anchorEnd": "Reply with the two families, the form model behind each, the"
    },
    {
      "id": "st-verify",
      "row": 6,
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
      "to": "st-fail",
      "from": "st-cli",
      "label": "exit 1"
    },
    {
      "to": "st-cli",
      "from": "st-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "st-input",
      "from": "st-anchor"
    },
    {
      "to": "st-cli",
      "from": "st-input"
    },
    {
      "to": "st-reply",
      "from": "st-cli",
      "label": "exit 0"
    },
    {
      "to": "st-verify",
      "from": "st-reply"
    }
  ]
};
