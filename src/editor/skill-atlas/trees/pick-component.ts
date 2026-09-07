import type { SkillTree } from '../types';

export const pickComponent: SkillTree = {
  "id": "live-tokens-pick-component",
  "digest": "sha256:d6ecf99e668c42f8",
  "title": "pick-component",
  "tagline": "Select a Component from the Registry",
  "nodes": [
    {
      "id": "pk-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Choose a component for a UX need",
      "desc": "Edits no file. For size, emphasis, or placement, read live-tokens-create-page.",
      "lines": [3, 3],
      "anchor": "description: Recommend which shipped @motion-proto/live-toke"
    },
    {
      "id": "pk-cat",
      "row": 1,
      "kind": "step",
      "title": "Run the catalogue",
      "desc": "See every component the project has, shipped and custom.",
      "lines": [10, 12],
      "anchor": "## Catalogue",
      "anchorEnd": "Before choosing, run `npx live-tokens components`. The list ",
      "command": "npx live-tokens components"
    },
    {
      "id": "pk-fam",
      "row": 2,
      "kind": "decide",
      "title": "Component purpose",
      "desc": "Each family names its candidates and one test for choosing between them.",
      "lines": [8, 8],
      "anchor": "When more than one shipped component could fit, find the fam",
      "chips": [
        {
          "label": "Action family",
          "lines": [14, 14],
          "anchor": "## Action family"
        },
        {
          "label": "Single-selection family",
          "lines": [20, 20],
          "anchor": "## Single-selection family"
        },
        {
          "label": "Text entry",
          "lines": [34, 34],
          "anchor": "## Text entry"
        },
        {
          "label": "On and off",
          "lines": [40, 40],
          "anchor": "## On and off"
        },
        {
          "label": "Container family",
          "lines": [52, 52],
          "anchor": "## Container family"
        },
        {
          "label": "Messaging family",
          "lines": [65, 65],
          "anchor": "## Messaging family"
        },
        {
          "label": "Display family",
          "lines": [79, 79],
          "anchor": "## Display family"
        }
      ]
    },
    {
      "id": "pk-act",
      "row": 3,
      "kind": "chipset",
      "title": "Action family",
      "desc": "The test is whether the action needs a word, a glyph, or a confirm and cancel pair.",
      "lines": [14, 18],
      "anchor": "## Action family",
      "anchorEnd": "The pair that confirms or cancels an inline edit: `InlineEdi"
    },
    {
      "id": "pk-sel",
      "row": 3,
      "kind": "chipset",
      "title": "Single-selection family",
      "desc": "The test is how many options there are and what the selection changes.",
      "lines": [20, 32],
      "anchor": "## Single-selection family",
      "anchorEnd": "The URL changes: `SideNavigation`. Sections inside one page:"
    },
    {
      "id": "pk-text",
      "row": 3,
      "kind": "chipset",
      "title": "Text entry",
      "desc": "The test is whether the page can list the answers.",
      "lines": [34, 38],
      "anchor": "## Text entry",
      "anchorEnd": "A number where the position on a track carries the meaning ("
    },
    {
      "id": "pk-bin",
      "row": 3,
      "kind": "chipset",
      "title": "On and off",
      "desc": "The test is whether the two states have names of their own.",
      "lines": [40, 50],
      "anchor": "## On and off",
      "anchorEnd": "When the two states share the feature's one name, use `Toggl"
    },
    {
      "id": "pk-con",
      "row": 3,
      "kind": "chipset",
      "title": "Container family",
      "desc": "The test is what the block is to the reader: an item, a section, content on demand, or a decision.",
      "lines": [52, 63],
      "anchor": "## Container family",
      "anchorEnd": "A set of items is one `Card` per item. A routine form goes i"
    },
    {
      "id": "pk-msg",
      "row": 3,
      "kind": "chipset",
      "title": "Messaging family",
      "desc": "The test is what the message is about, what brings it on, and whether the reader dismisses it.",
      "lines": [65, 77],
      "anchor": "## Messaging family",
      "anchorEnd": "`Badge` and `CornerBadge` differ in position only."
    },
    {
      "id": "pk-disp",
      "row": 3,
      "kind": "chipset",
      "title": "Display family",
      "desc": "The test is what the reader does with it: scan, open, set, run, or move between pages.",
      "lines": [79, 85],
      "anchor": "## Display family",
      "anchorEnd": "A titled break between the sections of one page: `SectionDiv"
    },
    {
      "id": "pk-fits",
      "row": 4,
      "kind": "decide",
      "title": "Catalogue fit",
      "desc": "A component from the catalogue is inspected next. A native element needs none. Anything else with chrome is authored.",
      "lines": [87, 91],
      "anchor": "## Nothing fits",
      "anchorEnd": "`npx live-tokens components <id>` prints one component's usa",
      "chips": [
        {
          "label": "shipped component",
          "lines": [12, 12],
          "anchor": "Before choosing, run `npx live-tokens components`. The list "
        },
        {
          "label": "custom component",
          "lines": [12, 12],
          "anchor": "Before choosing, run `npx live-tokens components`. The list "
        },
        {
          "label": "native element",
          "lines": [89, 89],
          "anchor": "A native element with no chrome of its own needs no componen"
        },
        {
          "label": "nothing in the catalogue fits",
          "lines": [89, 89],
          "anchor": "A native element with no chrome of its own needs no componen"
        }
      ]
    },
    {
      "id": "pk-inspect",
      "row": 5,
      "kind": "cli",
      "title": "Inspect the component contract",
      "desc": "See the component's props and usage before placing it.",
      "lines": [91, 91],
      "anchor": "`npx live-tokens components <id>` prints one component's usa",
      "command": "npx live-tokens components <id> --json"
    },
    {
      "id": "pk-native",
      "row": 5,
      "kind": "step",
      "title": "Use the native element",
      "desc": "An element with no chrome of its own needs no component.",
      "lines": [89, 89],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-make",
      "row": 5,
      "kind": "hand",
      "title": "live-tokens-create-component",
      "desc": "A piece with chrome that nothing fits becomes a new component.",
      "lines": [89, 89],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-page",
      "row": 6,
      "kind": "hand",
      "title": "live-tokens-create-page",
      "desc": "Continue with size, emphasis, and page layout.",
      "lines": [89, 89],
      "anchor": "A native element with no chrome of its own needs no componen"
    }
  ],
  "edges": [
    {
      "to": "pk-cat",
      "from": "pk-trig"
    },
    {
      "to": "pk-fam",
      "from": "pk-cat"
    },
    {
      "to": "pk-act",
      "from": "pk-fam",
      "label": "Action family"
    },
    {
      "to": "pk-sel",
      "from": "pk-fam",
      "label": "Single-selection family"
    },
    {
      "to": "pk-text",
      "from": "pk-fam",
      "label": "Text entry"
    },
    {
      "to": "pk-bin",
      "from": "pk-fam",
      "label": "On and off"
    },
    {
      "to": "pk-con",
      "from": "pk-fam",
      "label": "Container family"
    },
    {
      "to": "pk-msg",
      "from": "pk-fam",
      "label": "Messaging family"
    },
    {
      "to": "pk-disp",
      "from": "pk-fam",
      "label": "Display family"
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
    },
    {
      "to": "pk-fits",
      "from": "pk-act"
    },
    {
      "to": "pk-fits",
      "from": "pk-sel"
    },
    {
      "to": "pk-fits",
      "from": "pk-text"
    },
    {
      "to": "pk-fits",
      "from": "pk-bin"
    },
    {
      "to": "pk-fits",
      "from": "pk-con"
    },
    {
      "to": "pk-fits",
      "from": "pk-msg"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp"
    }
  ]
};
