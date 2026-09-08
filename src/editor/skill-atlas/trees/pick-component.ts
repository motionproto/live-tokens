import type { SkillTree } from '../types';

export const pickComponent: SkillTree = {
  "id": "live-tokens-pick-component",
  "digest": "sha256:5e4ca458665c95fd",
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
          "lines": [43, 43],
          "anchor": "## On and off"
        },
        {
          "label": "Container family",
          "lines": [55, 55],
          "anchor": "## Container family"
        },
        {
          "label": "Messaging family",
          "lines": [68, 68],
          "anchor": "## Messaging family"
        },
        {
          "label": "Display family",
          "lines": [82, 82],
          "anchor": "## Display family"
        }
      ]
    },
    {
      "id": "pk-act",
      "row": 2,
      "kind": "chipset",
      "title": "Action family",
      "desc": "Does the action need a word, a glyph, or a confirm and cancel pair.",
      "lines": [14, 18],
      "anchor": "## Action family",
      "anchorEnd": "The pair that confirms or cancels an inline edit: `InlineEdi"
    },
    {
      "id": "pk-sel",
      "row": 2,
      "kind": "chipset",
      "title": "Single-selection family",
      "desc": "How many options there are and what does the selection change.",
      "lines": [20, 32],
      "anchor": "## Single-selection family",
      "anchorEnd": "The URL changes: `SideNavigation`. Sections inside one page:"
    },
    {
      "id": "pk-text",
      "row": 2,
      "kind": "chipset",
      "title": "Text entry",
      "desc": "If the options are known, use a list or select. Anything else is an input field.",
      "lines": [34, 41],
      "anchor": "## Text entry",
      "anchorEnd": "A number where the position on a track carries the meaning ("
    },
    {
      "id": "pk-bin",
      "row": 2,
      "kind": "chipset",
      "title": "On and off",
      "desc": "If two states have names of their own use segmented control or radio buttons.",
      "lines": [43, 53],
      "anchor": "## On and off",
      "anchorEnd": "When the two states share the feature's one name, use `Toggl"
    },
    {
      "id": "pk-con",
      "row": 2,
      "kind": "chipset",
      "title": "Container family",
      "desc": "Is the block: an item, a section, collapsed content, or a decision.",
      "lines": [55, 66],
      "anchor": "## Container family",
      "anchorEnd": "A set of items is one `Card` per item. A routine form goes i"
    },
    {
      "id": "pk-msg",
      "row": 2,
      "kind": "chipset",
      "title": "Messaging family",
      "desc": "What is the message about? What triggers it? Is it dismissable?",
      "lines": [68, 80],
      "anchor": "## Messaging family",
      "anchorEnd": "`Badge` and `CornerBadge` differ in position only."
    },
    {
      "id": "pk-disp",
      "row": 2,
      "kind": "chipset",
      "title": "Display family",
      "desc": "Does the user view it, or interact with it?",
      "lines": [82, 90],
      "anchor": "## Display family",
      "anchorEnd": "A titled break between the sections of one page: `SectionDiv"
    },
    {
      "id": "pk-fits",
      "row": 3,
      "kind": "decide",
      "title": "Is there a match in the catalogue",
      "desc": "Use a component from the catalogue if one fits, otherwise build a new one.",
      "lines": [92, 96],
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
          "lines": [94, 94],
          "anchor": "A native element with no chrome of its own needs no componen"
        },
        {
          "label": "nothing in the catalogue fits",
          "lines": [94, 94],
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
      "lines": [96, 96],
      "anchor": "`npx live-tokens components <id>` prints one component's usa"
    },
    {
      "id": "pk-native",
      "row": 4,
      "kind": "step",
      "title": "Use a native element",
      "desc": "An element with no chrome of its own needs no component.",
      "lines": [94, 94],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-make",
      "row": 4,
      "kind": "hand",
      "title": "Create a component",
      "desc": "A piece with chrome that nothing fits becomes a new component.",
      "lines": [94, 94],
      "anchor": "A native element with no chrome of its own needs no componen"
    },
    {
      "id": "pk-page",
      "row": 5,
      "kind": "hand",
      "title": "Return the selected component",
      "desc": "Continue page layout using the result.",
      "lines": [94, 94],
      "anchor": "A native element with no chrome of its own needs no componen"
    }
  ],
  "edges": [
    {
      "to": "pk-fam",
      "from": "pk-trig"
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
