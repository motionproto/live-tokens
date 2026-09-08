import type { SkillTree } from '../types';

export const createPage: SkillTree = {
  "id": "live-tokens-create-page",
  "digest": "sha256:334a7506f185d60f",
  "title": "create-page",
  "tagline": "Create a Page Using Live Tokens",
  "nodes": [
    {
      "id": "cp-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create a page",
      "desc": "Builds a page with LiveTokens.",
      "lines": [3, 3],
      "anchor": "description: Create a page in a @motion-proto/live-tokens pr"
    },
    {
      "id": "cp-components",
      "row": 1,
      "kind": "chipset",
      "title": "Use the component contracts",
      "desc": "Use shipped components with their declared props. Size the wrapper around them.",
      "lines": [10, 17],
      "anchor": "## Components",
      "anchorEnd": "Text inside a `Card` or a `CollapsibleSection` takes the con"
    },
    {
      "id": "cp-tokens",
      "row": 2,
      "kind": "chipset",
      "title": "Use design tokens",
      "desc": "Page CSS takes a token wherever one exists. Widths are column spans and heights follow content.",
      "lines": [19, 24],
      "anchor": "## Tokens",
      "anchorEnd": "A value that comes from data, such as a sheet's padding in p"
    },
    {
      "id": "cp-type",
      "row": 3,
      "kind": "chipset",
      "title": "Assign text styles",
      "desc": "Each element takes one text style, with all five axes from that style.",
      "lines": [28, 43],
      "anchor": "### Type",
      "anchorEnd": "Use the semantic element for each place: one `h1`, an `h2` f",
      "chips": [
        {
          "label": "Page title",
          "lines": [34, 34],
          "anchor": "| Page title | `h1` in `--heading-xl-*` |"
        },
        {
          "label": "Section title",
          "lines": [35, 35],
          "anchor": "| Section title | `h2` in `--heading-lg-*`, or `SectionDivid"
        },
        {
          "label": "Card title",
          "lines": [36, 36],
          "anchor": "| Card title | the Card `title` prop |"
        },
        {
          "label": "Label above a group",
          "lines": [37, 37],
          "anchor": "| Label above a group | `--body-sm-*` in `--text-secondary` "
        },
        {
          "label": "Body",
          "lines": [38, 38],
          "anchor": "| Body | `p` in `--body-md-*` |"
        },
        {
          "label": "Secondary line",
          "lines": [39, 39],
          "anchor": "| Secondary line | `--body-sm-*` in `--text-secondary` |"
        },
        {
          "label": "Count, status, read-out",
          "lines": [40, 40],
          "anchor": "| Count, status, read-out | `--body-sm-*` in `--text-primary"
        },
        {
          "label": "Command or value",
          "lines": [41, 41],
          "anchor": "| Command or value | `code` in `--code-*` |"
        }
      ]
    },
    {
      "id": "cp-size",
      "row": 4,
      "kind": "step",
      "title": "Use the default size",
      "desc": "Every control and container keeps its shipped default size.",
      "lines": [45, 47],
      "anchor": "### Size",
      "anchorEnd": "Omit `size` on every control and container. The shipped defa"
    },
    {
      "id": "cp-emphasis",
      "row": 5,
      "kind": "step",
      "title": "Assign action emphasis",
      "desc": "One primary Button per page. Every other action is secondary, outline, or danger by its role.",
      "lines": [49, 53],
      "anchor": "### Emphasis",
      "anchorEnd": "In a row of actions the primary sits last, on the right. Up "
    },
    {
      "id": "cp-spacing",
      "row": 6,
      "kind": "chipset",
      "title": "Apply spacing by position",
      "desc": "Each position takes one step of the space scale. Space inside a group is smaller than space between groups.",
      "lines": [55, 69],
      "anchor": "### Spacing",
      "anchorEnd": "Every section after the first opens with a hairline: `paddin"
    },
    {
      "id": "cp-layout",
      "row": 7,
      "kind": "chipset",
      "title": "Page layout",
      "desc": "Name each section by its purpose. The layout then gives each section its column spans.",
      "lines": [73, 85],
      "anchor": "### Page layouts",
      "anchorEnd": "The stage is the canvas, player, or strip the work is about."
    },
    {
      "id": "cp-grid",
      "row": 8,
      "kind": "step",
      "title": "Read the page column count",
      "desc": "The page is a grid of the theme's column count, and each section spans it.",
      "lines": [87, 93],
      "anchor": "### Grid",
      "anchorEnd": "Read `--columns-count` in the project's `tokens.css`."
    },
    {
      "id": "cp-grid-span",
      "row": 9,
      "kind": "step",
      "title": "Span the page grid",
      "desc": "The section spans the full page grid first.",
      "lines": [94, 94],
      "anchor": "Span the parent grid with `grid-column: 1 / -1`."
    },
    {
      "id": "cp-grid-columns",
      "row": 10,
      "kind": "step",
      "title": "Redeclare the page columns",
      "desc": "The section repeats the page's columns and gutter, so its children line up with the page.",
      "lines": [95, 95],
      "anchor": "Redeclare `repeat(var(--columns-count), 1fr)` with `column-g"
    },
    {
      "id": "cp-grid-children",
      "row": 11,
      "kind": "step",
      "title": "Assign child columns",
      "desc": "Each child takes a page-column position.",
      "lines": [96, 98],
      "anchor": "Place each child by page-column numbers.",
      "anchorEnd": "A grid that follows the page columns takes `var(--columns-co"
    },
    {
      "id": "cp-separation",
      "row": 12,
      "kind": "chipset",
      "title": "Separate content by purpose",
      "desc": "Separate elements with the smallest difference that works: space, then a hairline, then a surface.",
      "lines": [100, 117],
      "anchor": "### Separation",
      "anchorEnd": "`references/layout-sources.md` names the sources for these l"
    },
    {
      "id": "cp-containers",
      "row": 13,
      "kind": "chipset",
      "title": "Choose containers by purpose",
      "desc": "Each purpose has its container. Panel is a stage, Card is titled content.",
      "lines": [119, 129],
      "anchor": "## Containers by purpose",
      "anchorEnd": "`MenuSelect` renders its list open. For a picker, toggle it ",
      "chips": [
        {
          "label": "Stage",
          "lines": [121, 121],
          "anchor": "`Panel` is a stage: a canvas, a player, a preview. `minHeigh"
        },
        {
          "label": "Empty and error states",
          "lines": [122, 122],
          "anchor": "An empty stage shows a heading that names the condition and "
        },
        {
          "label": "Titled content",
          "lines": [123, 123],
          "anchor": "`Card` is a titled block of content. Its `title` prop is the"
        },
        {
          "label": "Tool labels",
          "lines": [124, 124],
          "anchor": "A container in a tool UI labels itself: `Card variant=\"bare\""
        },
        {
          "label": "Form fields",
          "lines": [125, 125],
          "anchor": "A form puts the essential fields first and the secondary fie"
        },
        {
          "label": "Field rows",
          "lines": [126, 126],
          "anchor": "A row of fields is a flex row with `gap: var(--space-20)`. E"
        },
        {
          "label": "Toolbar actions",
          "lines": [127, 127],
          "anchor": "A toolbar is a flex row of Buttons on the section's bottom e"
        },
        {
          "label": "Button stacks",
          "lines": [128, 128],
          "anchor": "A vertical stack of Buttons sets `fullWidth` on each Button."
        },
        {
          "label": "Menu picker",
          "lines": [129, 129],
          "anchor": "`MenuSelect` renders its list open. For a picker, toggle it "
        }
      ]
    },
    {
      "id": "cp-route",
      "row": 14,
      "kind": "decide",
      "title": "Route integration",
      "desc": "The new route follows the way App.svelte already wires routes.",
      "lines": [133, 133],
      "anchor": "Add the route the way `App.svelte` already wires routes.",
      "chips": [
        {
          "label": "LiveTokensRouter",
          "lines": [135, 135],
          "anchor": "`<LiveTokensRouter pages={...}>`: add a `pages` entry with `"
        },
        {
          "label": "LiveEditorOverlay",
          "lines": [136, 136],
          "anchor": "Manual `<LiveEditorOverlay>`: dispatch with `$derived.by(() "
        }
      ]
    },
    {
      "id": "cp-router",
      "row": 15,
      "kind": "step",
      "title": "Add a router entry",
      "desc": "Add a pages entry with the lazy import and the source file.",
      "lines": [135, 135],
      "anchor": "`<LiveTokensRouter pages={...}>`: add a `pages` entry with `"
    },
    {
      "id": "cp-overlay",
      "row": 15,
      "kind": "step",
      "title": "Register the manual route",
      "desc": "Dispatch the page with a derived import and register its source.",
      "lines": [136, 136],
      "anchor": "Manual `<LiveEditorOverlay>`: dispatch with `$derived.by(() "
    },
    {
      "id": "cp-lazy",
      "row": 17,
      "kind": "step",
      "title": "Isolate page imports",
      "desc": "A lazy import keeps page CSS off the editor routes.",
      "lines": [138, 138],
      "anchor": "Import the page with `lazy`, so page CSS stays off the edito"
    },
    {
      "id": "cp-check",
      "row": 18,
      "kind": "step",
      "title": "Run live-tokens-check-compliance",
      "desc": "The compliance report lists both checkers' findings by rule.",
      "lines": [153, 153],
      "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
    },
    {
      "id": "cp-findings",
      "row": 19,
      "kind": "decide",
      "title": "Compliance findings",
      "desc": "Findings go to the repair skill. A clean report goes on to the visual checks.",
      "lines": [153, 153],
      "anchor": "Run **live-tokens-check-compliance**. Its report carries bot",
      "chips": [
        {
          "label": "findings",
          "lines": [153, 153],
          "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
        },
        {
          "label": "clean",
          "lines": [153, 153],
          "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
        }
      ]
    },
    {
      "id": "cp-fix",
      "row": 20,
      "kind": "gate",
      "title": "Run live-tokens-fix-findings",
      "desc": "The repair skill fixes the findings, then the check runs again.",
      "lines": [153, 153],
      "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
    },
    {
      "id": "cp-verify",
      "row": 21,
      "kind": "chipset",
      "title": "Verify the rendered page",
      "desc": "The checkers cannot see a layout. Open the page and confirm each line.",
      "lines": [155, 170],
      "anchor": "The checkers cannot see a layout. Open the page at the width",
      "anchorEnd": "Every `img` has `alt` text. Focus order follows the reading ",
      "chips": [
        {
          "label": "Main content first",
          "lines": [157, 157],
          "anchor": "The first section holds what the user came for."
        },
        {
          "label": "Heading hierarchy",
          "lines": [158, 158],
          "anchor": "One `h1`. Heading levels run in order with no skipped level."
        },
        {
          "label": "Label size",
          "lines": [159, 159],
          "anchor": "No label is larger than the page's body copy."
        },
        {
          "label": "Copy length",
          "lines": [160, 160],
          "anchor": "A line of copy runs 45 to 90 characters."
        },
        {
          "label": "Container alignment",
          "lines": [161, 161],
          "anchor": "The containers in a section align at the bottom."
        },
        {
          "label": "Control boundaries",
          "lines": [162, 162],
          "anchor": "Every control stays inside its wrapper. A `width: 100%` fiel"
        },
        {
          "label": "Primary action position",
          "lines": [163, 163],
          "anchor": "The actions sit where the eye goes last, with the one primar"
        },
        {
          "label": "Exit action",
          "lines": [164, 164],
          "anchor": "Every row of actions holds an action that leaves without com"
        },
        {
          "label": "Destructive confirmation",
          "lines": [165, 165],
          "anchor": "An action that destroys saved work confirms in a `Dialog`."
        },
        {
          "label": "Progress feedback",
          "lines": [166, 166],
          "anchor": "An action that runs longer than a moment shows progress in a"
        },
        {
          "label": "Field defaults",
          "lines": [167, 167],
          "anchor": "Every field has a default, and Reset restores it."
        },
        {
          "label": "Secondary settings",
          "lines": [168, 168],
          "anchor": "Secondary settings sit in a `CollapsibleSection`. Every cont"
        },
        {
          "label": "User vocabulary",
          "lines": [169, 169],
          "anchor": "Labels use the user's words, such as \"Export slices\"."
        },
        {
          "label": "Images and focus order",
          "lines": [170, 170],
          "anchor": "Every `img` has `alt` text. Focus order follows the reading "
        }
      ]
    },
    {
      "id": "cp-read",
      "row": 22,
      "kind": "done",
      "title": "Verify the reading order",
      "desc": "From a distance only the sections show. Up close, every border and bar earns its place or goes.",
      "lines": [174, 174],
      "anchor": "Then read the page from a distance: the sections and their e"
    }
  ],
  "edges": [
    {
      "to": "cp-components",
      "from": "cp-trig"
    },
    {
      "to": "cp-tokens",
      "from": "cp-components"
    },
    {
      "to": "cp-type",
      "from": "cp-tokens"
    },
    {
      "to": "cp-size",
      "from": "cp-type"
    },
    {
      "to": "cp-emphasis",
      "from": "cp-size"
    },
    {
      "to": "cp-spacing",
      "from": "cp-emphasis"
    },
    {
      "to": "cp-layout",
      "from": "cp-spacing"
    },
    {
      "to": "cp-grid-span",
      "from": "cp-grid"
    },
    {
      "to": "cp-grid-columns",
      "from": "cp-grid-span"
    },
    {
      "to": "cp-grid-children",
      "from": "cp-grid-columns"
    },
    {
      "to": "cp-separation",
      "from": "cp-grid-children"
    },
    {
      "to": "cp-containers",
      "from": "cp-separation"
    },
    {
      "to": "cp-route",
      "from": "cp-containers"
    },
    {
      "to": "cp-router",
      "from": "cp-route",
      "label": "LiveTokensRouter"
    },
    {
      "to": "cp-overlay",
      "from": "cp-route",
      "label": "LiveEditorOverlay"
    },
    {
      "to": "cp-lazy",
      "from": "cp-router"
    },
    {
      "to": "cp-lazy",
      "from": "cp-overlay"
    },
    {
      "to": "cp-check",
      "from": "cp-lazy"
    },
    {
      "to": "cp-findings",
      "from": "cp-check"
    },
    {
      "to": "cp-fix",
      "from": "cp-findings",
      "label": "findings"
    },
    {
      "to": "cp-verify",
      "from": "cp-findings",
      "label": "clean"
    },
    {
      "to": "cp-check",
      "from": "cp-fix",
      "label": "repeat until clean",
      "back": true
    },
    {
      "to": "cp-read",
      "from": "cp-verify"
    },
    {
      "to": "cp-grid",
      "from": "cp-layout"
    }
  ]
};
