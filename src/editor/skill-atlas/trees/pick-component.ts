import type { SkillTree } from '../types';

export const pickComponent: SkillTree = {
  "id": "live-tokens-pick-component",
  "digest": "sha256:2ee3e0d779e81f0b",
  "title": "pick-component",
  "tagline": "Select a component from the catalogue",
  "nodes": [
    {
      "id": "pk-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Check the catalogue",
      "desc": "Recommends the shipped component that fits a UX need. The catalogue lists every registered component, shipped and custom, with its usage.",
      "lines": [3, 3],
      "anchor": "description: Recommend which shipped @motion-proto/live-toke"
    },
    {
      "id": "pk-fam",
      "row": 1,
      "kind": "decide",
      "title": "Component purpose",
      "desc": "Each family names its candidates and helps select one.",
      "lines": [8, 8],
      "anchor": "When more than one shipped component could fit, find the fam",
      "chips": [
        {
          "label": "Action family",
          "lines": [17, 17],
          "anchor": "## Action family"
        },
        {
          "label": "Single-selection family",
          "lines": [23, 23],
          "anchor": "## Single-selection family"
        },
        {
          "label": "Text entry",
          "lines": [29, 29],
          "anchor": "## Text entry"
        },
        {
          "label": "On and off",
          "lines": [35, 35],
          "anchor": "## On and off"
        },
        {
          "label": "Container family",
          "lines": [41, 41],
          "anchor": "## Container family"
        },
        {
          "label": "Messaging family",
          "lines": [47, 47],
          "anchor": "## Messaging family"
        },
        {
          "label": "Display family",
          "lines": [53, 53],
          "anchor": "## Display family"
        }
      ]
    },
    {
      "id": "pk-cli",
      "row": 2,
      "kind": "cli",
      "title": "Run the family's command",
      "desc": "`components --family <name> --json` lists that family's candidates. Weigh a custom component the same way.",
      "lines": [13, 13],
      "anchor": "Run that family's command. Weigh a custom component by the s"
    },
    {
      "id": "pk-read",
      "row": 3,
      "kind": "step",
      "title": "Read the catalogue entries",
      "desc": "Weigh each candidate's useFor, alternatives, and constraints against the requirement.",
      "lines": [14, 15],
      "anchor": "Read each candidate's `useFor`, `alternatives`, and `constra",
      "anchorEnd": "Choose the candidate whose condition the requirement meets. "
    },
    {
      "id": "pk-fits",
      "row": 4,
      "kind": "decide",
      "title": "Is there a match in the catalogue",
      "desc": "Use a component from the catalogue if one fits, otherwise build a new one.",
      "lines": [59, 63],
      "anchor": "## Nothing fits",
      "anchorEnd": "`npx live-tokens components <id>` prints one component's cat",
      "chips": [
        {
          "label": "shipped component",
          "lines": [13, 13],
          "anchor": "Run that family's command. Weigh a custom component by the s"
        },
        {
          "label": "custom component",
          "lines": [13, 13],
          "anchor": "Run that family's command. Weigh a custom component by the s"
        },
        {
          "label": "native element",
          "lines": [61, 61],
          "anchor": "A native element with no chrome of its own needs no componen"
        },
        {
          "label": "nothing in the catalogue fits",
          "lines": [61, 61],
          "anchor": "A native element with no chrome of its own needs no componen"
        }
      ]
    },
    {
      "id": "pk-inspect",
      "row": 5,
      "kind": "cli",
      "title": "Check the component",
      "desc": "See the component's props and usage before placing it.",
      "lines": [63, 63],
      "anchor": "`npx live-tokens components <id>` prints one component's cat"
    },
    {
      "id": "pk-native",
      "row": 5,
      "kind": "step",
      "title": "Use a native element",
      "desc": "An element with no chrome of its own needs no component.",
      "lines": [61, 61],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-make",
      "row": 5,
      "kind": "hand",
      "title": "Create a component",
      "desc": "A piece with chrome that nothing in the catalogue fits goes to live-tokens-create-component.",
      "lines": [61, 61],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-page",
      "row": 6,
      "kind": "hand",
      "title": "Return the selected component",
      "desc": "The named component returns to live-tokens-create-page, which owns size, emphasis, and placement.",
      "lines": [61, 61],
      "anchor": "A native element with no chrome of its own needs no componen"
    }
  ],
  "edges": [
    {
      "to": "pk-fam",
      "from": "pk-trig"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "Action family"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "Single-selection family"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "Text entry"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "On and off"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "Container family"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "Messaging family"
    },
    {
      "to": "pk-cli",
      "from": "pk-fam",
      "label": "Display family"
    },
    {
      "to": "pk-read",
      "from": "pk-cli"
    },
    {
      "to": "pk-fits",
      "from": "pk-read"
    },
    {
      "to": "pk-inspect",
      "from": "pk-fits",
      "label": "shipped component"
    },
    {
      "to": "pk-inspect",
      "from": "pk-fits",
      "label": "custom component"
    },
    {
      "to": "pk-native",
      "from": "pk-fits",
      "label": "native element"
    },
    {
      "to": "pk-make",
      "from": "pk-fits",
      "label": "nothing in the catalogue fits"
    },
    {
      "to": "pk-page",
      "from": "pk-inspect"
    },
    {
      "to": "pk-page",
      "from": "pk-native"
    }
  ]
};
