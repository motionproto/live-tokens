import type { SkillTree } from './types';

export const skillTrees: Record<string, SkillTree> = {
  "create-theme": {
    "id": "live-tokens-create-theme",
    "digest": "sha256:9dd2e8bf69f722b5",
    "title": "create-theme",
    "tagline": "Derive one design direction, invoke the required set skills, and save one theme.",
    "nodes": [
      {
        "id": "ct-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Create or refine a theme",
        "desc": "Use when the user asks for a theme, look, vibe, or brand feel by mood, style, era, season, holiday, or hue. Use when the user names only a color and wants a theme around it. Use when the user refines a theme across more than one dimension.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Create or modify a complete live-tokens theme f"
      },
      {
        "id": "ct-direction",
        "row": 1,
        "kind": "step",
        "title": "Generate the design direction",
        "lines": [
          27,
          27
        ],
        "anchor": "Read the request once and generate the design direction base",
        "n": "1"
      },
      {
        "id": "ct-index",
        "row": 2,
        "kind": "ref",
        "title": "Name the anchor",
        "lines": [
          28,
          28
        ],
        "anchor": "Read `references/design-directions.md` and name the **anchor",
        "reference": "references/design-directions.md",
        "n": "2"
      },
      {
        "id": "ct-intents",
        "row": 3,
        "kind": "step",
        "title": "Generate the three intents",
        "lines": [
          29,
          29
        ],
        "anchor": "Generate the three intents the design direction and the anch",
        "n": "3",
        "chips": [
          {
            "label": "color",
            "lines": [
              46,
              46
            ],
            "anchor": "| color | live-tokens-set-colors | ten base colors, the sche"
          },
          {
            "label": "type",
            "lines": [
              47,
              47
            ],
            "anchor": "| type | live-tokens-set-type | the two families, the form m"
          },
          {
            "label": "geometry",
            "lines": [
              48,
              48
            ],
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
        "lines": [
          30,
          30
        ],
        "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co"
      },
      {
        "id": "ct-colors",
        "row": 5,
        "kind": "step",
        "title": "Invoke live-tokens-set-colors",
        "lines": [
          30,
          30
        ],
        "anchor": "Invoke **live-tokens-set-colors** with the anchor and the co",
        "n": "4"
      },
      {
        "id": "ct-type-q",
        "row": 6,
        "kind": "decide",
        "title": "Type scope",
        "desc": "Does the request leave type alone?",
        "lines": [
          31,
          31
        ],
        "anchor": "Invoke **live-tokens-set-type** with the anchor and the type"
      },
      {
        "id": "ct-type",
        "row": 7,
        "kind": "step",
        "title": "Invoke live-tokens-set-type",
        "lines": [
          31,
          31
        ],
        "anchor": "Invoke **live-tokens-set-type** with the anchor and the type",
        "n": "5"
      },
      {
        "id": "ct-geo-q",
        "row": 8,
        "kind": "decide",
        "title": "Geometry scope",
        "desc": "Does the request leave geometry alone?",
        "lines": [
          32,
          32
        ],
        "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the "
      },
      {
        "id": "ct-geo",
        "row": 9,
        "kind": "step",
        "title": "Invoke live-tokens-set-geometry",
        "lines": [
          32,
          32
        ],
        "anchor": "Invoke **live-tokens-set-geometry** with the anchor and the ",
        "n": "6"
      },
      {
        "id": "ct-save",
        "row": 10,
        "kind": "cli",
        "title": "Save the theme",
        "lines": [
          33,
          33
        ],
        "anchor": "Take the theme name from the design direction and run `npx l",
        "command": "npx live-tokens save-theme \"<name>\"",
        "n": "7",
        "chips": [
          {
            "label": "Multiple themes",
            "lines": [
              36,
              38
            ],
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
        "lines": [
          34,
          34
        ],
        "anchor": "Assemble the three set skill responses into the assembled re",
        "n": "8"
      },
      {
        "id": "ct-ver",
        "row": 12,
        "kind": "step",
        "title": "Verify the theme",
        "lines": [
          74,
          80
        ],
        "anchor": "## Verify",
        "anchorEnd": "To return to the previous theme, load it from the Theme pane",
        "chips": [
          {
            "label": "Set skill results",
            "lines": [
              76,
              76
            ],
            "anchor": "Each invoked set skill reports its result. When invoked, `se"
          },
          {
            "label": "Saved theme",
            "lines": [
              77,
              77
            ],
            "anchor": "`save-theme` exits 0 and names the theme it wrote and opened"
          },
          {
            "label": "Rendered theme",
            "lines": [
              78,
              78
            ],
            "anchor": "The app (dev server running) shows the whole theme, and the "
          },
          {
            "label": "Consistent intents",
            "lines": [
              79,
              79
            ],
            "anchor": "The assembled report names one design direction, and the thr"
          },
          {
            "label": "Revert",
            "lines": [
              80,
              80
            ],
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
        "lines": [
          57,
          72
        ],
        "anchor": "## Refining a theme",
        "anchorEnd": "and route all three again."
      },
      {
        "id": "ct-refine-colors",
        "row": 17,
        "kind": "hand",
        "title": "live-tokens-set-colors",
        "lines": [
          64,
          64
        ],
        "anchor": "| warmer, cooler, calmer, louder, lighter, darker, moodier, "
      },
      {
        "id": "ct-refine-type",
        "row": 17,
        "kind": "hand",
        "title": "live-tokens-set-type",
        "lines": [
          65,
          65
        ],
        "anchor": "| more editorial, friendlier, more technical, a serif for he"
      },
      {
        "id": "ct-refine-geometry",
        "row": 17,
        "kind": "hand",
        "title": "live-tokens-set-geometry",
        "lines": [
          66,
          66
        ],
        "anchor": "| rounder, sharper, pill buttons, tighter, airier, thicker b"
      },
      {
        "id": "ct-done",
        "row": 17,
        "kind": "done",
        "title": "Theme complete",
        "lines": [
          74,
          80
        ],
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
        "label": "set color"
      },
      {
        "to": "ct-type-q",
        "from": "ct-colors-q",
        "label": "leave color alone"
      },
      {
        "to": "ct-type-q",
        "from": "ct-colors"
      },
      {
        "to": "ct-type",
        "from": "ct-type-q",
        "label": "set type"
      },
      {
        "to": "ct-geo-q",
        "from": "ct-type-q",
        "label": "leave type alone"
      },
      {
        "to": "ct-geo-q",
        "from": "ct-type"
      },
      {
        "to": "ct-geo",
        "from": "ct-geo-q",
        "label": "set geometry"
      },
      {
        "to": "ct-save",
        "from": "ct-geo-q",
        "label": "leave geometry alone"
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
  },
  "set-colors": {
    "id": "live-tokens-set-colors",
    "digest": "sha256:fbff02a0779adf59",
    "title": "set-colors",
    "tagline": "Read the color intent, write the input, run the CLI, and verify the result.",
    "nodes": [
      {
        "id": "sc-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Set or refine a palette",
        "desc": "Use when the user asks for a palette, colors, or hues by mood, style, era, season, holiday, or hue. Use when the user names only a color. Use when the user refines a theme's color: warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Set a live-tokens theme's color: ten OKLCH base"
      },
      {
        "id": "sc-anchor",
        "row": 1,
        "kind": "ref",
        "title": "Read the color anchor",
        "lines": [
          19,
          19
        ],
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
        "lines": [
          20,
          20
        ],
        "anchor": "Translate the intent into ten base colors with the framework",
        "n": "2",
        "chips": [
          {
            "label": "Input format",
            "lines": [
              27,
              53
            ],
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
        "lines": [
          55,
          67
        ],
        "anchor": "## Chroma budget",
        "anchorEnd": "A good theme reads as 3 or 4 hue families on screen, never 1",
        "chips": [
          {
            "label": "Ground (about 60% of every screen)",
            "lines": [
              61,
              61
            ],
            "anchor": "| Ground (about 60% of every screen) | Neutral, Alternate | "
          },
          {
            "label": "Canvas (the largest single area)",
            "lines": [
              62,
              62
            ],
            "anchor": "| Canvas (the largest single area) | Canvas | C 0.02 to 0.14"
          },
          {
            "label": "Dominant chromatic (about 30%)",
            "lines": [
              63,
              63
            ],
            "anchor": "| Dominant chromatic (about 30%) | Brand | C 0.10 to 0.20 |"
          },
          {
            "label": "Garnish (about 10%)",
            "lines": [
              64,
              64
            ],
            "anchor": "| Garnish (about 10%) | Accent, Special | may exceed Brand; "
          },
          {
            "label": "Conditional",
            "lines": [
              65,
              65
            ],
            "anchor": "| Conditional | Info, Success, Warning, Danger | C 0.12 to 0"
          }
        ]
      },
      {
        "id": "sc-roles",
        "row": 4,
        "kind": "chipset",
        "title": "Role ranges",
        "lines": [
          69,
          95
        ],
        "anchor": "## Per-role ranges",
        "anchorEnd": "Blue tints cap very low at high L (H 264 at L 0.95 barely re",
        "chips": [
          {
            "label": "Canvas",
            "lines": [
              73,
              73
            ],
            "anchor": "| Canvas | L 0.92 to 0.98, C 0.02 to 0.06 | L 0.15 to 0.28, "
          },
          {
            "label": "Neutral, Alternate",
            "lines": [
              74,
              74
            ],
            "anchor": "| Neutral, Alternate | L about 0.55, C 0.008 to 0.02 | same "
          },
          {
            "label": "Brand",
            "lines": [
              75,
              75
            ],
            "anchor": "| Brand | L 0.45 to 0.62, C 0.12 to 0.20 | L 0.70 to 0.83, C"
          },
          {
            "label": "Accent",
            "lines": [
              76,
              76
            ],
            "anchor": "| Accent | harmony slot, or at least 0.25 L from Brand when "
          },
          {
            "label": "Special",
            "lines": [
              77,
              77
            ],
            "anchor": "| Special | most expressive; default Brand hue +60 at about "
          },
          {
            "label": "Info",
            "lines": [
              78,
              78
            ],
            "anchor": "| Info | shared status L (0.55 to 0.65 light) | lighten like"
          },
          {
            "label": "Success",
            "lines": [
              79,
              79
            ],
            "anchor": "| Success | shared status L | same | H 140 to 155 |"
          },
          {
            "label": "Warning",
            "lines": [
              80,
              80
            ],
            "anchor": "| Warning | L 0.75 or higher (vivid yellow must be light) | "
          },
          {
            "label": "Danger",
            "lines": [
              81,
              81
            ],
            "anchor": "| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to "
          }
        ]
      },
      {
        "id": "sc-mood",
        "row": 5,
        "kind": "step",
        "title": "Mood dials",
        "lines": [
          97,
          103
        ],
        "anchor": "## Mood dials",
        "anchorEnd": "Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0"
      },
      {
        "id": "sc-gamut",
        "row": 6,
        "kind": "step",
        "title": "Gamut constraints",
        "lines": [
          105,
          112
        ],
        "anchor": "## Gamut guardrails",
        "anchorEnd": "Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 C "
      },
      {
        "id": "sc-harmony",
        "row": 7,
        "kind": "step",
        "title": "Harmony",
        "lines": [
          114,
          120
        ],
        "anchor": "## Harmony",
        "anchorEnd": "Drama or maximum contrast: complementary, triadic, or tetrad"
      },
      {
        "id": "sc-sky",
        "row": 8,
        "kind": "step",
        "title": "Canvas gradient and shadows",
        "lines": [
          122,
          126
        ],
        "anchor": "## Canvas sky and shadows",
        "anchorEnd": "Shadow opacity derives from Canvas lightness and re-derives "
      },
      {
        "id": "sc-refine",
        "row": 9,
        "kind": "step",
        "title": "Refine existing colors",
        "lines": [
          128,
          134
        ],
        "anchor": "## Refining a theme's color",
        "anchorEnd": "One adjective moves one dial. Warmer and cooler rotate hue; "
      },
      {
        "id": "sc-cli",
        "row": 10,
        "kind": "cli",
        "title": "Run set-colors",
        "lines": [
          21,
          21
        ],
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
        "lines": [
          22,
          22
        ],
        "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
      },
      {
        "id": "sc-pass",
        "row": 11,
        "kind": "ok",
        "title": "Command passes",
        "lines": [
          22,
          22
        ],
        "anchor": "Read the report. Exit 0 passes, and auto-corrected values co"
      },
      {
        "id": "sc-report",
        "row": 13,
        "kind": "step",
        "title": "Read the report",
        "lines": [
          22,
          22
        ],
        "anchor": "Read the report. Exit 0 passes, and auto-corrected values co",
        "n": "4"
      },
      {
        "id": "sc-reply",
        "row": 14,
        "kind": "step",
        "title": "Reply with the result",
        "lines": [
          23,
          23
        ],
        "anchor": "Reply with the anchor if any, the scheme, the hue families, ",
        "n": "5"
      },
      {
        "id": "sc-scope",
        "row": 15,
        "kind": "step",
        "title": "Preserve the other dimensions",
        "lines": [
          136,
          140
        ],
        "anchor": "## Scope",
        "anchorEnd": "every other value in it forward. `save-theme` keeps the resu"
      },
      {
        "id": "sc-verify",
        "row": 16,
        "kind": "done",
        "title": "Verify the color",
        "lines": [
          142,
          148
        ],
        "anchor": "## Verify",
        "anchorEnd": "To revert, re-run with the previous base color file, or load",
        "chips": [
          {
            "label": "CLI checks",
            "lines": [
              144,
              144
            ],
            "anchor": "The CLI exits 0 with every check passing (auto-corrected is "
          },
          {
            "label": "Rendered palette",
            "lines": [
              145,
              145
            ],
            "anchor": "The app (dev server running) shows the new palette."
          },
          {
            "label": "Theme buffer status",
            "lines": [
              146,
              146
            ],
            "anchor": "The editor's Theme panel marks the open theme unsaved. A dry"
          },
          {
            "label": "Canvas identity",
            "lines": [
              147,
              147
            ],
            "anchor": "The canvas is committed: on screen it reads as the theme's c"
          },
          {
            "label": "Revert",
            "lines": [
              148,
              148
            ],
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
  },
  "set-type": {
    "id": "live-tokens-set-type",
    "digest": "sha256:5df66af7c1fb0f80",
    "title": "set-type",
    "tagline": "Read the type intent, write the input, run the CLI, and verify the result.",
    "nodes": [
      {
        "id": "st-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Choose or pair font families",
        "desc": "Use when the user asks to pair fonts, pick a typeface, or set the fonts. Use when the user describes type by voice: editorial, friendlier, technical, elegant, less generic. Use when the user names a face for a role: a serif for headings, a display font.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Set a live-tokens theme's type: a Google Fonts "
      },
      {
        "id": "st-anchor",
        "row": 1,
        "kind": "ref",
        "title": "Read the type anchor",
        "lines": [
          14,
          14
        ],
        "anchor": "Read the type intent and any anchor live-tokens-create-theme",
        "reference": "references/type-anchors.md",
        "n": "1"
      },
      {
        "id": "st-input",
        "row": 2,
        "kind": "step",
        "title": "Write the input file",
        "desc": "Choose the pairing and write scratch/font-pairing.json.",
        "lines": [
          15,
          15
        ],
        "anchor": "Choose the pairing and write it to `scratch/font-pairing.jso",
        "n": "2",
        "chips": [
          {
            "label": "Input format",
            "lines": [
              22,
              28
            ],
            "anchor": "## The pairing file",
            "anchorEnd": "Every slot is optional; an omitted slot keeps its family. `d"
          }
        ]
      },
      {
        "id": "st-body",
        "row": 3,
        "kind": "step",
        "title": "Choose the body face first",
        "lines": [
          30,
          34
        ],
        "anchor": "## Choose the body face first",
        "anchorEnd": "The shipped text styles ask the display face for 600 and the"
      },
      {
        "id": "st-matrix",
        "row": 4,
        "kind": "chipset",
        "title": "Compare font construction",
        "lines": [
          36,
          50
        ],
        "anchor": "## The font matrix",
        "anchorEnd": "Many faces sit between columns. When one straddles, say so a",
        "chips": [
          {
            "label": "Dynamic",
            "lines": [
              42,
              42
            ],
            "anchor": "| **Dynamic** | diagonal stress, open apertures, written ori"
          },
          {
            "label": "Rational",
            "lines": [
              43,
              43
            ],
            "anchor": "| **Rational** | vertical stress, closed apertures, drawn no"
          },
          {
            "label": "Geometric",
            "lines": [
              44,
              44
            ],
            "anchor": "| **Geometric** | monolinear, circle-and-line | technical, m"
          }
        ]
      },
      {
        "id": "st-voice",
        "row": 5,
        "kind": "chipset",
        "title": "Match the type voice",
        "lines": [
          52,
          66
        ],
        "anchor": "## Voice",
        "anchorEnd": "Match the type to the design direction the color came from. ",
        "chips": [
          {
            "label": "editorial, literary, considered",
            "lines": [
              56,
              56
            ],
            "anchor": "| editorial, literary, considered | dynamic serif display ov"
          },
          {
            "label": "elegant, luxurious, formal",
            "lines": [
              57,
              57
            ],
            "anchor": "| elegant, luxurious, formal | rational high-contrast serif "
          },
          {
            "label": "friendly, warm, approachable",
            "lines": [
              58,
              58
            ],
            "anchor": "| friendly, warm, approachable | dynamic sans on both sides,"
          },
          {
            "label": "technical, systematic, precise",
            "lines": [
              59,
              59
            ],
            "anchor": "| technical, systematic, precise | geometric or neo-grotesqu"
          },
          {
            "label": "playful, informal",
            "lines": [
              60,
              60
            ],
            "anchor": "| playful, informal | an expressive display face over a plai"
          },
          {
            "label": "serious, institutional, trustworthy",
            "lines": [
              61,
              61
            ],
            "anchor": "| serious, institutional, trustworthy | rational sans body, "
          },
          {
            "label": "quiet, minimal, unbranded",
            "lines": [
              62,
              62
            ],
            "anchor": "| quiet, minimal, unbranded | one superfamily across both sl"
          }
        ]
      },
      {
        "id": "st-shortcuts",
        "row": 6,
        "kind": "step",
        "title": "Choose a quiet pairing",
        "lines": [
          68,
          75
        ],
        "anchor": "## Shortcuts",
        "anchorEnd": "**Serif display over sans body** when nothing else decides i"
      },
      {
        "id": "st-risks",
        "row": 7,
        "kind": "step",
        "title": "Check the pairing",
        "lines": [
          77,
          82
        ],
        "anchor": "## Watch for",
        "anchorEnd": "**Sets of themes.** No two share a display face or a body fa"
      },
      {
        "id": "st-cli",
        "row": 8,
        "kind": "cli",
        "title": "Run set-type",
        "lines": [
          16,
          16
        ],
        "anchor": "Run `npx live-tokens set-type scratch/font-pairing.json`. It",
        "command": "npx live-tokens set-type scratch/font-pairing.json",
        "n": "3"
      },
      {
        "id": "st-fail",
        "row": 9,
        "kind": "gate",
        "title": "Correct the input file",
        "desc": "Use the error details to correct the input and rerun the command.",
        "lines": [
          17,
          17
        ],
        "anchor": "Read the report. Name a weight gap and offer an alternative "
      },
      {
        "id": "st-pass",
        "row": 9,
        "kind": "ok",
        "title": "Command passes",
        "lines": [
          17,
          17
        ],
        "anchor": "Read the report. Name a weight gap and offer an alternative "
      },
      {
        "id": "st-report",
        "row": 11,
        "kind": "step",
        "title": "Read the report",
        "lines": [
          17,
          17
        ],
        "anchor": "Read the report. Name a weight gap and offer an alternative ",
        "n": "4"
      },
      {
        "id": "st-reply",
        "row": 12,
        "kind": "step",
        "title": "Reply with the result",
        "lines": [
          18,
          18
        ],
        "anchor": "Reply with the two families, the form model behind each, the",
        "n": "5"
      },
      {
        "id": "st-scope",
        "row": 13,
        "kind": "step",
        "title": "Preserve the other dimensions",
        "lines": [
          84,
          86
        ],
        "anchor": "## Scope",
        "anchorEnd": "Type only. Color, component aliases, shape, and the type sca"
      },
      {
        "id": "st-verify",
        "row": 14,
        "kind": "done",
        "title": "Verify the type",
        "lines": [
          88,
          93
        ],
        "anchor": "## Verify",
        "anchorEnd": "To revert, run the previous pairing file, or load the open t",
        "chips": [
          {
            "label": "Changed font stacks",
            "lines": [
              90,
              90
            ],
            "anchor": "The CLI exits 0 and names each stack that moved, before and "
          },
          {
            "label": "Family weights and URLs",
            "lines": [
              91,
              91
            ],
            "anchor": "Each URL matches the family's weights: a range for a variabl"
          },
          {
            "label": "Rendered type",
            "lines": [
              92,
              92
            ],
            "anchor": "The app shows the new type, and the editor's Fonts section l"
          },
          {
            "label": "Revert",
            "lines": [
              93,
              93
            ],
            "anchor": "To revert, run the previous pairing file, or load the open t"
          }
        ]
      }
    ],
    "edges": [
      {
        "to": "st-anchor",
        "from": "st-trig"
      },
      {
        "to": "st-input",
        "from": "st-anchor"
      },
      {
        "to": "st-body",
        "from": "st-input"
      },
      {
        "to": "st-matrix",
        "from": "st-body"
      },
      {
        "to": "st-voice",
        "from": "st-matrix"
      },
      {
        "to": "st-shortcuts",
        "from": "st-voice"
      },
      {
        "to": "st-risks",
        "from": "st-shortcuts"
      },
      {
        "to": "st-cli",
        "from": "st-risks"
      },
      {
        "to": "st-fail",
        "from": "st-cli",
        "label": "exit 1"
      },
      {
        "to": "st-pass",
        "from": "st-cli",
        "label": "exit 0"
      },
      {
        "to": "st-cli",
        "from": "st-fail",
        "label": "rerun",
        "back": true
      },
      {
        "to": "st-report",
        "from": "st-pass"
      },
      {
        "to": "st-reply",
        "from": "st-report"
      },
      {
        "to": "st-scope",
        "from": "st-reply"
      },
      {
        "to": "st-verify",
        "from": "st-scope"
      }
    ]
  },
  "set-geometry": {
    "id": "live-tokens-set-geometry",
    "digest": "sha256:f58fba78bb20463d",
    "title": "set-geometry",
    "tagline": "Read the geometry intent, write the input, run the CLI, and verify the result.",
    "nodes": [
      {
        "id": "sg-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Set shape and spacing",
        "desc": "Use when the user asks for pill or capsule buttons. Use when the user asks for rounded, sharp, square, softer, or harder corners. Use when the user asks for thicker or thinner borders. Use when the user asks for density: space it out, tighter, denser, airier.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Set a live-tokens theme's geometry: corner radi"
      },
      {
        "id": "sg-anchor",
        "row": 1,
        "kind": "ref",
        "title": "Read the geometry anchor",
        "lines": [
          14,
          14
        ],
        "anchor": "Read the geometry intent and any anchor live-tokens-create-t",
        "reference": "references/geometry-anchors.md",
        "n": "1"
      },
      {
        "id": "sg-input",
        "row": 2,
        "kind": "step",
        "title": "Write the input file",
        "desc": "Write global or targeted set and shift operations.",
        "lines": [
          15,
          15
        ],
        "anchor": "Write the ops file to `scratch/geometry-ops.json`.",
        "n": "2",
        "chips": [
          {
            "label": "Input format",
            "lines": [
              24,
              41
            ],
            "anchor": "## The ops file",
            "anchorEnd": "`full` (radius shifts only): admits `--radius-full` as the t"
          }
        ]
      },
      {
        "id": "sg-idioms",
        "row": 3,
        "kind": "chipset",
        "title": "Translate geometry intent",
        "lines": [
          43,
          61
        ],
        "anchor": "## Idioms",
        "anchorEnd": "Magnitude: \"slightly\" or \"a bit\" is 1 step, unqualified is 1",
        "chips": [
          {
            "label": "pill, capsule",
            "lines": [
              49,
              49
            ],
            "anchor": "| pill, capsule | radius `set: \"--radius-full\"`, plus the pa"
          },
          {
            "label": "sharp, square corners",
            "lines": [
              50,
              50
            ],
            "anchor": "| sharp, square corners | radius `set: \"--radius-none\"`, or "
          },
          {
            "label": "rounded (a named component)",
            "lines": [
              51,
              51
            ],
            "anchor": "| rounded (a named component) | radius `shift: 2` |"
          },
          {
            "label": "softer, rounder (global)",
            "lines": [
              52,
              52
            ],
            "anchor": "| softer, rounder (global) | radius `shift: 1` to `2`, no `f"
          },
          {
            "label": "harder, sharper",
            "lines": [
              53,
              53
            ],
            "anchor": "| harder, sharper | radius `shift: -1` to `-2` |"
          },
          {
            "label": "increase the radius, less round, more round",
            "lines": [
              54,
              54
            ],
            "anchor": "| increase the radius, less round, more round | radius `shif"
          },
          {
            "label": "space it out, airier, breathing room",
            "lines": [
              55,
              55
            ],
            "anchor": "| space it out, airier, breathing room | padding and gap `sh"
          },
          {
            "label": "tighter, denser, more compact",
            "lines": [
              56,
              56
            ],
            "anchor": "| tighter, denser, more compact | padding and gap `shift: -1"
          },
          {
            "label": "thicker, thinner borders",
            "lines": [
              57,
              57
            ],
            "anchor": "| thicker, thinner borders | border-width `shift: 1` or `-1`"
          }
        ]
      },
      {
        "id": "sg-controls",
        "row": 4,
        "kind": "step",
        "title": "Compact containers before controls",
        "lines": [
          63,
          77
        ],
        "anchor": "## Compact containers before controls",
        "anchorEnd": "```"
      },
      {
        "id": "sg-scales",
        "row": 5,
        "kind": "step",
        "title": "Apply scales and floors",
        "lines": [
          79,
          89
        ],
        "anchor": "## Scales",
        "anchorEnd": "An alias off the subset spends its first step reaching the s"
      },
      {
        "id": "sg-cli",
        "row": 6,
        "kind": "cli",
        "title": "Run set-geometry",
        "lines": [
          16,
          16
        ],
        "anchor": "Run `npx live-tokens set-geometry scratch/geometry-ops.json`",
        "command": "npx live-tokens set-geometry scratch/geometry-ops.json",
        "n": "3"
      },
      {
        "id": "sg-fail",
        "row": 7,
        "kind": "gate",
        "title": "Correct the input file",
        "desc": "Use the error details to correct the input and rerun the command.",
        "lines": [
          17,
          17
        ],
        "anchor": "Read the report: every changed alias, old and new, plus skip"
      },
      {
        "id": "sg-pass",
        "row": 7,
        "kind": "ok",
        "title": "Command passes",
        "lines": [
          17,
          17
        ],
        "anchor": "Read the report: every changed alias, old and new, plus skip"
      },
      {
        "id": "sg-report",
        "row": 9,
        "kind": "step",
        "title": "Read the report",
        "lines": [
          17,
          17
        ],
        "anchor": "Read the report: every changed alias, old and new, plus skip",
        "n": "4"
      },
      {
        "id": "sg-reply",
        "row": 10,
        "kind": "step",
        "title": "Reply with the result",
        "lines": [
          18,
          18
        ],
        "anchor": "Reply with every alias that moved and any skip or clamp wort",
        "n": "5"
      },
      {
        "id": "sg-scope",
        "row": 11,
        "kind": "step",
        "title": "Preserve the other dimensions",
        "lines": [
          91,
          93
        ],
        "anchor": "## Scope",
        "anchorEnd": "Geometry only. Color, type, saved themes, and `tokens.css` a"
      },
      {
        "id": "sg-verify",
        "row": 12,
        "kind": "done",
        "title": "Verify the geometry",
        "lines": [
          95,
          101
        ],
        "anchor": "## Verify",
        "anchorEnd": "To revert, run the inverse ops, or load the open theme to di",
        "chips": [
          {
            "label": "Expected changes",
            "lines": [
              97,
              97
            ],
            "anchor": "The CLI exits 0 and the report lists the expected changes, w"
          },
          {
            "label": "Rendered geometry",
            "lines": [
              98,
              98
            ],
            "anchor": "The app shows the new shape on each changed component."
          },
          {
            "label": "Control padding",
            "lines": [
              99,
              99
            ],
            "anchor": "Buttons still read as buttons: the label has room at both en"
          },
          {
            "label": "Component buffers",
            "lines": [
              100,
              100
            ],
            "anchor": "`component-configs/<id>/_working.json` exists for every comp"
          },
          {
            "label": "Revert",
            "lines": [
              101,
              101
            ],
            "anchor": "To revert, run the inverse ops, or load the open theme to di"
          }
        ]
      }
    ],
    "edges": [
      {
        "to": "sg-anchor",
        "from": "sg-trig"
      },
      {
        "to": "sg-input",
        "from": "sg-anchor"
      },
      {
        "to": "sg-idioms",
        "from": "sg-input"
      },
      {
        "to": "sg-controls",
        "from": "sg-idioms"
      },
      {
        "to": "sg-scales",
        "from": "sg-controls"
      },
      {
        "to": "sg-cli",
        "from": "sg-scales"
      },
      {
        "to": "sg-fail",
        "from": "sg-cli",
        "label": "exit 1"
      },
      {
        "to": "sg-pass",
        "from": "sg-cli",
        "label": "exit 0"
      },
      {
        "to": "sg-cli",
        "from": "sg-fail",
        "label": "rerun",
        "back": true
      },
      {
        "to": "sg-report",
        "from": "sg-pass"
      },
      {
        "to": "sg-reply",
        "from": "sg-report"
      },
      {
        "to": "sg-scope",
        "from": "sg-reply"
      },
      {
        "to": "sg-verify",
        "from": "sg-scope"
      }
    ]
  },
  "pick-component": {
    "id": "live-tokens-pick-component",
    "digest": "sha256:d6ecf99e668c42f8",
    "title": "pick-component",
    "tagline": "Run the catalogue, choose a family, and apply its test to select the component.",
    "nodes": [
      {
        "id": "pk-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Choose a component for a UX need",
        "desc": "Use when the user asks which component to use, or what the difference between two components is. Use when the user asks how to show or capture a UX outcome.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Recommend which shipped @motion-proto/live-toke"
      },
      {
        "id": "pk-cat",
        "row": 1,
        "kind": "step",
        "title": "Run the catalogue",
        "lines": [
          10,
          12
        ],
        "anchor": "## Catalogue",
        "anchorEnd": "Before choosing, run `npx live-tokens components`. The list ",
        "command": "npx live-tokens components"
      },
      {
        "id": "pk-fam",
        "row": 2,
        "kind": "decide",
        "title": "Component purpose",
        "desc": "Which family matches the UX need?",
        "lines": [
          8,
          8
        ],
        "anchor": "When more than one shipped component could fit, find the fam"
      },
      {
        "id": "pk-act",
        "row": 3,
        "kind": "ask",
        "title": "Action family",
        "desc": "What communicates the action?",
        "lines": [
          14,
          18
        ],
        "anchor": "## Action family",
        "anchorEnd": "The pair that confirms or cancels an inline edit: `InlineEdi",
        "chips": [
          {
            "label": "Button",
            "lines": [
              16,
              16
            ],
            "anchor": "The action needs a word to be unambiguous: `Button`."
          },
          {
            "label": "IconButton",
            "lines": [
              17,
              17
            ],
            "anchor": "The glyph alone is plain (close, edit, delete) and space is "
          },
          {
            "label": "InlineEditActions",
            "lines": [
              18,
              18
            ],
            "anchor": "The pair that confirms or cancels an inline edit: `InlineEdi"
          }
        ]
      },
      {
        "id": "pk-sel",
        "row": 3,
        "kind": "ask",
        "title": "Single-selection family",
        "desc": "What does the selection change, and how many options fit?",
        "lines": [
          20,
          32
        ],
        "anchor": "## Single-selection family",
        "anchorEnd": "The URL changes: `SideNavigation`. Sections inside one page:",
        "chips": [
          {
            "label": "SegmentedControl",
            "lines": [
              26,
              26
            ],
            "anchor": "| `SegmentedControl` | An inline switch between views of the"
          },
          {
            "label": "TabBar",
            "lines": [
              27,
              27
            ],
            "anchor": "| `TabBar` | The content area below swaps. | 2 to 7 |"
          },
          {
            "label": "RadioButton",
            "lines": [
              28,
              28
            ],
            "anchor": "| `RadioButton` | The reader reads every option as text insi"
          },
          {
            "label": "MenuSelect",
            "lines": [
              29,
              29
            ],
            "anchor": "| `MenuSelect` | The options would overflow a row. | any |"
          },
          {
            "label": "Wrapped labels",
            "lines": [
              31,
              31
            ],
            "anchor": "When a label would wrap in a `SegmentedControl`, use `RadioB"
          },
          {
            "label": "URL or section navigation",
            "lines": [
              32,
              32
            ],
            "anchor": "The URL changes: `SideNavigation`. Sections inside one page:"
          }
        ]
      },
      {
        "id": "pk-text",
        "row": 3,
        "kind": "ask",
        "title": "Text entry",
        "desc": "Can the page list the answers?",
        "lines": [
          34,
          38
        ],
        "anchor": "## Text entry",
        "anchorEnd": "A number where the position on a track carries the meaning (",
        "chips": [
          {
            "label": "Input",
            "lines": [
              36,
              36
            ],
            "anchor": "The page cannot list the answers (a name, an amount, a searc"
          },
          {
            "label": "Single-selection family",
            "lines": [
              37,
              37
            ],
            "anchor": "The page can list the answers: the single-selection family."
          },
          {
            "label": "Slider or numeric Input",
            "lines": [
              38,
              38
            ],
            "anchor": "A number where the position on a track carries the meaning ("
          }
        ]
      },
      {
        "id": "pk-bin",
        "row": 3,
        "kind": "ask",
        "title": "On and off",
        "desc": "Do the two states have their own names?",
        "lines": [
          40,
          50
        ],
        "anchor": "## On and off",
        "anchorEnd": "When the two states share the feature's one name, use `Toggl",
        "chips": [
          {
            "label": "Toggle",
            "lines": [
              46,
              46
            ],
            "anchor": "| `Toggle` | A setting that takes effect at once. The label "
          },
          {
            "label": "SegmentedControl",
            "lines": [
              47,
              47
            ],
            "anchor": "| `SegmentedControl` | Two named alternatives the reader com"
          },
          {
            "label": "RadioButton pair",
            "lines": [
              48,
              48
            ],
            "anchor": "| `RadioButton` pair | A yes or no the reader answers inside"
          }
        ]
      },
      {
        "id": "pk-con",
        "row": 3,
        "kind": "ask",
        "title": "Container family",
        "desc": "What does the content represent?",
        "lines": [
          52,
          63
        ],
        "anchor": "## Container family",
        "anchorEnd": "A set of items is one `Card` per item. A routine form goes i",
        "chips": [
          {
            "label": "Card",
            "lines": [
              58,
              58
            ],
            "anchor": "| `Card` | Inline, always open | One item, or each item in a"
          },
          {
            "label": "Panel",
            "lines": [
              59,
              59
            ],
            "anchor": "| `Panel` | Inline, always open | One section of the page's "
          },
          {
            "label": "CollapsibleSection",
            "lines": [
              60,
              60
            ],
            "anchor": "| `CollapsibleSection` | Inline, opened on demand | Secondar"
          },
          {
            "label": "Dialog",
            "lines": [
              61,
              61
            ],
            "anchor": "| `Dialog` | Modal, blocks the page | A decision the page ca"
          }
        ]
      },
      {
        "id": "pk-msg",
        "row": 3,
        "kind": "ask",
        "title": "Messaging family",
        "desc": "What causes the message, and what does it describe?",
        "lines": [
          65,
          77
        ],
        "anchor": "## Messaging family",
        "anchorEnd": "`Badge` and `CornerBadge` differ in position only.",
        "chips": [
          {
            "label": "Callout",
            "lines": [
              71,
              71
            ],
            "anchor": "| `Callout` | A section | Always present | No | Something th"
          },
          {
            "label": "Notification",
            "lines": [
              72,
              72
            ],
            "anchor": "| `Notification` | The system | An action or event | Yes | F"
          },
          {
            "label": "Tooltip",
            "lines": [
              73,
              73
            ],
            "anchor": "| `Tooltip` | An element | Hover or focus | On leave | A def"
          },
          {
            "label": "Badge",
            "lines": [
              74,
              74
            ],
            "anchor": "| `Badge` | An element | Always present | No | A standing la"
          },
          {
            "label": "CornerBadge",
            "lines": [
              75,
              75
            ],
            "anchor": "| `CornerBadge` | A parent's corner | Always present | No | "
          }
        ]
      },
      {
        "id": "pk-disp",
        "row": 3,
        "kind": "ask",
        "title": "Display family",
        "desc": "What does the reader inspect or use?",
        "lines": [
          79,
          85
        ],
        "anchor": "## Display family",
        "anchorEnd": "A titled break between the sections of one page: `SectionDiv",
        "chips": [
          {
            "label": "Image or ImageLightbox",
            "lines": [
              81,
              81
            ],
            "anchor": "A picture the page shows: `Image`. A picture whose detail th"
          },
          {
            "label": "Table or Card",
            "lines": [
              82,
              82
            ],
            "anchor": "Records the reader scans and compares: `Table`. A set of ite"
          },
          {
            "label": "ProgressBar or Slider",
            "lines": [
              83,
              83
            ],
            "anchor": "A read-out of progress: `ProgressBar`. A number the reader s"
          },
          {
            "label": "CodeSnippet or prose",
            "lines": [
              84,
              84
            ],
            "anchor": "Text the reader runs or pastes (an install command, a key, a"
          },
          {
            "label": "SectionDivider or SideNavigation",
            "lines": [
              85,
              85
            ],
            "anchor": "A titled break between the sections of one page: `SectionDiv"
          }
        ]
      },
      {
        "id": "pk-fits",
        "row": 4,
        "kind": "decide",
        "title": "Catalogue fit",
        "desc": "Does a catalogue component or native element fit, or does the task need a new component with chrome?",
        "lines": [
          87,
          91
        ],
        "anchor": "## Nothing fits",
        "anchorEnd": "`npx live-tokens components <id>` prints one component's usa"
      },
      {
        "id": "pk-inspect",
        "row": 5,
        "kind": "cli",
        "title": "Inspect the component contract",
        "lines": [
          91,
          91
        ],
        "anchor": "`npx live-tokens components <id>` prints one component's usa",
        "command": "npx live-tokens components <id> --json"
      },
      {
        "id": "pk-native",
        "row": 5,
        "kind": "step",
        "title": "Use the native element",
        "lines": [
          89,
          89
        ],
        "anchor": "A native element with no chrome of its own needs no componen"
      },
      {
        "id": "pk-make",
        "row": 5,
        "kind": "hand",
        "title": "live-tokens-create-component",
        "lines": [
          89,
          89
        ],
        "anchor": "A native element with no chrome of its own needs no componen"
      },
      {
        "id": "pk-page",
        "row": 6,
        "kind": "hand",
        "title": "live-tokens-create-page",
        "desc": "Continue with size, emphasis, and page layout.",
        "lines": [
          89,
          89
        ],
        "anchor": "A native element with no chrome of its own needs no componen"
      }
    ],
    "edges": [
      {
        "to": "pk-cat",
        "from": "pk-trig"
      },
      {
        "to": "pk-fam",
        "from": "pk-cat"
      },
      {
        "to": "pk-act",
        "from": "pk-fam",
        "label": "Action family"
      },
      {
        "to": "pk-fits",
        "from": "pk-act",
        "label": "Button"
      },
      {
        "to": "pk-fits",
        "from": "pk-act",
        "label": "IconButton"
      },
      {
        "to": "pk-fits",
        "from": "pk-act",
        "label": "InlineEditActions"
      },
      {
        "to": "pk-sel",
        "from": "pk-fam",
        "label": "Single-selection family"
      },
      {
        "to": "pk-fits",
        "from": "pk-sel",
        "label": "SegmentedControl"
      },
      {
        "to": "pk-fits",
        "from": "pk-sel",
        "label": "TabBar"
      },
      {
        "to": "pk-fits",
        "from": "pk-sel",
        "label": "RadioButton"
      },
      {
        "to": "pk-fits",
        "from": "pk-sel",
        "label": "MenuSelect"
      },
      {
        "to": "pk-fits",
        "from": "pk-sel",
        "label": "RadioButton"
      },
      {
        "to": "pk-fits",
        "from": "pk-sel",
        "label": "SideNavigation or TabBar"
      },
      {
        "to": "pk-text",
        "from": "pk-fam",
        "label": "Text entry"
      },
      {
        "to": "pk-fits",
        "from": "pk-text",
        "label": "Input"
      },
      {
        "to": "pk-fits",
        "from": "pk-text",
        "label": "Single-selection family"
      },
      {
        "to": "pk-fits",
        "from": "pk-text",
        "label": "Slider or numeric Input"
      },
      {
        "to": "pk-bin",
        "from": "pk-fam",
        "label": "On and off"
      },
      {
        "to": "pk-fits",
        "from": "pk-bin",
        "label": "Toggle"
      },
      {
        "to": "pk-fits",
        "from": "pk-bin",
        "label": "SegmentedControl"
      },
      {
        "to": "pk-fits",
        "from": "pk-bin",
        "label": "RadioButton pair"
      },
      {
        "to": "pk-con",
        "from": "pk-fam",
        "label": "Container family"
      },
      {
        "to": "pk-fits",
        "from": "pk-con",
        "label": "Card"
      },
      {
        "to": "pk-fits",
        "from": "pk-con",
        "label": "Panel"
      },
      {
        "to": "pk-fits",
        "from": "pk-con",
        "label": "CollapsibleSection"
      },
      {
        "to": "pk-fits",
        "from": "pk-con",
        "label": "Dialog"
      },
      {
        "to": "pk-msg",
        "from": "pk-fam",
        "label": "Messaging family"
      },
      {
        "to": "pk-fits",
        "from": "pk-msg",
        "label": "Callout"
      },
      {
        "to": "pk-fits",
        "from": "pk-msg",
        "label": "Notification"
      },
      {
        "to": "pk-fits",
        "from": "pk-msg",
        "label": "Tooltip"
      },
      {
        "to": "pk-fits",
        "from": "pk-msg",
        "label": "Badge"
      },
      {
        "to": "pk-fits",
        "from": "pk-msg",
        "label": "CornerBadge"
      },
      {
        "to": "pk-disp",
        "from": "pk-fam",
        "label": "Display family"
      },
      {
        "to": "pk-fits",
        "from": "pk-disp",
        "label": "Image or ImageLightbox"
      },
      {
        "to": "pk-fits",
        "from": "pk-disp",
        "label": "Table or Card"
      },
      {
        "to": "pk-fits",
        "from": "pk-disp",
        "label": "ProgressBar or Slider"
      },
      {
        "to": "pk-fits",
        "from": "pk-disp",
        "label": "CodeSnippet or prose"
      },
      {
        "to": "pk-fits",
        "from": "pk-disp",
        "label": "SectionDivider or SideNavigation"
      },
      {
        "to": "pk-inspect",
        "from": "pk-fits",
        "label": "catalogue component"
      },
      {
        "to": "pk-native",
        "from": "pk-fits",
        "label": "native element"
      },
      {
        "to": "pk-make",
        "from": "pk-fits",
        "label": "nothing in the catalogue fits"
      },
      {
        "to": "pk-page",
        "from": "pk-inspect"
      },
      {
        "to": "pk-page",
        "from": "pk-native"
      }
    ]
  },
  "create-page": {
    "id": "live-tokens-create-page",
    "digest": "sha256:334a7506f185d60f",
    "title": "create-page",
    "tagline": "Use the component and token contracts, choose a layout, wire the route, and verify the page.",
    "nodes": [
      {
        "id": "cp-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Create a page or route",
        "desc": "Use when the user asks for a page or a route. Use when the user asks to change the layout of a page.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Create a page in a @motion-proto/live-tokens pr"
      },
      {
        "id": "cp-components",
        "row": 1,
        "kind": "chipset",
        "title": "Use the component contracts",
        "lines": [
          10,
          17
        ],
        "anchor": "## Components",
        "anchorEnd": "Text inside a `Card` or a `CollapsibleSection` takes the con",
        "chips": [
          {
            "label": "Use a shipped component",
            "lines": [
              12,
              12
            ],
            "anchor": "Use a shipped component when one fits. Import it from `@moti"
          },
          {
            "label": "Inspect declared props",
            "lines": [
              13,
              13
            ],
            "anchor": "`npx live-tokens components <id>` prints the declared props,"
          },
          {
            "label": "Pass declared props",
            "lines": [
              14,
              14
            ],
            "anchor": "Pass only the props a component declares."
          },
          {
            "label": "Size the wrapper",
            "lines": [
              15,
              15
            ],
            "anchor": "A shipped component fills its parent. To size one, size the "
          },
          {
            "label": "Use native elements",
            "lines": [
              16,
              16
            ],
            "anchor": "A native element with no chrome of its own needs no componen"
          },
          {
            "label": "Assign content typography",
            "lines": [
              17,
              17
            ],
            "anchor": "Text inside a `Card` or a `CollapsibleSection` takes the con"
          }
        ]
      },
      {
        "id": "cp-tokens",
        "row": 2,
        "kind": "chipset",
        "title": "Use design tokens",
        "lines": [
          19,
          24
        ],
        "anchor": "## Tokens",
        "anchorEnd": "A value that comes from data, such as a sheet's padding in p",
        "chips": [
          {
            "label": "Token references",
            "lines": [
              21,
              21
            ],
            "anchor": "When a design token exists for a value, page CSS takes the t"
          },
          {
            "label": "Column widths",
            "lines": [
              22,
              22
            ],
            "anchor": "A width is a span of page columns. The Layout section gives "
          },
          {
            "label": "Content heights",
            "lines": [
              23,
              23
            ],
            "anchor": "A height follows the content. A stage's `minHeight` is the o"
          },
          {
            "label": "Data values",
            "lines": [
              24,
              24
            ],
            "anchor": "A value that comes from data, such as a sheet's padding in p"
          }
        ]
      },
      {
        "id": "cp-type",
        "row": 3,
        "kind": "chipset",
        "title": "Assign text styles",
        "lines": [
          28,
          43
        ],
        "anchor": "### Type",
        "anchorEnd": "Use the semantic element for each place: one `h1`, an `h2` f",
        "chips": [
          {
            "label": "Page title",
            "lines": [
              34,
              34
            ],
            "anchor": "| Page title | `h1` in `--heading-xl-*` |"
          },
          {
            "label": "Section title",
            "lines": [
              35,
              35
            ],
            "anchor": "| Section title | `h2` in `--heading-lg-*`, or `SectionDivid"
          },
          {
            "label": "Card title",
            "lines": [
              36,
              36
            ],
            "anchor": "| Card title | the Card `title` prop |"
          },
          {
            "label": "Label above a group",
            "lines": [
              37,
              37
            ],
            "anchor": "| Label above a group | `--body-sm-*` in `--text-secondary` "
          },
          {
            "label": "Body",
            "lines": [
              38,
              38
            ],
            "anchor": "| Body | `p` in `--body-md-*` |"
          },
          {
            "label": "Secondary line",
            "lines": [
              39,
              39
            ],
            "anchor": "| Secondary line | `--body-sm-*` in `--text-secondary` |"
          },
          {
            "label": "Count, status, read-out",
            "lines": [
              40,
              40
            ],
            "anchor": "| Count, status, read-out | `--body-sm-*` in `--text-primary"
          },
          {
            "label": "Command or value",
            "lines": [
              41,
              41
            ],
            "anchor": "| Command or value | `code` in `--code-*` |"
          }
        ]
      },
      {
        "id": "cp-size",
        "row": 4,
        "kind": "step",
        "title": "Use the default size",
        "lines": [
          45,
          47
        ],
        "anchor": "### Size",
        "anchorEnd": "Omit `size` on every control and container. The shipped defa"
      },
      {
        "id": "cp-emphasis",
        "row": 5,
        "kind": "step",
        "title": "Assign action emphasis",
        "lines": [
          49,
          53
        ],
        "anchor": "### Emphasis",
        "anchorEnd": "In a row of actions the primary sits last, on the right. Up "
      },
      {
        "id": "cp-spacing",
        "row": 6,
        "kind": "chipset",
        "title": "Apply spacing by position",
        "lines": [
          55,
          69
        ],
        "anchor": "### Spacing",
        "anchorEnd": "Every section after the first opens with a hairline: `paddin",
        "chips": [
          {
            "label": "Between controls in a row",
            "lines": [
              61,
              61
            ],
            "anchor": "| Between controls in a row | `--space-8` |"
          },
          {
            "label": "Inside a wrapper the page draws",
            "lines": [
              62,
              62
            ],
            "anchor": "| Inside a wrapper the page draws | `--space-16` |"
          },
          {
            "label": "Between fields in a form",
            "lines": [
              63,
              63
            ],
            "anchor": "| Between fields in a form | `--space-20` |"
          },
          {
            "label": "Between containers in a section",
            "lines": [
              64,
              64
            ],
            "anchor": "| Between containers in a section | `--columns-gutter` acros"
          },
          {
            "label": "Between sections",
            "lines": [
              65,
              65
            ],
            "anchor": "| Between sections | `--space-16` above a hairline |"
          },
          {
            "label": "Page title to first section",
            "lines": [
              66,
              66
            ],
            "anchor": "| Page title to first section | `--space-24`, no hairline |"
          },
          {
            "label": "Page margin",
            "lines": [
              67,
              67
            ],
            "anchor": "| Page margin | `--space-32` |"
          }
        ]
      },
      {
        "id": "cp-layout",
        "row": 7,
        "kind": "decide",
        "title": "Page layout",
        "desc": "Which layout matches the reader's task?",
        "lines": [
          73,
          85
        ],
        "anchor": "### Page layouts",
        "anchorEnd": "The stage is the canvas, player, or strip the work is about.",
        "chips": [
          {
            "label": "Stacked sections",
            "lines": [
              79,
              79
            ],
            "anchor": "| Stacked sections | The reader moves top to bottom: an open"
          },
          {
            "label": "Main with a supporting pane",
            "lines": [
              80,
              80
            ],
            "anchor": "| Main with a supporting pane | One region is the work and t"
          },
          {
            "label": "List with detail",
            "lines": [
              81,
              81
            ],
            "anchor": "| List with detail | The reader picks an item from a list an"
          },
          {
            "label": "Grid of equals",
            "lines": [
              82,
              82
            ],
            "anchor": "| Grid of equals | The reader compares or scans items of one"
          },
          {
            "label": "Single column",
            "lines": [
              83,
              83
            ],
            "anchor": "| Single column | The reader fills a form or reads at length"
          }
        ]
      },
      {
        "id": "cp-grid",
        "row": 8,
        "kind": "step",
        "title": "Read the page column count",
        "lines": [
          93,
          93
        ],
        "anchor": "Read `--columns-count` in the project's `tokens.css`.",
        "n": "1"
      },
      {
        "id": "cp-grid-span",
        "row": 9,
        "kind": "step",
        "title": "Span the page grid",
        "lines": [
          94,
          94
        ],
        "anchor": "Span the parent grid with `grid-column: 1 / -1`.",
        "n": "2"
      },
      {
        "id": "cp-grid-columns",
        "row": 10,
        "kind": "step",
        "title": "Redeclare the page columns",
        "lines": [
          95,
          95
        ],
        "anchor": "Redeclare `repeat(var(--columns-count), 1fr)` with `column-g",
        "n": "3"
      },
      {
        "id": "cp-grid-children",
        "row": 11,
        "kind": "step",
        "title": "Assign child columns",
        "lines": [
          96,
          98
        ],
        "anchor": "Place each child by page-column numbers.",
        "anchorEnd": "A grid that follows the page columns takes `var(--columns-co",
        "n": "4"
      },
      {
        "id": "cp-separation",
        "row": 12,
        "kind": "chipset",
        "title": "Separate content by purpose",
        "lines": [
          100,
          117
        ],
        "anchor": "### Separation",
        "anchorEnd": "`references/layout-sources.md` names the sources for these l",
        "chips": [
          {
            "label": "Content",
            "lines": [
              110,
              110
            ],
            "anchor": "| Content | `--text-primary`, or the color `site.css` gives "
          },
          {
            "label": "Label",
            "lines": [
              111,
              111
            ],
            "anchor": "| Label | `--text-secondary` |"
          },
          {
            "label": "Chrome",
            "lines": [
              112,
              112
            ],
            "anchor": "| Chrome | `--border-neutral` |"
          },
          {
            "label": "Overlay on content, such as a grid or a selection",
            "lines": [
              113,
              113
            ],
            "anchor": "| Overlay on content, such as a grid or a selection | `--bor"
          }
        ]
      },
      {
        "id": "cp-containers",
        "row": 13,
        "kind": "chipset",
        "title": "Choose containers by purpose",
        "lines": [
          119,
          129
        ],
        "anchor": "## Containers by purpose",
        "anchorEnd": "`MenuSelect` renders its list open. For a picker, toggle it ",
        "chips": [
          {
            "label": "Stage",
            "lines": [
              121,
              121
            ],
            "anchor": "`Panel` is a stage: a canvas, a player, a preview. `minHeigh"
          },
          {
            "label": "Empty and error states",
            "lines": [
              122,
              122
            ],
            "anchor": "An empty stage shows a heading that names the condition and "
          },
          {
            "label": "Titled content",
            "lines": [
              123,
              123
            ],
            "anchor": "`Card` is a titled block of content. Its `title` prop is the"
          },
          {
            "label": "Tool labels",
            "lines": [
              124,
              124
            ],
            "anchor": "A container in a tool UI labels itself: `Card variant=\"bare\""
          },
          {
            "label": "Form fields",
            "lines": [
              125,
              125
            ],
            "anchor": "A form puts the essential fields first and the secondary fie"
          },
          {
            "label": "Field rows",
            "lines": [
              126,
              126
            ],
            "anchor": "A row of fields is a flex row with `gap: var(--space-20)`. E"
          },
          {
            "label": "Toolbar actions",
            "lines": [
              127,
              127
            ],
            "anchor": "A toolbar is a flex row of Buttons on the section's bottom e"
          },
          {
            "label": "Button stacks",
            "lines": [
              128,
              128
            ],
            "anchor": "A vertical stack of Buttons sets `fullWidth` on each Button."
          },
          {
            "label": "Menu picker",
            "lines": [
              129,
              129
            ],
            "anchor": "`MenuSelect` renders its list open. For a picker, toggle it "
          }
        ]
      },
      {
        "id": "cp-route",
        "row": 14,
        "kind": "decide",
        "title": "Route integration",
        "desc": "How does App.svelte wire routes?",
        "lines": [
          133,
          133
        ],
        "anchor": "Add the route the way `App.svelte` already wires routes."
      },
      {
        "id": "cp-router",
        "row": 15,
        "kind": "step",
        "title": "Add a router entry",
        "lines": [
          135,
          135
        ],
        "anchor": "`<LiveTokensRouter pages={...}>`: add a `pages` entry with `"
      },
      {
        "id": "cp-overlay",
        "row": 15,
        "kind": "step",
        "title": "Register the manual route",
        "lines": [
          136,
          136
        ],
        "anchor": "Manual `<LiveEditorOverlay>`: dispatch with `$derived.by(() "
      },
      {
        "id": "cp-lazy",
        "row": 17,
        "kind": "step",
        "title": "Isolate page imports",
        "lines": [
          138,
          138
        ],
        "anchor": "Import the page with `lazy`, so page CSS stays off the edito"
      },
      {
        "id": "cp-check",
        "row": 18,
        "kind": "step",
        "title": "Run live-tokens-check-compliance",
        "lines": [
          153,
          153
        ],
        "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
      },
      {
        "id": "cp-findings",
        "row": 19,
        "kind": "decide",
        "title": "Compliance findings",
        "desc": "Does the report contain findings, or is the page clean?",
        "lines": [
          153,
          153
        ],
        "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
      },
      {
        "id": "cp-fix",
        "row": 20,
        "kind": "gate",
        "title": "Run live-tokens-fix-findings",
        "lines": [
          153,
          153
        ],
        "anchor": "Run **live-tokens-check-compliance**. Its report carries bot"
      },
      {
        "id": "cp-verify",
        "row": 21,
        "kind": "chipset",
        "title": "Verify the rendered page",
        "lines": [
          155,
          170
        ],
        "anchor": "The checkers cannot see a layout. Open the page at the width",
        "anchorEnd": "Every `img` has `alt` text. Focus order follows the reading ",
        "chips": [
          {
            "label": "Main content first",
            "lines": [
              157,
              157
            ],
            "anchor": "The first section holds what the user came for."
          },
          {
            "label": "Heading hierarchy",
            "lines": [
              158,
              158
            ],
            "anchor": "One `h1`. Heading levels run in order with no skipped level."
          },
          {
            "label": "Label size",
            "lines": [
              159,
              159
            ],
            "anchor": "No label is larger than the page's body copy."
          },
          {
            "label": "Copy length",
            "lines": [
              160,
              160
            ],
            "anchor": "A line of copy runs 45 to 90 characters."
          },
          {
            "label": "Container alignment",
            "lines": [
              161,
              161
            ],
            "anchor": "The containers in a section align at the bottom."
          },
          {
            "label": "Control boundaries",
            "lines": [
              162,
              162
            ],
            "anchor": "Every control stays inside its wrapper. A `width: 100%` fiel"
          },
          {
            "label": "Primary action position",
            "lines": [
              163,
              163
            ],
            "anchor": "The actions sit where the eye goes last, with the one primar"
          },
          {
            "label": "Exit action",
            "lines": [
              164,
              164
            ],
            "anchor": "Every row of actions holds an action that leaves without com"
          },
          {
            "label": "Destructive confirmation",
            "lines": [
              165,
              165
            ],
            "anchor": "An action that destroys saved work confirms in a `Dialog`."
          },
          {
            "label": "Progress feedback",
            "lines": [
              166,
              166
            ],
            "anchor": "An action that runs longer than a moment shows progress in a"
          },
          {
            "label": "Field defaults",
            "lines": [
              167,
              167
            ],
            "anchor": "Every field has a default, and Reset restores it."
          },
          {
            "label": "Secondary settings",
            "lines": [
              168,
              168
            ],
            "anchor": "Secondary settings sit in a `CollapsibleSection`. Every cont"
          },
          {
            "label": "User vocabulary",
            "lines": [
              169,
              169
            ],
            "anchor": "Labels use the user's words, such as \"Export slices\"."
          },
          {
            "label": "Images and focus order",
            "lines": [
              170,
              170
            ],
            "anchor": "Every `img` has `alt` text. Focus order follows the reading "
          }
        ]
      },
      {
        "id": "cp-read",
        "row": 22,
        "kind": "done",
        "title": "Verify the reading order",
        "lines": [
          174,
          174
        ],
        "anchor": "Then read the page from a distance: the sections and their e"
      }
    ],
    "edges": [
      {
        "to": "cp-components",
        "from": "cp-trig"
      },
      {
        "to": "cp-tokens",
        "from": "cp-components"
      },
      {
        "to": "cp-type",
        "from": "cp-tokens"
      },
      {
        "to": "cp-size",
        "from": "cp-type"
      },
      {
        "to": "cp-emphasis",
        "from": "cp-size"
      },
      {
        "to": "cp-spacing",
        "from": "cp-emphasis"
      },
      {
        "to": "cp-layout",
        "from": "cp-spacing"
      },
      {
        "to": "cp-grid",
        "from": "cp-layout",
        "label": "Stacked sections"
      },
      {
        "to": "cp-grid",
        "from": "cp-layout",
        "label": "Main with a supporting pane"
      },
      {
        "to": "cp-grid",
        "from": "cp-layout",
        "label": "List with detail"
      },
      {
        "to": "cp-grid",
        "from": "cp-layout",
        "label": "Grid of equals"
      },
      {
        "to": "cp-grid",
        "from": "cp-layout",
        "label": "Single column"
      },
      {
        "to": "cp-grid-span",
        "from": "cp-grid"
      },
      {
        "to": "cp-grid-columns",
        "from": "cp-grid-span"
      },
      {
        "to": "cp-grid-children",
        "from": "cp-grid-columns"
      },
      {
        "to": "cp-separation",
        "from": "cp-grid-children"
      },
      {
        "to": "cp-containers",
        "from": "cp-separation"
      },
      {
        "to": "cp-route",
        "from": "cp-containers"
      },
      {
        "to": "cp-router",
        "from": "cp-route",
        "label": "LiveTokensRouter"
      },
      {
        "to": "cp-overlay",
        "from": "cp-route",
        "label": "LiveEditorOverlay"
      },
      {
        "to": "cp-lazy",
        "from": "cp-router"
      },
      {
        "to": "cp-lazy",
        "from": "cp-overlay"
      },
      {
        "to": "cp-check",
        "from": "cp-lazy"
      },
      {
        "to": "cp-findings",
        "from": "cp-check"
      },
      {
        "to": "cp-fix",
        "from": "cp-findings",
        "label": "findings"
      },
      {
        "to": "cp-verify",
        "from": "cp-findings",
        "label": "clean"
      },
      {
        "to": "cp-check",
        "from": "cp-fix",
        "label": "repeat until clean",
        "back": true
      },
      {
        "to": "cp-read",
        "from": "cp-verify"
      }
    ]
  },
  "create-component": {
    "id": "live-tokens-create-component",
    "digest": "sha256:3b8a2ccd7e5cb4e6",
    "title": "create-component",
    "tagline": "A runtime/editor pair exposes full token editing in the CUSTOM catalogue.",
    "nodes": [
      {
        "id": "cc-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Create or expose an editable component",
        "desc": "A runtime/editor pair adds token editing to a new or existing Svelte component after the catalogue check.",
        "lines": [
          2,
          8
        ],
        "anchor": "name: live-tokens-create-component",
        "anchorEnd": "The end state is a runtime Svelte file, an editor Svelte fil"
      },
      {
        "id": "cc-read",
        "row": 1,
        "kind": "step",
        "title": "Study the closest shipped example",
        "desc": "Shipped patterns include Card parts, Badge variants, Button states, Dialog structure, and SegmentedControl linked siblings. Custom files live in src/system/components/.",
        "lines": [
          10,
          22
        ],
        "anchor": "## Worked examples ship inside the package",
        "anchorEnd": "Shipped editors live in `src/editor/component-editor/` becau"
      },
      {
        "id": "cc-run",
        "row": 3,
        "kind": "step",
        "n": "1",
        "title": "Write the runtime file",
        "desc": "Every editable CSS variable lives in :global(:root) with a theme-token default. The plugin seeds default.json from this block.",
        "lines": [
          24,
          26
        ],
        "anchor": "## The recipe",
        "anchorEnd": "**Runtime file**, `src/system/components/MyWidget.svelte`. D"
      },
      {
        "id": "cc-ed",
        "row": 4,
        "kind": "step",
        "n": "2",
        "title": "Write the editor file",
        "desc": "The module declares the component ID, one states map per VariantGroup, and the flat allTokens union. The markup renders those groups in ComponentEditorBase.",
        "lines": [
          27,
          27
        ],
        "anchor": "**Editor file**, `src/system/components/MyWidgetEditor.svelt"
      },
      {
        "id": "cc-ext",
        "row": 5,
        "kind": "chipset",
        "title": "Choose the applicable extensions",
        "desc": "The linked-sibling reference covers shared variant values; the intrinsics reference covers structural controls. Every component reads the sketch reference.",
        "chips": [
          {
            "label": "Shared variants: linked siblings",
            "lines": [
              181,
              181
            ],
            "anchor": "- `references/linked-siblings.md`: variants that share base "
          },
          {
            "label": "Structural controls: intrinsics",
            "lines": [
              182,
              182
            ],
            "anchor": "- `references/intrinsics.md`: structural or display choices "
          },
          {
            "label": "Sketch mode, required",
            "lines": [
              183,
              183
            ],
            "anchor": "- `references/sketch-mode.md`: joining the sketch layer. **E"
          }
        ],
        "lines": [
          177,
          183
        ],
        "anchor": "## Extensions",
        "anchorEnd": "- `references/sketch-mode.md`: joining the sketch layer. **E",
        "tag": "extension references"
      },
      {
        "id": "cc-reg",
        "row": 6,
        "kind": "step",
        "n": "3",
        "title": "Register through bootLiveTokens",
        "desc": "bootLiveTokens receives a unique component ID and registers it after editor initialization. Manually mounted apps call registerComponent immediately before mount.",
        "lines": [
          28,
          45
        ],
        "anchor": "**Register** by passing the component to `bootLiveTokens` in",
        "anchorEnd": "`bootLiveTokens` calls `registerComponent` for you after its"
      },
      {
        "id": "cc-desc",
        "row": 7,
        "kind": "step",
        "n": "4",
        "title": "Describe the component's purpose",
        "desc": "A leading HTML comment says what it is, what to use it for, and what to reach for instead; the catalogue pairs it with the id, variants, and props. componentDirs adds other source directories.",
        "lines": [
          46,
          58
        ],
        "anchor": "**Say what it is for.** The runtime file's leading HTML comm",
        "anchorEnd": "At most four lines, one sentence each: what it is, `Use for:"
      },
      {
        "id": "cc-sk",
        "row": 8,
        "kind": "step",
        "n": "5",
        "title": "Join the sketch layer",
        "desc": "Project components choose a reserved class by size and declare five --sketch-* values. The class requires normal flow, visible overflow, and free pseudo-elements. Package components register PartSpec.",
        "lines": [
          59,
          59
        ],
        "anchor": "**Join the sketch layer.** The effect draws a fixed set of p"
      },
      {
        "id": "cc-gate",
        "row": 9,
        "kind": "cli",
        "n": "6",
        "title": "Run the strict component check",
        "desc": "Strict mode turns warnings into failures; JSON adds stable rule IDs. An ID scopes one component; the default scope covers src/system/components/.",
        "lines": [
          60,
          66
        ],
        "anchor": "**Gate on the checker.** Run it, fix every error, and run it",
        "anchorEnd": "If it rejects a suffix, do not invent a new name for the rol",
        "command": "npx live-tokens check-component <id> --strict --json"
      },
      {
        "id": "cc-disc",
        "row": 2,
        "kind": "chipset",
        "title": "Apply the token rules",
        "desc": "These rules govern every token in the runtime and editor files.",
        "chips": [
          {
            "label": "Token names",
            "lines": [
              69,
              81
            ],
            "anchor": "## Token discipline",
            "anchorEnd": ""
          },
          {
            "label": "Allowed suffixes",
            "lines": [
              83,
              104
            ],
            "anchor": "### Suffix vocabulary",
            "anchorEnd": "compete. A suffix outside that list fails `check-component`."
          },
          {
            "label": "Common failures",
            "lines": [
              109,
              115
            ],
            "anchor": "### Rules that bite",
            "anchorEnd": "- **Text aliases.** Neutral scale is `--text-primary` / `--t"
          },
          {
            "label": "Typography groupKey",
            "lines": [
              116,
              126
            ],
            "anchor": "- **Typography `groupKey` on multi-slot components must incl",
            "anchorEnd": "The helper strips the `--<component>-` prefix and those segm"
          },
          {
            "label": "State model for stateful components",
            "lines": [
              128,
              164
            ],
            "anchor": "## State model",
            "anchorEnd": "```"
          },
          {
            "label": "Editor copy",
            "lines": [
              154,
              158
            ],
            "anchor": "## User-facing copy",
            "anchorEnd": "Custom chrome inside an editor snippet is rare, since `Compo"
          },
          {
            "label": "Public import paths",
            "lines": [
              160,
              175
            ],
            "anchor": "## Public imports only",
            "anchorEnd": "**Never deep-import `node_modules/@motion-proto/live-tokens/"
          },
          {
            "label": "Toggle example",
            "lines": [
              19,
              19
            ],
            "anchor": "- Every rule below in the fewest lines: `Toggle`. Component "
          }
        ],
        "tag": "global rules"
      },
      {
        "id": "cc-fail",
        "row": 10,
        "kind": "gate",
        "title": "Fix component-check findings",
        "desc": "Each pass repairs one rule group. A rejected suffix takes the role name from a shipped component that paints the same element.",
        "lines": [
          60,
          66
        ],
        "anchor": "**Gate on the checker.** Run it, fix every error, and run it",
        "anchorEnd": "If it rejects a suffix, do not invent a new name for the rol"
      },
      {
        "id": "cc-ver",
        "row": 10,
        "kind": "ok",
        "n": "7",
        "title": "Static contract passes",
        "desc": "The checker confirms file layout, token names, state order, imports, registration, editor/runtime parity, and valid theme-backed defaults or declared intrinsics.",
        "lines": [
          185,
          187
        ],
        "anchor": "## Verification checklist",
        "anchorEnd": "Step 6 of the recipe is the static gate: `npx live-tokens ch",
        "chips": [
          {
            "label": "Verification checklist",
            "lines": [
              67,
              67
            ],
            "anchor": "**Verify** with the checklist at the bottom of this file, th"
          }
        ]
      },
      {
        "id": "cc-test",
        "row": 11,
        "kind": "step",
        "title": "Run the registry contract test",
        "desc": "The test checks registration, unique variables, runtime declarations, default.json seeds, opacity floors, and alias round trips. checkRegistryEntry covers custom components; builtInRegistry covers shipped components.",
        "lines": [
          189,
          189
        ],
        "anchor": "**Then run the registry contract test.** `checkRegistryEntry"
      },
      {
        "id": "cc-intr",
        "row": 13,
        "kind": "step",
        "title": "Run the intrinsics contract test",
        "desc": "The test verifies that every intrinsic and variant has matching, allowed runtime and editor defaults.",
        "lines": [
          191,
          191
        ],
        "anchor": "**If your component declares `intrinsics`, the intrinsics co"
      },
      {
        "id": "cc-intr-q",
        "row": 12,
        "kind": "decide",
        "title": "Does the component declare intrinsics?",
        "desc": "Components with structural or display choices run the intrinsics contract test.",
        "lines": [
          191,
          191
        ],
        "anchor": "**If your component declares `intrinsics`, the intrinsics co"
      },
      {
        "id": "cc-man",
        "row": 14,
        "kind": "step",
        "title": "Verify the component at runtime",
        "desc": "The runtime review at /live-tokens/components checks the CUSTOM entry, token controls, default derivation, persistence, Reset, clean boot, and sketch mode. Linked components also verify linked-block sync.",
        "lines": [
          193,
          201
        ],
        "anchor": "Finally navigate to `/live-tokens/components` and confirm th",
        "anchorEnd": "- [ ] Switch Sketch mode on in the editor and walk the check"
      },
      {
        "id": "cc-place",
        "row": 15,
        "kind": "hand",
        "title": "Continue with create-page",
        "desc": "create-page places the completed component on a page.",
        "lines": [
          67,
          67
        ],
        "anchor": "**Verify** with the checklist at the bottom of this file, th"
      }
    ],
    "edges": [
      {
        "from": "cc-trig",
        "to": "cc-read"
      },
      {
        "from": "cc-read",
        "to": "cc-disc"
      },
      {
        "from": "cc-disc",
        "to": "cc-run"
      },
      {
        "from": "cc-run",
        "to": "cc-ed"
      },
      {
        "from": "cc-ed",
        "to": "cc-ext"
      },
      {
        "from": "cc-ext",
        "to": "cc-reg"
      },
      {
        "from": "cc-reg",
        "to": "cc-desc"
      },
      {
        "from": "cc-desc",
        "to": "cc-sk"
      },
      {
        "from": "cc-sk",
        "to": "cc-gate"
      },
      {
        "from": "cc-ver",
        "to": "cc-test"
      },
      {
        "from": "cc-test",
        "to": "cc-intr-q"
      },
      {
        "from": "cc-intr-q",
        "to": "cc-intr",
        "label": "has intrinsics"
      },
      {
        "from": "cc-intr-q",
        "to": "cc-man",
        "label": "token values only"
      },
      {
        "from": "cc-intr",
        "to": "cc-man"
      },
      {
        "from": "cc-man",
        "to": "cc-place"
      },
      {
        "from": "cc-gate",
        "to": "cc-fail",
        "label": "exit 1"
      },
      {
        "from": "cc-gate",
        "to": "cc-ver",
        "label": "exit 0"
      },
      {
        "from": "cc-fail",
        "to": "cc-gate",
        "label": "rerun",
        "back": true
      }
    ]
  },
  "check-compliance": {
    "id": "live-tokens-check-compliance",
    "digest": "sha256:495beffadd041e80",
    "title": "check-compliance",
    "tagline": "A read-only report explains project compliance and repair cost, then hands findings to fix-findings.",
    "nodes": [
      {
        "id": "cc2-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Review design-system compliance",
        "desc": "The report covers migrations, components, usage, checker findings, and repair cost. fix-findings applies repairs; the editor handles single tokens.",
        "lines": [
          2,
          3
        ],
        "anchor": "name: live-tokens-check-compliance",
        "anchorEnd": "description: Check an existing @motion-proto/live-tokens pro"
      },
      {
        "id": "cc2-why",
        "row": 1,
        "kind": "step",
        "title": "Keep the audit read-only",
        "desc": "The command supplies every fact. The review explains each finding and estimates its repair cost.",
        "lines": [
          8,
          8
        ],
        "anchor": "The answer to \"check this project\" is a report. Every fact i"
      },
      {
        "id": "cc2-run",
        "row": 2,
        "kind": "cli",
        "n": "1",
        "title": "Generate the compliance report",
        "desc": "The report reads files and exits 0 even when it finds problems.",
        "lines": [
          12,
          12
        ],
        "anchor": "Run `npx live-tokens report --json`. It always exits 0: it i",
        "command": "npx live-tokens report --json"
      },
      {
        "id": "cc2-upgrade",
        "row": 3,
        "kind": "gate",
        "title": "Upgrade to get the report command",
        "desc": "Upgrading @motion-proto/live-tokens restores the command. The next run generates the report.",
        "lines": [
          12,
          12
        ],
        "anchor": "Run `npx live-tokens report --json`. It always exits 0: it i"
      },
      {
        "id": "cc2-sections",
        "row": 3,
        "kind": "chipset",
        "title": "Read each report section",
        "desc": "Each section names a project fact and the repair cost for each actionable finding.",
        "lines": [
          19,
          30
        ],
        "anchor": "## The report's sections",
        "anchorEnd": "| `findings.pages`, `findings.components` | Both checkers' f",
        "chips": [
          {
            "label": "migrations",
            "lines": [
              23,
              23
            ],
            "anchor": "| `migrations` | Whether `tokens.css` is behind the installe"
          },
          {
            "label": "components[].unread",
            "lines": [
              24,
              24
            ],
            "anchor": "| `components[].unread` | Tokens a component declares that n"
          },
          {
            "label": "components[].registered",
            "lines": [
              25,
              25
            ],
            "anchor": "| `components[].registered` | A component file with no `boot"
          },
          {
            "label": "components[].described",
            "lines": [
              26,
              26
            ],
            "anchor": "| `components[].described` | Whether the runtime file has th"
          },
          {
            "label": "usage.byPage",
            "lines": [
              27,
              27
            ],
            "anchor": "| `usage.byPage` | Which catalogue component each page rende"
          },
          {
            "label": "usage.unusedShipped",
            "lines": [
              28,
              28
            ],
            "anchor": "| `usage.unusedShipped` | Shipped components no page renders"
          },
          {
            "label": "usage.customUnregistered / usage.customUnused",
            "lines": [
              29,
              29
            ],
            "anchor": "| `usage.customUnregistered`, `usage.customUnused` | The pro"
          },
          {
            "label": "findings.pages / findings.components",
            "lines": [
              30,
              30
            ],
            "anchor": "| `findings.pages`, `findings.components` | Both checkers' f"
          }
        ]
      },
      {
        "id": "cc2-drill-q",
        "row": 4,
        "kind": "decide",
        "title": "Does a finding need more evidence?",
        "desc": "A component or token-scale query supplies additional evidence for classification.",
        "lines": [
          17,
          17
        ],
        "anchor": "`npx live-tokens components <id>` and `npx live-tokens token"
      },
      {
        "id": "cc2-drill",
        "row": 5,
        "kind": "cli",
        "title": "Inspect the component or scale",
        "desc": "components <id> lists props, values, and tokens. tokens --family <name> lists one scale. Both commands accept --json.",
        "lines": [
          17,
          17
        ],
        "anchor": "`npx live-tokens components <id>` and `npx live-tokens token",
        "command": "npx live-tokens components <id> --json\nnpx live-tokens tokens --family <name> --json"
      },
      {
        "id": "cc2-read",
        "row": 6,
        "kind": "step",
        "n": "2",
        "title": "Classify each fix",
        "desc": "Mechanical fixes follow a fixed mapping; judgement calls require a semantic choice. The classification names the choice and any visible shift.",
        "lines": [
          32,
          35
        ],
        "anchor": "## Mechanical or judgement",
        "anchorEnd": "- **Judgement**: a colour literal mapped by the role it play"
      },
      {
        "id": "cc2-deliberate-q",
        "row": 7,
        "kind": "decide",
        "title": "Deliberate finding?",
        "desc": "Overlays, project-owned layout sizes, artwork, and vendored CSS require an intent check.",
        "lines": [
          37,
          39
        ],
        "anchor": "## Deliberate findings",
        "anchorEnd": "A translucent overlay on an app shell, or a layout size the "
      },
      {
        "id": "cc2-deliberate",
        "row": 8,
        "kind": "step",
        "n": "3",
        "title": "Name the narrowest config entry",
        "desc": "The review names a rule-severity entry or file exclusion and identifies the narrower choice. The user controls the config change.",
        "lines": [
          37,
          39
        ],
        "anchor": "## Deliberate findings",
        "anchorEnd": "A translucent overlay on an app shell, or a layout size the "
      },
      {
        "id": "cc2-report",
        "row": 9,
        "kind": "chipset",
        "n": "4",
        "title": "Report six sections with counts",
        "desc": "The summary lists files for current errors, orders fixes by the fix-findings sequence, and marks each as mechanical or judgement.",
        "lines": [
          41,
          48
        ],
        "anchor": "## Summary",
        "anchorEnd": "Recommended fixes, in the order **live-tokens-fix-findings**",
        "chips": [
          {
            "label": "Pending migrations",
            "lines": [
              43,
              43
            ],
            "anchor": "Migrations pending, and the one command that clears them."
          },
          {
            "label": "Current build errors",
            "lines": [
              44,
              44
            ],
            "anchor": "What fails the build now: errors by rule, with the files."
          },
          {
            "label": "Strict warnings",
            "lines": [
              45,
              45
            ],
            "anchor": "What the strict count adds: warnings by rule."
          },
          {
            "label": "Components",
            "lines": [
              46,
              46
            ],
            "anchor": "Components: unread tokens, unregistered, undescribed."
          },
          {
            "label": "Usage",
            "lines": [
              47,
              47
            ],
            "anchor": "Usage: what each page renders, and what is used nowhere."
          },
          {
            "label": "Recommended fixes",
            "lines": [
              48,
              48
            ],
            "anchor": "Recommended fixes, in the order **live-tokens-fix-findings**"
          }
        ]
      },
      {
        "id": "cc2-done",
        "row": 10,
        "kind": "hand",
        "title": "Hand off the fixes",
        "desc": "The hand-off offers live-tokens-fix-findings for the full set or a selected subset. The audit preserves project files.",
        "lines": [
          50,
          50
        ],
        "anchor": "End with the hand-off: \"Run live-tokens-fix-findings to appl"
      }
    ],
    "edges": [
      {
        "from": "cc2-trig",
        "to": "cc2-why"
      },
      {
        "from": "cc2-why",
        "to": "cc2-run"
      },
      {
        "from": "cc2-run",
        "to": "cc2-upgrade",
        "label": "unknown command"
      },
      {
        "from": "cc2-upgrade",
        "to": "cc2-run",
        "label": "retry",
        "back": true
      },
      {
        "from": "cc2-run",
        "to": "cc2-sections",
        "label": "report ready"
      },
      {
        "from": "cc2-read",
        "to": "cc2-deliberate-q"
      },
      {
        "from": "cc2-deliberate-q",
        "to": "cc2-deliberate",
        "label": "possible exception"
      },
      {
        "from": "cc2-deliberate-q",
        "to": "cc2-report",
        "label": "ordinary finding"
      },
      {
        "from": "cc2-deliberate",
        "to": "cc2-report"
      },
      {
        "from": "cc2-report",
        "to": "cc2-done"
      },
      {
        "from": "cc2-sections",
        "to": "cc2-drill-q"
      },
      {
        "from": "cc2-drill-q",
        "to": "cc2-drill",
        "label": "needs evidence"
      },
      {
        "from": "cc2-drill-q",
        "to": "cc2-read",
        "label": "enough evidence"
      },
      {
        "from": "cc2-drill",
        "to": "cc2-read"
      }
    ]
  },
  "fix-findings": {
    "id": "live-tokens-fix-findings",
    "digest": "sha256:f31b82cb3aefa302",
    "title": "fix-findings",
    "tagline": "The repair loop clears the largest error group first, repeats by rule, and ends with strict validation.",
    "nodes": [
      {
        "id": "ff-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Fix design-system findings",
        "desc": "The loop groups existing findings by rule, applies each recipe, and reruns both checkers. check-compliance supplies the read-only report.",
        "lines": [
          2,
          3
        ],
        "anchor": "name: live-tokens-fix-findings",
        "anchorEnd": "description: Bring an existing @motion-proto/live-tokens pro"
      },
      {
        "id": "ff-why",
        "row": 1,
        "kind": "step",
        "title": "Enforce page and component contracts",
        "desc": "The page checker enforces catalogue components, declared props, and tokenized CSS. The component checker enforces semantic token names and theme-backed defaults. Passing files repaint.",
        "lines": [
          8,
          10
        ],
        "anchor": "Two checkers hold a project to its design system. `check-pag",
        "anchorEnd": "This skill is the loop for code that already exists. When th"
      },
      {
        "id": "ff-run",
        "row": 2,
        "kind": "cli",
        "n": "1",
        "title": "Collect all findings",
        "desc": "Each finding includes a stable rule, file, and line. A page path scopes check-page; a component ID scopes check-component.",
        "lines": [
          14,
          19
        ],
        "anchor": "Run both checkers with `--json`. Each finding carries a stab",
        "anchorEnd": "`check-page src/pages/Home.svelte` and `check-component <id>",
        "command": "npx live-tokens check-page --json\nnpx live-tokens check-component --json"
      },
      {
        "id": "ff-blocked",
        "row": 3,
        "kind": "gate",
        "title": "Upgrade to get the checkers",
        "desc": "A package upgrade supplies the checkers. migrate --check plans token changes; migrate --write applies them. --tokens identifies a custom tokens.css path.",
        "lines": [
          19,
          19
        ],
        "anchor": "`check-page src/pages/Home.svelte` and `check-component <id>"
      },
      {
        "id": "ff-empty",
        "row": 3,
        "kind": "ok",
        "title": "Default checks pass",
        "desc": "Strict validation now reveals advisory warnings.",
        "lines": [
          23,
          23
        ],
        "anchor": "Run once with `--strict` and report what it adds, so the use"
      },
      {
        "id": "ff-loop",
        "row": 4,
        "kind": "step",
        "n": "2",
        "title": "Group findings by rule",
        "desc": "Errors precede warnings. The largest rule group gives one recipe the widest effect.",
        "lines": [
          20,
          20
        ],
        "anchor": "Group by rule. Take errors before warnings, and the rule wit"
      },
      {
        "id": "ff-never",
        "row": 5,
        "kind": "chipset",
        "title": "Protect three constraints",
        "desc": "--off applies to one working run. Severity changes require user approval. Repairs use existing tokens and report every visible shift.",
        "chips": [
          {
            "label": "Keep project rule severity",
            "lines": [
              29,
              29
            ],
            "anchor": "- **Silence a rule to pass.** `--off=<rule>` is for a single"
          },
          {
            "label": "Map to existing tokens",
            "lines": [
              30,
              30
            ],
            "anchor": "- **Mint a token.** A literal with no token behind it is rem"
          },
          {
            "label": "Report visible changes",
            "lines": [
              31,
              31
            ],
            "anchor": "- **Change what the page looks like without saying so.** Mos"
          }
        ]
      },
      {
        "id": "ff-recipe",
        "row": 6,
        "kind": "decide",
        "n": "3",
        "title": "Finding type?",
        "desc": "One recipe covers the group: page colours by role, geometry by scale, or the rule table. Unknown components enter a separate hand-off.",
        "lines": [
          21,
          21
        ],
        "anchor": "Apply that rule's recipe to every finding in the group: colo"
      },
      {
        "id": "ff-colour",
        "row": 7,
        "kind": "step",
        "title": "Map page colours by role",
        "desc": "Each page literal maps by job: text, fill, stroke, scrim, tint, transparency, or gradient. Role tokens then move coherently with the theme.",
        "lines": [
          33,
          48
        ],
        "anchor": "## Colour by role, never by hue",
        "anchorEnd": "A `var(--x, #fff)` fallback is not a finding. A named colour"
      },
      {
        "id": "ff-geom",
        "row": 7,
        "kind": "step",
        "title": "Map geometry to its scale",
        "desc": "Theme-owned geometry maps to token scales: nearest-step spacing, matching stroke and corner tokens, whole-shadow replacements, and tokenized geometry inside calc(). Layout sizing remains intact.",
        "lines": [
          50,
          62
        ],
        "anchor": "## Geometry by scale",
        "anchorEnd": "While in the file, motion values take `--duration-*` and `--"
      },
      {
        "id": "ff-rest",
        "row": 7,
        "kind": "chipset",
        "title": "Apply the rule's recipe",
        "desc": "The table supplies one repair for every finding in the current rule group.",
        "lines": [
          64,
          81
        ],
        "anchor": "## Every other rule",
        "anchorEnd": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to",
        "chips": [
          {
            "label": "unknown-token",
            "lines": [
              68,
              68
            ],
            "anchor": "| `unknown-token` | A typo or a rename. Search `tokens.css` "
          },
          {
            "label": "raw-text-axis",
            "lines": [
              69,
              69
            ],
            "anchor": "| `raw-text-axis` | Set the whole axis set from one text sty"
          },
          {
            "label": "unknown-prop, unknown-prop-value",
            "lines": [
              71,
              72
            ],
            "anchor": "| `unknown-prop` | The component drops it at runtime. `npx l",
            "anchorEnd": "| `unknown-prop-value` | Pick a value from the union the mes"
          },
          {
            "label": "hardcoded-columns",
            "lines": [
              73,
              73
            ],
            "anchor": "| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` "
          },
          {
            "label": "site-css-in-main, missing-source, reserved-route",
            "lines": [
              74,
              76
            ],
            "anchor": "| `site-css-in-main` | Delete the import from `main.ts` and ",
            "anchorEnd": "| `reserved-route` | Move the route out of `/live-tokens/*`;"
          },
          {
            "label": "deep-import",
            "lines": [
              77,
              77
            ],
            "anchor": "| `deep-import` | Import from `@motion-proto/live-tokens` or"
          },
          {
            "label": "Token naming",
            "lines": [
              78,
              78
            ],
            "anchor": "| `unknown-suffix`, `state-after-property`, `disabled-is-ter"
          },
          {
            "label": "Component defaults",
            "lines": [
              79,
              79
            ],
            "anchor": "| `color-literal`, `unknown-token-ref`, `default-not-token` "
          },
          {
            "label": "Editor/runtime mismatches",
            "lines": [
              80,
              80
            ],
            "anchor": "| `phantom-editor-token`, `phantom-link` | The editor names "
          },
          {
            "label": "Component wiring",
            "lines": [
              81,
              81
            ],
            "anchor": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to"
          }
        ]
      },
      {
        "id": "ff-hand",
        "row": 7,
        "kind": "hand",
        "title": "Resolve the unknown component",
        "desc": "pick-component finds a catalogue match. create-component builds a new editable component.",
        "lines": [
          70,
          70
        ],
        "anchor": "| `unknown-component` | Not in the catalogue. Read **live-to"
      },
      {
        "id": "ff-gate",
        "row": 8,
        "kind": "decide",
        "n": "4",
        "title": "Rerun result?",
        "desc": "Repairable findings return to the grouped loop. An unmatched literal enters the report with its rationale.",
        "lines": [
          22,
          22
        ],
        "anchor": "Run again. New findings can appear as old ones clear: a toke"
      },
      {
        "id": "ff-strict",
        "row": 9,
        "kind": "cli",
        "n": "5",
        "title": "Run strict validation",
        "desc": "--strict exposes advisory warnings after the default checks pass.",
        "lines": [
          23,
          23
        ],
        "anchor": "Run once with `--strict` and report what it adds, so the use",
        "command": "npx live-tokens check-page --strict --json\nnpx live-tokens check-component --strict --json"
      },
      {
        "id": "ff-warn",
        "row": 10,
        "kind": "decide",
        "title": "Clear strict warnings now?",
        "desc": "The user selects the warnings to repair. Accepted warnings return to the rule loop and both validation stages.",
        "lines": [
          23,
          23
        ],
        "anchor": "Run once with `--strict` and report what it adds, so the use"
      },
      {
        "id": "ff-clean",
        "row": 10,
        "kind": "ok",
        "title": "Strict checks pass",
        "desc": "Both strict checks exit 0.",
        "lines": [
          23,
          23
        ],
        "anchor": "Run once with `--strict` and report what it adds, so the use"
      },
      {
        "id": "ff-report",
        "row": 11,
        "kind": "step",
        "title": "Report changes by rule",
        "desc": "The final report gives each rule's count and visible shifts, explains unresolved findings, records approved config entries, and includes both commands with exit codes.",
        "lines": [
          83,
          85
        ],
        "anchor": "## Report",
        "anchorEnd": "Say what changed by rule, one line per rule with the count a"
      },
      {
        "id": "ff-script",
        "row": 12,
        "kind": "step",
        "title": "Gate builds with check:design",
        "desc": "Scaffolded projects include check:design. Other projects add both checkers to that script and run it before vite build.",
        "lines": [
          25,
          25
        ],
        "anchor": "A project scaffolded by `create` has a `check:design` script"
      },
      {
        "id": "ff-ver",
        "row": 13,
        "kind": "done",
        "title": "Verify that every touched file repaints",
        "desc": "A surface-colour and spacing change in /live-tokens/editor tests every touched file. Any repaint failure becomes a reported checker gap.",
        "lines": [
          87,
          89
        ],
        "anchor": "## Verify",
        "anchorEnd": "Open `/live-tokens/editor` in dev and change a surface colou"
      }
    ],
    "edges": [
      {
        "from": "ff-trig",
        "to": "ff-why"
      },
      {
        "from": "ff-why",
        "to": "ff-run"
      },
      {
        "from": "ff-run",
        "to": "ff-blocked",
        "label": "unknown command"
      },
      {
        "from": "ff-blocked",
        "to": "ff-run",
        "label": "retry",
        "back": true
      },
      {
        "from": "ff-run",
        "to": "ff-loop",
        "label": "findings"
      },
      {
        "from": "ff-run",
        "to": "ff-empty",
        "label": "clean"
      },
      {
        "from": "ff-empty",
        "to": "ff-strict"
      },
      {
        "from": "ff-loop",
        "to": "ff-never"
      },
      {
        "from": "ff-never",
        "to": "ff-recipe"
      },
      {
        "from": "ff-recipe",
        "to": "ff-colour",
        "label": "page colour"
      },
      {
        "from": "ff-recipe",
        "to": "ff-geom",
        "label": "geometry"
      },
      {
        "from": "ff-recipe",
        "to": "ff-rest",
        "label": "other rule"
      },
      {
        "from": "ff-recipe",
        "to": "ff-hand",
        "label": "unknown component"
      },
      {
        "from": "ff-colour",
        "to": "ff-gate"
      },
      {
        "from": "ff-geom",
        "to": "ff-gate"
      },
      {
        "from": "ff-rest",
        "to": "ff-gate"
      },
      {
        "from": "ff-hand",
        "to": "ff-gate"
      },
      {
        "from": "ff-gate",
        "to": "ff-loop",
        "label": "repairable findings",
        "back": true
      },
      {
        "from": "ff-gate",
        "to": "ff-report",
        "label": "unmatched literal"
      },
      {
        "from": "ff-gate",
        "to": "ff-strict",
        "label": "clean"
      },
      {
        "from": "ff-strict",
        "to": "ff-warn",
        "label": "warnings"
      },
      {
        "from": "ff-strict",
        "to": "ff-clean",
        "label": "clean"
      },
      {
        "from": "ff-warn",
        "to": "ff-loop",
        "label": "clear now",
        "back": true
      },
      {
        "from": "ff-warn",
        "to": "ff-report",
        "label": "defer repairs"
      },
      {
        "from": "ff-clean",
        "to": "ff-report"
      },
      {
        "from": "ff-report",
        "to": "ff-script"
      },
      {
        "from": "ff-script",
        "to": "ff-ver"
      }
    ]
  }
};

export const skillKeys = Object.keys(skillTrees);
