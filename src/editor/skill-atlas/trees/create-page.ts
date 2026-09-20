import type { SkillTree } from '../types';

export const createPage: SkillTree = {
  "id": "live-tokens-create-page",
  "digest": "sha256:e9eafa612a3b863b",
  "title": "create-page",
  "tagline": "Create a Page Using Live Tokens",
  "nodes": [
    {
      "id": "cp-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create a page",
      "desc": "Builds a page from the shipped components at their defaults and the theme's text styles.",
      "lines": [3, 3],
      "anchor": "description: Create a page in a @motion-proto/live-tokens pr"
    },
    {
      "id": "cp-project",
      "row": 1,
      "kind": "step",
      "title": "Read the project",
      "desc": "The existing pages and where they live, how App.svelte wires routes, the column count in tokens.css, and the catalogue.",
      "lines": [12, 12],
      "anchor": "Read the project first: the existing pages and where they li"
    },
    {
      "id": "cp-layout",
      "row": 2,
      "kind": "chipset",
      "title": "Lay out the sections",
      "desc": "Name each section by its purpose, then take its column spans from the layout that matches how the reader moves through the page.",
      "lines": [13, 13],
      "anchor": "Read the page top to bottom and name each section by its pur",
      "chips": [
        {
          "label": "Stacked sections",
          "lines": [31, 31],
          "anchor": "| Stacked sections | The reader moves top to bottom: an open"
        },
        {
          "label": "Main with a supporting pane",
          "lines": [32, 32],
          "anchor": "| Main with a supporting pane | One region is the work and t"
        },
        {
          "label": "List with detail",
          "lines": [33, 33],
          "anchor": "| List with detail | The reader picks an item from a list an"
        },
        {
          "label": "Grid of equals",
          "lines": [34, 34],
          "anchor": "| Grid of equals | The reader compares or scans items of one"
        },
        {
          "label": "Single column",
          "lines": [35, 35],
          "anchor": "| Single column | The reader fills a form or reads at length"
        }
      ]
    },
    {
      "id": "cp-grid",
      "row": 3,
      "kind": "chipset",
      "title": "Place the sections on the grid",
      "desc": "The page is a grid of the theme's column count. Each section spans it, then repeats its columns so children line up with the page. Separate with space first, then a hairline, then a surface.",
      "lines": [14, 14],
      "anchor": "Build the page grid and place each section on it. Separate t",
      "chips": [
        {
          "label": "Grid",
          "lines": [39, 52],
          "anchor": "### Grid",
          "anchorEnd": "No scaffold collapses the page grid on a phone: the theme's "
        },
        {
          "label": "Separation",
          "lines": [54, 71],
          "anchor": "### Separation",
          "anchorEnd": "`references/layout-sources.md` names the sources for these l"
        }
      ]
    },
    {
      "id": "cp-containers",
      "row": 4,
      "kind": "chipset",
      "title": "Choose containers by purpose",
      "desc": "Panel is a stage, Card is titled content; a component's own constraints come from the components command.",
      "lines": [15, 15],
      "anchor": "Give each section its container. `npx live-tokens components",
      "chips": [
        {
          "label": "Stage",
          "lines": [81, 81],
          "anchor": "An empty stage shows a heading that names the condition and "
        },
        {
          "label": "Card",
          "lines": [82, 82],
          "anchor": "A container in a tool UI labels itself: `Card variant=\"bare\""
        },
        {
          "label": "Form",
          "lines": [83, 83],
          "anchor": "A row of fields is a flex row with `gap: var(--space-20)`; e"
        },
        {
          "label": "Buttons",
          "lines": [84, 84],
          "anchor": "A toolbar is a flex row of Buttons on the section's bottom e"
        },
        {
          "label": "Picker",
          "lines": [85, 85],
          "anchor": "For a `MenuSelect` picker, toggle it from a Button with a tr"
        }
      ]
    },
    {
      "id": "cp-component",
      "row": 5,
      "kind": "chipset",
      "title": "Match a component to each need",
      "desc": "Use a shipped component when one fits, and pass only the props it declares. When two could fit, pick-component chooses. When nothing in the catalogue fits, create-component builds it. A native element with no chrome needs no component.",
      "lines": [16, 16],
      "anchor": "Match a shipped component to each need. When two could fit, ",
      "chips": [
        {
          "label": "Components",
          "lines": [73, 80],
          "anchor": "## Components",
          "anchorEnd": "Text inside a `Card` or a `CollapsibleSection` takes the con"
        },
        {
          "label": "pick-component",
          "lines": [16, 16],
          "anchor": "Match a shipped component to each need. When two could fit, "
        },
        {
          "label": "create-component",
          "lines": [16, 16],
          "anchor": "Match a shipped component to each need. When two could fit, "
        }
      ]
    },
    {
      "id": "cp-hierarchy",
      "row": 6,
      "kind": "chipset",
      "title": "Set the tokens and the hierarchy",
      "desc": "Page CSS takes a token wherever one exists. One text style per element, the shipped size on every control, one primary Button per page, and one space step per position.",
      "lines": [17, 18],
      "anchor": "Write the page CSS in design tokens.",
      "anchorEnd": "Set the hierarchy: one text style per element, the shipped s",
      "chips": [
        {
          "label": "Tokens",
          "lines": [96, 101],
          "anchor": "## Tokens",
          "anchorEnd": "A value that comes from data, such as a sheet's padding in p"
        },
        {
          "label": "Type",
          "lines": [105, 120],
          "anchor": "### Type",
          "anchorEnd": "Use the semantic element for each place: one `h1`, an `h2` f"
        },
        {
          "label": "Size and emphasis",
          "lines": [122, 130],
          "anchor": "### Size",
          "anchorEnd": "In a row of actions the primary sits last, on the right. Up "
        },
        {
          "label": "Spacing",
          "lines": [132, 146],
          "anchor": "### Spacing",
          "anchorEnd": "Every section after the first opens with a hairline: `paddin"
        }
      ]
    },
    {
      "id": "cp-route",
      "row": 7,
      "kind": "chipset",
      "title": "Assign page routes",
      "desc": "Add the route the way App.svelte already wires routes, with a lazy import and the source path. The lazy import keeps page CSS off the editor routes.",
      "lines": [19, 19],
      "anchor": "Add the route, with a lazy import and the source path.",
      "chips": [
        {
          "label": "LiveTokensRouter",
          "lines": [152, 152],
          "anchor": "`<LiveTokensRouter pages={...}>`: add a `pages` entry with `"
        },
        {
          "label": "LiveEditorOverlay",
          "lines": [153, 153],
          "anchor": "Manual `<LiveEditorOverlay>`: dispatch with `$derived.by(() "
        }
      ]
    },
    {
      "id": "cp-check",
      "row": 8,
      "kind": "cli",
      "title": "Run check-page",
      "desc": "check-page --tests --strict --json applies every auto repair, proves the rendered page at its own route, and returns the fixes beside the remaining findings.",
      "lines": [170, 170],
      "anchor": "Run `npx live-tokens check-page <file> --tests --strict --js"
    },
    {
      "id": "cp-repair",
      "row": 9,
      "kind": "gate",
      "title": "Repair from guidance",
      "desc": "Each remaining finding carries its guidance. Make each repair, then run check-page again.",
      "lines": [172, 172],
      "anchor": "Each remaining finding carries a rule id, a line, and its `g"
    },
    {
      "id": "cp-verify",
      "row": 10,
      "kind": "chipset",
      "title": "Check the page in the browser",
      "desc": "The checkers cannot see a layout. Open the page at its width and check each line.",
      "lines": [174, 190],
      "anchor": "The checkers cannot see a layout. Open the page at the width",
      "anchorEnd": "`references/interaction-sources.md` names the sources for th",
      "chips": [
        {
          "label": "Structure",
          "lines": [176, 180],
          "anchor": "The first section holds what the user came for.",
          "anchorEnd": "The containers in a section align at the bottom."
        },
        {
          "label": "Actions",
          "lines": [181, 184],
          "anchor": "The actions sit where the eye goes last, with the one primar",
          "anchorEnd": "An action that runs longer than a moment shows progress in a"
        },
        {
          "label": "Fields",
          "lines": [185, 186],
          "anchor": "Every field has a default, and Reset restores it.",
          "anchorEnd": "Secondary settings sit in a `CollapsibleSection`. Every cont"
        },
        {
          "label": "Words and access",
          "lines": [187, 188],
          "anchor": "Labels use the user's words, such as \"Export slices\".",
          "anchorEnd": "Every `img` has `alt` text. Focus order follows the reading "
        }
      ]
    },
    {
      "id": "cp-read",
      "row": 11,
      "kind": "step",
      "title": "Read the page twice",
      "desc": "From a distance only the sections show. Up close, every border and bar earns its place or goes.",
      "lines": [192, 192],
      "anchor": "Then read the page from a distance: the sections and their e"
    },
    {
      "id": "cp-reply",
      "row": 12,
      "kind": "done",
      "title": "Reply with the result",
      "desc": "The sections and the layout each took, the components placed, the route, and the check-page result.",
      "lines": [21, 21],
      "anchor": "Reply with the sections and the layout each took, the compon"
    }
  ],
  "edges": [
    {
      "from": "cp-trig",
      "to": "cp-project"
    },
    {
      "from": "cp-project",
      "to": "cp-layout"
    },
    {
      "from": "cp-layout",
      "to": "cp-grid"
    },
    {
      "from": "cp-grid",
      "to": "cp-containers"
    },
    {
      "from": "cp-containers",
      "to": "cp-component"
    },
    {
      "from": "cp-component",
      "to": "cp-hierarchy"
    },
    {
      "from": "cp-hierarchy",
      "to": "cp-route"
    },
    {
      "from": "cp-route",
      "to": "cp-check"
    },
    {
      "from": "cp-check",
      "to": "cp-repair",
      "label": "findings"
    },
    {
      "from": "cp-repair",
      "to": "cp-check",
      "label": "rerun",
      "back": true
    },
    {
      "from": "cp-check",
      "to": "cp-verify",
      "label": "exit 0"
    },
    {
      "from": "cp-verify",
      "to": "cp-read"
    },
    {
      "from": "cp-read",
      "to": "cp-reply"
    }
  ]
};
