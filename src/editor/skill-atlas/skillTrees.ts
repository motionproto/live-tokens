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
    "digest": "sha256:e76b07ab702280f6",
    "title": "create-component",
    "tagline": "Map design tokens to semantic properties, build the runtime and editor, register the component, and verify it.",
    "nodes": [
      {
        "id": "cc-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Create an editable component",
        "desc": "Use when live-tokens-pick-component finds no suitable component, or the user asks for a new component. Use when the user asks to make an existing Svelte component editable in the live-tokens editor.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Create an editable component for a @motion-prot"
      },
      {
        "id": "cc-model",
        "row": 1,
        "kind": "chipset",
        "title": "Use the two-layer design model",
        "lines": [
          10,
          25
        ],
        "anchor": "## Design model",
        "anchorEnd": "Props carry content and behavior: a value, a label, a callba",
        "chips": [
          {
            "label": "Design tokens",
            "lines": [
              16,
              16
            ],
            "anchor": "| Design tokens | Name the available colors, typography, geo"
          },
          {
            "label": "Semantic properties",
            "lines": [
              17,
              17
            ],
            "anchor": "| Semantic properties | Name the visual roles within a compo"
          }
        ]
      },
      {
        "id": "cc-inspect",
        "row": 2,
        "kind": "step",
        "title": "Read the project configuration",
        "lines": [
          31,
          31
        ],
        "anchor": "Read the project's `package.json`, `live-tokens.config.json`",
        "n": "1"
      },
      {
        "id": "cc-catalogue",
        "row": 3,
        "kind": "step",
        "title": "Run the catalogue",
        "lines": [
          32,
          32
        ],
        "anchor": "Run `npx live-tokens components`. The list holds every compo",
        "n": "2"
      },
      {
        "id": "cc-tokens",
        "row": 4,
        "kind": "step",
        "title": "Inspect the token families",
        "lines": [
          33,
          33
        ],
        "anchor": "Run `npx live-tokens tokens --family <name>` for each family",
        "n": "3"
      },
      {
        "id": "cc-examples",
        "row": 5,
        "kind": "step",
        "title": "Read a runtime and editor pair",
        "lines": [
          34,
          34
        ],
        "anchor": "Read a shipped runtime and editor pair: `Toggle` for interac",
        "n": "4"
      },
      {
        "id": "cc-suffixes",
        "row": 6,
        "kind": "ref",
        "title": "Read the property suffixes",
        "lines": [
          35,
          35
        ],
        "anchor": "Read `references/token-naming.md` for the suffixes that sele",
        "n": "5",
        "reference": "references/token-naming.md"
      },
      {
        "id": "cc-map",
        "row": 7,
        "kind": "chipset",
        "title": "Map each editable role",
        "lines": [
          41,
          54
        ],
        "anchor": "Before writing a file, identify the component's parts, text ",
        "anchorEnd": "Assign from the tokens the project has. Match the token fami",
        "chips": [
          {
            "label": "--statcard-surface",
            "lines": [
              45,
              45
            ],
            "anchor": "| `--statcard-surface` | `--surface-neutral` | `background` "
          },
          {
            "label": "--statcard-border",
            "lines": [
              46,
              46
            ],
            "anchor": "| `--statcard-border` | `--border-neutral` | `border-color` "
          },
          {
            "label": "--statcard-border-width",
            "lines": [
              47,
              47
            ],
            "anchor": "| `--statcard-border-width` | `--border-width-1` | `border-w"
          },
          {
            "label": "--statcard-radius",
            "lines": [
              48,
              48
            ],
            "anchor": "| `--statcard-radius` | `--radius-md` | `border-radius` |"
          },
          {
            "label": "--statcard-padding",
            "lines": [
              49,
              49
            ],
            "anchor": "| `--statcard-padding` | `--space-16` | `padding` |"
          },
          {
            "label": "--statcard-value",
            "lines": [
              50,
              50
            ],
            "anchor": "| `--statcard-value` | `--text-primary` | `color` of the val"
          },
          {
            "label": "--statcard-value-font-size",
            "lines": [
              51,
              51
            ],
            "anchor": "| `--statcard-value-font-size` | `--font-size-2xl` | `font-s"
          },
          {
            "label": "--statcard-label",
            "lines": [
              52,
              52
            ],
            "anchor": "| `--statcard-label` | `--text-secondary` | `color` of the l"
          }
        ]
      },
      {
        "id": "cc-name",
        "row": 8,
        "kind": "chipset",
        "title": "Name semantic properties",
        "lines": [
          56,
          68
        ],
        "anchor": "A property name starts with the component id and ends with t",
        "anchorEnd": "For a state that affects several parts, follow Toggle: `--to",
        "chips": [
          {
            "label": "Component id",
            "lines": [
              62,
              62
            ],
            "anchor": "`componentId` is the runtime file name in lowercase with no "
          },
          {
            "label": "Variant",
            "lines": [
              63,
              63
            ],
            "anchor": "`variant` is present when the component has more than one: `"
          },
          {
            "label": "Part",
            "lines": [
              64,
              64
            ],
            "anchor": "`part` names a region inside the component: `header`, `body`"
          },
          {
            "label": "State",
            "lines": [
              65,
              65
            ],
            "anchor": "`state` comes before the property: `--card-hover-border`. `d"
          },
          {
            "label": "Property suffix",
            "lines": [
              66,
              66
            ],
            "anchor": "`property` is the suffix, and the suffix selects the editor "
          }
        ]
      },
      {
        "id": "cc-align",
        "row": 9,
        "kind": "step",
        "title": "Reuse the shipped role names",
        "lines": [
          70,
          70
        ],
        "anchor": "Name a role as the shipped component that paints the same th"
      },
      {
        "id": "cc-runtime",
        "row": 10,
        "kind": "step",
        "title": "Create the runtime component",
        "lines": [
          72,
          114
        ],
        "anchor": "## Runtime component",
        "anchorEnd": "The excerpt shows the chain for part of the property map. Ev"
      },
      {
        "id": "cc-intrinsic-q",
        "row": 11,
        "kind": "decide",
        "title": "Structural properties",
        "desc": "Does a property carry a structural choice?",
        "lines": [
          114,
          114
        ],
        "anchor": "The excerpt shows the chain for part of the property map. Ev"
      },
      {
        "id": "cc-intrinsics",
        "row": 12,
        "kind": "ref",
        "title": "Declare intrinsics",
        "lines": [
          114,
          114
        ],
        "anchor": "The excerpt shows the chain for part of the property map. Ev",
        "reference": "references/intrinsics.md"
      },
      {
        "id": "cc-states",
        "row": 13,
        "kind": "chipset",
        "title": "Separate parts, variants, and states",
        "lines": [
          116,
          132
        ],
        "anchor": "## Variants and states",
        "anchorEnd": "A component supplies its variants. The page chooses the one ",
        "chips": [
          {
            "label": "Part",
            "lines": [
              122,
              122
            ],
            "anchor": "| Part | Regions present at once | Dialog's overlay, header,"
          },
          {
            "label": "Variant",
            "lines": [
              123,
              123
            ],
            "anchor": "| Variant | Alternative presentations the page chooses | Bad"
          },
          {
            "label": "State",
            "lines": [
              124,
              124
            ],
            "anchor": "| State | A runtime condition | Toggle's on, hover, disabled"
          }
        ]
      },
      {
        "id": "cc-editor",
        "row": 14,
        "kind": "step",
        "title": "Export the property schema",
        "lines": [
          138,
          138
        ],
        "anchor": "A `<script module>` block exports `component`, the id, and `",
        "n": "1"
      },
      {
        "id": "cc-editor-preview",
        "row": 15,
        "kind": "step",
        "title": "Map states to preview props",
        "lines": [
          139,
          139
        ],
        "anchor": "The instance script imports the runtime component and the ed",
        "n": "2"
      },
      {
        "id": "cc-editor-markup",
        "row": 16,
        "kind": "step",
        "title": "Render the editor and preview",
        "lines": [
          140,
          140
        ],
        "anchor": "The markup mounts `ComponentEditorBase` with one `VariantGro",
        "n": "3"
      },
      {
        "id": "cc-linked-q",
        "row": 17,
        "kind": "decide",
        "title": "Shared values",
        "desc": "Do variants share a value?",
        "lines": [
          176,
          176
        ],
        "anchor": "When variants share a value, read `references/linked-sibling"
      },
      {
        "id": "cc-linked",
        "row": 18,
        "kind": "ref",
        "title": "Declare linked properties",
        "lines": [
          176,
          176
        ],
        "anchor": "When variants share a value, read `references/linked-sibling",
        "reference": "references/linked-siblings.md"
      },
      {
        "id": "cc-register",
        "row": 19,
        "kind": "step",
        "title": "Register the component",
        "lines": [
          178,
          201
        ],
        "anchor": "## Registration",
        "anchorEnd": "Inside the live-tokens repository, a first-party component k"
      },
      {
        "id": "cc-sketch",
        "row": 20,
        "kind": "ref",
        "title": "Integrate Sketch mode",
        "lines": [
          205,
          205
        ],
        "anchor": "Every component joins the sketch layer: read `references/ske",
        "reference": "references/sketch-mode.md"
      },
      {
        "id": "cc-overlay-q",
        "row": 21,
        "kind": "decide",
        "title": "Fixed overlays",
        "desc": "Does the component have a fixed overlay?",
        "lines": [
          207,
          207
        ],
        "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-"
      },
      {
        "id": "cc-portal",
        "row": 22,
        "kind": "ref",
        "title": "Portal the fixed overlay",
        "lines": [
          207,
          207
        ],
        "anchor": "A fixed overlay portals to `<body>`: read `references/fixed-",
        "reference": "references/fixed-overlays.md"
      },
      {
        "id": "cc-audit",
        "row": 23,
        "kind": "step",
        "title": "Run live-tokens-check-compliance",
        "lines": [
          211,
          211
        ],
        "anchor": "Run **live-tokens-check-compliance** and address its finding"
      },
      {
        "id": "cc-check",
        "row": 24,
        "kind": "cli",
        "title": "Run the strict component check",
        "lines": [
          211,
          211
        ],
        "anchor": "Run **live-tokens-check-compliance** and address its finding",
        "command": "npx live-tokens check-component <id> --strict --json",
        "n": "1"
      },
      {
        "id": "cc-fail",
        "row": 25,
        "kind": "gate",
        "title": "Resolve the findings",
        "desc": "Apply live-tokens-fix-findings using the rule sections, then rerun.",
        "lines": [
          211,
          211
        ],
        "anchor": "Run **live-tokens-check-compliance** and address its finding",
        "chips": [
          {
            "label": "unknown-suffix, state-after-property, disabled-is-terminal",
            "lines": [
              221,
              221
            ],
            "anchor": "| `unknown-suffix`, `state-after-property`, `disabled-is-ter"
          },
          {
            "label": "default-not-token, color-literal, dimension-literal, unknown-token-ref",
            "lines": [
              222,
              222
            ],
            "anchor": "| `default-not-token`, `color-literal`, `dimension-literal`,"
          },
          {
            "label": "invalid-id, missing-file, missing-root-block, no-tokens",
            "lines": [
              223,
              223
            ],
            "anchor": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to"
          },
          {
            "label": "missing-component-const, missing-all-tokens, phantom-editor-token, phantom-link, deep-import",
            "lines": [
              224,
              224
            ],
            "anchor": "| `missing-component-const`, `missing-all-tokens`, `phantom-"
          },
          {
            "label": "missing-registration",
            "lines": [
              225,
              225
            ],
            "anchor": "| `missing-registration` | Registration |"
          }
        ]
      },
      {
        "id": "cc-pass",
        "row": 25,
        "kind": "ok",
        "title": "Component check passes",
        "lines": [
          211,
          211
        ],
        "anchor": "Run **live-tokens-check-compliance** and address its finding"
      },
      {
        "id": "cc-build",
        "row": 27,
        "kind": "step",
        "title": "Run the Svelte check and build",
        "lines": [
          212,
          212
        ],
        "anchor": "Run the project's Svelte check and its build.",
        "n": "2"
      },
      {
        "id": "cc-contract",
        "row": 28,
        "kind": "ref",
        "title": "Verify the registry and intrinsics",
        "lines": [
          213,
          213
        ],
        "anchor": "Verify the registry entry with `checkRegistryEntry`: read `r",
        "n": "3",
        "reference": "references/contract-tests.md"
      },
      {
        "id": "cc-editor-check",
        "row": 29,
        "kind": "chipset",
        "title": "Verify the component in the editor",
        "lines": [
          214,
          214
        ],
        "anchor": "Open `/live-tokens/components` and check each line below.",
        "n": "4",
        "chips": [
          {
            "label": "Registry group",
            "lines": [
              229,
              229
            ],
            "anchor": "A custom component appears under CUSTOM. A first-party compo"
          },
          {
            "label": "Property controls",
            "lines": [
              230,
              230
            ],
            "anchor": "Each property has the control its suffix selects, and change"
          },
          {
            "label": "Preview and interaction",
            "lines": [
              231,
              231
            ],
            "anchor": "The preview matches the state being edited. Keyboard and poi"
          },
          {
            "label": "Linked values",
            "lines": [
              232,
              232
            ],
            "anchor": "Linked properties change together. Separate roles stay indep"
          },
          {
            "label": "Persistence and reset",
            "lines": [
              233,
              233
            ],
            "anchor": "An edit persists across a reload. Reset restores the `:globa"
          },
          {
            "label": "Theme propagation",
            "lines": [
              234,
              234
            ],
            "anchor": "A theme change reaches every property."
          },
          {
            "label": "Sketch rendering",
            "lines": [
              235,
              235
            ],
            "anchor": "With Sketch mode on, every painted part is drawn in its own "
          }
        ]
      },
      {
        "id": "cc-reply",
        "row": 30,
        "kind": "step",
        "title": "Reply with the implementation results",
        "lines": [
          215,
          215
        ],
        "anchor": "Reply with the files, the component id, the props, and the r",
        "n": "5"
      },
      {
        "id": "cc-page",
        "row": 31,
        "kind": "hand",
        "title": "live-tokens-create-page",
        "lines": [
          237,
          237
        ],
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
  },
  "check-compliance": {
    "id": "live-tokens-check-compliance",
    "digest": "sha256:bd4b6b454ef0f2f2",
    "title": "check-compliance",
    "tagline": "Read the project report, inspect evidence, classify findings, and hand the fix list to the repair skill.",
    "nodes": [
      {
        "id": "cc2-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Review design-system compliance",
        "desc": "Use when the user asks to check, audit, or review the project.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Report an existing project's adherence to @moti"
      },
      {
        "id": "cc2-run",
        "row": 1,
        "kind": "cli",
        "title": "Generate the compliance report",
        "lines": [
          14,
          14
        ],
        "anchor": "Run `npx live-tokens report --json`.",
        "command": "npx live-tokens report --json",
        "n": "1"
      },
      {
        "id": "cc2-upgrade",
        "row": 2,
        "kind": "gate",
        "title": "Route the dependency upgrade",
        "desc": "Invoke live-tokens-fix-findings for the dependency upgrade, then resume the audit.",
        "lines": [
          12,
          12
        ],
        "anchor": "When `report` is an unknown command, route the dependency up"
      },
      {
        "id": "cc2-sections",
        "row": 3,
        "kind": "chipset",
        "title": "Read the report sections",
        "lines": [
          15,
          15
        ],
        "anchor": "Read each section of the report with the Report sections tab",
        "n": "2",
        "chips": [
          {
            "label": "migrations",
            "lines": [
              28,
              28
            ],
            "anchor": "| `migrations` | Whether `tokens.css` is behind the installe"
          },
          {
            "label": "findings.pages, findings.components",
            "lines": [
              29,
              29
            ],
            "anchor": "| `findings.pages`, `findings.components` | Both checkers' f"
          },
          {
            "label": "components[].unread",
            "lines": [
              30,
              30
            ],
            "anchor": "| `components[].unread` | Tokens a component declares and ne"
          },
          {
            "label": "components[].registered",
            "lines": [
              31,
              31
            ],
            "anchor": "| `components[].registered` | Whether the component has a `b"
          },
          {
            "label": "components[].described",
            "lines": [
              32,
              32
            ],
            "anchor": "| `components[].described` | Whether the runtime file has th"
          },
          {
            "label": "usage.byPage",
            "lines": [
              33,
              33
            ],
            "anchor": "| `usage.byPage` | Which catalogue component each page rende"
          },
          {
            "label": "usage.unusedShipped",
            "lines": [
              34,
              34
            ],
            "anchor": "| `usage.unusedShipped` | Shipped components no page renders"
          },
          {
            "label": "usage.customUnregistered, usage.customUnused",
            "lines": [
              35,
              35
            ],
            "anchor": "| `usage.customUnregistered`, `usage.customUnused` | The pro"
          }
        ]
      },
      {
        "id": "cc2-drill-q",
        "row": 4,
        "kind": "decide",
        "title": "Inspection details",
        "desc": "Does the finding need component or scale details?",
        "lines": [
          16,
          16
        ],
        "anchor": "When a finding needs component or scale details, run the mat"
      },
      {
        "id": "cc2-component",
        "row": 5,
        "kind": "cli",
        "title": "Inspect the component",
        "lines": [
          22,
          22
        ],
        "anchor": "For one component, run `npx live-tokens components <id>`. Fo",
        "command": "npx live-tokens components <id> --json"
      },
      {
        "id": "cc2-scale",
        "row": 5,
        "kind": "cli",
        "title": "Inspect the scale",
        "lines": [
          22,
          22
        ],
        "anchor": "For one component, run `npx live-tokens components <id>`. Fo",
        "command": "npx live-tokens tokens --family <name> --json"
      },
      {
        "id": "cc2-classify",
        "row": 7,
        "kind": "chipset",
        "title": "Classify the findings",
        "lines": [
          17,
          17
        ],
        "anchor": "Classify each finding as Mechanical, Judgement, or Deliberat",
        "n": "4",
        "chips": [
          {
            "label": "Mechanical",
            "lines": [
              41,
              41
            ],
            "anchor": "**Mechanical.** The value determines the token, such as a sp"
          },
          {
            "label": "Judgement",
            "lines": [
              42,
              42
            ],
            "anchor": "**Judgement.** A role determines the token, such as a color "
          },
          {
            "label": "Deliberate",
            "lines": [
              43,
              43
            ],
            "anchor": "**Deliberate.** The finding records a decision, such as a la"
          }
        ]
      },
      {
        "id": "cc2-deliberate-q",
        "row": 8,
        "kind": "decide",
        "title": "Finding class",
        "desc": "Does the finding require a deliberate config decision?",
        "lines": [
          17,
          17
        ],
        "anchor": "Classify each finding as Mechanical, Judgement, or Deliberat"
      },
      {
        "id": "cc2-deliberate",
        "row": 9,
        "kind": "step",
        "title": "Name the narrower config entry",
        "lines": [
          43,
          43
        ],
        "anchor": "**Deliberate.** The finding records a decision, such as a la"
      },
      {
        "id": "cc2-reply",
        "row": 10,
        "kind": "chipset",
        "title": "Reply in report order",
        "lines": [
          18,
          18
        ],
        "anchor": "Reply with the findings of each section in the table's order",
        "n": "5",
        "chips": [
          {
            "label": "migrations",
            "lines": [
              28,
              28
            ],
            "anchor": "| `migrations` | Whether `tokens.css` is behind the installe"
          },
          {
            "label": "findings.pages, findings.components",
            "lines": [
              29,
              29
            ],
            "anchor": "| `findings.pages`, `findings.components` | Both checkers' f"
          },
          {
            "label": "components[].unread",
            "lines": [
              30,
              30
            ],
            "anchor": "| `components[].unread` | Tokens a component declares and ne"
          },
          {
            "label": "components[].registered",
            "lines": [
              31,
              31
            ],
            "anchor": "| `components[].registered` | Whether the component has a `b"
          },
          {
            "label": "components[].described",
            "lines": [
              32,
              32
            ],
            "anchor": "| `components[].described` | Whether the runtime file has th"
          },
          {
            "label": "usage.byPage",
            "lines": [
              33,
              33
            ],
            "anchor": "| `usage.byPage` | Which catalogue component each page rende"
          },
          {
            "label": "usage.unusedShipped",
            "lines": [
              34,
              34
            ],
            "anchor": "| `usage.unusedShipped` | Shipped components no page renders"
          },
          {
            "label": "usage.customUnregistered, usage.customUnused",
            "lines": [
              35,
              35
            ],
            "anchor": "| `usage.customUnregistered`, `usage.customUnused` | The pro"
          }
        ]
      },
      {
        "id": "cc2-fix-list",
        "row": 11,
        "kind": "step",
        "title": "List the recommended fixes",
        "lines": [
          19,
          19
        ],
        "anchor": "List the recommended fixes, each marked with its finding cla",
        "n": "6"
      },
      {
        "id": "cc2-handoff",
        "row": 12,
        "kind": "hand",
        "title": "live-tokens-fix-findings",
        "lines": [
          20,
          20
        ],
        "anchor": "End with the hand-off: run **live-tokens-fix-findings** on t",
        "n": "7"
      }
    ],
    "edges": [
      {
        "to": "cc2-run",
        "from": "cc2-trig"
      },
      {
        "to": "cc2-upgrade",
        "from": "cc2-run",
        "label": "unknown command"
      },
      {
        "to": "cc2-run",
        "from": "cc2-upgrade",
        "label": "resume audit",
        "back": true
      },
      {
        "to": "cc2-sections",
        "from": "cc2-run",
        "label": "report"
      },
      {
        "to": "cc2-drill-q",
        "from": "cc2-sections"
      },
      {
        "to": "cc2-component",
        "from": "cc2-drill-q",
        "label": "component"
      },
      {
        "to": "cc2-scale",
        "from": "cc2-drill-q",
        "label": "scale"
      },
      {
        "to": "cc2-classify",
        "from": "cc2-drill-q",
        "label": "continue with classification"
      },
      {
        "to": "cc2-classify",
        "from": "cc2-component"
      },
      {
        "to": "cc2-classify",
        "from": "cc2-scale"
      },
      {
        "to": "cc2-deliberate-q",
        "from": "cc2-classify"
      },
      {
        "to": "cc2-deliberate",
        "from": "cc2-deliberate-q",
        "label": "Deliberate"
      },
      {
        "to": "cc2-reply",
        "from": "cc2-deliberate-q",
        "label": "Mechanical"
      },
      {
        "to": "cc2-reply",
        "from": "cc2-deliberate-q",
        "label": "Judgement"
      },
      {
        "to": "cc2-reply",
        "from": "cc2-deliberate"
      },
      {
        "to": "cc2-fix-list",
        "from": "cc2-reply"
      },
      {
        "to": "cc2-handoff",
        "from": "cc2-fix-list"
      }
    ]
  },
  "fix-findings": {
    "id": "live-tokens-fix-findings",
    "digest": "sha256:cdf856b3ea69482a",
    "title": "fix-findings",
    "tagline": "Migrate tokens, repair findings by rule and scope, rerun the checkers, and report the result.",
    "nodes": [
      {
        "id": "ff-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Fix design-system findings",
        "desc": "Use when the user asks to fix the project.",
        "lines": [
          3,
          3
        ],
        "anchor": "description: Fix every finding of check-page and check-compo"
      },
      {
        "id": "ff-migrate",
        "row": 1,
        "kind": "step",
        "title": "Run the token migration",
        "lines": [
          14,
          14
        ],
        "anchor": "Run `npx live-tokens migrate --check`, then `--write`.",
        "n": "1",
        "command": "npx live-tokens migrate --check\nnpx live-tokens migrate --write"
      },
      {
        "id": "ff-run",
        "row": 2,
        "kind": "cli",
        "title": "Run both checkers",
        "lines": [
          15,
          16
        ],
        "anchor": "Run both checkers with `--json`. Each finding carries a `rul",
        "anchorEnd": "```sh",
        "n": "2",
        "command": "npx live-tokens check-page --json\nnpx live-tokens check-component --json"
      },
      {
        "id": "ff-upgrade",
        "row": 3,
        "kind": "gate",
        "title": "Upgrade the checker commands",
        "lines": [
          12,
          12
        ],
        "anchor": "When `check-page` is an unknown command, upgrade `@motion-pr"
      },
      {
        "id": "ff-clean",
        "row": 3,
        "kind": "ok",
        "title": "Default checks pass",
        "lines": [
          24,
          24
        ],
        "anchor": "When the errors are clear, run both checkers with `--strict`"
      },
      {
        "id": "ff-group",
        "row": 5,
        "kind": "step",
        "title": "Group findings by rule",
        "lines": [
          20,
          20
        ],
        "anchor": "Group the findings by rule.",
        "n": "3"
      },
      {
        "id": "ff-order",
        "row": 6,
        "kind": "decide",
        "title": "Repair order",
        "desc": "Which group remains within the repair scope?",
        "lines": [
          21,
          21
        ],
        "anchor": "Take the largest error group first, then the remaining error"
      },
      {
        "id": "ff-recipe",
        "row": 7,
        "kind": "decide",
        "title": "Rule family",
        "desc": "Which section covers the rule?",
        "lines": [
          22,
          22
        ],
        "anchor": "Fix every finding in the group with its section: Color by ro",
        "n": "5"
      },
      {
        "id": "ff-color",
        "row": 8,
        "kind": "chipset",
        "title": "Color by role",
        "lines": [
          41,
          55
        ],
        "anchor": "## Color by role",
        "anchorEnd": "| A gradient | `--gradient-*` | Or compose one from surface ",
        "chips": [
          {
            "label": "Text on a surface",
            "lines": [
              47,
              47
            ],
            "anchor": "| Text on a surface | `--text-primary` through `--text-disab"
          },
          {
            "label": "Light text on a dark chip",
            "lines": [
              48,
              48
            ],
            "anchor": "| Light text on a dark chip | `--text-inverted` | No AA guar"
          },
          {
            "label": "A surface fill",
            "lines": [
              49,
              49
            ],
            "anchor": "| A surface fill | `--surface-<family>-<level>` | The role n"
          },
          {
            "label": "A stroke",
            "lines": [
              50,
              50
            ],
            "anchor": "| A stroke | `--border-<family>-<level>` | Levels run `faint"
          },
          {
            "label": "A translucent layer that dims what is behind it",
            "lines": [
              51,
              51
            ],
            "anchor": "| A translucent layer that dims what is behind it | `--scrim"
          },
          {
            "label": "A translucent wash on a surface",
            "lines": [
              52,
              52
            ],
            "anchor": "| A translucent wash on a surface | `--tint-low`, `--tint`, "
          },
          {
            "label": "Any other translucent color",
            "lines": [
              53,
              53
            ],
            "anchor": "| Any other translucent color | The role's token at an opaci"
          },
          {
            "label": "Fully transparent",
            "lines": [
              54,
              54
            ],
            "anchor": "| Fully transparent | `--color-transparent` | |"
          },
          {
            "label": "A gradient",
            "lines": [
              55,
              55
            ],
            "anchor": "| A gradient | `--gradient-*` | Or compose one from surface "
          }
        ]
      },
      {
        "id": "ff-geometry",
        "row": 8,
        "kind": "chipset",
        "title": "Geometry by scale",
        "lines": [
          57,
          69
        ],
        "anchor": "## Geometry by scale",
        "anchorEnd": "| A `blur()` | `--blur-*` | No rule reports it. Fix it while",
        "chips": [
          {
            "label": "Spacing",
            "lines": [
              63,
              63
            ],
            "anchor": "| Spacing | `--space-<px>` | `npx live-tokens tokens --famil"
          },
          {
            "label": "A stroke width",
            "lines": [
              64,
              64
            ],
            "anchor": "| A stroke width | `--border-width-1`, `-2`, `-4` | Also for"
          },
          {
            "label": "A corner",
            "lines": [
              65,
              65
            ],
            "anchor": "| A corner | `--radius-sm` through `--radius-4xl`, or `--rad"
          },
          {
            "label": "A shadow",
            "lines": [
              66,
              66
            ],
            "anchor": "| A shadow | `--shadow-sm` through `--shadow-xl` | Replace t"
          },
          {
            "label": "Part of a calc()",
            "lines": [
              67,
              67
            ],
            "anchor": "| Part of a `calc()` | The token inside the calc | `calc(var"
          },
          {
            "label": "A duration or easing",
            "lines": [
              68,
              68
            ],
            "anchor": "| A duration or easing | `--duration-*`, `--ease-*` | No rul"
          },
          {
            "label": "A blur()",
            "lines": [
              69,
              69
            ],
            "anchor": "| A `blur()` | `--blur-*` | No rule reports it. Fix it while"
          }
        ]
      },
      {
        "id": "ff-remaining",
        "row": 8,
        "kind": "chipset",
        "title": "The remaining rules",
        "lines": [
          71,
          91
        ],
        "anchor": "## The remaining rules",
        "anchorEnd": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to",
        "chips": [
          {
            "label": "unknown-token",
            "lines": [
              75,
              75
            ],
            "anchor": "| `unknown-token` | Search `tokens.css` for the stem. When a"
          },
          {
            "label": "raw-text-axis",
            "lines": [
              76,
              76
            ],
            "anchor": "| `raw-text-axis` | Set every axis from one text style, `-fo"
          },
          {
            "label": "unknown-component",
            "lines": [
              77,
              77
            ],
            "anchor": "| `unknown-component` | Read **live-tokens-pick-component** "
          },
          {
            "label": "unknown-prop",
            "lines": [
              78,
              78
            ],
            "anchor": "| `unknown-prop` | `npx live-tokens components <id>` prints "
          },
          {
            "label": "unknown-prop-value",
            "lines": [
              79,
              79
            ],
            "anchor": "| `unknown-prop-value` | Use a value from the union the mess"
          },
          {
            "label": "control-size",
            "lines": [
              80,
              80
            ],
            "anchor": "| `control-size` | Delete the `size` prop. The shipped defau"
          },
          {
            "label": "multiple-primary",
            "lines": [
              81,
              81
            ],
            "anchor": "| `multiple-primary` | Keep the action that completes the ma"
          },
          {
            "label": "danger-without-dialog",
            "lines": [
              82,
              82
            ],
            "anchor": "| `danger-without-dialog` | Open a `Dialog` from the danger "
          },
          {
            "label": "hardcoded-columns",
            "lines": [
              83,
              83
            ],
            "anchor": "| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` "
          },
          {
            "label": "site-css-in-main",
            "lines": [
              84,
              84
            ],
            "anchor": "| `site-css-in-main` | Delete the import from `main.ts`. Add"
          },
          {
            "label": "missing-source",
            "lines": [
              85,
              85
            ],
            "anchor": "| `missing-source` | Add `source: 'src/...'` to the route en"
          },
          {
            "label": "reserved-route",
            "lines": [
              86,
              86
            ],
            "anchor": "| `reserved-route` | Move the route out of `/live-tokens/*`."
          },
          {
            "label": "deep-import",
            "lines": [
              87,
              87
            ],
            "anchor": "| `deep-import` | Import from `@motion-proto/live-tokens`, `"
          },
          {
            "label": "unknown-suffix, state-after-property, disabled-is-terminal",
            "lines": [
              88,
              88
            ],
            "anchor": "| `unknown-suffix`, `state-after-property`, `disabled-is-ter"
          },
          {
            "label": "color-literal, unknown-token-ref, default-not-token (component)",
            "lines": [
              89,
              89
            ],
            "anchor": "| `color-literal`, `unknown-token-ref`, `default-not-token` "
          },
          {
            "label": "phantom-editor-token, phantom-link",
            "lines": [
              90,
              90
            ],
            "anchor": "| `phantom-editor-token`, `phantom-link` | The editor names "
          },
          {
            "label": "invalid-id, missing-file, missing-root-block, no-tokens, missing-component-const, missing-all-tokens, missing-registration",
            "lines": [
              91,
              91
            ],
            "anchor": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to"
          }
        ]
      },
      {
        "id": "ff-rerun",
        "row": 11,
        "kind": "cli",
        "title": "Rerun both checkers",
        "desc": "Retain --strict when the repair scope includes warnings.",
        "lines": [
          23,
          23
        ],
        "anchor": "Run both checkers again. When repairable findings remain in ",
        "command": "npx live-tokens check-page --json\nnpx live-tokens check-component --json",
        "n": "6"
      },
      {
        "id": "ff-repeat",
        "row": 12,
        "kind": "gate",
        "title": "Regroup the remaining findings",
        "lines": [
          23,
          23
        ],
        "anchor": "Run both checkers again. When repairable findings remain in "
      },
      {
        "id": "ff-unresolved",
        "row": 12,
        "kind": "step",
        "title": "Record the unresolved findings",
        "desc": "Leave findings with no fitting token and state the reason in the reply.",
        "lines": [
          37,
          37
        ],
        "anchor": "Add no token to `tokens.css`. Map a literal with no matching"
      },
      {
        "id": "ff-strict",
        "row": 14,
        "kind": "cli",
        "title": "Run strict checks",
        "lines": [
          24,
          24
        ],
        "anchor": "When the errors are clear, run both checkers with `--strict`",
        "command": "npx live-tokens check-page --strict --json\nnpx live-tokens check-component --strict --json",
        "n": "7"
      },
      {
        "id": "ff-warnings",
        "row": 15,
        "kind": "decide",
        "title": "Warning scope",
        "desc": "Does the request include warnings, or does the user choose to clear them?",
        "lines": [
          24,
          25
        ],
        "anchor": "When the errors are clear, run both checkers with `--strict`",
        "anchorEnd": "When the repair scope includes warnings, return to step 3 wi"
      },
      {
        "id": "ff-warning-loop",
        "row": 16,
        "kind": "gate",
        "title": "Include warnings in the repair scope",
        "lines": [
          25,
          25
        ],
        "anchor": "When the repair scope includes warnings, return to step 3 wi",
        "n": "8"
      },
      {
        "id": "ff-build",
        "row": 17,
        "kind": "step",
        "title": "Gate the existing build",
        "desc": "Add check:design when absent. Preserve the existing build command when adding the gate.",
        "lines": [
          33,
          33
        ],
        "anchor": "When `package.json` has no `check:design` script, add `\"chec"
      },
      {
        "id": "ff-reply",
        "row": 18,
        "kind": "chipset",
        "title": "Reply with the repair results",
        "lines": [
          26,
          29
        ],
        "anchor": "Reply with:",
        "anchorEnd": "both checker commands with their exit codes",
        "n": "9",
        "chips": [
          {
            "label": "Changes by rule",
            "lines": [
              27,
              27
            ],
            "anchor": "the changes by rule, each with its count and any visible shi"
          },
          {
            "label": "Remaining findings",
            "lines": [
              28,
              28
            ],
            "anchor": "the findings left, each with its reason and any config entry"
          },
          {
            "label": "Checker commands and exit codes",
            "lines": [
              29,
              29
            ],
            "anchor": "both checker commands with their exit codes"
          }
        ]
      },
      {
        "id": "ff-done",
        "row": 19,
        "kind": "done",
        "title": "Repair results complete",
        "lines": [
          26,
          29
        ],
        "anchor": "Reply with:",
        "anchorEnd": "both checker commands with their exit codes"
      }
    ],
    "edges": [
      {
        "to": "ff-migrate",
        "from": "ff-trig"
      },
      {
        "to": "ff-run",
        "from": "ff-migrate"
      },
      {
        "to": "ff-upgrade",
        "from": "ff-run",
        "label": "unknown command"
      },
      {
        "to": "ff-run",
        "from": "ff-upgrade",
        "label": "rerun",
        "back": true
      },
      {
        "to": "ff-group",
        "from": "ff-run",
        "label": "findings"
      },
      {
        "to": "ff-clean",
        "from": "ff-run",
        "label": "exit 0"
      },
      {
        "to": "ff-strict",
        "from": "ff-clean"
      },
      {
        "to": "ff-order",
        "from": "ff-group"
      },
      {
        "to": "ff-recipe",
        "from": "ff-order",
        "label": "largest error group"
      },
      {
        "to": "ff-recipe",
        "from": "ff-order",
        "label": "remaining errors"
      },
      {
        "to": "ff-recipe",
        "from": "ff-order",
        "label": "warnings"
      },
      {
        "to": "ff-color",
        "from": "ff-recipe",
        "label": "Color by role"
      },
      {
        "to": "ff-rerun",
        "from": "ff-color"
      },
      {
        "to": "ff-geometry",
        "from": "ff-recipe",
        "label": "Geometry by scale"
      },
      {
        "to": "ff-rerun",
        "from": "ff-geometry"
      },
      {
        "to": "ff-remaining",
        "from": "ff-recipe",
        "label": "The remaining rules"
      },
      {
        "to": "ff-rerun",
        "from": "ff-remaining"
      },
      {
        "to": "ff-repeat",
        "from": "ff-rerun",
        "label": "repairable findings"
      },
      {
        "to": "ff-group",
        "from": "ff-repeat",
        "label": "return to step 3",
        "back": true
      },
      {
        "to": "ff-unresolved",
        "from": "ff-rerun",
        "label": "no token fits"
      },
      {
        "to": "ff-reply",
        "from": "ff-unresolved"
      },
      {
        "to": "ff-strict",
        "from": "ff-rerun",
        "label": "errors clear"
      },
      {
        "to": "ff-warnings",
        "from": "ff-strict",
        "label": "warnings"
      },
      {
        "to": "ff-build",
        "from": "ff-strict",
        "label": "strict checks pass"
      },
      {
        "to": "ff-warning-loop",
        "from": "ff-warnings",
        "label": "repair scope includes warnings"
      },
      {
        "to": "ff-build",
        "from": "ff-warnings",
        "label": "user defers warnings"
      },
      {
        "to": "ff-group",
        "from": "ff-warning-loop",
        "label": "use --strict",
        "back": true
      },
      {
        "to": "ff-reply",
        "from": "ff-build"
      },
      {
        "to": "ff-done",
        "from": "ff-reply"
      }
    ]
  }
};

export const skillKeys = Object.keys(skillTrees);
