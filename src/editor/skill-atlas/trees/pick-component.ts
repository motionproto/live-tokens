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
      "kind": "ask",
      "title": "Action family",
      "desc": "The test is whether the action needs a word, a glyph, or a confirm and cancel pair.",
      "lines": [14, 18],
      "anchor": "## Action family",
      "anchorEnd": "The pair that confirms or cancels an inline edit: `InlineEdi",
      "chips": [
        {
          "label": "Button",
          "lines": [16, 16],
          "anchor": "The action needs a word to be unambiguous: `Button`."
        },
        {
          "label": "IconButton",
          "lines": [17, 17],
          "anchor": "The glyph alone is plain (close, edit, delete) and space is "
        },
        {
          "label": "InlineEditActions",
          "lines": [18, 18],
          "anchor": "The pair that confirms or cancels an inline edit: `InlineEdi"
        }
      ]
    },
    {
      "id": "pk-sel",
      "row": 3,
      "kind": "ask",
      "title": "Single-selection family",
      "desc": "The test is how many options there are and what the selection changes.",
      "lines": [20, 32],
      "anchor": "## Single-selection family",
      "anchorEnd": "The URL changes: `SideNavigation`. Sections inside one page:",
      "chips": [
        {
          "label": "SegmentedControl",
          "lines": [26, 26],
          "anchor": "| `SegmentedControl` | An inline switch between views of the"
        },
        {
          "label": "TabBar",
          "lines": [27, 27],
          "anchor": "| `TabBar` | The content area below swaps. | 2 to 7 |"
        },
        {
          "label": "RadioButton",
          "lines": [28, 28],
          "anchor": "| `RadioButton` | The reader reads every option as text insi"
        },
        {
          "label": "MenuSelect",
          "lines": [29, 29],
          "anchor": "| `MenuSelect` | The options would overflow a row. | any |"
        },
        {
          "label": "SideNavigation",
          "lines": [32, 32],
          "anchor": "The URL changes: `SideNavigation`. Sections inside one page:"
        }
      ]
    },
    {
      "id": "pk-text",
      "row": 3,
      "kind": "ask",
      "title": "Text entry",
      "desc": "The test is whether the page can list the answers.",
      "lines": [34, 38],
      "anchor": "## Text entry",
      "anchorEnd": "A number where the position on a track carries the meaning (",
      "chips": [
        {
          "label": "Input",
          "lines": [36, 36],
          "anchor": "The page cannot list the answers (a name, an amount, a searc"
        },
        {
          "label": "Single-selection family",
          "lines": [37, 37],
          "anchor": "The page can list the answers: the single-selection family."
        },
        {
          "label": "Slider",
          "lines": [38, 38],
          "anchor": "A number where the position on a track carries the meaning ("
        }
      ]
    },
    {
      "id": "pk-bin",
      "row": 3,
      "kind": "ask",
      "title": "On and off",
      "desc": "The test is whether the two states have names of their own.",
      "lines": [40, 50],
      "anchor": "## On and off",
      "anchorEnd": "When the two states share the feature's one name, use `Toggl",
      "chips": [
        {
          "label": "Toggle",
          "lines": [46, 46],
          "anchor": "| `Toggle` | A setting that takes effect at once. The label "
        },
        {
          "label": "SegmentedControl",
          "lines": [47, 47],
          "anchor": "| `SegmentedControl` | Two named alternatives the reader com"
        },
        {
          "label": "RadioButton pair",
          "lines": [48, 48],
          "anchor": "| `RadioButton` pair | A yes or no the reader answers inside"
        }
      ]
    },
    {
      "id": "pk-con",
      "row": 3,
      "kind": "ask",
      "title": "Container family",
      "desc": "The test is what the block is to the reader: an item, a section, content on demand, or a decision.",
      "lines": [52, 63],
      "anchor": "## Container family",
      "anchorEnd": "A set of items is one `Card` per item. A routine form goes i",
      "chips": [
        {
          "label": "Card",
          "lines": [58, 58],
          "anchor": "| `Card` | Inline, always open | One item, or each item in a"
        },
        {
          "label": "Panel",
          "lines": [59, 59],
          "anchor": "| `Panel` | Inline, always open | One section of the page's "
        },
        {
          "label": "CollapsibleSection",
          "lines": [60, 60],
          "anchor": "| `CollapsibleSection` | Inline, opened on demand | Secondar"
        },
        {
          "label": "Dialog",
          "lines": [61, 61],
          "anchor": "| `Dialog` | Modal, blocks the page | A decision the page ca"
        }
      ]
    },
    {
      "id": "pk-msg",
      "row": 3,
      "kind": "ask",
      "title": "Messaging family",
      "desc": "The test is what the message is about, what brings it on, and whether the reader dismisses it.",
      "lines": [65, 77],
      "anchor": "## Messaging family",
      "anchorEnd": "`Badge` and `CornerBadge` differ in position only.",
      "chips": [
        {
          "label": "Callout",
          "lines": [71, 71],
          "anchor": "| `Callout` | A section | Always present | No | Something th"
        },
        {
          "label": "Notification",
          "lines": [72, 72],
          "anchor": "| `Notification` | The system | An action or event | Yes | F"
        },
        {
          "label": "Tooltip",
          "lines": [73, 73],
          "anchor": "| `Tooltip` | An element | Hover or focus | On leave | A def"
        },
        {
          "label": "Badge",
          "lines": [74, 74],
          "anchor": "| `Badge` | An element | Always present | No | A standing la"
        },
        {
          "label": "CornerBadge",
          "lines": [75, 75],
          "anchor": "| `CornerBadge` | A parent's corner | Always present | No | "
        }
      ]
    },
    {
      "id": "pk-disp",
      "row": 3,
      "kind": "ask",
      "title": "Display family",
      "desc": "The test is what the reader does with it: scan, open, set, run, or move between pages.",
      "lines": [79, 85],
      "anchor": "## Display family",
      "anchorEnd": "A titled break between the sections of one page: `SectionDiv",
      "chips": [
        {
          "label": "Image",
          "lines": [81, 81],
          "anchor": "A picture the page shows: `Image`. A picture whose detail th"
        },
        {
          "label": "ImageLightbox",
          "lines": [81, 81],
          "anchor": "A picture the page shows: `Image`. A picture whose detail th"
        },
        {
          "label": "Table",
          "lines": [82, 82],
          "anchor": "Records the reader scans and compares: `Table`. A set of ite"
        },
        {
          "label": "Card",
          "lines": [82, 82],
          "anchor": "Records the reader scans and compares: `Table`. A set of ite"
        },
        {
          "label": "ProgressBar",
          "lines": [83, 83],
          "anchor": "A read-out of progress: `ProgressBar`. A number the reader s"
        },
        {
          "label": "Slider",
          "lines": [83, 83],
          "anchor": "A read-out of progress: `ProgressBar`. A number the reader s"
        },
        {
          "label": "CodeSnippet",
          "lines": [84, 84],
          "anchor": "Text the reader runs or pastes (an install command, a key, a"
        },
        {
          "label": "prose",
          "lines": [84, 84],
          "anchor": "Text the reader runs or pastes (an install command, a key, a"
        },
        {
          "label": "SectionDivider",
          "lines": [85, 85],
          "anchor": "A titled break between the sections of one page: `SectionDiv"
        },
        {
          "label": "SideNavigation",
          "lines": [85, 85],
          "anchor": "A titled break between the sections of one page: `SectionDiv"
        }
      ]
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
      "to": "pk-fits",
      "from": "pk-act",
      "label": "Button"
    },
    {
      "to": "pk-fits",
      "from": "pk-act",
      "label": "IconButton"
    },
    {
      "to": "pk-fits",
      "from": "pk-act",
      "label": "InlineEditActions"
    },
    {
      "to": "pk-sel",
      "from": "pk-fam",
      "label": "Single-selection family"
    },
    {
      "to": "pk-fits",
      "from": "pk-sel",
      "label": "SegmentedControl"
    },
    {
      "to": "pk-fits",
      "from": "pk-sel",
      "label": "TabBar"
    },
    {
      "to": "pk-fits",
      "from": "pk-sel",
      "label": "RadioButton"
    },
    {
      "to": "pk-fits",
      "from": "pk-sel",
      "label": "MenuSelect"
    },
    {
      "to": "pk-fits",
      "from": "pk-sel",
      "label": "SideNavigation"
    },
    {
      "to": "pk-text",
      "from": "pk-fam",
      "label": "Text entry"
    },
    {
      "to": "pk-fits",
      "from": "pk-text",
      "label": "Input"
    },
    {
      "to": "pk-fits",
      "from": "pk-text",
      "label": "Single-selection family"
    },
    {
      "to": "pk-fits",
      "from": "pk-text",
      "label": "Slider"
    },
    {
      "to": "pk-bin",
      "from": "pk-fam",
      "label": "On and off"
    },
    {
      "to": "pk-fits",
      "from": "pk-bin",
      "label": "Toggle"
    },
    {
      "to": "pk-fits",
      "from": "pk-bin",
      "label": "SegmentedControl"
    },
    {
      "to": "pk-fits",
      "from": "pk-bin",
      "label": "RadioButton pair"
    },
    {
      "to": "pk-con",
      "from": "pk-fam",
      "label": "Container family"
    },
    {
      "to": "pk-fits",
      "from": "pk-con",
      "label": "Card"
    },
    {
      "to": "pk-fits",
      "from": "pk-con",
      "label": "Panel"
    },
    {
      "to": "pk-fits",
      "from": "pk-con",
      "label": "CollapsibleSection"
    },
    {
      "to": "pk-fits",
      "from": "pk-con",
      "label": "Dialog"
    },
    {
      "to": "pk-msg",
      "from": "pk-fam",
      "label": "Messaging family"
    },
    {
      "to": "pk-fits",
      "from": "pk-msg",
      "label": "Callout"
    },
    {
      "to": "pk-fits",
      "from": "pk-msg",
      "label": "Notification"
    },
    {
      "to": "pk-fits",
      "from": "pk-msg",
      "label": "Tooltip"
    },
    {
      "to": "pk-fits",
      "from": "pk-msg",
      "label": "Badge"
    },
    {
      "to": "pk-fits",
      "from": "pk-msg",
      "label": "CornerBadge"
    },
    {
      "to": "pk-disp",
      "from": "pk-fam",
      "label": "Display family"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "Image"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "ImageLightbox"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "Table"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "Card"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "ProgressBar"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "Slider"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "CodeSnippet"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "prose"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "SectionDivider"
    },
    {
      "to": "pk-fits",
      "from": "pk-disp",
      "label": "SideNavigation"
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
