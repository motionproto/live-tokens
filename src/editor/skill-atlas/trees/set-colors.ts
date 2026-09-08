import type { SkillTree } from '../types';

export const setColors: SkillTree = {
  "id": "live-tokens-set-colors",
  "digest": "sha256:d83d60fcbfa2f662",
  "title": "set-colors",
  "tagline": "Set the Color Palettes",
  "nodes": [
    {
      "id": "sc-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Set or refine a palette",
      "desc": "Selects colors for a live tokens theme. Each palette is derived from an OKLCH base color, which is assigned a position based on luminance, and the rest of the family is generated around it. ",
      "lines": [3, 3],
      "anchor": "description: Set a live-tokens theme's color: ten OKLCH base"
    },
    {
      "id": "sc-anchor",
      "row": 1,
      "kind": "ref",
      "title": "Look up the color anchor",
      "desc": "The anchor keyword from create theme guides color selection.",
      "lines": [19, 19],
      "anchor": "Read the color intent and any anchor live-tokens-create-them",
      "reference": "references/color-anchors.md"
    },
    {
      "id": "sc-input",
      "row": 2,
      "kind": "step",
      "title": "Write the base colors",
      "desc": "Ten base colors and a scheme in one file, chosen by six rules. Keep the file for refinements.",
      "lines": [20, 20],
      "anchor": "Translate the intent into ten base colors with the framework",
      "chips": [
        {
          "label": "Chroma budget",
          "lines": [56, 68],
          "anchor": "## Chroma budget",
          "anchorEnd": "A good theme reads as 3 or 4 hue families on screen, never 1"
        },
        {
          "label": "Role ranges",
          "lines": [70, 96],
          "anchor": "## Per-role ranges",
          "anchorEnd": "Blue tints cap very low at high L (H 264 at L 0.95 barely re"
        },
        {
          "label": "Mood dials",
          "lines": [98, 104],
          "anchor": "## Mood dials",
          "anchorEnd": "Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0"
        },
        {
          "label": "Gamut guardrails",
          "lines": [106, 113],
          "anchor": "## Gamut guardrails",
          "anchorEnd": "Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C "
        },
        {
          "label": "Harmony",
          "lines": [115, 121],
          "anchor": "## Harmony",
          "anchorEnd": "Drama or maximum contrast: complementary, triadic, or tetrad"
        },
        {
          "label": "Canvas sky and shadows",
          "lines": [123, 127],
          "anchor": "## Canvas sky and shadows",
          "anchorEnd": "Shadow opacity derives from Canvas lightness and re-derives "
        }
      ]
    },
    {
      "id": "sc-cli",
      "row": 3,
      "kind": "cli",
      "title": "Set colors",
      "desc": "The engine derives the theme's color from the ten base colors and checks every text pair for WCAG AA contrast.",
      "lines": [21, 21],
      "anchor": "Run `npx live-tokens set-colors scratch/<slug>-base-colors.j"
    },
    {
      "id": "sc-fail",
      "row": 4,
      "kind": "gate",
      "title": "Correct the base colors",
      "desc": "A text pair below WCAG AA fails the run. Exit 1 names the base color to change and how: raise its lightness or reduce its chroma.",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
    },
    {
      "id": "sc-reply",
      "row": 5,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Report the anchor, the scheme, the hue families, the Canvas base color, and any auto-correction.",
      "lines": [22, 23],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co",
      "anchorEnd": "Reply with the anchor if any, the scheme, the hue families, "
    },
    {
      "id": "sc-verify",
      "row": 6,
      "kind": "done",
      "title": "Verify the color",
      "desc": "The CLI passes, the app shows the new palette, and the theme reads as edited.",
      "lines": [143, 149],
      "anchor": "## Verify",
      "anchorEnd": "To revert, re-run with the previous base color file, or load"
    }
  ],
  "edges": [
    {
      "to": "sc-anchor",
      "from": "sc-trig"
    },
    {
      "to": "sc-fail",
      "from": "sc-cli",
      "label": "exit 1"
    },
    {
      "to": "sc-cli",
      "from": "sc-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "sc-input",
      "from": "sc-anchor"
    },
    {
      "to": "sc-cli",
      "from": "sc-input"
    },
    {
      "to": "sc-reply",
      "from": "sc-cli",
      "label": "exit 0"
    },
    {
      "to": "sc-verify",
      "from": "sc-reply"
    }
  ]
};
