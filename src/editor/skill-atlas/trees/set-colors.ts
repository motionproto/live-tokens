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
      "desc": "Changes color only. For a request that also names type or geometry, read live-tokens-create-theme.",
      "lines": [3, 3],
      "anchor": "description: Set a live-tokens theme's color: ten OKLCH base"
    },
    {
      "id": "sc-anchor",
      "row": 1,
      "kind": "ref",
      "title": "Read the color anchor",
      "desc": "An anchor's entry overrides the generic ranges.",
      "lines": [19, 19],
      "anchor": "Read the color intent and any anchor live-tokens-create-them",
      "reference": "references/color-anchors.md"
    },
    {
      "id": "sc-input",
      "row": 2,
      "kind": "step",
      "title": "Write the input file",
      "desc": "Ten base colors and a scheme go in one file. Keep it for refinements.",
      "lines": [20, 20],
      "anchor": "Translate the intent into ten base colors with the framework"
    },
    {
      "id": "sc-budget",
      "row": 3,
      "kind": "chipset",
      "title": "Chroma budget",
      "desc": "The more area a palette covers, the less chroma it gets.",
      "lines": [56, 68],
      "anchor": "## Chroma budget",
      "anchorEnd": "A good theme reads as 3 or 4 hue families on screen, never 1"
    },
    {
      "id": "sc-roles",
      "row": 4,
      "kind": "chipset",
      "title": "Role ranges",
      "desc": "Each base color has its own lightness, chroma, and hue range.",
      "lines": [70, 96],
      "anchor": "## Per-role ranges",
      "anchorEnd": "Blue tints cap very low at high L (H 264 at L 0.95 barely re",
      "chips": [
        {
          "label": "Canvas",
          "lines": [74, 74],
          "anchor": "| Canvas | L 0.92 to 0.98, C 0.02 to 0.06 | L 0.15 to 0.28, "
        },
        {
          "label": "Neutral, Alternate",
          "lines": [75, 75],
          "anchor": "| Neutral, Alternate | L about 0.55, C 0.008 to 0.02 | same "
        },
        {
          "label": "Brand",
          "lines": [76, 76],
          "anchor": "| Brand | L 0.45 to 0.62, C 0.12 to 0.20 | L 0.70 to 0.83, C"
        },
        {
          "label": "Accent",
          "lines": [77, 77],
          "anchor": "| Accent | harmony slot, or at least 0.25 L from Brand when "
        },
        {
          "label": "Special",
          "lines": [78, 78],
          "anchor": "| Special | most expressive; default Brand hue +60 at about "
        },
        {
          "label": "Info",
          "lines": [79, 79],
          "anchor": "| Info | shared status L (0.55 to 0.65 light) | lighten like"
        },
        {
          "label": "Success",
          "lines": [80, 80],
          "anchor": "| Success | shared status L | same | H 140 to 155 |"
        },
        {
          "label": "Warning",
          "lines": [81, 81],
          "anchor": "| Warning | L 0.75 or higher (vivid yellow must be light) | "
        },
        {
          "label": "Danger",
          "lines": [82, 82],
          "anchor": "| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to "
        }
      ]
    },
    {
      "id": "sc-mood",
      "row": 5,
      "kind": "step",
      "title": "Mood dials",
      "desc": "Lightness and saturation set the mood. Warm and cool are hue ranges.",
      "lines": [98, 104],
      "anchor": "## Mood dials",
      "anchorEnd": "Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0"
    },
    {
      "id": "sc-gamut",
      "row": 6,
      "kind": "step",
      "title": "Gamut constraints",
      "desc": "Some colors do not exist at some lightness. These rules keep the intent achievable.",
      "lines": [106, 113],
      "anchor": "## Gamut guardrails",
      "anchorEnd": "Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C "
    },
    {
      "id": "sc-harmony",
      "row": 7,
      "kind": "step",
      "title": "Harmony",
      "desc": "Each hue is an offset from Brand, set by the harmony mode.",
      "lines": [115, 121],
      "anchor": "## Harmony",
      "anchorEnd": "Drama or maximum contrast: complementary, triadic, or tetrad"
    },
    {
      "id": "sc-sky",
      "row": 8,
      "kind": "step",
      "title": "Canvas gradient and shadows",
      "desc": "A canvas gradient is for atmospheric intents only. Shadows derive from Canvas lightness.",
      "lines": [123, 127],
      "anchor": "## Canvas sky and shadows",
      "anchorEnd": "Shadow opacity derives from Canvas lightness and re-derives "
    },
    {
      "id": "sc-refine",
      "row": 9,
      "kind": "step",
      "title": "Refine existing colors",
      "desc": "A refinement edits the base color file and runs again.",
      "lines": [129, 135],
      "anchor": "## Refining a theme's color",
      "anchorEnd": "One adjective moves one dial. Warmer and cooler rotate hue; "
    },
    {
      "id": "sc-cli",
      "row": 10,
      "kind": "cli",
      "title": "Run set-colors",
      "desc": "The engine derives the theme's color from the ten base colors and checks contrast.",
      "lines": [21, 21],
      "anchor": "Run `npx live-tokens set-colors scratch/<slug>-base-colors.j",
      "command": "npx live-tokens set-colors scratch/<slug>-base-colors.json"
    },
    {
      "id": "sc-fail",
      "row": 11,
      "kind": "gate",
      "title": "Correct the input file",
      "desc": "Exit 1 names the base color to change and how.",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
    },
    {
      "id": "sc-pass",
      "row": 11,
      "kind": "ok",
      "title": "Command passes",
      "desc": "Every check passes. Auto-corrected values count.",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
    },
    {
      "id": "sc-report",
      "row": 13,
      "kind": "step",
      "title": "Read the report",
      "desc": "The report names the scheme, the hue families, and what was auto-corrected.",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
    },
    {
      "id": "sc-reply",
      "row": 14,
      "kind": "step",
      "title": "Reply with the result",
      "desc": "Report the anchor, the scheme, the hue families, the Canvas base color, and any auto-correction.",
      "lines": [23, 23],
      "anchor": "Reply with the anchor if any, the scheme, the hue families, "
    },
    {
      "id": "sc-scope",
      "row": 15,
      "kind": "step",
      "title": "Preserve the other dimensions",
      "desc": "Only color changes. Fonts, geometry, and saved themes carry forward.",
      "lines": [137, 141],
      "anchor": "## Scope",
      "anchorEnd": "every other value in it forward. `save-theme` keeps the resu"
    },
    {
      "id": "sc-verify",
      "row": 16,
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
      "to": "sc-input",
      "from": "sc-anchor"
    },
    {
      "to": "sc-budget",
      "from": "sc-input"
    },
    {
      "to": "sc-roles",
      "from": "sc-budget"
    },
    {
      "to": "sc-mood",
      "from": "sc-roles"
    },
    {
      "to": "sc-gamut",
      "from": "sc-mood"
    },
    {
      "to": "sc-harmony",
      "from": "sc-gamut"
    },
    {
      "to": "sc-sky",
      "from": "sc-harmony"
    },
    {
      "to": "sc-refine",
      "from": "sc-sky"
    },
    {
      "to": "sc-cli",
      "from": "sc-refine"
    },
    {
      "to": "sc-fail",
      "from": "sc-cli",
      "label": "exit 1"
    },
    {
      "to": "sc-pass",
      "from": "sc-cli",
      "label": "exit 0"
    },
    {
      "to": "sc-cli",
      "from": "sc-fail",
      "label": "rerun",
      "back": true
    },
    {
      "to": "sc-report",
      "from": "sc-pass"
    },
    {
      "to": "sc-reply",
      "from": "sc-report"
    },
    {
      "to": "sc-scope",
      "from": "sc-reply"
    },
    {
      "to": "sc-verify",
      "from": "sc-scope"
    }
  ]
};
