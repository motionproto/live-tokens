import type { SkillTree } from '../types';

export const createComponent: SkillTree = {
  "id": "live-tokens-create-component",
  "digest": "sha256:645396f59225a9db",
  "title": "create-component",
  "tagline": "Create a LiveTokens Component",
  "nodes": [
    {
      "id": "cc-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create component",
      "desc": "Makes a component. Every editable value is a semantic property assigned a design token.",
      "lines": [3, 3],
      "anchor": "description: Create an editable component for a @motion-prot"
    },
    {
      "id": "cc-project",
      "row": 1,
      "kind": "chipset",
      "title": "Read the project",
      "desc": "Determine the existing context.",
      "lines": [12, 12],
      "anchor": "Read the project: `package.json`, `live-tokens.config.json`,",
      "chips": [
        {
          "label": "Config",
          "lines": [43, 43],
          "anchor": "Read the project's `package.json`, `live-tokens.config.json`"
        },
        {
          "label": "Catalogue",
          "lines": [44, 44],
          "anchor": "Run `npx live-tokens components`. The list holds every compo"
        },
        {
          "label": "Token scales",
          "lines": [45, 45],
          "anchor": "Run `npx live-tokens tokens --scale <name>` for each token s"
        },
        {
          "label": "Shipped pair",
          "lines": [46, 46],
          "anchor": "Read a shipped runtime and editor pair: `Toggle` for interac"
        },
        {
          "label": "Suffixes",
          "lines": [47, 47],
          "anchor": "Read `references/token-naming.md` for the suffixes that sele"
        }
      ]
    },
    {
      "id": "cc-design",
      "row": 2,
      "kind": "chipset",
      "title": "Design the Component",
      "desc": "Separate the parts, variants, and states.",
      "lines": [13, 13],
      "anchor": "Design the properties: separate the component's parts, varia",
      "chips": [
        {
          "label": "Design model",
          "lines": [20, 37],
          "anchor": "## Design model",
          "anchorEnd": "Prop names follow the shipped components. `label` names a co"
        },
        {
          "label": "Parts, variants, and states",
          "lines": [51, 67],
          "anchor": "## Variants and states",
          "anchorEnd": "A component supplies its variants. The page chooses the one "
        },
        {
          "label": "Property map",
          "lines": [71, 84],
          "anchor": "Before writing a file, identify the component's parts, text ",
          "anchorEnd": "Assign from the tokens the project has. Match the token scal"
        },
        {
          "label": "Name shape",
          "lines": [86, 98],
          "anchor": "A property name starts with the component id and ends with t",
          "anchorEnd": "For a state that affects several parts, follow Toggle: `--to"
        },
        {
          "label": "Shipped role names",
          "lines": [100, 100],
          "anchor": "Name a role as the shipped component that paints the same th"
        }
      ]
    },
    {
      "id": "cc-runtime",
      "row": 3,
      "kind": "chipset",
      "title": "Write the component runtime ",
      "desc": "Start with the catalogue export. Declare every property with its token, and read it in the CSS.",
      "lines": [14, 14],
      "anchor": "Write the runtime file: the catalogue export and the `:globa",
      "chips": [
        {
          "label": "Catalogue entry",
          "lines": [106, 118],
          "anchor": "Open the file with a `<script module lang=\"ts\">` block that ",
          "anchorEnd": "```"
        },
        {
          "label": "Root block",
          "lines": [120, 148],
          "anchor": "Declare every editable property in a literal `:global(:root)",
          "anchorEnd": "The excerpt shows the chain for part of the property map. Ev"
        },
        {
          "label": "Intrinsics",
          "lines": [148, 148],
          "anchor": "The excerpt shows the chain for part of the property map. Ev"
        },
        {
          "label": "Sketch mode",
          "lines": [223, 223],
          "anchor": "Every component joins the sketch layer: read `references/ske"
        },
        {
          "label": "Fixed overlays",
          "lines": [225, 225],
          "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-"
        }
      ]
    },
    {
      "id": "cc-editor",
      "row": 4,
      "kind": "chipset",
      "title": "Write the component editor",
      "desc": "Show semantic properties and token assignment. Link properties that are shared across states or variants.",
      "lines": [15, 15],
      "anchor": "Write the editor file: the schema, the preview props, and th",
      "chips": [
        {
          "label": "Schema",
          "lines": [154, 154],
          "anchor": "A `<script module>` block exports `component`, the id, and `"
        },
        {
          "label": "Preview props",
          "lines": [155, 155],
          "anchor": "The instance script imports the runtime component and the ed"
        },
        {
          "label": "Markup",
          "lines": [156, 156],
          "anchor": "The markup mounts `ComponentEditorBase` with one `VariantGro"
        },
        {
          "label": "Linked siblings",
          "lines": [192, 192],
          "anchor": "When variants share a value, read `references/linked-sibling"
        }
      ]
    },
    {
      "id": "cc-register",
      "row": 5,
      "kind": "chipset",
      "title": "Register the component",
      "desc": "Register it in the shared module main.ts and live-tokens.testing.ts both name, and write its contract, so check-component --tests can see and drive it.",
      "lines": [16, 16],
      "anchor": "Register the component in the module `src/main.ts` and `live",
      "chips": [
        {
          "label": "Shared module",
          "lines": [196, 212],
          "anchor": "Register the component in `src/registerComponents.ts`, a reg",
          "anchorEnd": "});"
        },
        {
          "label": "Import and name it",
          "lines": [215, 215],
          "anchor": "Import the module from `src/main.ts`, before `bootLiveTokens"
        },
        {
          "label": "Contract",
          "lines": [215, 215],
          "anchor": "Import the module from `src/main.ts`, before `bootLiveTokens"
        },
        {
          "label": "First-party",
          "lines": [219, 219],
          "anchor": "Inside the live-tokens repository, a first-party component k"
        }
      ]
    },
    {
      "id": "cc-checks",
      "row": 6,
      "kind": "chipset",
      "title": "Run the checks",
      "desc": "Get a report from check-compliance, then run check-component --tests until it passes with the contract's suites covered.",
      "lines": [17, 17],
      "anchor": "Run **live-tokens-check-compliance**, then `npx live-tokens ",
      "chips": [
        {
          "label": "Compliance and tests",
          "lines": [229, 229],
          "anchor": "Run **live-tokens-check-compliance** and address its finding"
        },
        {
          "label": "Svelte check and build",
          "lines": [230, 230],
          "anchor": "Run the project's Svelte check and its build."
        },
        {
          "label": "Component tests",
          "lines": [17, 17],
          "anchor": "Run **live-tokens-check-compliance**, then `npx live-tokens "
        },
        {
          "label": "Rule table",
          "lines": [235, 245],
          "anchor": "| `fix` | Section |",
          "anchorEnd": "| `coverage` | Add the missing contract, or complete the run"
        }
      ]
    },
    {
      "id": "cc-reply",
      "row": 7,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "The files, the id, the props, and each check's result.",
      "lines": [18, 18],
      "anchor": "Reply with the files, the id, the props, and each check's re"
    },
    {
      "id": "cc-page",
      "row": 8,
      "kind": "hand",
      "title": "live-tokens-create-page",
      "desc": "The component is done. Placing it on a page is the next skill.",
      "lines": [249, 249],
      "anchor": "Then place the component on a page with **live-tokens-create"
    }
  ],
  "edges": [
    {
      "from": "cc-trig",
      "to": "cc-project"
    },
    {
      "from": "cc-project",
      "to": "cc-design"
    },
    {
      "from": "cc-design",
      "to": "cc-runtime"
    },
    {
      "from": "cc-runtime",
      "to": "cc-editor"
    },
    {
      "from": "cc-editor",
      "to": "cc-register"
    },
    {
      "from": "cc-register",
      "to": "cc-checks"
    },
    {
      "from": "cc-checks",
      "to": "cc-reply"
    },
    {
      "from": "cc-reply",
      "to": "cc-page"
    }
  ]
};
