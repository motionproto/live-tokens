import type { SkillTree } from './types';

export const skillTrees: Record<string, SkillTree> = {
  "generate-theme": {
    "id": "live-tokens-generate-theme",
    "digest": "sha256:e6b9892d67820148",
    "title": "generate-theme",
    "tagline": "One brief guides color, type, and geometry across three skills.",
    "nodes": [
      {
        "id": "gt-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Define or refine a theme",
        "desc": "A palette, mood, style, occasion, hue, or color refinement drives the theme. The editor handles single tokens; pair-fonts handles type; adjust-geometry handles geometry.",
        "lines": [
          2,
          8
        ],
        "anchor": "name: live-tokens-generate-theme",
        "anchorEnd": "A theme is three decisions made from one brief: color, type,"
      },
      {
        "id": "gt-voice",
        "row": 1,
        "kind": "step",
        "n": "1",
        "title": "Define the theme voice",
        "desc": "The voice sentence captures the mood, hue family, scheme, and implied type and geometry. It guides every later choice.",
        "lines": [
          12,
          12
        ],
        "anchor": "Read the brief once and name its voice in a sentence: the mo"
      },
      {
        "id": "gt-anchor",
        "row": 2,
        "kind": "decide",
        "title": "Anchor category?",
        "desc": "Anchors define color, type, and geometry and override generic defaults. When two match, the idiom sets constraints and the feeling adjusts its dials.",
        "lines": [
          13,
          13
        ],
        "anchor": "Read the anchor reference that matches the voice (feeling, i",
        "n": "2"
      },
      {
        "id": "gt-mood",
        "row": 3,
        "kind": "ref",
        "title": "Read the mood anchor",
        "reference": "references/mood-vocabulary.md",
        "lines": [
          123,
          123
        ],
        "anchor": "- `references/mood-vocabulary.md` covers feelings: joyful, p"
      },
      {
        "id": "gt-style",
        "row": 3,
        "kind": "ref",
        "title": "Read the style anchor",
        "reference": "references/style-vocabulary.md",
        "lines": [
          124,
          124
        ],
        "anchor": "- `references/style-vocabulary.md` covers named idioms, eras"
      },
      {
        "id": "gt-named",
        "row": 3,
        "kind": "ref",
        "title": "Read the named-theme anchor",
        "reference": "references/named-themes.md",
        "lines": [
          125,
          125
        ],
        "anchor": "- `references/named-themes.md` covers holidays, seasons, and"
      },
      {
        "id": "gt-none",
        "row": 3,
        "kind": "ref",
        "title": "Use generic color and geometry rules",
        "lines": [
          127,
          127
        ],
        "anchor": "Most briefs hit the first file. A brief that matches two (\"c"
      },
      {
        "id": "gt-seed",
        "row": 4,
        "kind": "step",
        "n": "3",
        "title": "Define ten OKLCH seeds",
        "desc": "scratch/<slug>-brief.json records Brand, Accent, Special, Canvas, Neutral, Alternate, and four status seeds.",
        "lines": [
          14,
          14
        ],
        "anchor": "Translate the brief into a seed file using the framework bel"
      },
      {
        "id": "gt-cons",
        "row": 5,
        "kind": "chipset",
        "title": "Apply all palette constraints",
        "chips": [
          {
            "label": "Brief schema",
            "lines": [
              24,
              47
            ],
            "anchor": "## The brief",
            "anchorEnd": "Roles: **Brand** is the dominant chromatic identity; **Accen"
          },
          {
            "label": "Chroma budget",
            "lines": [
              49,
              58
            ],
            "anchor": "## Chroma budget: color is inversely proportional to area",
            "anchorEnd": "A good theme reads as 3 or 4 hue families on screen, never 1"
          },
          {
            "label": "Role bands",
            "lines": [
              60,
              72
            ],
            "anchor": "## Per-role bands",
            "anchorEnd": "| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to "
          },
          {
            "label": "Canvas commitment",
            "lines": [
              74,
              87
            ],
            "anchor": "**The canvas carries the theme's identity, so commit to it.*",
            "anchorEnd": ""
          },
          {
            "label": "Mood dials",
            "lines": [
              88,
              94
            ],
            "anchor": "## Mood dials",
            "anchorEnd": "Avoid mid-lightness yellow-green (H 100 to 120 at L 0.5 to 0"
          },
          {
            "label": "Gamut guardrails",
            "lines": [
              96,
              103
            ],
            "anchor": "## Gamut guardrails",
            "anchorEnd": "- Peak chroma anchors: red H20 C 0.25 at L 0.63; orange H60 "
          },
          {
            "label": "Hue harmony",
            "lines": [
              105,
              111
            ],
            "anchor": "## Harmony",
            "anchorEnd": "- Drama or maximum contrast: complementary, triadic, or tetr"
          },
          {
            "label": "Canvas gradient and shadows",
            "lines": [
              113,
              117
            ],
            "anchor": "## Canvas sky and shadows",
            "anchorEnd": "Shadow opacity derives from Canvas lightness and re-derives "
          }
        ],
        "tag": "constraints"
      },
      {
        "id": "gt-cli",
        "row": 6,
        "kind": "cli",
        "n": "4",
        "title": "Generate and validate the theme",
        "desc": "The CLI writes and opens themes/<slug>.json and reports contrast. Reruns replace every color, including editor edits. --carry-from <theme> copies gradients, fonts, and component aliases.",
        "lines": [
          15,
          15
        ],
        "anchor": "Run `npx live-tokens generate-theme scratch/<slug>-brief.jso",
        "chips": [
          {
            "label": "Flags",
            "lines": [
              22,
              22
            ],
            "anchor": "Flags: `--dry-run` prints the report without writing; `--no-"
          }
        ],
        "command": "npx live-tokens generate-theme scratch/<slug>-brief.json"
      },
      {
        "id": "gt-fail",
        "row": 7,
        "kind": "gate",
        "title": "A seed fails validation",
        "desc": "The report names the failed seed. A valid repair raises its lightness or reduces its chroma before the next run.",
        "lines": [
          15,
          15
        ],
        "anchor": "Run `npx live-tokens generate-theme scratch/<slug>-brief.jso"
      },
      {
        "id": "gt-pass",
        "row": 7,
        "kind": "ok",
        "title": "Colors pass validation",
        "desc": "The flow continues to the type and geometry decisions.",
        "lines": [
          15,
          15
        ],
        "anchor": "Run `npx live-tokens generate-theme scratch/<slug>-brief.jso"
      },
      {
        "id": "gt-type-q",
        "row": 8,
        "kind": "decide",
        "title": "Preserve the current type?",
        "desc": "An explicit color-only instruction preserves current type. Complete themes pair type through pair-fonts.",
        "lines": [
          16,
          16
        ],
        "anchor": "Invoke **live-tokens-pair-fonts** with the same voice. Skip "
      },
      {
        "id": "gt-fonts",
        "row": 9,
        "kind": "hand",
        "n": "5",
        "title": "Pair fonts from the same voice",
        "desc": "pair-fonts receives the voice sentence and aligns the type with the theme.",
        "lines": [
          16,
          16
        ],
        "anchor": "Invoke **live-tokens-pair-fonts** with the same voice. Skip "
      },
      {
        "id": "gt-geo-q",
        "row": 10,
        "kind": "decide",
        "title": "Does the theme need geometry changes?",
        "desc": "A shape or spacing cue continues to adjust-geometry. A neutral geometry voice preserves current aliases.",
        "lines": [
          17,
          17
        ],
        "anchor": "Invoke **live-tokens-adjust-geometry** with the geometry the"
      },
      {
        "id": "gt-geo",
        "row": 12,
        "kind": "hand",
        "n": "6",
        "title": "Adjust geometry from the same voice",
        "desc": "adjust-geometry receives the geometry intent. Anchor geometry overrides the voice table.",
        "lines": [
          17,
          17
        ],
        "anchor": "Invoke **live-tokens-adjust-geometry** with the geometry the"
      },
      {
        "id": "gt-geotab",
        "row": 11,
        "kind": "chipset",
        "title": "Prepare the geometry hand-off",
        "chips": [
          {
            "label": "Voice-to-geometry map",
            "lines": [
              129,
              140
            ],
            "anchor": "## Geometry from the voice",
            "anchorEnd": "This table is the fallback. When the brief matched an entry "
          },
          {
            "label": "Safe operation order",
            "lines": [
              20,
              20
            ],
            "anchor": "Order matters only for safety, and the order above is safe: "
          },
          {
            "label": "Output files",
            "lines": [
              148,
              150
            ],
            "anchor": "## Files each step writes",
            "anchorEnd": "Color writes `themes/<slug>.json` and opens it. Type and geo"
          }
        ],
        "tag": "sources"
      },
      {
        "id": "gt-tell",
        "row": 13,
        "kind": "step",
        "n": "7",
        "title": "Reload and review the theme",
        "desc": "The browser holds type and geometry in the working buffer until Save. Further revisions update the same brief.",
        "lines": [
          18,
          18
        ],
        "anchor": "Tell the user to look at the running app, and that type and "
      },
      {
        "id": "gt-ver",
        "row": 14,
        "kind": "step",
        "title": "Verify the complete theme",
        "desc": "Colors pass validation, each invoked sibling reports success, and the reloaded app shows the complete theme. Selecting the previous theme restores the prior look.",
        "lines": [
          152,
          156
        ],
        "anchor": "## Verify",
        "anchorEnd": "- To return to the previous look, load the theme the CLI out"
      },
      {
        "id": "gt-refine-q",
        "row": 15,
        "kind": "decide",
        "title": "Refine the theme?",
        "desc": "Every refinement updates the existing seed brief. The generator owns the derived theme data.",
        "lines": [
          142,
          146
        ],
        "anchor": "## Refining a theme that exists",
        "anchorEnd": "One adjective moves one dial. Warmer and cooler rotate hue; "
      },
      {
        "id": "gt-refine",
        "row": 16,
        "kind": "step",
        "tag": "Follow-up",
        "title": "Refine the seed brief",
        "desc": "The scratch brief supplies seeds. The theme file recovers them after scratch-file loss. Each refinement moves one requested dial and retains the other seeds.",
        "lines": [
          142,
          146
        ],
        "anchor": "## Refining a theme that exists",
        "anchorEnd": "One adjective moves one dial. Warmer and cooler rotate hue; "
      },
      {
        "id": "gt-done",
        "row": 16,
        "kind": "done",
        "title": "Theme complete",
        "desc": "generate-theme has written the colors. Saving the open theme keeps any type or geometry changes.",
        "lines": [
          148,
          150
        ],
        "anchor": "## Files each step writes",
        "anchorEnd": "Color writes `themes/<slug>.json` and opens it. Type and geo"
      }
    ],
    "edges": [
      {
        "from": "gt-trig",
        "to": "gt-voice"
      },
      {
        "from": "gt-voice",
        "to": "gt-anchor"
      },
      {
        "from": "gt-anchor",
        "to": "gt-mood",
        "label": "feeling"
      },
      {
        "from": "gt-anchor",
        "to": "gt-style",
        "label": "idiom or era"
      },
      {
        "from": "gt-anchor",
        "to": "gt-named",
        "label": "holiday, season, or scene"
      },
      {
        "from": "gt-anchor",
        "to": "gt-none",
        "label": "generic rules"
      },
      {
        "from": "gt-mood",
        "to": "gt-seed"
      },
      {
        "from": "gt-style",
        "to": "gt-seed"
      },
      {
        "from": "gt-named",
        "to": "gt-seed"
      },
      {
        "from": "gt-none",
        "to": "gt-seed"
      },
      {
        "from": "gt-seed",
        "to": "gt-cons"
      },
      {
        "from": "gt-cons",
        "to": "gt-cli"
      },
      {
        "from": "gt-cli",
        "to": "gt-fail",
        "label": "exit 1"
      },
      {
        "from": "gt-cli",
        "to": "gt-pass",
        "label": "exit 0"
      },
      {
        "from": "gt-fail",
        "to": "gt-cli",
        "label": "rerun",
        "back": true
      },
      {
        "from": "gt-pass",
        "to": "gt-type-q"
      },
      {
        "from": "gt-type-q",
        "to": "gt-fonts",
        "label": "pair type"
      },
      {
        "from": "gt-type-q",
        "to": "gt-geo-q",
        "label": "preserve type"
      },
      {
        "from": "gt-fonts",
        "to": "gt-geo-q"
      },
      {
        "from": "gt-geo-q",
        "to": "gt-geotab",
        "label": "change geometry"
      },
      {
        "from": "gt-geotab",
        "to": "gt-geo"
      },
      {
        "from": "gt-geo",
        "to": "gt-tell"
      },
      {
        "from": "gt-geo-q",
        "to": "gt-tell",
        "label": "preserve geometry"
      },
      {
        "from": "gt-tell",
        "to": "gt-ver"
      },
      {
        "from": "gt-ver",
        "to": "gt-refine-q"
      },
      {
        "from": "gt-refine-q",
        "to": "gt-refine",
        "label": "refine"
      },
      {
        "from": "gt-refine-q",
        "to": "gt-done",
        "label": "done"
      },
      {
        "from": "gt-refine",
        "to": "gt-cli",
        "label": "regenerate",
        "back": true
      }
    ]
  },
  "pair-fonts": {
    "id": "live-tokens-pair-fonts",
    "digest": "sha256:f5f807a05b7665e2",
    "title": "pair-fonts",
    "tagline": "Choose the families; the CLI verifies them and builds URLs for their available weights.",
    "nodes": [
      {
        "id": "pf-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Choose or pair font families",
        "desc": "The pairing selects or restyles font families. generate-theme supplies the type voice for complete themes.",
        "lines": [
          2,
          6
        ],
        "anchor": "name: live-tokens-pair-fonts",
        "anchorEnd": "# Pairing fonts for a theme"
      },
      {
        "id": "pf-pool",
        "row": 1,
        "kind": "step",
        "title": "Use Google Fonts with the CLI",
        "desc": "The CLI manages Google Fonts. The editor's Project fonts section handles other sources.",
        "lines": [
          8,
          8
        ],
        "anchor": "You choose the families; the CLI verifies each against Googl"
      },
      {
        "id": "pf-body",
        "row": 2,
        "kind": "step",
        "title": "Choose the body face first",
        "desc": "Body faces need regular, bold, italic, open apertures, a large x-height, and low or moderate contrast. Families that miss a requirement belong in display.",
        "lines": [
          29,
          31
        ],
        "anchor": "## Choose the body face first",
        "anchorEnd": "The body face is the anchor. It carries most of the words, a"
      },
      {
        "id": "pf-spec",
        "row": 3,
        "kind": "decide",
        "title": "Does the brief define a specific voice?",
        "desc": "A specific voice follows the full matrix. A vague or quiet brief takes a conservative pairing.",
        "lines": [
          65,
          67
        ],
        "anchor": "## Shortcuts",
        "anchorEnd": "These find an adequate pairing fast and skip the reasoning; "
      },
      {
        "id": "pf-matrix",
        "row": 4,
        "kind": "step",
        "title": "Classify each face by form and finish",
        "desc": "Form describes its model: dynamic, rational, or geometric. Finish describes stroke contrast and serif treatment.",
        "lines": [
          35,
          44
        ],
        "anchor": "## The font matrix: the decision rule",
        "anchorEnd": ""
      },
      {
        "id": "pf-short",
        "row": 4,
        "kind": "step",
        "title": "Choose a conservative pairing",
        "desc": "Conservative options include a superfamily, one family across weights, two families by one designer, or a serif display face with a sans body.",
        "lines": [
          65,
          72
        ],
        "anchor": "## Shortcuts",
        "anchorEnd": "- **Serif display over sans body** when nothing else decides"
      },
      {
        "id": "pf-rule",
        "row": 5,
        "kind": "chipset",
        "title": "Compare form and finish",
        "chips": [
          {
            "label": "Same form, different finish: reliable",
            "lines": [
              45,
              45
            ],
            "anchor": "- **Same skeleton, different flesh: reliable.** Helvetica an"
          },
          {
            "label": "Same finish, different form: clashes",
            "lines": [
              46,
              46
            ],
            "anchor": "- **Same flesh, different skeleton: the failure case.** The "
          },
          {
            "label": "Different on both: deliberate contrast",
            "lines": [
              47,
              47
            ],
            "anchor": "- **Far apart on both: works, deliberately.** An unmistakabl"
          },
          {
            "label": "Faces between models",
            "lines": [
              49,
              49
            ],
            "anchor": "Many faces sit between columns. When one straddles, say so a"
          }
        ],
        "tag": "pairing rule"
      },
      {
        "id": "pf-voice",
        "row": 6,
        "kind": "step",
        "title": "Match the pairing to the theme voice",
        "desc": "The pairing matches type and color to the same brief. Conflicting voices make them feel unrelated.",
        "lines": [
          51,
          63
        ],
        "anchor": "## Voice",
        "anchorEnd": "Match the type to the same brief the color came from. A warm"
      },
      {
        "id": "pf-watch",
        "row": 7,
        "kind": "chipset",
        "title": "Check four pairing risks",
        "chips": [
          {
            "label": "x-height parity",
            "lines": [
              76,
              76
            ],
            "anchor": "- **x-height parity.** Both faces are set from one size scal"
          },
          {
            "label": "Small-size legibility",
            "lines": [
              77,
              77
            ],
            "anchor": "- **Print faces at small sizes.** Delicate serifs and high s"
          },
          {
            "label": "More than two families",
            "lines": [
              78,
              78
            ],
            "anchor": "- **Every family is a request.** Two is the target; three ne"
          },
          {
            "label": "Repeated families across theme sets",
            "lines": [
              79,
              79
            ],
            "anchor": "- **Sets of themes:** no two share a display face or a body "
          }
        ],
        "lines": [
          74,
          74
        ],
        "anchor": "## Watch for",
        "tag": "risks"
      },
      {
        "id": "pf-brief",
        "row": 8,
        "kind": "step",
        "n": "1",
        "title": "Write scratch/font-brief.json",
        "desc": "The brief changes listed slots and preserves the rest. Display maps to --font-display; body maps to --font-sans. Serif, mono, and editorial serve specialized roles.",
        "lines": [
          12,
          12
        ],
        "anchor": "Choose the pairing with the framework below and write a brie"
      },
      {
        "id": "pf-shape",
        "row": 9,
        "kind": "chipset",
        "title": "Check font brief fields and flags",
        "chips": [
          {
            "label": "Slots and stacks",
            "lines": [
              21,
              27
            ],
            "anchor": "## The brief",
            "anchorEnd": "Every slot is optional and an omitted slot is left exactly a"
          },
          {
            "label": "Pairing rationale",
            "lines": [
              17,
              17
            ],
            "anchor": "State your reasoning when you propose the pairing: each face"
          },
          {
            "label": "Flags",
            "lines": [
              19,
              19
            ],
            "anchor": "Flags: `--dry-run` reports without writing. `--no-verify` sk"
          }
        ],
        "tag": "brief"
      },
      {
        "id": "pf-cli",
        "row": 10,
        "kind": "cli",
        "n": "2",
        "title": "Validate and apply the font stacks",
        "desc": "The report lists changed stacks, each family's weights and URL, and every required-weight gap.",
        "lines": [
          13,
          13
        ],
        "anchor": "Run `npx live-tokens set-fonts scratch/font-brief.json`. It ",
        "command": "npx live-tokens set-fonts scratch/font-brief.json"
      },
      {
        "id": "pf-fail",
        "row": 11,
        "kind": "gate",
        "title": "Google Fonts lacks a family",
        "desc": "The next run uses a valid Google Fonts family name.",
        "lines": [
          14,
          14
        ],
        "anchor": "Read the report. A weight gap is a quality note: name it and"
      },
      {
        "id": "pf-gap",
        "row": 11,
        "kind": "ok",
        "n": "3",
        "title": "The CLI applies the font stacks",
        "desc": "Meaningful gaps include body 400, 700, or italic and display 600. Display 300 remains optional.",
        "lines": [
          14,
          14
        ],
        "anchor": "Read the report. A weight gap is a quality note: name it and"
      },
      {
        "id": "pf-tell",
        "row": 12,
        "kind": "step",
        "n": "4",
        "title": "Reload and review the type",
        "desc": "Reloading before Save gives the editor the new buffer. Save then keeps the change.",
        "lines": [
          15,
          15
        ],
        "anchor": "Tell the user to reload the editor page before saving. A run"
      },
      {
        "id": "pf-scope",
        "row": 13,
        "kind": "chipset",
        "title": "Font-family scope",
        "desc": "Font-family changes preserve color, component aliases, geometry, and the type scale.",
        "chips": [
          {
            "label": "Buffer, Save, and Adopt",
            "lines": [
              81,
              83
            ],
            "anchor": "## Scope",
            "anchorEnd": "Type only. Color, component aliases, shape, and the type sca"
          }
        ],
        "tag": "scope"
      },
      {
        "id": "pf-ver",
        "row": 14,
        "kind": "done",
        "title": "Verify the type",
        "desc": "The report lists stacks and weights; the CLI builds matching URLs. Reloading shows the new type. Reselecting the open theme restores the previous type.",
        "lines": [
          85,
          90
        ],
        "anchor": "## Verify",
        "anchorEnd": "- To revert, run the inverse brief, or load the open theme a"
      }
    ],
    "edges": [
      {
        "from": "pf-trig",
        "to": "pf-pool"
      },
      {
        "from": "pf-pool",
        "to": "pf-body"
      },
      {
        "from": "pf-body",
        "to": "pf-spec"
      },
      {
        "from": "pf-spec",
        "to": "pf-matrix",
        "label": "specific"
      },
      {
        "from": "pf-spec",
        "to": "pf-short",
        "label": "vague or quiet"
      },
      {
        "from": "pf-matrix",
        "to": "pf-rule"
      },
      {
        "from": "pf-rule",
        "to": "pf-voice"
      },
      {
        "from": "pf-short",
        "to": "pf-voice"
      },
      {
        "from": "pf-voice",
        "to": "pf-watch"
      },
      {
        "from": "pf-watch",
        "to": "pf-brief"
      },
      {
        "from": "pf-brief",
        "to": "pf-shape"
      },
      {
        "from": "pf-shape",
        "to": "pf-cli"
      },
      {
        "from": "pf-cli",
        "to": "pf-fail",
        "label": "exit 1"
      },
      {
        "from": "pf-cli",
        "to": "pf-gap",
        "label": "exit 0"
      },
      {
        "from": "pf-fail",
        "to": "pf-cli",
        "label": "rerun",
        "back": true
      },
      {
        "from": "pf-gap",
        "to": "pf-tell"
      },
      {
        "from": "pf-tell",
        "to": "pf-scope"
      },
      {
        "from": "pf-scope",
        "to": "pf-ver"
      }
    ]
  },
  "adjust-geometry": {
    "id": "live-tokens-adjust-geometry",
    "digest": "sha256:cd28cf6a45c926e2",
    "title": "adjust-geometry",
    "tagline": "The CLI reads a small ops file, moves each alias along its token scale, and reports the result.",
    "nodes": [
      {
        "id": "ag-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Adjust shape or spacing",
        "desc": "Geometry changes cover radius, padding, gaps, border width, and density. generate-theme supplies the geometry intent for complete themes.",
        "lines": [
          2,
          8
        ],
        "anchor": "name: live-tokens-adjust-geometry",
        "anchorEnd": "You translate the request into a small ops file; the CLI res"
      },
      {
        "id": "ag-live",
        "row": 1,
        "kind": "step",
        "title": "Read the live configuration",
        "desc": "Each run reads the buffer or falls back to the open theme and shipped default. Relative shifts compound across runs.",
        "lines": [
          17,
          17
        ],
        "anchor": "Each run reads the LIVE config (buffer, else the open theme,"
      },
      {
        "id": "ag-target",
        "row": 2,
        "kind": "step",
        "title": "Choose a global or component target",
        "desc": "An absent target applies globally. Component IDs map windows and modals to dialog, cards to card, and tabs to tabbar. Unknown IDs fail.",
        "lines": [
          34,
          34
        ],
        "anchor": "- `target` (optional): a component id (the folder names unde"
      },
      {
        "id": "ag-kind",
        "row": 3,
        "kind": "chipset",
        "title": "Choose the geometry property",
        "chips": [
          {
            "label": "radius",
            "lines": [
              35,
              35
            ],
            "anchor": "- `kind`: `radius | padding | gap | border-width`."
          },
          {
            "label": "padding",
            "lines": [
              35,
              35
            ],
            "anchor": "- `kind`: `radius | padding | gap | border-width`."
          },
          {
            "label": "gap",
            "lines": [
              35,
              35
            ],
            "anchor": "- `kind`: `radius | padding | gap | border-width`."
          },
          {
            "label": "border-width",
            "lines": [
              35,
              35
            ],
            "anchor": "- `kind`: `radius | padding | gap | border-width`."
          }
        ],
        "tag": "property"
      },
      {
        "id": "ag-op",
        "row": 4,
        "kind": "decide",
        "title": "Set or shift?",
        "desc": "Set selects a token on the property's scale. Shift moves a whole number of steps and clamps at either end.",
        "lines": [
          36,
          36
        ],
        "anchor": "- `set` or `shift`, exactly one of the two. `set` takes an e"
      },
      {
        "id": "ag-shift",
        "row": 5,
        "kind": "step",
        "title": "Shift by steps",
        "desc": "'Slightly' and 'a bit' each move 1 step; an unqualified request moves 1–2; 'much,' 'way,' and 'really' move 2–3. 'Softer' increases radius and spacing.",
        "lines": [
          53,
          53
        ],
        "anchor": "Magnitude words: \"slightly\" or \"a bit\" is 1 step, unqualifie"
      },
      {
        "id": "ag-set",
        "row": 5,
        "kind": "step",
        "title": "Set an exact token",
        "desc": "Set selects a token from the property's scale. A pill operation sets --radius-full. The full flag belongs to radius shifts.",
        "lines": [
          37,
          37
        ],
        "anchor": "- `full` (radius shifts only): admits `--radius-full` as the"
      },
      {
        "id": "ag-idiom",
        "row": 6,
        "kind": "step",
        "title": "Map common phrases to operations",
        "desc": "The table translates pill, corner, density, and border requests into exact operations.",
        "lines": [
          39,
          51
        ],
        "anchor": "## Idioms",
        "anchorEnd": "| thicker, thinner borders | border-width `shift: 1` or `-1`"
      },
      {
        "id": "ag-squeeze",
        "row": 7,
        "kind": "step",
        "title": "Protect controls during compaction",
        "desc": "Global compaction stops at shift: -1 because larger shifts crush controls. Further compaction targets named containers. Global expansion remains safe.",
        "lines": [
          55,
          59
        ],
        "anchor": "## Controls squeeze before containers",
        "anchorEnd": "So a global compaction is `shift: -1`. When the brief wants "
      },
      {
        "id": "ag-pill",
        "row": 8,
        "kind": "decide",
        "title": "Does the request create a pill?",
        "desc": "--radius-full curves into the end glyphs. Large-text pills need at least --space-8 horizontal padding.",
        "lines": [
          61,
          61
        ],
        "anchor": "A pill needs the room most. `--radius-full` bends the corner"
      },
      {
        "id": "ag-pillop",
        "row": 9,
        "kind": "step",
        "title": "Set pill radius and padding together",
        "desc": "The radius and padding operations share a target. The padding set follows global compaction so it wins.",
        "lines": [
          63,
          69
        ],
        "anchor": "```json",
        "anchorEnd": "```"
      },
      {
        "id": "ag-ladder",
        "row": 10,
        "kind": "chipset",
        "title": "Respect token scales and padding floors",
        "chips": [
          {
            "label": "Radius, space, and border-width scales",
            "lines": [
              73,
              73
            ],
            "anchor": "Radius runs `none, sm, md, lg, xl, 2xl, 3xl, 4xl`, with `ful"
          },
          {
            "label": "Content padding floor: --space-4",
            "lines": [
              75,
              75
            ],
            "anchor": "Content insets stop at `--space-4`. Below it the text sits a"
          },
          {
            "label": "Text-control padding floor: --space-6",
            "lines": [
              77,
              77
            ],
            "anchor": "Padding that wraps a line of type stops a rung higher, at `-"
          },
          {
            "label": "Margin shifts use the full scale",
            "lines": [
              79,
              79
            ],
            "anchor": "The floor guards `-padding` only. Outer space is exempt, bec"
          },
          {
            "label": "Off-subset aliases first reach a listed rung",
            "lines": [
              81,
              81
            ],
            "anchor": "An alias sitting off the subset spends its first step reachi"
          }
        ],
        "lines": [
          71,
          71
        ],
        "anchor": "## Ladders",
        "tag": "ladders and floors"
      },
      {
        "id": "ag-write",
        "row": 11,
        "kind": "step",
        "n": "1",
        "title": "Write scratch/adjust-ops.json",
        "lines": [
          12,
          12
        ],
        "anchor": "Write the ops file to `scratch/adjust-ops.json`."
      },
      {
        "id": "ag-shapes",
        "row": 12,
        "kind": "chipset",
        "title": "Check operation forms",
        "chips": [
          {
            "label": "Global, relative",
            "lines": [
              20,
              25
            ],
            "anchor": "",
            "anchorEnd": "```"
          },
          {
            "label": "Targeted, absolute",
            "lines": [
              27,
              31
            ],
            "anchor": "Targeted, absolute:",
            "anchorEnd": "```"
          },
          {
            "label": "The CLI ignores name",
            "lines": [
              33,
              33
            ],
            "anchor": "- `name`: ignored. Buffers are fixed slots, so a name names "
          }
        ],
        "lines": [
          19,
          19
        ],
        "anchor": "## The ops file",
        "tag": "ops file"
      },
      {
        "id": "ag-cli",
        "row": 13,
        "kind": "cli",
        "n": "2",
        "title": "Apply the geometry operations",
        "desc": "The CLI writes each changed component to component-configs/<id>/_working.json, the page's active buffer. --dry-run limits the operation to reporting.",
        "lines": [
          13,
          13
        ],
        "anchor": "Run `npx live-tokens adjust scratch/adjust-ops.json`. It wri",
        "command": "npx live-tokens adjust scratch/adjust-ops.json"
      },
      {
        "id": "ag-fail",
        "row": 14,
        "kind": "gate",
        "title": "The CLI rejects an operation",
        "desc": "The report names the invalid operation or missing input. The repair resolves that issue before the next run.",
        "lines": [
          14,
          14
        ],
        "anchor": "Read the report card: every changed alias old → new, plus sk"
      },
      {
        "id": "ag-card",
        "row": 14,
        "kind": "ok",
        "n": "3",
        "title": "The buffers hold the new geometry",
        "desc": "The report lists every outcome. --space-6 is the padding floor for buttons, badges, inputs, and tabs. Pills at that floor need a targeted lift.",
        "lines": [
          14,
          14
        ],
        "anchor": "Read the report card: every changed alias old → new, plus sk"
      },
      {
        "id": "ag-tell",
        "row": 15,
        "kind": "step",
        "n": "4",
        "title": "Reload and review the geometry",
        "desc": "Reloading before Save gives the editor the current buffer. Save keeps the change, and inverse operations undo it.",
        "lines": [
          15,
          15
        ],
        "anchor": "Tell the user to reload the page before saving. The editor k"
      },
      {
        "id": "ag-scope",
        "row": 16,
        "kind": "chipset",
        "title": "Geometry scope",
        "desc": "Geometry operations remap component aliases to existing tokens and preserve colors, fonts, tokens.css, and saved themes.",
        "chips": [
          {
            "label": "Buffers, Save, and Adopt",
            "lines": [
              83,
              85
            ],
            "anchor": "## Scope",
            "anchorEnd": "Every value written is an existing token; nothing new is min"
          }
        ],
        "tag": "scope"
      },
      {
        "id": "ag-ver",
        "row": 17,
        "kind": "done",
        "title": "Verify the geometry",
        "desc": "The command exits 0 with expected changes and explained skips. Controls remain readable after reload. Each reported component has a _working.json.",
        "lines": [
          87,
          93
        ],
        "anchor": "## Verify",
        "anchorEnd": "- To revert, run the inverse ops, or load a theme in the The"
      }
    ],
    "edges": [
      {
        "from": "ag-trig",
        "to": "ag-live"
      },
      {
        "from": "ag-live",
        "to": "ag-target"
      },
      {
        "from": "ag-target",
        "to": "ag-kind"
      },
      {
        "from": "ag-kind",
        "to": "ag-op"
      },
      {
        "from": "ag-op",
        "to": "ag-shift",
        "label": "shift"
      },
      {
        "from": "ag-op",
        "to": "ag-set",
        "label": "set"
      },
      {
        "from": "ag-shift",
        "to": "ag-idiom"
      },
      {
        "from": "ag-set",
        "to": "ag-idiom"
      },
      {
        "from": "ag-idiom",
        "to": "ag-squeeze"
      },
      {
        "from": "ag-squeeze",
        "to": "ag-pill"
      },
      {
        "from": "ag-pill",
        "to": "ag-pillop",
        "label": "pill"
      },
      {
        "from": "ag-pillop",
        "to": "ag-ladder"
      },
      {
        "from": "ag-ladder",
        "to": "ag-write"
      },
      {
        "from": "ag-write",
        "to": "ag-shapes"
      },
      {
        "from": "ag-shapes",
        "to": "ag-cli"
      },
      {
        "from": "ag-cli",
        "to": "ag-fail",
        "label": "exit 1"
      },
      {
        "from": "ag-cli",
        "to": "ag-card",
        "label": "exit 0"
      },
      {
        "from": "ag-fail",
        "to": "ag-cli",
        "label": "rerun",
        "back": true
      },
      {
        "from": "ag-card",
        "to": "ag-tell"
      },
      {
        "from": "ag-tell",
        "to": "ag-scope"
      },
      {
        "from": "ag-scope",
        "to": "ag-ver"
      },
      {
        "from": "ag-pill",
        "to": "ag-ladder",
        "label": "other geometry"
      }
    ]
  },
  "pick-component": {
    "id": "live-tokens-pick-component",
    "digest": "sha256:8a49229102d83d69",
    "title": "pick-component",
    "tagline": "Purpose determines the component. Similar-looking components serve different jobs.",
    "nodes": [
      {
        "id": "pk-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Choose a component for a UX need",
        "desc": "Purpose, interaction, and content map the need to the catalogue before custom implementation.",
        "lines": [
          2,
          8
        ],
        "anchor": "name: live-tokens-pick-component",
        "anchorEnd": "This skill helps you choose between shipped components when "
      },
      {
        "id": "pk-cat",
        "row": 1,
        "kind": "step",
        "title": "Scan the catalogue",
        "desc": "The catalogue groups 26 shipped components into six families. Slider belongs to the Input family; CodeSnippet presents commands the reader should run.",
        "lines": [
          12,
          14
        ],
        "anchor": "## Catalogue",
        "anchorEnd": "Action: `Button`, `IconButton`, `InlineEditActions`. Input: "
      },
      {
        "id": "pk-reg",
        "row": 2,
        "kind": "cli",
        "title": "Inspect available components",
        "desc": "The list combines shipped and registered project components. A component ID reveals its purpose, variants, props, accepted values, and token defaults.",
        "lines": [
          16,
          22
        ],
        "anchor": "That line is the shipped set. A project can register compone",
        "anchorEnd": "union accepts, and its tokens with defaults; `--json` return",
        "command": "npx live-tokens components"
      },
      {
        "id": "pk-fam",
        "row": 3,
        "kind": "decide",
        "title": "Component job?",
        "desc": "The component's primary job selects a family and its deciding question.",
        "lines": [
          14,
          14
        ],
        "anchor": "Action: `Button`, `IconButton`, `InlineEditActions`. Input: "
      },
      {
        "id": "pk-act",
        "row": 4,
        "kind": "ask",
        "tag": "action",
        "title": "Action content?",
        "desc": "IconButton handles a clear icon action and requires ariaLabel. Button carries text. InlineEditActions supplies a consistent confirm-and-cancel pair.",
        "lines": [
          24,
          31
        ],
        "anchor": "## Action family: Button vs IconButton",
        "anchorEnd": "- `InlineEditActions` is the confirm-and-cancel pair that fo",
        "chips": [
          {
            "label": "Clear icon: IconButton",
            "lines": [
              29,
              29
            ],
            "anchor": "- `IconButton` is icon-only and square. Use it for compact, "
          },
          {
            "label": "Needs text: Button",
            "lines": [
              28,
              28
            ],
            "anchor": "- `Button` carries a text label, optionally with a leading o"
          },
          {
            "label": "Confirm and cancel: InlineEditActions",
            "lines": [
              31,
              31
            ],
            "anchor": "- `InlineEditActions` is the confirm-and-cancel pair that fo"
          }
        ]
      },
      {
        "id": "pk-sel",
        "row": 4,
        "kind": "ask",
        "tag": "single selection",
        "title": "Selection context?",
        "desc": "SegmentedControl handles 2–4 inline alternatives; TabBar handles 2–7 page panels. RadioButton suits form choices or long labels. MenuSelect contains overflowing options.",
        "lines": [
          33,
          47
        ],
        "anchor": "## Single-selection family: SegmentedControl vs TabBar vs Ra",
        "anchorEnd": "- **Don't pick `SegmentedControl` when option labels are lon",
        "chips": [
          {
            "label": "Page content: TabBar",
            "lines": [
              40,
              40
            ],
            "anchor": "| `TabBar`          | Switching between *tab panels* (conten"
          },
          {
            "label": "Inline setting: SegmentedControl",
            "lines": [
              39,
              39
            ],
            "anchor": "| `SegmentedControl`| Inline switch between alternative *vie"
          },
          {
            "label": "Form choice: RadioButton",
            "lines": [
              41,
              41
            ],
            "anchor": "| `RadioButton`     | Form-style selection where the user re"
          },
          {
            "label": "Many options: MenuSelect",
            "lines": [
              42,
              42
            ],
            "anchor": "| `MenuSelect`      | A list of options, one checked; render"
          },
          {
            "label": "Labels that wrap: RadioButton",
            "lines": [
              47,
              47
            ],
            "anchor": "- **Don't pick `SegmentedControl` when option labels are lon"
          }
        ]
      },
      {
        "id": "pk-text",
        "row": 4,
        "kind": "ask",
        "tag": "text entry",
        "title": "Answer set?",
        "desc": "Fixed answers take selection controls; open answers take Input. Slider suits position or two bounds; numeric Input suits values users prefer to type. Input's error state holds validation messages.",
        "lines": [
          49,
          55
        ],
        "anchor": "## Text entry: Input vs the selection family",
        "anchorEnd": "- Its four variants are `default`, `focused`, `disabled`, an",
        "chips": [
          {
            "label": "Short list: selection family",
            "lines": [
              52,
              52
            ],
            "anchor": "- The boundary is whether you can list the answers. A short "
          },
          {
            "label": "Long list: MenuSelect",
            "lines": [
              52,
              52
            ],
            "anchor": "- The boundary is whether you can list the answers. A short "
          },
          {
            "label": "Open-ended: Input",
            "lines": [
              51,
              51
            ],
            "anchor": "- `Input` takes an answer the page cannot enumerate: a name,"
          },
          {
            "label": "Position or two bounds: Slider",
            "lines": [
              53,
              53
            ],
            "anchor": "- `Slider` takes a number inside a known range where the pos"
          },
          {
            "label": "Binary state: Toggle",
            "lines": [
              54,
              54
            ],
            "anchor": "- **Don't use it for on/off.** That is `Toggle`, and a one-f"
          }
        ]
      },
      {
        "id": "pk-con",
        "row": 4,
        "kind": "ask",
        "tag": "containers",
        "title": "Container role?",
        "desc": "Card groups content. CollapsibleSection hides secondary content. Panel fixes a stage's height. Dialog pauses page interaction for a focused task.",
        "lines": [
          57,
          69
        ],
        "anchor": "## Container family: Card vs CollapsibleSection vs Dialog",
        "anchorEnd": "- **Don't use `Dialog` for routine forms.** Reach for it onl",
        "chips": [
          {
            "label": "Grouped content: Card",
            "lines": [
              66,
              66
            ],
            "anchor": "- Default to `Card`. It's the workhorse. For full-bleed medi"
          },
          {
            "label": "Secondary content: CollapsibleSection",
            "lines": [
              67,
              67
            ],
            "anchor": "- Reach for `CollapsibleSection` only when the content is *l"
          },
          {
            "label": "Stage: Panel",
            "lines": [
              68,
              68
            ],
            "anchor": "- `Panel` is a stage, not a content container. It pins its o"
          },
          {
            "label": "Blocking task: Dialog",
            "lines": [
              69,
              69
            ],
            "anchor": "- **Don't use `Dialog` for routine forms.** Reach for it onl"
          }
        ]
      },
      {
        "id": "pk-msg",
        "row": 4,
        "kind": "ask",
        "tag": "messaging",
        "title": "Message role?",
        "desc": "Callout provides persistent content; Notification provides transient feedback. Tooltip supplements visible content. Badge sits inline; CornerBadge overlays another element.",
        "lines": [
          71,
          84
        ],
        "anchor": "## Messaging family: Callout vs Notification vs Tooltip vs B",
        "anchorEnd": "- `Badge` and `CornerBadge` differ only in positioning. `Cor",
        "chips": [
          {
            "label": "Persistent content: Callout",
            "lines": [
              81,
              81
            ],
            "anchor": "- `Callout` is *content*. Part of the section, written into "
          },
          {
            "label": "Transient feedback: Notification",
            "lines": [
              82,
              82
            ],
            "anchor": "- `Notification` is *feedback*. Appears in response to an ac"
          },
          {
            "label": "Supplementary hint: Tooltip",
            "lines": [
              83,
              83
            ],
            "anchor": "- `Tooltip` is for *what an element means*. **Don't use `Too"
          },
          {
            "label": "Status: Badge or CornerBadge",
            "lines": [
              84,
              84
            ],
            "anchor": "- `Badge` and `CornerBadge` differ only in positioning. `Cor"
          }
        ]
      },
      {
        "id": "pk-bin",
        "row": 4,
        "kind": "ask",
        "tag": "on or off",
        "title": "Binary-choice context?",
        "desc": "Toggle controls one named feature and acts immediately. SegmentedControl compares two named states. RadioButton belongs in a larger form submission.",
        "lines": [
          95,
          107
        ],
        "anchor": "## Toggle vs SegmentedControl vs RadioButton (for on/off)",
        "anchorEnd": "- `Toggle` flips immediately; `RadioButton` pair is for form",
        "chips": [
          {
            "label": "Same name: Toggle",
            "lines": [
              105,
              105
            ],
            "anchor": "- If the off and on states share a name (the feature itself)"
          },
          {
            "label": "Distinct names: SegmentedControl",
            "lines": [
              106,
              106
            ],
            "anchor": "- If the two states have different names you want users to c"
          },
          {
            "label": "Larger form: RadioButton pair",
            "lines": [
              107,
              107
            ],
            "anchor": "- `Toggle` flips immediately; `RadioButton` pair is for form"
          }
        ]
      },
      {
        "id": "pk-disp",
        "row": 4,
        "kind": "ask",
        "tag": "display",
        "title": "Display content?",
        "desc": "Table presents records; Cards present actionable items. ImageLightbox reveals detail; ProgressBar reports progress; CodeSnippet offers copyable commands or values. SideNavigation changes URLs; TabBar changes panels.",
        "lines": [
          86,
          93
        ],
        "anchor": "## Display family: shown, not asked",
        "anchorEnd": "- `SectionDivider` separates sections of one page. `SideNavi",
        "chips": [
          {
            "label": "Inline picture: Image",
            "lines": [
              88,
              88
            ],
            "anchor": "- `Image` frames a picture in the flow at one of four sizes,"
          },
          {
            "label": "Detailed picture: ImageLightbox",
            "lines": [
              89,
              89
            ],
            "anchor": "- `ImageLightbox` adds click-to-open at full size and takes "
          },
          {
            "label": "Records: Table",
            "lines": [
              90,
              90
            ],
            "anchor": "- `Table` themes your own rows and cells without owning the "
          },
          {
            "label": "Progress readout: ProgressBar",
            "lines": [
              91,
              91
            ],
            "anchor": "- `ProgressBar` reports progress against a labelled track. I"
          },
          {
            "label": "Copyable command or value: CodeSnippet",
            "lines": [
              92,
              92
            ],
            "anchor": "- `CodeSnippet` is for a single-line command or value the re"
          },
          {
            "label": "Sections: SectionDivider; URLs: SideNavigation",
            "lines": [
              93,
              93
            ],
            "anchor": "- `SectionDivider` separates sections of one page. `SideNavi"
          }
        ]
      },
      {
        "id": "pk-fits",
        "row": 5,
        "kind": "decide",
        "title": "Does anything in the catalogue fit?",
        "desc": "A catalogue fit limits maintenance. A catalogue gap warrants a custom component.",
        "lines": [
          109,
          111
        ],
        "anchor": "---",
        "anchorEnd": "If nothing in the catalogue fits (a `DatePicker`, a `Stepper"
      },
      {
        "id": "pk-place",
        "row": 6,
        "kind": "hand",
        "title": "Continue with build-page",
        "desc": "The page uses the selected component.",
        "lines": [
          10,
          10
        ],
        "anchor": "For composing a page once you've picked components, see **li"
      },
      {
        "id": "pk-make",
        "row": 6,
        "kind": "hand",
        "title": "Continue with create-component",
        "desc": "The custom path builds a token-driven DatePicker, Stepper, or other uncovered need.",
        "lines": [
          111,
          111
        ],
        "anchor": "If nothing in the catalogue fits (a `DatePicker`, a `Stepper"
      }
    ],
    "edges": [
      {
        "from": "pk-trig",
        "to": "pk-cat"
      },
      {
        "from": "pk-cat",
        "to": "pk-reg"
      },
      {
        "from": "pk-fam",
        "to": "pk-act",
        "label": "action"
      },
      {
        "from": "pk-act",
        "to": "pk-fits"
      },
      {
        "from": "pk-fam",
        "to": "pk-sel",
        "label": "selection"
      },
      {
        "from": "pk-sel",
        "to": "pk-fits"
      },
      {
        "from": "pk-fam",
        "to": "pk-con",
        "label": "container"
      },
      {
        "from": "pk-con",
        "to": "pk-fits"
      },
      {
        "from": "pk-fam",
        "to": "pk-msg",
        "label": "message"
      },
      {
        "from": "pk-msg",
        "to": "pk-fits"
      },
      {
        "from": "pk-fam",
        "to": "pk-bin",
        "label": "on/off"
      },
      {
        "from": "pk-bin",
        "to": "pk-fits"
      },
      {
        "from": "pk-fits",
        "to": "pk-place",
        "label": "catalogue fit"
      },
      {
        "from": "pk-fits",
        "to": "pk-make",
        "label": "catalogue gap"
      },
      {
        "from": "pk-fam",
        "to": "pk-text",
        "label": "text entry"
      },
      {
        "from": "pk-text",
        "to": "pk-fits"
      },
      {
        "from": "pk-fam",
        "to": "pk-disp",
        "label": "display"
      },
      {
        "from": "pk-disp",
        "to": "pk-fits"
      },
      {
        "from": "pk-reg",
        "to": "pk-fam"
      }
    ]
  },
  "build-page": {
    "id": "live-tokens-build-page",
    "digest": "sha256:9690053df3487413",
    "title": "build-page",
    "tagline": "Catalogue components cover established needs. Theme tokens drive every theme-owned value.",
    "nodes": [
      {
        "id": "bp-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Build a page, route, or screen",
        "desc": "The page combines catalogue components and theme tokens, then adds routing and repaint verification.",
        "lines": [
          2,
          8
        ],
        "anchor": "name: live-tokens-build-page",
        "anchorEnd": "Two rules above all else:"
      },
      {
        "id": "bp-fit",
        "row": 2,
        "kind": "decide",
        "n": "1",
        "title": "Does an existing component fit?",
        "desc": "A catalogue component enters contract inspection. A catalogue gap opens the custom UI paths.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-pick",
        "row": 1,
        "kind": "hand",
        "title": "Check with pick-component",
        "desc": "pick-component tests the need against shipped and registered project components.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-use",
        "row": 3,
        "kind": "step",
        "title": "Import the existing component",
        "desc": "Shipped components come from @motion-proto/live-tokens/components/<Name>.svelte; project components come from their local path.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-custom-q",
        "row": 3,
        "kind": "decide",
        "title": "Custom UI scope?",
        "desc": "Page-local markup suits one-off layout. create-component supports reusable UI and Live Tokens editing.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-local",
        "row": 4,
        "kind": "step",
        "title": "Write page-local markup",
        "desc": "The markup follows the page's token, typography, grid, routing, and validation rules.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-make",
        "row": 4,
        "kind": "hand",
        "title": "Create the missing component",
        "desc": "create-component builds reusable, editable UI. The completed component returns here for contract inspection.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-props",
        "row": 5,
        "kind": "cli",
        "title": "Inspect the component contract",
        "desc": "The component receives declared props and accepted variant and size values. The checker flags unsupported values before the runtime drops them.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio",
        "command": "npx live-tokens components <id>"
      },
      {
        "id": "bp-tok",
        "row": 6,
        "kind": "step",
        "n": "2",
        "title": "Use tokens for theme-owned values",
        "desc": "Theme tokens supply colours, spacing, strokes, radii, shadows, font sizes, and font families in <style>, style=, and style: directives. Literals remain for layout dimensions.",
        "lines": [
          11,
          11
        ],
        "anchor": "**Use theme tokens for every value.** Every color, spacing, "
      },
      {
        "id": "bp-text",
        "row": 7,
        "kind": "step",
        "title": "Use a complete text-style token",
        "desc": "The --heading-*, --body-*, --editorial-*, --eyebrow, and --code tokens set family, size, weight, line height, and letter spacing together. Theme changes update the complete style.",
        "lines": [
          13,
          13
        ],
        "anchor": "For text, reach for a whole text style rather than assemblin"
      },
      {
        "id": "bp-prose-q",
        "row": 8,
        "kind": "decide",
        "title": "Container prose override?",
        "desc": "Card and CollapsibleSection style nested prose by default. Page-owned text and full-bleed media disable prose.",
        "lines": [
          15,
          15
        ],
        "anchor": "Text inside a `Card` or a `CollapsibleSection` is typed by"
      },
      {
        "id": "bp-prose",
        "row": 9,
        "kind": "step",
        "title": "Pass prose={false}",
        "desc": "This prop gives the page control of nested text and full-bleed media.",
        "lines": [
          15,
          15
        ],
        "anchor": "Text inside a `Card` or a `CollapsibleSection` is typed by"
      },
      {
        "id": "bp-grid",
        "row": 12,
        "kind": "step",
        "title": "Use the page column grid",
        "desc": "The page uses --columns-count, --columns-gutter, and --columns-max-width. Page-aligned children span 1 / -1 and redeclare repeat(var(--columns-count), 1fr) with --columns-gutter.",
        "lines": [
          35,
          37
        ],
        "anchor": "Pages sit inside the column grid via `--columns-count`, `--c",
        "anchorEnd": "To place children at specific page-column positions, span th"
      },
      {
        "id": "bp-wire",
        "row": 15,
        "kind": "decide",
        "title": "Does the app use LiveTokensRouter?",
        "desc": "The route follows App.svelte's pattern and lazy-loads the page. Static imports evaluate every page module at startup and leak CSS into editor routes.",
        "lines": [
          53,
          58
        ],
        "anchor": "## Wiring",
        "anchorEnd": "Either way use `lazy`, not a static top-level import: static"
      },
      {
        "id": "bp-router",
        "row": 16,
        "kind": "step",
        "title": "Add a lazy page entry",
        "desc": "The entry sets lazy and source. label and icon add navigation; resolve(path) handles dynamic routes. A URL-only route omits label.",
        "lines": [
          56,
          56
        ],
        "anchor": "- **`<LiveTokensRouter pages={...}>`** (the usual case): add"
      },
      {
        "id": "bp-overlay",
        "row": 16,
        "kind": "step",
        "title": "Wire LiveEditorOverlay manually",
        "desc": "$derived.by(() => import(...)) loads the page, and pageSources registers its source.",
        "lines": [
          57,
          57
        ],
        "anchor": "- **Manual `<LiveEditorOverlay>`**: dispatch with `$derived."
      },
      {
        "id": "bp-css",
        "row": 17,
        "kind": "step",
        "title": "Import site.css in each page",
        "desc": "Each page imports site.css in its script block. A main.ts import leaks page CSS into editor routes.",
        "lines": [
          59,
          59
        ],
        "anchor": "- Import `site.css` from each page's `<script>` block, never"
      },
      {
        "id": "bp-avoid",
        "row": 18,
        "kind": "chipset",
        "title": "Follow seven page safeguards",
        "chips": [
          {
            "label": "Theme tokens for colour and geometry",
            "lines": [
              78,
              78
            ],
            "anchor": "- Colour literals, and px or rem in spacing, stroke, radius,"
          },
          {
            "label": "Page grids use --columns-count",
            "lines": [
              79,
              79
            ],
            "anchor": "- Hardcoded page-grid counts (`repeat(10, 1fr)`). Use `repea"
          },
          {
            "label": "Component changes through the editor",
            "lines": [
              80,
              80
            ],
            "anchor": "- Utility classes overriding shipped components. Extend via "
          },
          {
            "label": "Label the box with a text style",
            "lines": [
              81,
              81
            ],
            "anchor": "- A card header as a section label in a tool UI, and a page "
          },
          {
            "label": "Public package imports",
            "lines": [
              82,
              82
            ],
            "anchor": "- Deep imports from `node_modules/@motion-proto/live-tokens/"
          },
          {
            "label": "Editor routes own editor mounts",
            "lines": [
              83,
              83
            ],
            "anchor": "- Mounting `Editor` or `ComponentEditorPage` outside their d"
          },
          {
            "label": "The package owns /live-tokens/* routes",
            "lines": [
              84,
              84
            ],
            "anchor": "- A page route under `/live-tokens/*`. That namespace is re"
          }
        ],
        "lines": [
          76,
          76
        ],
        "anchor": "## Avoid",
        "tag": "safeguards"
      },
      {
        "id": "bp-check",
        "row": 19,
        "kind": "cli",
        "title": "Check the page",
        "desc": "The checker rejects invalid components, props, imports, tokens, colours, and routes. Strict mode adds px/rem geometry, fixed page columns, raw type axes, and source-free routes.",
        "lines": [
          88,
          97
        ],
        "anchor": "Run the checker and fix what it reports. Repeat until it exi",
        "anchorEnd": "Warnings do not fail the run. `--strict` makes them fail, wh",
        "command": "npx live-tokens check-page src/pages/YourPage.svelte --strict --json"
      },
      {
        "id": "bp-fail",
        "row": 20,
        "kind": "gate",
        "title": "Fix page-check findings",
        "desc": "Each repair clears one reported rule before the next run.",
        "lines": [
          88,
          97
        ],
        "anchor": "Run the checker and fix what it reports. Repeat until it exi",
        "anchorEnd": "Warnings do not fail the run. `--strict` makes them fail, wh"
      },
      {
        "id": "bp-pass",
        "row": 20,
        "kind": "ok",
        "title": "Page check passes",
        "desc": "The page meets its component, token, import, and routing contracts.",
        "lines": [
          88,
          97
        ],
        "anchor": "Run the checker and fix what it reports. Repeat until it exi",
        "anchorEnd": "Warnings do not fail the run. `--strict` makes them fail, wh"
      },
      {
        "id": "bp-ver",
        "row": 21,
        "kind": "done",
        "title": "Verify the page repaints",
        "desc": "A colour change confirms repainting. Page Source confirms the route source. The columns overlay confirms that content stays within --columns-max-width.",
        "lines": [
          103,
          103
        ],
        "anchor": "Then in dev: change a colour in `/live-tokens/editor` and co"
      },
      {
        "id": "bp-laws",
        "row": 10,
        "kind": "step",
        "title": "The purpose of a layout",
        "desc": "The page shows one thing; each mark that is not content must earn its place. Separate with the smallest difference that separates: space, then a hairline rule, then a second surface. Content, labels, and scaffolding each take their own token. On a tool page the stage takes the space and controls take the smallest size that still works.",
        "reference": "references/layout-sources.md",
        "lines": [
          19,
          29
        ],
        "anchor": "**The purpose of a layout.** The page shows one thing. All o",
        "anchorEnd": "`references/layout-sources.md` names the sources for these l"
      },
      {
        "id": "bp-bands",
        "row": 11,
        "kind": "step",
        "title": "Name the bands by their job",
        "desc": "Name each band by its job: what the user looks at, types into, presses. A tool page runs stage, inputs, then one toolbar along the bottom edge. Separate bands with space and a rule; stretch a band's boxes to one height so their bottom edges make one line.",
        "reference": "references/layout-sources.md",
        "lines": [
          31,
          33
        ],
        "anchor": "Decide the bands before the columns. Read the page top to bo",
        "anchorEnd": "Separate bands with space and a rule, `padding-top: var(--sp"
      },
      {
        "id": "bp-contain",
        "row": 13,
        "kind": "step",
        "title": "Containers by job",
        "desc": "Panel is a stage. Card is a titled block of content, typed by its own tokens; compact drops a size. A box in a tool UI is a bare compact Card labelled from a text style. A toolbar is a flex row of small buttons with no card around it.",
        "reference": "references/layout-sources.md",
        "lines": [
          39,
          44
        ],
        "anchor": "### Containers by job",
        "anchorEnd": "- A toolbar is a flex row of small buttons on the band's bot"
      },
      {
        "id": "bp-density",
        "row": 14,
        "kind": "step",
        "title": "Density",
        "desc": "size=\"small\" in toolbars and compose rows; fullWidth comes off in a row. A custom wrapper forwards size. Text in a card body inherits the card's size unless typed. MenuSelect renders open; a picker toggles it from a Button.",
        "reference": "references/layout-sources.md",
        "lines": [
          46,
          51
        ],
        "anchor": "### Density",
        "anchorEnd": "- `MenuSelect` renders its list open. For a picker, toggle i"
      }
    ],
    "edges": [
      {
        "from": "bp-trig",
        "to": "bp-pick"
      },
      {
        "from": "bp-pick",
        "to": "bp-fit"
      },
      {
        "from": "bp-fit",
        "to": "bp-use",
        "label": "catalogue fit"
      },
      {
        "from": "bp-fit",
        "to": "bp-custom-q",
        "label": "catalogue gap"
      },
      {
        "from": "bp-custom-q",
        "to": "bp-local",
        "label": "one-off page"
      },
      {
        "from": "bp-custom-q",
        "to": "bp-make",
        "label": "reusable or editable"
      },
      {
        "from": "bp-use",
        "to": "bp-props"
      },
      {
        "from": "bp-make",
        "to": "bp-props"
      },
      {
        "from": "bp-local",
        "to": "bp-tok"
      },
      {
        "from": "bp-tok",
        "to": "bp-text"
      },
      {
        "from": "bp-text",
        "to": "bp-prose-q"
      },
      {
        "from": "bp-prose-q",
        "to": "bp-prose",
        "label": "page text or full bleed"
      },
      {
        "from": "bp-wire",
        "to": "bp-router",
        "label": "LiveTokensRouter"
      },
      {
        "from": "bp-wire",
        "to": "bp-overlay",
        "label": "manual overlay"
      },
      {
        "from": "bp-router",
        "to": "bp-css"
      },
      {
        "from": "bp-overlay",
        "to": "bp-css"
      },
      {
        "from": "bp-css",
        "to": "bp-avoid"
      },
      {
        "from": "bp-avoid",
        "to": "bp-check"
      },
      {
        "from": "bp-props",
        "to": "bp-tok"
      },
      {
        "from": "bp-check",
        "to": "bp-fail",
        "label": "exit 1"
      },
      {
        "from": "bp-check",
        "to": "bp-pass",
        "label": "exit 0"
      },
      {
        "from": "bp-pass",
        "to": "bp-ver"
      },
      {
        "from": "bp-fail",
        "to": "bp-check",
        "label": "rerun",
        "back": true
      },
      {
        "from": "bp-prose-q",
        "to": "bp-laws",
        "label": "default handling"
      },
      {
        "from": "bp-prose",
        "to": "bp-laws"
      },
      {
        "from": "bp-laws",
        "to": "bp-bands"
      },
      {
        "from": "bp-bands",
        "to": "bp-grid"
      },
      {
        "from": "bp-grid",
        "to": "bp-contain"
      },
      {
        "from": "bp-contain",
        "to": "bp-density"
      },
      {
        "from": "bp-density",
        "to": "bp-wire"
      }
    ]
  },
  "create-component": {
    "id": "live-tokens-create-component",
    "digest": "sha256:d4d3024f29d6580e",
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
              169,
              169
            ],
            "anchor": "- `references/linked-siblings.md`: variants that share base "
          },
          {
            "label": "Structural controls: intrinsics",
            "lines": [
              170,
              170
            ],
            "anchor": "- `references/intrinsics.md`: structural or display choices "
          },
          {
            "label": "Sketch mode, required",
            "lines": [
              171,
              171
            ],
            "anchor": "- `references/sketch-mode.md`: joining the sketch layer. **E"
          }
        ],
        "lines": [
          165,
          171
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
        "desc": "A leading HTML comment names the job and limits; the catalogue pairs it with ID, variants, and props. componentDirs adds other source directories.",
        "lines": [
          46,
          46
        ],
        "anchor": "**Say what it is for.** The runtime file's leading HTML comm"
      },
      {
        "id": "cc-sk",
        "row": 8,
        "kind": "step",
        "n": "5",
        "title": "Join the sketch layer",
        "desc": "Project components choose a reserved class by size and declare five --sketch-* values. The class requires normal flow, visible overflow, and free pseudo-elements. Package components register PartSpec.",
        "lines": [
          47,
          47
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
          48,
          54
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
              57,
              81
            ],
            "anchor": "## Token discipline",
            "anchorEnd": ""
          },
          {
            "label": "Allowed suffixes",
            "lines": [
              71,
              92
            ],
            "anchor": "### Suffix vocabulary",
            "anchorEnd": "compete. A suffix outside that list fails `check-component`."
          },
          {
            "label": "Common failures",
            "lines": [
              97,
              103
            ],
            "anchor": "### Rules that bite",
            "anchorEnd": "- **Text aliases.** Neutral scale is `--text-primary` / `--t"
          },
          {
            "label": "Typography groupKey",
            "lines": [
              104,
              114
            ],
            "anchor": "- **Typography `groupKey` on multi-slot components must incl",
            "anchorEnd": "The helper strips the `--<component>-` prefix and those segm"
          },
          {
            "label": "State model for stateful components",
            "lines": [
              116,
              159
            ],
            "anchor": "## State model",
            "anchorEnd": "```"
          },
          {
            "label": "Editor copy",
            "lines": [
              142,
              146
            ],
            "anchor": "## User-facing copy",
            "anchorEnd": "Custom chrome inside an editor snippet is rare, since `Compo"
          },
          {
            "label": "Public import paths",
            "lines": [
              148,
              163
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
          48,
          54
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
          173,
          175
        ],
        "anchor": "## Verification checklist",
        "anchorEnd": "Step 6 of the recipe is the static gate: `npx live-tokens ch",
        "chips": [
          {
            "label": "Verification checklist",
            "lines": [
              55,
              55
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
          177,
          177
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
          179,
          179
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
          179,
          179
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
          181,
          189
        ],
        "anchor": "Finally navigate to `/live-tokens/components` and confirm th",
        "anchorEnd": "- [ ] Switch Sketch mode on in the editor and walk the check"
      },
      {
        "id": "cc-place",
        "row": 15,
        "kind": "hand",
        "title": "Continue with build-page",
        "desc": "build-page places the completed component on a page.",
        "lines": [
          55,
          55
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
    "digest": "sha256:312e48bb6fc90fa4",
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
            "label": "--strict warnings",
            "lines": [
              45,
              45
            ],
            "anchor": "What `--strict` would add: warnings by rule."
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
