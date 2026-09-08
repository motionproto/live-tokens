import type { SkillTree } from '../types';

export const createTheme: SkillTree = {
  "id": "live-tokens-create-theme",
  "digest": "sha256:9de2cd5d34861cd6",
  "title": "create-theme",
  "tagline": "Create a Live Tokens Theme",
  "nodes": [
    {
      "id": "ct-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Create or refine a theme",
      "desc": "A theme has three dimensions: color, typography, and geometry. The skill adjusts design token values and their assignment to semantic properties to create a new theme.",
      "lines": [3, 3],
      "anchor": "description: Create or modify a complete live-tokens theme f"
    },
    {
      "id": "ct-direction",
      "row": 1,
      "kind": "step",
      "title": "Generate the design direction",
      "desc": "A short summary of the request: the mood, and the intent it sets for color, type, and geometry.",
      "lines": [27, 27],
      "anchor": "Read the request once and generate the design direction base"
    },
    {
      "id": "ct-index",
      "row": 2,
      "kind": "ref",
      "title": "Name the anchor",
      "desc": "The anchor is a keyword for the mood, idiom, or season. Each dimension has a lookup table that helps guide choices based on the anchor.",
      "lines": [28, 28],
      "anchor": "Read `references/design-directions.md` and name the **anchor",
      "reference": "references/design-directions.md"
    },
    {
      "id": "ct-colors",
      "row": 3,
      "kind": "step",
      "title": "Set colors",
      "desc": "Turns the color intent into the theme's color.",
      "lines": [30, 30],
      "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co"
    },
    {
      "id": "ct-type",
      "row": 3,
      "kind": "step",
      "title": "Set type",
      "desc": "Turns the type intent into a font pairing.",
      "lines": [31, 31],
      "anchor": "Invoke **live-tokens-set-type** with the anchor and the type"
    },
    {
      "id": "ct-geo",
      "row": 3,
      "kind": "step",
      "title": "Set-Geometry",
      "desc": "Turns the geometry intent into each component's shape and spacing.",
      "lines": [32, 32],
      "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the "
    },
    {
      "id": "ct-save",
      "row": 4,
      "kind": "cli",
      "title": "Save the theme",
      "desc": "The buffers become a saved theme, and the editor loads it.",
      "lines": [33, 33],
      "anchor": "Take the theme name from the design direction and run `npx l"
    },
    {
      "id": "ct-assemble",
      "row": 5,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Reply with the design direction, what each set skill did, any dimension omitted, and anything flagged by a skill.",
      "lines": [34, 34],
      "anchor": "Assemble the three set skill responses into the assembled re"
    },
    {
      "id": "ct-ver",
      "row": 6,
      "kind": "step",
      "title": "Verify the theme",
      "desc": "Each set skill passed, the theme is saved, and the app shows it.",
      "lines": [78, 84],
      "anchor": "## Verify",
      "anchorEnd": "To return to the previous theme, load it from the Theme pane"
    },
    {
      "id": "ct-refine-q",
      "row": 7,
      "kind": "decide",
      "title": "User feedback",
      "desc": "The user sees the theme and may ask for a change. One adjective usually names one dimension and goes to that set skill. A change across dimensions starts again from the design direction.",
      "lines": [53, 76],
      "anchor": "## Refining a theme",
      "anchorEnd": "loading it from the editor's Theme panel; loading clears the",
      "chips": [
        {
          "label": "color",
          "lines": [60, 60],
          "anchor": "| warmer, cooler, calmer, louder, lighter, darker, moodier, "
        },
        {
          "label": "type",
          "lines": [61, 61],
          "anchor": "| more editorial, friendlier, more technical, a serif for he"
        },
        {
          "label": "geometry",
          "lines": [62, 62],
          "anchor": "| rounder, sharper, pill buttons, tighter, airier, thicker b"
        },
        {
          "label": "spans dimensions",
          "lines": [69, 71],
          "anchor": "Keep this skill for a refinement that spans dimensions (\"mak",
          "anchorEnd": "and route all three again."
        },
        {
          "label": "no refinement",
          "lines": [67, 67],
          "anchor": "When no refinement is requested, the theme is complete."
        }
      ]
    },
    {
      "id": "ct-refine-colors",
      "row": 8,
      "kind": "hand",
      "title": "Set colors (adjust)",
      "desc": "Any request that names color, such as warmer, calmer, darker, or more contrast, goes to live-tokens-set-colors.",
      "lines": [60, 60],
      "anchor": "| warmer, cooler, calmer, louder, lighter, darker, moodier, "
    },
    {
      "id": "ct-refine-type",
      "row": 8,
      "kind": "hand",
      "title": "Set type (adjust)",
      "desc": "Any request that names type, such as more editorial, friendlier, or a serif for headings, goes to live-tokens-set-type.",
      "lines": [61, 61],
      "anchor": "| more editorial, friendlier, more technical, a serif for he"
    },
    {
      "id": "ct-refine-geometry",
      "row": 8,
      "kind": "hand",
      "title": "Set geometry (adjust)",
      "desc": "Any request that names geometry, such as rounder, pill buttons, tighter, or thicker borders, goes to live-tokens-set-geometry.",
      "lines": [62, 62],
      "anchor": "| rounder, sharper, pill buttons, tighter, airier, thicker b"
    },
    {
      "id": "ct-done",
      "row": 9,
      "kind": "done",
      "title": "Theme complete",
      "desc": "The theme is saved, open in the editor, and shown in the app.",
      "lines": [78, 84],
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
    },
    {
      "to": "ct-colors",
      "from": "ct-index"
    },
    {
      "to": "ct-save",
      "from": "ct-colors"
    },
    {
      "to": "ct-type",
      "from": "ct-index"
    },
    {
      "to": "ct-save",
      "from": "ct-type"
    },
    {
      "to": "ct-geo",
      "from": "ct-index"
    },
    {
      "to": "ct-save",
      "from": "ct-geo"
    },
    {
      "to": "ct-refine-q",
      "from": "ct-refine-colors",
      "back": true
    },
    {
      "to": "ct-refine-q",
      "from": "ct-refine-type",
      "back": true
    },
    {
      "to": "ct-refine-q",
      "from": "ct-refine-geometry",
      "back": true
    }
  ]
};
