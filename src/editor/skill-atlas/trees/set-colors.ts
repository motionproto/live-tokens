import type { SkillTree } from '../types';

export const setColors: SkillTree = {
  "id": "live-tokens-set-colors",
  "digest": "sha256:fbff02a0779adf59",
  "title": "set-colors",
  "tagline": "Set the Color Palettes",
  "nodes": [
    {
      "id": "sc-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Set or refine a palette",
      "desc": "Use when the user asks for a palette, colors, or hues by mood, style, era, season, holiday, or hue. Use when the user names only a color. Use when the user refines a theme's color: warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast.",
      "lines": [3, 3],
      "anchor": "description: Set a live-tokens theme's color: ten OKLCH base"
    },
    {
      "id": "sc-anchor",
      "row": 1,
      "kind": "ref",
      "title": "Read the color anchor",
      "lines": [19, 19],
      "anchor": "Read the color intent and any anchor live-tokens-create-them",
      "reference": "references/color-anchors.md",
      "n": "1"
    },
    {
      "id": "sc-input",
      "row": 2,
      "kind": "step",
      "title": "Write the input file",
      "desc": "Write ten base colors, the scheme, and the optional canvas gradient.",
      "lines": [20, 20],
      "anchor": "Translate the intent into ten base colors with the framework",
      "n": "2",
      "chips": [
        {
          "label": "Input format",
          "lines": [27, 53],
          "anchor": "## The base color file",
          "anchorEnd": "Roles: **Brand** is the dominant chromatic identity; **Accen"
        }
      ]
    },
    {
      "id": "sc-budget",
      "row": 3,
      "kind": "chipset",
      "title": "Chroma budget",
      "lines": [55, 67],
      "anchor": "## Chroma budget",
      "anchorEnd": "A good theme reads as 3 or 4 hue families on screen, never 1",
      "chips": [
        {
          "label": "Ground (about 60% of every screen)",
          "lines": [61, 61],
          "anchor": "| Ground (about 60% of every screen) | Neutral, Alternate | "
        },
        {
          "label": "Canvas (the largest single area)",
          "lines": [62, 62],
          "anchor": "| Canvas (the largest single area) | Canvas | C 0.02 to 0.14"
        },
        {
          "label": "Dominant chromatic (about 30%)",
          "lines": [63, 63],
          "anchor": "| Dominant chromatic (about 30%) | Brand | C 0.10 to 0.20 |"
        },
        {
          "label": "Garnish (about 10%)",
          "lines": [64, 64],
          "anchor": "| Garnish (about 10%) | Accent, Special | may exceed Brand; "
        },
        {
          "label": "Conditional",
          "lines": [65, 65],
          "anchor": "| Conditional | Info, Success, Warning, Danger | C 0.12 to 0"
        }
      ]
    },
    {
      "id": "sc-roles",
      "row": 4,
      "kind": "chipset",
      "title": "Role ranges",
      "lines": [69, 95],
      "anchor": "## Per-role ranges",
      "anchorEnd": "Blue tints cap very low at high L (H 264 at L 0.95 barely re",
      "chips": [
        {
          "label": "Canvas",
          "lines": [73, 73],
          "anchor": "| Canvas | L 0.92 to 0.98, C 0.02 to 0.06 | L 0.15 to 0.28, "
        },
        {
          "label": "Neutral, Alternate",
          "lines": [74, 74],
          "anchor": "| Neutral, Alternate | L about 0.55, C 0.008 to 0.02 | same "
        },
        {
          "label": "Brand",
          "lines": [75, 75],
          "anchor": "| Brand | L 0.45 to 0.62, C 0.12 to 0.20 | L 0.70 to 0.83, C"
        },
        {
          "label": "Accent",
          "lines": [76, 76],
          "anchor": "| Accent | harmony slot, or at least 0.25 L from Brand when "
        },
        {
          "label": "Special",
          "lines": [77, 77],
          "anchor": "| Special | most expressive; default Brand hue +60 at about "
        },
        {
          "label": "Info",
          "lines": [78, 78],
          "anchor": "| Info | shared status L (0.55 to 0.65 light) | lighten like"
        },
        {
          "label": "Success",
          "lines": [79, 79],
          "anchor": "| Success | shared status L | same | H 140 to 155 |"
        },
        {
          "label": "Warning",
          "lines": [80, 80],
          "anchor": "| Warning | L 0.75 or higher (vivid yellow must be light) | "
        },
        {
          "label": "Danger",
          "lines": [81, 81],
          "anchor": "| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to "
        }
      ]
    },
    {
      "id": "sc-mood",
      "row": 5,
      "kind": "step",
      "title": "Mood dials",
      "lines": [97, 103],
      "anchor": "## Mood dials",
      "anchorEnd": "Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0"
    },
    {
      "id": "sc-gamut",
      "row": 6,
      "kind": "step",
      "title": "Gamut constraints",
      "lines": [105, 112],
      "anchor": "## Gamut guardrails",
      "anchorEnd": "Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C "
    },
    {
      "id": "sc-harmony",
      "row": 7,
      "kind": "step",
      "title": "Harmony",
      "lines": [114, 120],
      "anchor": "## Harmony",
      "anchorEnd": "Drama or maximum contrast: complementary, triadic, or tetrad"
    },
    {
      "id": "sc-sky",
      "row": 8,
      "kind": "step",
      "title": "Canvas gradient and shadows",
      "lines": [122, 126],
      "anchor": "## Canvas sky and shadows",
      "anchorEnd": "Shadow opacity derives from Canvas lightness and re-derives "
    },
    {
      "id": "sc-refine",
      "row": 9,
      "kind": "step",
      "title": "Refine existing colors",
      "lines": [128, 134],
      "anchor": "## Refining a theme's color",
      "anchorEnd": "One adjective moves one dial. Warmer and cooler rotate hue; "
    },
    {
      "id": "sc-cli",
      "row": 10,
      "kind": "cli",
      "title": "Run set-colors",
      "lines": [21, 21],
      "anchor": "Run `npx live-tokens set-colors scratch/<slug>-base-colors.j",
      "command": "npx live-tokens set-colors scratch/<slug>-base-colors.json",
      "n": "3"
    },
    {
      "id": "sc-fail",
      "row": 11,
      "kind": "gate",
      "title": "Correct the input file",
      "desc": "Use the error details to correct the input and rerun the command.",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
    },
    {
      "id": "sc-pass",
      "row": 11,
      "kind": "ok",
      "title": "Command passes",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
    },
    {
      "id": "sc-report",
      "row": 13,
      "kind": "step",
      "title": "Read the report",
      "lines": [22, 22],
      "anchor": "Read the report. Exit 0 passes, and auto-corrected values co",
      "n": "4"
    },
    {
      "id": "sc-reply",
      "row": 14,
      "kind": "step",
      "title": "Reply with the result",
      "lines": [23, 23],
      "anchor": "Reply with the anchor if any, the scheme, the hue families, ",
      "n": "5"
    },
    {
      "id": "sc-scope",
      "row": 15,
      "kind": "step",
      "title": "Preserve the other dimensions",
      "lines": [136, 140],
      "anchor": "## Scope",
      "anchorEnd": "every other value in it forward. `save-theme` keeps the resu"
    },
    {
      "id": "sc-verify",
      "row": 16,
      "kind": "done",
      "title": "Verify the color",
      "lines": [142, 148],
      "anchor": "## Verify",
      "anchorEnd": "To revert, re-run with the previous base color file, or load",
      "chips": [
        {
          "label": "CLI checks",
          "lines": [144, 144],
          "anchor": "The CLI exits 0 with every check passing (auto-corrected is "
        },
        {
          "label": "Rendered palette",
          "lines": [145, 145],
          "anchor": "The app (dev server running) shows the new palette."
        },
        {
          "label": "Theme buffer status",
          "lines": [146, 146],
          "anchor": "The editor's Theme panel marks the open theme unsaved. A dry"
        },
        {
          "label": "Canvas identity",
          "lines": [147, 147],
          "anchor": "The canvas is committed: on screen it reads as the theme's c"
        },
        {
          "label": "Revert",
          "lines": [148, 148],
          "anchor": "To revert, re-run with the previous base color file, or load"
        }
      ]
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
