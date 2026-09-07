import type { SkillTree } from '../types';

export const createComponent: SkillTree = {
  "id": "live-tokens-create-component",
  "digest": "sha256:11dd2ebbee8b7e08",
  "title": "create-component",
  "tagline": "Create a New Component Using Semantic Properties and Design Tokens",
  "nodes": [
    {
      "id": "cc-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create an editable component",
      "lines": [3, 3],
      "anchor": "description: Create an editable component for a @motion-prot"
    },
    {
      "id": "cc-model",
      "row": 1,
      "kind": "chipset",
      "title": "Use the two-layer design model",
      "lines": [10, 25],
      "anchor": "## Design model",
      "anchorEnd": "Props carry content and behavior: a value, a label, a callba",
      "chips": [
        {
          "label": "Design tokens",
          "lines": [16, 16],
          "anchor": "| Design tokens | Name the available colors, typography, geo"
        },
        {
          "label": "Semantic properties",
          "lines": [17, 17],
          "anchor": "| Semantic properties | Name the visual roles within a compo"
        }
      ]
    },
    {
      "id": "cc-inspect",
      "row": 2,
      "kind": "step",
      "title": "Read the project configuration",
      "lines": [31, 31],
      "anchor": "Read the project's `package.json`, `live-tokens.config.json`",
      "n": "1"
    },
    {
      "id": "cc-catalogue",
      "row": 3,
      "kind": "step",
      "title": "Run the catalogue",
      "lines": [32, 32],
      "anchor": "Run `npx live-tokens components`. The list holds every compo",
      "n": "2"
    },
    {
      "id": "cc-tokens",
      "row": 4,
      "kind": "step",
      "title": "Inspect the token families",
      "lines": [33, 33],
      "anchor": "Run `npx live-tokens tokens --family <name>` for each family",
      "n": "3"
    },
    {
      "id": "cc-examples",
      "row": 5,
      "kind": "step",
      "title": "Read a runtime and editor pair",
      "lines": [34, 34],
      "anchor": "Read a shipped runtime and editor pair: `Toggle` for interac",
      "n": "4"
    },
    {
      "id": "cc-suffixes",
      "row": 6,
      "kind": "ref",
      "title": "Read the property suffixes",
      "lines": [35, 35],
      "anchor": "Read `references/token-naming.md` for the suffixes that sele",
      "n": "5",
      "reference": "references/token-naming.md"
    },
    {
      "id": "cc-map",
      "row": 7,
      "kind": "chipset",
      "title": "Map each editable role",
      "lines": [41, 54],
      "anchor": "Before writing a file, identify the component's parts, text ",
      "anchorEnd": "Assign from the tokens the project has. Match the token fami",
      "chips": [
        {
          "label": "--statcard-surface",
          "lines": [45, 45],
          "anchor": "| `--statcard-surface` | `--surface-neutral` | `background` "
        },
        {
          "label": "--statcard-border",
          "lines": [46, 46],
          "anchor": "| `--statcard-border` | `--border-neutral` | `border-color` "
        },
        {
          "label": "--statcard-border-width",
          "lines": [47, 47],
          "anchor": "| `--statcard-border-width` | `--border-width-1` | `border-w"
        },
        {
          "label": "--statcard-radius",
          "lines": [48, 48],
          "anchor": "| `--statcard-radius` | `--radius-md` | `border-radius` |"
        },
        {
          "label": "--statcard-padding",
          "lines": [49, 49],
          "anchor": "| `--statcard-padding` | `--space-16` | `padding` |"
        },
        {
          "label": "--statcard-value",
          "lines": [50, 50],
          "anchor": "| `--statcard-value` | `--text-primary` | `color` of the val"
        },
        {
          "label": "--statcard-value-font-size",
          "lines": [51, 51],
          "anchor": "| `--statcard-value-font-size` | `--font-size-2xl` | `font-s"
        },
        {
          "label": "--statcard-label",
          "lines": [52, 52],
          "anchor": "| `--statcard-label` | `--text-secondary` | `color` of the l"
        }
      ]
    },
    {
      "id": "cc-name",
      "row": 8,
      "kind": "chipset",
      "title": "Name semantic properties",
      "lines": [56, 68],
      "anchor": "A property name starts with the component id and ends with t",
      "anchorEnd": "For a state that affects several parts, follow Toggle: `--to",
      "chips": [
        {
          "label": "Component id",
          "lines": [62, 62],
          "anchor": "`componentId` is the runtime file name in lowercase with no "
        },
        {
          "label": "Variant",
          "lines": [63, 63],
          "anchor": "`variant` is present when the component has more than one: `"
        },
        {
          "label": "Part",
          "lines": [64, 64],
          "anchor": "`part` names a region inside the component: `header`, `body`"
        },
        {
          "label": "State",
          "lines": [65, 65],
          "anchor": "`state` comes before the property: `--card-hover-border`. `d"
        },
        {
          "label": "Property suffix",
          "lines": [66, 66],
          "anchor": "`property` is the suffix, and the suffix selects the editor "
        }
      ]
    },
    {
      "id": "cc-align",
      "row": 9,
      "kind": "step",
      "title": "Reuse the shipped role names",
      "lines": [70, 70],
      "anchor": "Name a role as the shipped component that paints the same th"
    },
    {
      "id": "cc-runtime",
      "row": 10,
      "kind": "step",
      "title": "Create the runtime component",
      "lines": [72, 114],
      "anchor": "## Runtime component",
      "anchorEnd": "The excerpt shows the chain for part of the property map. Ev"
    },
    {
      "id": "cc-intrinsic-q",
      "row": 11,
      "kind": "decide",
      "title": "Structural properties",
      "desc": "Does a property carry a structural choice?",
      "lines": [114, 114],
      "anchor": "The excerpt shows the chain for part of the property map. Ev",
      "chips": [
        {
          "label": "structural choice",
          "lines": [114, 114],
          "anchor": "The excerpt shows the chain for part of the property map. Ev"
        },
        {
          "label": "editable value",
          "lines": [114, 114],
          "anchor": "The excerpt shows the chain for part of the property map. Ev"
        }
      ]
    },
    {
      "id": "cc-intrinsics",
      "row": 12,
      "kind": "ref",
      "title": "Declare intrinsics",
      "lines": [114, 114],
      "anchor": "The excerpt shows the chain for part of the property map. Ev",
      "reference": "references/intrinsics.md"
    },
    {
      "id": "cc-states",
      "row": 13,
      "kind": "chipset",
      "title": "Separate parts, variants, and states",
      "lines": [116, 132],
      "anchor": "## Variants and states",
      "anchorEnd": "A component supplies its variants. The page chooses the one ",
      "chips": [
        {
          "label": "Part",
          "lines": [122, 122],
          "anchor": "| Part | Regions present at once | Dialog's overlay, header,"
        },
        {
          "label": "Variant",
          "lines": [123, 123],
          "anchor": "| Variant | Alternative presentations the page chooses | Bad"
        },
        {
          "label": "State",
          "lines": [124, 124],
          "anchor": "| State | A runtime condition | Toggle's on, hover, disabled"
        }
      ]
    },
    {
      "id": "cc-editor",
      "row": 14,
      "kind": "step",
      "title": "Export the property schema",
      "lines": [138, 138],
      "anchor": "A `<script module>` block exports `component`, the id, and `",
      "n": "1"
    },
    {
      "id": "cc-editor-preview",
      "row": 15,
      "kind": "step",
      "title": "Map states to preview props",
      "lines": [139, 139],
      "anchor": "The instance script imports the runtime component and the ed",
      "n": "2"
    },
    {
      "id": "cc-editor-markup",
      "row": 16,
      "kind": "step",
      "title": "Render the editor and preview",
      "lines": [140, 140],
      "anchor": "The markup mounts `ComponentEditorBase` with one `VariantGro",
      "n": "3"
    },
    {
      "id": "cc-linked-q",
      "row": 17,
      "kind": "decide",
      "title": "Shared values",
      "desc": "Do variants share a value?",
      "lines": [176, 176],
      "anchor": "When variants share a value, read `references/linked-sibling",
      "chips": [
        {
          "label": "share a value",
          "lines": [176, 176],
          "anchor": "When variants share a value, read `references/linked-sibling"
        },
        {
          "label": "separate keys",
          "lines": [176, 176],
          "anchor": "When variants share a value, read `references/linked-sibling"
        }
      ]
    },
    {
      "id": "cc-linked",
      "row": 18,
      "kind": "ref",
      "title": "Declare linked properties",
      "lines": [176, 176],
      "anchor": "When variants share a value, read `references/linked-sibling",
      "reference": "references/linked-siblings.md"
    },
    {
      "id": "cc-register",
      "row": 19,
      "kind": "step",
      "title": "Register the component",
      "lines": [178, 201],
      "anchor": "## Registration",
      "anchorEnd": "Inside the live-tokens repository, a first-party component k"
    },
    {
      "id": "cc-sketch",
      "row": 20,
      "kind": "ref",
      "title": "Integrate Sketch mode",
      "lines": [205, 205],
      "anchor": "Every component joins the sketch layer: read `references/ske",
      "reference": "references/sketch-mode.md"
    },
    {
      "id": "cc-overlay-q",
      "row": 21,
      "kind": "decide",
      "title": "Fixed overlays",
      "desc": "Does the component have a fixed overlay?",
      "lines": [207, 207],
      "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-",
      "chips": [
        {
          "label": "fixed overlay",
          "lines": [207, 207],
          "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-"
        },
        {
          "label": "container",
          "lines": [207, 207],
          "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-"
        }
      ]
    },
    {
      "id": "cc-portal",
      "row": 22,
      "kind": "ref",
      "title": "Portal the fixed overlay",
      "lines": [207, 207],
      "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-",
      "reference": "references/fixed-overlays.md"
    },
    {
      "id": "cc-audit",
      "row": 23,
      "kind": "step",
      "title": "Run live-tokens-check-compliance",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding"
    },
    {
      "id": "cc-check",
      "row": 24,
      "kind": "cli",
      "title": "Run the strict component check",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding",
      "command": "npx live-tokens check-component <id> --strict --json",
      "n": "1"
    },
    {
      "id": "cc-fail",
      "row": 25,
      "kind": "gate",
      "title": "Resolve the findings",
      "desc": "The repair for each section is in live-tokens-fix-findings.",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding",
      "chips": [
        {
          "label": "Property design, the name",
          "lines": [221, 221],
          "anchor": "| `unknown-suffix`, `state-after-property`, `disabled-is-ter"
        },
        {
          "label": "Property design, the assigned token",
          "lines": [222, 222],
          "anchor": "| `default-not-token`, `color-literal`, `dimension-literal`,"
        },
        {
          "label": "Runtime component",
          "lines": [223, 223],
          "anchor": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to"
        },
        {
          "label": "Component editor",
          "lines": [224, 224],
          "anchor": "| `missing-component-const`, `missing-all-tokens`, `phantom-"
        },
        {
          "label": "Registration",
          "lines": [225, 225],
          "anchor": "| `missing-registration` | Registration |"
        }
      ]
    },
    {
      "id": "cc-pass",
      "row": 25,
      "kind": "ok",
      "title": "Component check passes",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding"
    },
    {
      "id": "cc-build",
      "row": 27,
      "kind": "step",
      "title": "Run the Svelte check and build",
      "lines": [212, 212],
      "anchor": "Run the project's Svelte check and its build.",
      "n": "2"
    },
    {
      "id": "cc-contract",
      "row": 28,
      "kind": "ref",
      "title": "Verify the registry and intrinsics",
      "lines": [213, 213],
      "anchor": "Verify the registry entry with `checkRegistryEntry`: read `r",
      "n": "3",
      "reference": "references/contract-tests.md"
    },
    {
      "id": "cc-editor-check",
      "row": 29,
      "kind": "chipset",
      "title": "Verify the component in the editor",
      "lines": [214, 214],
      "anchor": "Open `/live-tokens/components` and check each line below.",
      "n": "4",
      "chips": [
        {
          "label": "Registry group",
          "lines": [229, 229],
          "anchor": "A custom component appears under CUSTOM. A first-party compo"
        },
        {
          "label": "Property controls",
          "lines": [230, 230],
          "anchor": "Each property has the control its suffix selects, and change"
        },
        {
          "label": "Preview and interaction",
          "lines": [231, 231],
          "anchor": "The preview matches the state being edited. Keyboard and poi"
        },
        {
          "label": "Linked values",
          "lines": [232, 232],
          "anchor": "Linked properties change together. Separate roles stay indep"
        },
        {
          "label": "Persistence and reset",
          "lines": [233, 233],
          "anchor": "An edit persists across a reload. Reset restores the `:globa"
        },
        {
          "label": "Theme propagation",
          "lines": [234, 234],
          "anchor": "A theme change reaches every property."
        },
        {
          "label": "Sketch rendering",
          "lines": [235, 235],
          "anchor": "With Sketch mode on, every painted part is drawn in its own "
        }
      ]
    },
    {
      "id": "cc-reply",
      "row": 30,
      "kind": "step",
      "title": "Reply with the implementation results",
      "lines": [215, 215],
      "anchor": "Reply with the files, the component id, the props, and the r",
      "n": "5"
    },
    {
      "id": "cc-page",
      "row": 31,
      "kind": "hand",
      "title": "live-tokens-create-page",
      "lines": [237, 237],
      "anchor": "Then place the component on a page with **live-tokens-create"
    }
  ],
  "edges": [
    {
      "to": "cc-model",
      "from": "cc-trig"
    },
    {
      "to": "cc-inspect",
      "from": "cc-model"
    },
    {
      "to": "cc-catalogue",
      "from": "cc-inspect"
    },
    {
      "to": "cc-tokens",
      "from": "cc-catalogue"
    },
    {
      "to": "cc-examples",
      "from": "cc-tokens"
    },
    {
      "to": "cc-suffixes",
      "from": "cc-examples"
    },
    {
      "to": "cc-map",
      "from": "cc-suffixes"
    },
    {
      "to": "cc-name",
      "from": "cc-map"
    },
    {
      "to": "cc-align",
      "from": "cc-name"
    },
    {
      "to": "cc-runtime",
      "from": "cc-align"
    },
    {
      "to": "cc-intrinsic-q",
      "from": "cc-runtime"
    },
    {
      "to": "cc-intrinsics",
      "from": "cc-intrinsic-q",
      "label": "structural choice"
    },
    {
      "to": "cc-states",
      "from": "cc-intrinsic-q",
      "label": "editable value"
    },
    {
      "to": "cc-states",
      "from": "cc-intrinsics"
    },
    {
      "to": "cc-editor",
      "from": "cc-states"
    },
    {
      "to": "cc-editor-preview",
      "from": "cc-editor"
    },
    {
      "to": "cc-editor-markup",
      "from": "cc-editor-preview"
    },
    {
      "to": "cc-linked-q",
      "from": "cc-editor-markup"
    },
    {
      "to": "cc-linked",
      "from": "cc-linked-q",
      "label": "share a value"
    },
    {
      "to": "cc-register",
      "from": "cc-linked-q",
      "label": "separate keys"
    },
    {
      "to": "cc-register",
      "from": "cc-linked"
    },
    {
      "to": "cc-sketch",
      "from": "cc-register"
    },
    {
      "to": "cc-overlay-q",
      "from": "cc-sketch"
    },
    {
      "to": "cc-portal",
      "from": "cc-overlay-q",
      "label": "fixed overlay"
    },
    {
      "to": "cc-audit",
      "from": "cc-overlay-q",
      "label": "container"
    },
    {
      "to": "cc-audit",
      "from": "cc-portal"
    },
    {
      "to": "cc-check",
      "from": "cc-audit"
    },
    {
      "to": "cc-fail",
      "from": "cc-check",
      "label": "exit 1"
    },
    {
      "to": "cc-pass",
      "from": "cc-check",
      "label": "exit 0"
    },
    {
      "to": "cc-check",
      "from": "cc-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "cc-build",
      "from": "cc-pass"
    },
    {
      "to": "cc-contract",
      "from": "cc-build"
    },
    {
      "to": "cc-editor-check",
      "from": "cc-contract"
    },
    {
      "to": "cc-reply",
      "from": "cc-editor-check"
    },
    {
      "to": "cc-page",
      "from": "cc-reply"
    }
  ]
};
