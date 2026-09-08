import type { SkillTree } from '../types';

export const createComponent: SkillTree = {
  "id": "live-tokens-create-component",
  "digest": "sha256:9912da00df506816",
  "title": "create-component",
  "tagline": "Create a New Component Using Semantic Properties and Design Tokens",
  "nodes": [
    {
      "id": "cc-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create a component",
      "desc": "Makes a component editable: a runtime file, an editor file, and a registration. Every editable value is a semantic property assigned a design token.",
      "lines": [3, 3],
      "anchor": "description: Create an editable component for a @motion-prot"
    },
    {
      "id": "cc-project",
      "row": 1,
      "kind": "chipset",
      "title": "Read the project",
      "desc": "The config, the catalogue, the token scales the component will use, a shipped runtime and editor pair, and the property suffixes.",
      "lines": [12, 12],
      "anchor": "Read the project: `package.json`, `live-tokens.config.json`,",
      "chips": [
        {
          "label": "Config",
          "lines": [42, 42],
          "anchor": "Read the project's `package.json`, `live-tokens.config.json`"
        },
        {
          "label": "Catalogue",
          "lines": [43, 43],
          "anchor": "Run `npx live-tokens components`. The list holds every compo"
        },
        {
          "label": "Token scales",
          "lines": [44, 44],
          "anchor": "Run `npx live-tokens tokens --scale <name>` for each token s"
        },
        {
          "label": "Shipped pair",
          "lines": [45, 45],
          "anchor": "Read a shipped runtime and editor pair: `Toggle` for interac"
        },
        {
          "label": "Suffixes",
          "lines": [46, 46],
          "anchor": "Read `references/token-naming.md` for the suffixes that sele"
        }
      ]
    },
    {
      "id": "cc-design",
      "row": 2,
      "kind": "chipset",
      "title": "Design the properties",
      "desc": "Separate the parts, variants, and states. Then write one row per editable role: its property, its token, and the CSS it controls. Name each role the way the shipped components name it.",
      "lines": [13, 13],
      "anchor": "Design the properties: separate the component's parts, varia",
      "chips": [
        {
          "label": "Design model",
          "lines": [21, 36],
          "anchor": "## Design model",
          "anchorEnd": "Props carry content and behavior: a value, a label, a callba"
        },
        {
          "label": "Parts, variants, and states",
          "lines": [50, 66],
          "anchor": "## Variants and states",
          "anchorEnd": "A component supplies its variants. The page chooses the one "
        },
        {
          "label": "Property map",
          "lines": [70, 83],
          "anchor": "Before writing a file, identify the component's parts, text ",
          "anchorEnd": "Assign from the tokens the project has. Match the token scal"
        },
        {
          "label": "Name shape",
          "lines": [85, 97],
          "anchor": "A property name starts with the component id and ends with t",
          "anchorEnd": "For a state that affects several parts, follow Toggle: `--to"
        },
        {
          "label": "Shipped role names",
          "lines": [99, 99],
          "anchor": "Name a role as the shipped component that paints the same th"
        }
      ]
    },
    {
      "id": "cc-runtime",
      "row": 3,
      "kind": "chipset",
      "title": "Write the runtime file",
      "desc": "Open with the usage comment. Declare every property in the root block with its token, and read it in the CSS. A structural choice is an intrinsic. Every component joins the sketch layer, and a fixed overlay portals to body.",
      "lines": [14, 14],
      "anchor": "Write the runtime file: the usage comment and the `:global(:",
      "chips": [
        {
          "label": "Usage comment",
          "lines": [105, 112],
          "anchor": "Open the file with an HTML comment in the shape every shippe",
          "anchorEnd": "-->"
        },
        {
          "label": "Root block",
          "lines": [115, 143],
          "anchor": "Declare every editable property in a literal `:global(:root)",
          "anchorEnd": "The excerpt shows the chain for part of the property map. Ev"
        },
        {
          "label": "Intrinsics",
          "lines": [143, 143],
          "anchor": "The excerpt shows the chain for part of the property map. Ev"
        },
        {
          "label": "Sketch mode",
          "lines": [216, 216],
          "anchor": "Every component joins the sketch layer: read `references/ske"
        },
        {
          "label": "Fixed overlays",
          "lines": [218, 218],
          "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-"
        }
      ]
    },
    {
      "id": "cc-editor",
      "row": 4,
      "kind": "chipset",
      "title": "Write the editor file",
      "desc": "Export the id and one row per property, map the edited state to preview props, and mount one VariantGroup per variant. Variants that share a value are linked.",
      "lines": [15, 15],
      "anchor": "Write the editor file: the schema, the preview props, and th",
      "chips": [
        {
          "label": "Schema",
          "lines": [149, 149],
          "anchor": "A `<script module>` block exports `component`, the id, and `"
        },
        {
          "label": "Preview props",
          "lines": [150, 150],
          "anchor": "The instance script imports the runtime component and the ed"
        },
        {
          "label": "Markup",
          "lines": [151, 151],
          "anchor": "The markup mounts `ComponentEditorBase` with one `VariantGro"
        },
        {
          "label": "Linked siblings",
          "lines": [187, 187],
          "anchor": "When variants share a value, read `references/linked-sibling"
        }
      ]
    },
    {
      "id": "cc-register",
      "row": 5,
      "kind": "chipset",
      "title": "Register the component",
      "desc": "Add it to bootLiveTokens in main.ts. A manual mount calls registerComponent first. A first-party component takes a registry entry instead.",
      "lines": [16, 16],
      "anchor": "Register the component in `bootLiveTokens`.",
      "chips": [
        {
          "label": "bootLiveTokens",
          "lines": [191, 205],
          "anchor": "Add the component to the project's `bootLiveTokens` call in ",
          "anchorEnd": "});"
        },
        {
          "label": "Manual mount",
          "lines": [208, 208],
          "anchor": "A component that declares intrinsics adds `intrinsics` to th"
        },
        {
          "label": "First-party",
          "lines": [212, 212],
          "anchor": "Inside the live-tokens repository, a first-party component k"
        }
      ]
    },
    {
      "id": "cc-checks",
      "row": 6,
      "kind": "chipset",
      "title": "Run the checks",
      "desc": "The compliance report, then the strict component check until exit 0, then the Svelte check, the build, and the contract test. Each rule names the section that fixes it.",
      "lines": [17, 17],
      "anchor": "Run the checks: **live-tokens-check-compliance**, the strict",
      "chips": [
        {
          "label": "Compliance and component check",
          "lines": [222, 222],
          "anchor": "Run **live-tokens-check-compliance** and address its finding"
        },
        {
          "label": "Svelte check and build",
          "lines": [223, 223],
          "anchor": "Run the project's Svelte check and its build."
        },
        {
          "label": "Contract test",
          "lines": [224, 224],
          "anchor": "Verify the registration with `checkRegistryEntry`: read `ref"
        },
        {
          "label": "Rule table",
          "lines": [230, 236],
          "anchor": "| Rule | Section |",
          "anchorEnd": "| `missing-registration` | Registration |"
        }
      ]
    },
    {
      "id": "cc-editor-check",
      "row": 7,
      "kind": "chipset",
      "title": "Check the component in the editor",
      "desc": "Open it in the editor and confirm each line.",
      "lines": [18, 18],
      "anchor": "Check the component in the editor.",
      "chips": [
        {
          "label": "Listing",
          "lines": [240, 240],
          "anchor": "A custom component appears under CUSTOM. A first-party compo"
        },
        {
          "label": "Controls and preview",
          "lines": [241, 243],
          "anchor": "Each property has the control its suffix selects, and change",
          "anchorEnd": "Linked properties change together. Separate roles stay indep"
        },
        {
          "label": "Persistence and theme",
          "lines": [244, 245],
          "anchor": "An edit persists across a reload. Reset restores the `:globa",
          "anchorEnd": "A theme change reaches every property."
        },
        {
          "label": "Sketch mode",
          "lines": [246, 246],
          "anchor": "With Sketch mode on, every painted part is drawn in its own "
        }
      ]
    },
    {
      "id": "cc-reply",
      "row": 8,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "The files, the id, the props, and each check's result.",
      "lines": [19, 19],
      "anchor": "Reply with the files, the id, the props, and each check's re"
    },
    {
      "id": "cc-page",
      "row": 9,
      "kind": "hand",
      "title": "live-tokens-create-page",
      "desc": "The component is done. Placing it on a page is the next skill.",
      "lines": [248, 248],
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
      "to": "cc-editor-check"
    },
    {
      "from": "cc-editor-check",
      "to": "cc-reply"
    },
    {
      "from": "cc-reply",
      "to": "cc-page"
    }
  ]
};
