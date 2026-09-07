import type { SkillTree } from '../types';

export const createTheme: SkillTree = {
  "id": "live-tokens-create-theme",
  "digest": "sha256:d29f68b8c7319dd9",
  "title": "create-theme",
  "tagline": "Create a Live Tokens Theme",
  "nodes": [
    {
      "id": "ct-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create or refine a theme",
      "desc": "For color, type, or geometry named on its own, read that set skill.",
      "lines": [3, 3],
      "anchor": "description: Create or modify a complete live-tokens theme f"
    },
    {
      "id": "ct-direction",
      "row": 1,
      "kind": "step",
      "title": "Generate the design direction",
      "desc": "One design direction names the mood and what it implies for color, type, and geometry.",
      "lines": [27, 27],
      "anchor": "Read the request once and generate the design direction base"
    },
    {
      "id": "ct-index",
      "row": 2,
      "kind": "ref",
      "title": "Name the anchor",
      "desc": "The anchor is the feeling, idiom, or occasion the reference lists for the request.",
      "lines": [28, 28],
      "anchor": "Read `references/design-directions.md` and name the **anchor",
      "reference": "references/design-directions.md"
    },
    {
      "id": "ct-intents",
      "row": 3,
      "kind": "step",
      "title": "Generate the three intents",
      "desc": "One line per dimension names the outcome. The set skills choose the values.",
      "lines": [29, 29],
      "anchor": "Generate the three intents the design direction and the anch",
      "chips": [
        {
          "label": "color",
          "lines": [46, 46],
          "anchor": "| color | live-tokens-set-colors | ten base colors, the sche"
        },
        {
          "label": "type",
          "lines": [47, 47],
          "anchor": "| type | live-tokens-set-type | the families for up to five "
        },
        {
          "label": "geometry",
          "lines": [48, 48],
          "anchor": "| geometry | live-tokens-set-geometry | radius, padding, gap"
        }
      ]
    },
    {
      "id": "ct-colors-q",
      "row": 4,
      "kind": "decide",
      "title": "Color scope",
      "desc": "Color is skipped only when the user asked to leave it alone.",
      "lines": [30, 30],
      "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co",
      "chips": [
        {
          "label": "color intent",
          "lines": [30, 30],
          "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co"
        },
        {
          "label": "leave the color alone",
          "lines": [30, 30],
          "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co"
        }
      ]
    },
    {
      "id": "ct-colors",
      "row": 5,
      "kind": "step",
      "title": "Invoke live-tokens-set-colors",
      "desc": "The set skill turns the color intent into the theme's color.",
      "lines": [30, 30],
      "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co"
    },
    {
      "id": "ct-type-q",
      "row": 6,
      "kind": "decide",
      "title": "Type scope",
      "desc": "Type is skipped only when the user asked to leave it alone.",
      "lines": [31, 31],
      "anchor": "Invoke **live-tokens-set-type** with the anchor and the type",
      "chips": [
        {
          "label": "type intent",
          "lines": [31, 31],
          "anchor": "Invoke **live-tokens-set-type** with the anchor and the type"
        },
        {
          "label": "leave the type alone",
          "lines": [31, 31],
          "anchor": "Invoke **live-tokens-set-type** with the anchor and the type"
        }
      ]
    },
    {
      "id": "ct-type",
      "row": 7,
      "kind": "step",
      "title": "Invoke live-tokens-set-type",
      "desc": "The set skill turns the type intent into a font pairing.",
      "lines": [31, 31],
      "anchor": "Invoke **live-tokens-set-type** with the anchor and the type"
    },
    {
      "id": "ct-geo-q",
      "row": 8,
      "kind": "decide",
      "title": "Geometry scope",
      "desc": "Geometry is skipped when the intent is to leave it alone.",
      "lines": [32, 32],
      "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the ",
      "chips": [
        {
          "label": "geometry intent",
          "lines": [32, 32],
          "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the "
        },
        {
          "label": "leave the geometry alone",
          "lines": [32, 32],
          "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the "
        }
      ]
    },
    {
      "id": "ct-geo",
      "row": 9,
      "kind": "step",
      "title": "Invoke live-tokens-set-geometry",
      "desc": "The set skill turns the geometry intent into each component's shape and spacing.",
      "lines": [32, 32],
      "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the "
    },
    {
      "id": "ct-save",
      "row": 10,
      "kind": "cli",
      "title": "Save the theme",
      "desc": "The buffers become a saved theme, and the editor loads it.",
      "lines": [33, 33],
      "anchor": "Take the theme name from the design direction and run `npx l",
      "command": "npx live-tokens save-theme \"<name>\"",
      "chips": [
        {
          "label": "Multiple themes",
          "lines": [36, 38],
          "anchor": "A set of themes runs steps 4 to 7 once per theme, with `--no",
          "anchorEnd": "theme starts from the same state."
        }
      ]
    },
    {
      "id": "ct-assemble",
      "row": 11,
      "kind": "step",
      "title": "Assemble the reports",
      "desc": "One report names the design direction and what each set skill changed.",
      "lines": [34, 34],
      "anchor": "Assemble the three set skill responses into the assembled re"
    },
    {
      "id": "ct-ver",
      "row": 12,
      "kind": "step",
      "title": "Verify the theme",
      "desc": "Each set skill passed, the theme is saved, and the app shows it.",
      "lines": [74, 80],
      "anchor": "## Verify",
      "anchorEnd": "To return to the previous theme, load it from the Theme pane",
      "chips": [
        {
          "label": "Set skill results",
          "lines": [76, 76],
          "anchor": "Each invoked set skill reports its result. When invoked, `se"
        },
        {
          "label": "Saved theme",
          "lines": [77, 77],
          "anchor": "`save-theme` exits 0 and names the theme it wrote and opened"
        },
        {
          "label": "Rendered theme",
          "lines": [78, 78],
          "anchor": "The app (dev server running) shows the whole theme, and the "
        },
        {
          "label": "Consistent intents",
          "lines": [79, 79],
          "anchor": "The assembled report names one design direction, and the thr"
        },
        {
          "label": "Revert",
          "lines": [80, 80],
          "anchor": "To return to the previous theme, load it from the Theme pane"
        }
      ]
    },
    {
      "id": "ct-refine-q",
      "row": 13,
      "kind": "decide",
      "title": "Refinement scope",
      "desc": "One adjective usually names one dimension and goes to that set skill. A refinement across dimensions starts again from the design direction.",
      "lines": [57, 72],
      "anchor": "## Refining a theme",
      "anchorEnd": "and route all three again.",
      "chips": [
        {
          "label": "color",
          "lines": [64, 64],
          "anchor": "| warmer, cooler, calmer, louder, lighter, darker, moodier, "
        },
        {
          "label": "type",
          "lines": [65, 65],
          "anchor": "| more editorial, friendlier, more technical, a serif for he"
        },
        {
          "label": "geometry",
          "lines": [66, 66],
          "anchor": "| rounder, sharper, pill buttons, tighter, airier, thicker b"
        },
        {
          "label": "spans dimensions",
          "lines": [70, 72],
          "anchor": "Keep this skill for a refinement that spans dimensions (\"mak",
          "anchorEnd": "and route all three again."
        },
        {
          "label": "no refinement",
          "lines": [68, 68],
          "anchor": "When no refinement is requested, the theme is complete."
        }
      ]
    },
    {
      "id": "ct-refine-colors",
      "row": 17,
      "kind": "hand",
      "title": "live-tokens-set-colors",
      "desc": "Warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast.",
      "lines": [64, 64],
      "anchor": "| warmer, cooler, calmer, louder, lighter, darker, moodier, "
    },
    {
      "id": "ct-refine-type",
      "row": 17,
      "kind": "hand",
      "title": "live-tokens-set-type",
      "desc": "More editorial, friendlier, more technical, a serif for headings.",
      "lines": [65, 65],
      "anchor": "| more editorial, friendlier, more technical, a serif for he"
    },
    {
      "id": "ct-refine-geometry",
      "row": 17,
      "kind": "hand",
      "title": "live-tokens-set-geometry",
      "desc": "Rounder, sharper, pill buttons, tighter, airier, thicker borders.",
      "lines": [66, 66],
      "anchor": "| rounder, sharper, pill buttons, tighter, airier, thicker b"
    },
    {
      "id": "ct-done",
      "row": 17,
      "kind": "done",
      "title": "Theme complete",
      "desc": "The theme is saved, open in the editor, and shown in the app.",
      "lines": [74, 80],
      "anchor": "## Verify",
      "anchorEnd": "To return to the previous theme, load it from the Theme pane"
    }
  ],
  "edges": [
    {
      "to": "ct-direction",
      "from": "ct-trig"
    },
    {
      "to": "ct-index",
      "from": "ct-direction"
    },
    {
      "to": "ct-intents",
      "from": "ct-index"
    },
    {
      "to": "ct-colors-q",
      "from": "ct-intents"
    },
    {
      "to": "ct-colors",
      "from": "ct-colors-q",
      "label": "color intent"
    },
    {
      "to": "ct-type-q",
      "from": "ct-colors-q",
      "label": "leave the color alone"
    },
    {
      "to": "ct-type-q",
      "from": "ct-colors"
    },
    {
      "to": "ct-type",
      "from": "ct-type-q",
      "label": "type intent"
    },
    {
      "to": "ct-geo-q",
      "from": "ct-type-q",
      "label": "leave the type alone"
    },
    {
      "to": "ct-geo-q",
      "from": "ct-type"
    },
    {
      "to": "ct-geo",
      "from": "ct-geo-q",
      "label": "geometry intent"
    },
    {
      "to": "ct-save",
      "from": "ct-geo-q",
      "label": "leave the geometry alone"
    },
    {
      "to": "ct-save",
      "from": "ct-geo"
    },
    {
      "to": "ct-assemble",
      "from": "ct-save"
    },
    {
      "to": "ct-ver",
      "from": "ct-assemble"
    },
    {
      "to": "ct-refine-q",
      "from": "ct-ver"
    },
    {
      "to": "ct-refine-colors",
      "from": "ct-refine-q",
      "label": "color"
    },
    {
      "to": "ct-refine-type",
      "from": "ct-refine-q",
      "label": "type"
    },
    {
      "to": "ct-refine-geometry",
      "from": "ct-refine-q",
      "label": "geometry"
    },
    {
      "to": "ct-direction",
      "from": "ct-refine-q",
      "label": "spans dimensions",
      "back": true
    },
    {
      "to": "ct-done",
      "from": "ct-refine-q",
      "label": "no refinement"
    }
  ]
};
