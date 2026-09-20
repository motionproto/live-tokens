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
      "title": "Pick a component",
      "desc": "Recommends the component that fits a UX need, from the shipped components and the project's own.",
      "lines": [3, 3],
      "anchor": "description: Recommend which shipped @motion-proto/live-toke"
    },
    {
      "id": "pk-cli",
      "row": 1,
      "kind": "cli",
      "title": "List the catalogue",
      "desc": "`components --json` returns every component's catalogue entry.",
      "lines": [12, 12],
      "anchor": "Run `npx live-tokens components --json`. The list carries th"
    },
    {
      "id": "pk-read",
      "row": 2,
      "kind": "step",
      "title": "Read the candidates' entries",
      "desc": "whenToUse is the condition that makes a component right. whenNotToUse lists the conditions that rule it out. constraints are its rules of use.",
      "lines": [13, 13],
      "anchor": "Read each plausible candidate's `whenToUse`, `whenNotToUse`,"
    },
    {
      "id": "pk-drop",
      "row": 3,
      "kind": "decide",
      "title": "Drop what the requirement rules out",
      "desc": "A candidate goes when one of its whenNotToUse conditions matches the requirement. A row that names a use points at the component to weigh next.",
      "lines": [14, 15],
      "anchor": "Drop a candidate whose `whenNotToUse` names a condition the ",
      "anchorEnd": "When a dropped row names a `use`, weigh that component the s",
      "chips": [
        {
          "label": "a dropped row names a use",
          "lines": [15, 15],
          "anchor": "When a dropped row names a `use`, weigh that component the s"
        },
        {
          "label": "surviving candidate",
          "lines": [16, 16],
          "anchor": "Choose the surviving candidate whose `whenToUse` condition t"
        }
      ]
    },
    {
      "id": "pk-fits",
      "row": 4,
      "kind": "decide",
      "title": "Choose the candidate that fits",
      "desc": "The survivor whose whenToUse matches the requirement is the answer. With no survivor, the piece is a native element or a new component.",
      "lines": [16, 17],
      "anchor": "Choose the surviving candidate whose `whenToUse` condition t",
      "anchorEnd": "When no candidate fits, follow \"Nothing fits\".",
      "chips": [
        {
          "label": "whenToUse condition the requirement meets",
          "lines": [16, 16],
          "anchor": "Choose the surviving candidate whose `whenToUse` condition t"
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
      "row": 5,
      "kind": "cli",
      "title": "Check the component",
      "desc": "`components <id>` prints the chosen component's props and the values each accepts.",
      "lines": [23, 23],
      "anchor": "`npx live-tokens components <id>` prints one component's cat"
    },
    {
      "id": "pk-native",
      "row": 5,
      "kind": "step",
      "title": "Use a native element",
      "desc": "An element with no chrome of its own needs no component.",
      "lines": [21, 21],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-make",
      "row": 5,
      "kind": "hand",
      "title": "Create a component",
      "desc": "A piece with chrome that nothing in the catalogue fits goes to live-tokens-create-component.",
      "lines": [21, 21],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-page",
      "row": 6,
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
      "to": "pk-drop",
      "from": "pk-read"
    },
    {
      "to": "pk-read",
      "from": "pk-drop",
      "label": "a dropped row names a use",
      "back": true
    },
    {
      "to": "pk-fits",
      "from": "pk-drop",
      "label": "surviving candidate"
    },
    {
      "to": "pk-inspect",
      "from": "pk-fits",
      "label": "whenToUse condition the requirement meets"
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
