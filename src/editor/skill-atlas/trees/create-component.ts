import type { SkillTree } from '../types';

export const createComponent: SkillTree = {
  "id": "live-tokens-create-component",
  "digest": "sha256:f2fecf1cae1d8464",
  "title": "create-component",
  "tagline": "Create a New Component Using Semantic Properties and Design Tokens",
  "nodes": [
    {
      "id": "cc-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create an editable component",
      "desc": "Makes a component editable in the live-tokens editor: a runtime file, an editor file, and a registration, with every editable value on a design token.",
      "lines": [3, 3],
      "anchor": "description: Create an editable component for a @motion-prot"
    },
    {
      "id": "cc-model",
      "row": 1,
      "kind": "chipset",
      "title": "Use the two-layer design model",
      "desc": "Design tokens hold the theme's values. Semantic properties say what a component paints with them.",
      "lines": [10, 25],
      "anchor": "## Design model",
      "anchorEnd": "Props carry content and behavior: a value, a label, a callba"
    },
    {
      "id": "cc-inspect",
      "row": 2,
      "kind": "step",
      "title": "Read the project configuration",
      "desc": "Learn the package version, the check settings, and what is already registered.",
      "lines": [31, 31],
      "anchor": "Read the project's `package.json`, `live-tokens.config.json`"
    },
    {
      "id": "cc-catalogue",
      "row": 3,
      "kind": "step",
      "title": "Run the catalogue",
      "desc": "See every component the project already has, so the new one fits beside them.",
      "lines": [32, 32],
      "anchor": "Run `npx live-tokens components`. The list holds every compo"
    },
    {
      "id": "cc-tokens",
      "row": 4,
      "kind": "step",
      "title": "Inspect the token scales",
      "desc": "See which tokens a property can reference.",
      "lines": [33, 33],
      "anchor": "Run `npx live-tokens tokens --scale <name>` for each token s"
    },
    {
      "id": "cc-examples",
      "row": 5,
      "kind": "step",
      "title": "Read a runtime and editor pair",
      "desc": "Shipped pairs show the pattern for states, variants, linked values, and parts.",
      "lines": [34, 34],
      "anchor": "Read a shipped runtime and editor pair: `Toggle` for interac"
    },
    {
      "id": "cc-suffixes",
      "row": 6,
      "kind": "ref",
      "title": "Read the property suffixes",
      "desc": "The suffix of a property name picks the editor control for it.",
      "lines": [35, 35],
      "anchor": "Read `references/token-naming.md` for the suffixes that sele",
      "reference": "references/token-naming.md"
    },
    {
      "id": "cc-map",
      "row": 7,
      "kind": "chipset",
      "title": "Map each editable role",
      "desc": "Plan every editable role before writing a file: its property, its token, and the CSS it controls.",
      "lines": [41, 54],
      "anchor": "Before writing a file, identify the component's parts, text ",
      "anchorEnd": "Assign from the tokens the project has. Match the token scal",
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
      "desc": "A name runs from the component id to the property suffix, with variant, part, and state between.",
      "lines": [56, 68],
      "anchor": "A property name starts with the component id and ends with t",
      "anchorEnd": "For a state that affects several parts, follow Toggle: `--to"
    },
    {
      "id": "cc-align",
      "row": 9,
      "kind": "step",
      "title": "Reuse the shipped role names",
      "desc": "Name each role as the shipped components name it, so a fill is -surface everywhere.",
      "lines": [70, 70],
      "anchor": "Name a role as the shipped component that paints the same th"
    },
    {
      "id": "cc-runtime",
      "row": 10,
      "kind": "step",
      "title": "Create the runtime component",
      "desc": "The runtime file declares each property with its token and reads it in the CSS.",
      "lines": [72, 114],
      "anchor": "## Runtime component",
      "anchorEnd": "The excerpt shows the chain for part of the property map. Ev"
    },
    {
      "id": "cc-intrinsic-q",
      "row": 11,
      "kind": "decide",
      "title": "Structural properties",
      "desc": "A choice such as alignment or visibility is an intrinsic. A value on a scale is a property.",
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
      "desc": "An intrinsic declares its allowed values and its default, and the editor offers them as a choice.",
      "lines": [114, 114],
      "anchor": "The excerpt shows the chain for part of the property map. Ev",
      "reference": "references/intrinsics.md"
    },
    {
      "id": "cc-states",
      "row": 13,
      "kind": "chipset",
      "title": "Separate parts, variants, and states",
      "desc": "Parts, variants, and states are different things. Keep them apart in the props, the names, and the editor.",
      "lines": [116, 132],
      "anchor": "## Variants and states",
      "anchorEnd": "A component supplies its variants. The page chooses the one "
    },
    {
      "id": "cc-editor",
      "row": 14,
      "kind": "step",
      "title": "Export the property schema",
      "desc": "The editor exports the component id and one row per property, so the panel knows what to show.",
      "lines": [138, 138],
      "anchor": "A `<script module>` block exports `component`, the id, and `"
    },
    {
      "id": "cc-editor-preview",
      "row": 15,
      "kind": "step",
      "title": "Map states to preview props",
      "desc": "The editor maps the state under edit onto the runtime component's props for the preview.",
      "lines": [139, 139],
      "anchor": "The instance script imports the runtime component and the ed"
    },
    {
      "id": "cc-editor-markup",
      "row": 16,
      "kind": "step",
      "title": "Render the editor and preview",
      "desc": "One VariantGroup per variant, each with a live preview.",
      "lines": [140, 140],
      "anchor": "The markup mounts `ComponentEditorBase` with one `VariantGro"
    },
    {
      "id": "cc-linked-q",
      "row": 17,
      "kind": "decide",
      "title": "Shared values",
      "desc": "Variants that share one value need a linked group, so the editor moves them together.",
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
      "desc": "A groupKey per text role links the siblings.",
      "lines": [176, 176],
      "anchor": "When variants share a value, read `references/linked-sibling",
      "reference": "references/linked-siblings.md"
    },
    {
      "id": "cc-register",
      "row": 19,
      "kind": "step",
      "title": "Register the component",
      "desc": "Add the component to bootLiveTokens in src/main.ts, so the editor and the checkers find it.",
      "lines": [178, 201],
      "anchor": "## Registration",
      "anchorEnd": "Inside the live-tokens repository, a first-party component k"
    },
    {
      "id": "cc-sketch",
      "row": 20,
      "kind": "ref",
      "title": "Integrate Sketch mode",
      "desc": "The component names its --sketch-* values, so Sketch mode can draw it.",
      "lines": [205, 205],
      "anchor": "Every component joins the sketch layer: read `references/ske",
      "reference": "references/sketch-mode.md"
    },
    {
      "id": "cc-overlay-q",
      "row": 21,
      "kind": "decide",
      "title": "Fixed overlays",
      "desc": "A fixed overlay and a container that owns its content's typography each have a reference.",
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
      "desc": "The overlay renders under <body>, so no ancestor can move or clip it.",
      "lines": [207, 207],
      "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-",
      "reference": "references/fixed-overlays.md"
    },
    {
      "id": "cc-audit",
      "row": 23,
      "kind": "step",
      "title": "Run live-tokens-check-compliance",
      "desc": "The compliance report names the findings, and the repair skill fixes them.",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding"
    },
    {
      "id": "cc-check",
      "row": 24,
      "kind": "cli",
      "title": "Run the strict component check",
      "desc": "The strict check reads the runtime, the editor, and the registration.",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding"
    },
    {
      "id": "cc-fail",
      "row": 25,
      "kind": "gate",
      "title": "Resolve the findings",
      "desc": "Each rule names the section that fixes it. Repair and rerun until exit 0.",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding"
    },
    {
      "id": "cc-pass",
      "row": 25,
      "kind": "ok",
      "title": "Component check passes",
      "desc": "Every rule passes, warnings included.",
      "lines": [211, 211],
      "anchor": "Run **live-tokens-check-compliance** and address its finding"
    },
    {
      "id": "cc-build",
      "row": 27,
      "kind": "step",
      "title": "Run the Svelte check and build",
      "desc": "The project's Svelte check and build both pass.",
      "lines": [212, 212],
      "anchor": "Run the project's Svelte check and its build."
    },
    {
      "id": "cc-contract",
      "row": 28,
      "kind": "ref",
      "title": "Verify the registration and intrinsics",
      "desc": "checkRegistryEntry confirms the registration and that the defaults match the runtime.",
      "lines": [213, 213],
      "anchor": "Verify the registration with `checkRegistryEntry`: read `ref",
      "reference": "references/contract-tests.md"
    },
    {
      "id": "cc-editor-check",
      "row": 29,
      "kind": "chipset",
      "title": "Verify the component in the editor",
      "desc": "Open the component in the editor and confirm each behaviour.",
      "lines": [214, 214],
      "anchor": "Open `/live-tokens/components` and check each line below."
    },
    {
      "id": "cc-reply",
      "row": 30,
      "kind": "step",
      "title": "Reply with the implementation results",
      "desc": "Report the files, the id, the props, and each check's result.",
      "lines": [215, 215],
      "anchor": "Reply with the files, the component id, the props, and the r"
    },
    {
      "id": "cc-page",
      "row": 31,
      "kind": "hand",
      "title": "live-tokens-create-page",
      "desc": "The component is done. Placing it on a page is the next skill.",
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
