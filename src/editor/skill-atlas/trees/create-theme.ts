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
      "desc": "Use when the user asks for a theme, look, vibe, or brand feel by mood, style, era, season, holiday, or hue. Use when the user names only a color and wants a theme around it. Use when the user refines a theme across more than one dimension.",
      "lines": [3, 3],
      "anchor": "description: Create or modify a complete live-tokens theme f"
    },
    {
      "id": "ct-direction",
      "row": 1,
      "kind": "step",
      "title": "Generate the design direction",
      "lines": [27, 27],
      "anchor": "Read the request once and generate the design direction base",
      "n": "1"
    },
    {
      "id": "ct-index",
      "row": 2,
      "kind": "ref",
      "title": "Name the anchor",
      "lines": [28, 28],
      "anchor": "Read `references/design-directions.md` and name the **anchor",
      "reference": "references/design-directions.md",
      "n": "2"
    },
    {
      "id": "ct-intents",
      "row": 3,
      "kind": "step",
      "title": "Generate the three intents",
      "lines": [29, 29],
      "anchor": "Generate the three intents the design direction and the anch",
      "n": "3",
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
      "desc": "Does the request leave color alone?",
      "lines": [30, 30],
      "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co"
    },
    {
      "id": "ct-colors",
      "row": 5,
      "kind": "step",
      "title": "Invoke live-tokens-set-colors",
      "lines": [30, 30],
      "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co",
      "n": "4"
    },
    {
      "id": "ct-type-q",
      "row": 6,
      "kind": "decide",
      "title": "Type scope",
      "desc": "Does the request leave type alone?",
      "lines": [31, 31],
      "anchor": "Invoke **live-tokens-set-type** with the anchor and the type"
    },
    {
      "id": "ct-type",
      "row": 7,
      "kind": "step",
      "title": "Invoke live-tokens-set-type",
      "lines": [31, 31],
      "anchor": "Invoke **live-tokens-set-type** with the anchor and the type",
      "n": "5"
    },
    {
      "id": "ct-geo-q",
      "row": 8,
      "kind": "decide",
      "title": "Geometry scope",
      "desc": "Does the request leave geometry alone?",
      "lines": [32, 32],
      "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the "
    },
    {
      "id": "ct-geo",
      "row": 9,
      "kind": "step",
      "title": "Invoke live-tokens-set-geometry",
      "lines": [32, 32],
      "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the ",
      "n": "6"
    },
    {
      "id": "ct-save",
      "row": 10,
      "kind": "cli",
      "title": "Save the theme",
      "lines": [33, 33],
      "anchor": "Take the theme name from the design direction and run `npx l",
      "command": "npx live-tokens save-theme \"<name>\"",
      "n": "7",
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
      "lines": [34, 34],
      "anchor": "Assemble the three set skill responses into the assembled re",
      "n": "8"
    },
    {
      "id": "ct-ver",
      "row": 12,
      "kind": "step",
      "title": "Verify the theme",
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
      "desc": "Does the refinement name one dimension or span dimensions?",
      "lines": [57, 72],
      "anchor": "## Refining a theme",
      "anchorEnd": "and route all three again."
    },
    {
      "id": "ct-refine-colors",
      "row": 17,
      "kind": "hand",
      "title": "live-tokens-set-colors",
      "lines": [64, 64],
      "anchor": "| warmer, cooler, calmer, louder, lighter, darker, moodier, "
    },
    {
      "id": "ct-refine-type",
      "row": 17,
      "kind": "hand",
      "title": "live-tokens-set-type",
      "lines": [65, 65],
      "anchor": "| more editorial, friendlier, more technical, a serif for he"
    },
    {
      "id": "ct-refine-geometry",
      "row": 17,
      "kind": "hand",
      "title": "live-tokens-set-geometry",
      "lines": [66, 66],
      "anchor": "| rounder, sharper, pill buttons, tighter, airier, thicker b"
    },
    {
      "id": "ct-done",
      "row": 17,
      "kind": "done",
      "title": "Theme complete",
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
