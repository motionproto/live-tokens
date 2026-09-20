import type { SkillTree } from '../types';

export const pickComponent: SkillTree = {
  "id": "live-tokens-pick-component",
  "digest": "sha256:2c4a39712f046d14",
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
      "id": "pk-cli",
      "row": 1,
      "kind": "cli",
      "title": "List the catalogue",
      "desc": "`components --json` lists every component's catalogue entry, shipped and the project's own.",
      "lines": [12, 12],
      "anchor": "Run `npx live-tokens components --json`. The list carries th"
    },
    {
      "id": "pk-read",
      "row": 2,
      "kind": "step",
      "title": "Read the catalogue entries",
      "desc": "Weigh each candidate's whenToUse, whenNotToUse, and constraints against the requirement. Drop a candidate whose whenNotToUse condition is met, following a use into its own entry.",
      "lines": [13, 16],
      "anchor": "Read each plausible candidate's `whenToUse`, `whenNotToUse`,",
      "anchorEnd": "Choose the surviving candidate whose `whenToUse` condition t"
    },
    {
      "id": "pk-fits",
      "row": 3,
      "kind": "decide",
      "title": "Is there a match in the catalogue",
      "desc": "Use a component from the catalogue if one fits, otherwise build a new one.",
      "lines": [19, 23],
      "anchor": "## Nothing fits",
      "anchorEnd": "`npx live-tokens components <id>` prints one component's cat",
      "chips": [
        {
          "label": "shipped component",
          "lines": [12, 12],
          "anchor": "Run `npx live-tokens components --json`. The list carries th"
        },
        {
          "label": "project's own component",
          "lines": [12, 12],
          "anchor": "Run `npx live-tokens components --json`. The list carries th"
        },
        {
          "label": "native element",
          "lines": [21, 21],
          "anchor": "A native element with no chrome of its own needs no componen"
        },
        {
          "label": "nothing in the catalogue fits",
          "lines": [21, 21],
          "anchor": "A native element with no chrome of its own needs no componen"
        }
      ]
    },
    {
      "id": "pk-inspect",
      "row": 4,
      "kind": "cli",
      "title": "Check the component",
      "desc": "See the component's props and usage before placing it.",
      "lines": [23, 23],
      "anchor": "`npx live-tokens components <id>` prints one component's cat"
    },
    {
      "id": "pk-native",
      "row": 4,
      "kind": "step",
      "title": "Use a native element",
      "desc": "An element with no chrome of its own needs no component.",
      "lines": [21, 21],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-make",
      "row": 4,
      "kind": "hand",
      "title": "Create a component",
      "desc": "A piece with chrome that nothing in the catalogue fits goes to live-tokens-create-component.",
      "lines": [21, 21],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-page",
      "row": 5,
      "kind": "hand",
      "title": "Return the selected component",
      "desc": "The named component returns to live-tokens-create-page, which owns size, emphasis, and placement.",
      "lines": [21, 21],
      "anchor": "A native element with no chrome of its own needs no componen"
    }
  ],
  "edges": [
    {
      "to": "pk-cli",
      "from": "pk-trig"
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
      "label": "project's own component"
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
