import type { SkillTree } from './types';

export const skillTrees: Record<string, SkillTree> = {
  "generate-theme": {
    "id": "live-tokens-generate-theme",
    "title": "generate-theme",
    "tagline": "One brief becomes three decisions: color here, type and geometry delegated.",
    "nodes": [
      {
        "id": "gt-trig",
        "row": 0,
        "kind": "trigger",
        "title": "A brief names a mood, hue, era, or occasion",
        "desc": "Fires on theme, look, vibe, palette, brand feel. Single tokens go to the editor; type alone or geometry alone go straight to the sibling skills.",
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
        "title": "Name the voice in one sentence",
        "desc": "Mood, hue family, scheme, and the type and geometry that mood implies. Every decision below keys off this sentence.",
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
        "title": "Which anchor reference matches?",
        "desc": "An anchor entry fixes color, type, and geometry together and overrides the generic defaults in this file. Read it before seeding.",
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
        "title": "A feeling",
        "desc": "mood-vocabulary.md",
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
        "title": "An idiom or era",
        "desc": "style-vocabulary.md",
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
        "title": "A holiday or season",
        "desc": "named-themes.md",
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
        "title": "None of the three",
        "desc": "Fall back to the bands and the geometry table",
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
        "title": "Seed all ten palettes in OKLCH",
        "desc": "Write scratch/theme-brief.json. Ten seeds are required: Brand, Accent, Special, Canvas, Neutral, Alternate, and the four statuses.",
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
        "title": "The constraints on that one step",
        "desc": "Not a sequence. Every seed is checked against all of these.",
        "chips": [
          {
            "label": "Brief shape",
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
            "label": "Per-role bands",
            "lines": [
              60,
              72
            ],
            "anchor": "## Per-role bands",
            "anchorEnd": "| Danger | shared status L, C 0.15 to 0.20 | same | H 20 to "
          },
          {
            "label": "Commit the canvas",
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
            "label": "Harmony offsets",
            "lines": [
              105,
              111
            ],
            "anchor": "## Harmony",
            "anchorEnd": "- Drama or maximum contrast: complementary, triadic, or tetr"
          },
          {
            "label": "Canvas sky",
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
        "title": "npx live-tokens generate-theme",
        "desc": "Writes themes/<slug>.json, opens it, prints a contrast report. --dry-run reports only; --no-activate writes without opening.",
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
        "command": "npx live-tokens generate-theme scratch/theme-brief.json"
      },
      {
        "id": "gt-fail",
        "row": 7,
        "kind": "gate",
        "title": "Exit 1: a floor is unmet",
        "desc": "The seeds themselves are unworkable. Each failure line names the seed to change, usually raise its lightness or cut its chroma. Fix the brief and re-run under the same name.",
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
        "title": "Exit 0: auto-corrections are fine",
        "desc": "Regeneration replaces the theme's whole color state, including palette edits made in the editor since the last run. Say so once when iterating.",
        "lines": [
          15,
          15
        ],
        "anchor": "Run `npx live-tokens generate-theme scratch/<slug>-brief.jso"
      },
      {
        "id": "gt-fonts",
        "row": 8,
        "kind": "hand",
        "n": "5",
        "title": "Hand the voice to pair-fonts",
        "desc": "Same voice sentence, so the type comes from the same reading of the brief. Skip only when the user asked for color specifically and said to leave the type alone.",
        "lines": [
          16,
          16
        ],
        "anchor": "Invoke **live-tokens-pair-fonts** with the same voice. Skip "
      },
      {
        "id": "gt-geo",
        "row": 9,
        "kind": "hand",
        "n": "6",
        "title": "Hand the geometry to adjust-geometry",
        "desc": "Give it intent, not mechanics. The voice table is the fallback; an anchor entry's geometry wins over it.",
        "lines": [
          17,
          17
        ],
        "anchor": "Invoke **live-tokens-adjust-geometry** with the geometry the"
      },
      {
        "id": "gt-geotab",
        "row": 10,
        "kind": "chipset",
        "title": "Where the geometry comes from",
        "chips": [
          {
            "label": "Geometry from the voice",
            "lines": [
              129,
              140
            ],
            "anchor": "## Geometry from the voice",
            "anchorEnd": "This table is the fallback. When the brief matched an entry "
          },
          {
            "label": "Order is safe as written",
            "lines": [
              20,
              20
            ],
            "anchor": "Order matters only for safety, and the order above is safe: "
          },
          {
            "label": "Files each step writes",
            "lines": [
              148,
              150
            ],
            "anchor": "## Files each step writes",
            "anchorEnd": "Color writes `themes/<slug>.json` and opens it. Type and geo"
          }
        ],
        "tag": "where it comes from"
      },
      {
        "id": "gt-tell",
        "row": 11,
        "kind": "step",
        "n": "7",
        "title": "Tell the user to look, and that it is unsaved",
        "desc": "Type and geometry sit in the unsaved buffer until they save the open theme. Offer refinements as edits to the same brief.",
        "lines": [
          18,
          18
        ],
        "anchor": "Tell the user to look at the running app, and that type and "
      },
      {
        "id": "gt-ver",
        "row": 12,
        "kind": "done",
        "title": "Verify",
        "desc": "Color CLI exits 0 with every check passing, both siblings report what they changed, the app shows the whole look after a reload. Load the named theme to go back.",
        "lines": [
          152,
          156
        ],
        "anchor": "## Verify",
        "anchorEnd": "- To return to the previous look, load the theme the CLI out"
      },
      {
        "id": "gt-refine",
        "row": 13,
        "kind": "step",
        "tag": "Follow-up",
        "title": "\"Warmer\", \"calmer\", \"more contrast\"",
        "desc": "A refinement is a new brief, not a hand-edit. Edit scratch/<slug>-brief.json, or recover the ten seeds from the theme file's editorConfigs. One adjective moves one dial; every seed the user did not name stays put.",
        "lines": [
          142,
          146
        ],
        "anchor": "## Refining a theme that exists",
        "anchorEnd": "One adjective moves one dial. Warmer and cooler rotate hue; "
      }
    ],
    "edges": [
      [
        "gt-trig",
        "gt-voice"
      ],
      [
        "gt-voice",
        "gt-anchor"
      ],
      [
        "gt-anchor",
        "gt-mood"
      ],
      [
        "gt-anchor",
        "gt-style"
      ],
      [
        "gt-anchor",
        "gt-named"
      ],
      [
        "gt-anchor",
        "gt-none"
      ],
      [
        "gt-mood",
        "gt-seed"
      ],
      [
        "gt-style",
        "gt-seed"
      ],
      [
        "gt-named",
        "gt-seed"
      ],
      [
        "gt-none",
        "gt-seed"
      ],
      [
        "gt-seed",
        "gt-cons"
      ],
      [
        "gt-cons",
        "gt-cli"
      ],
      [
        "gt-cli",
        "gt-fail"
      ],
      [
        "gt-cli",
        "gt-pass"
      ],
      [
        "gt-fail",
        "gt-cli",
        "back"
      ],
      [
        "gt-pass",
        "gt-fonts"
      ],
      [
        "gt-fonts",
        "gt-geo"
      ],
      [
        "gt-geo",
        "gt-geotab"
      ],
      [
        "gt-geotab",
        "gt-tell"
      ],
      [
        "gt-tell",
        "gt-ver"
      ],
      [
        "gt-ver",
        "gt-refine"
      ],
      [
        "gt-refine",
        "gt-cli",
        "back"
      ]
    ]
  },
  "pair-fonts": {
    "id": "live-tokens-pair-fonts",
    "title": "pair-fonts",
    "tagline": "You choose the families. The CLI proves they exist and builds the URL from the weights they really have.",
    "nodes": [
      {
        "id": "pf-trig",
        "row": 0,
        "kind": "trigger",
        "title": "The request is about type",
        "desc": "Pair fonts, pick a typeface, or a voice word: more editorial, friendlier, more technical. Also invoked by generate-theme for the type half of a whole look.",
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
        "title": "Google Fonts is the pool",
        "desc": "Freely licensable and loads by URL. Never hand-author font JSON, never edit the data tree. Other sources go in by hand through the editor's Project fonts section.",
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
        "desc": "It is the anchor: it carries most of the words and survives small sizes. Regular, bold and italic; low to moderate contrast; open apertures; large x-height. A face failing any of these is a display face whatever its name says.",
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
        "title": "Is the brief specific about voice?",
        "desc": "A vague brief, or type that should stay quiet, takes a shortcut instead of the full argument.",
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
        "title": "Run the font matrix",
        "desc": "Classify each candidate on two layers: the skeleton is the form model (dynamic, rational, geometric), the flesh is stroke contrast and serif treatment.",
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
        "title": "Take a shortcut",
        "desc": "A superfamily, one family across weights, one designer, or serif display over sans body when nothing else decides it.",
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
        "title": "The decision rule",
        "chips": [
          {
            "label": "Same skeleton, different flesh: reliable",
            "lines": [
              45,
              45
            ],
            "anchor": "- **Same skeleton, different flesh: reliable.** Helvetica an"
          },
          {
            "label": "Same flesh, different skeleton: the failure case",
            "lines": [
              46,
              46
            ],
            "anchor": "- **Same flesh, different skeleton: the failure case.** The "
          },
          {
            "label": "Far apart on both: deliberate",
            "lines": [
              47,
              47
            ],
            "anchor": "- **Far apart on both: works, deliberately.** An unmistakabl"
          },
          {
            "label": "When a face straddles",
            "lines": [
              49,
              49
            ],
            "anchor": "Many faces sit between columns. When one straddles, say so a"
          }
        ],
        "tag": "the decision rule"
      },
      {
        "id": "pf-voice",
        "row": 6,
        "kind": "step",
        "title": "Check the pairing against the voice table",
        "desc": "Seven brief words map to a type voice. Match the type to the same brief the color came from: a warm autumn palette under a cold geometric sans reads as two projects.",
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
        "title": "Watch for",
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
            "label": "Print faces at small sizes",
            "lines": [
              77,
              77
            ],
            "anchor": "- **Print faces at small sizes.** Delicate serifs and high s"
          },
          {
            "label": "Every family is a request",
            "lines": [
              78,
              78
            ],
            "anchor": "- **Every family is a request.** Two is the target; three ne"
          },
          {
            "label": "Sets of themes",
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
        "tag": "watch for"
      },
      {
        "id": "pf-brief",
        "row": 8,
        "kind": "step",
        "n": "1",
        "title": "Write scratch/font-brief.json",
        "desc": "Every slot is optional and an omitted slot is left exactly as it is. display is --font-display, body is --font-sans; serif, mono and editorial exist when a theme needs them.",
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
        "title": "The brief",
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
            "label": "State your reasoning",
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
        "tag": "the brief"
      },
      {
        "id": "pf-cli",
        "row": 10,
        "kind": "cli",
        "n": "2",
        "title": "npx live-tokens set-fonts",
        "desc": "Prints each stack that moved, each family's real weights and URL, and the weights your typography tokens ask for that the family lacks.",
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
        "title": "A family is not on Google Fonts",
        "desc": "The run fails. Fix the spelling and re-run; the CLI reports the canonical spelling back.",
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
        "title": "A weight gap is a quality note",
        "desc": "Name it and offer an alternative only if it matters. A body face without 400 or 700 matters; a display face without 300 does not.",
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
        "title": "Tell the user to reload and look",
        "desc": "The edit is unsaved until they save the open theme.",
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
        "title": "Scope",
        "chips": [
          {
            "label": "Type only, never color",
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
        "title": "Verify",
        "desc": "CLI exits 0 naming each stack before and after, each URL reflects the family's real weights, the app shows the new type after a reload. Revert with the inverse brief.",
        "lines": [
          85,
          90
        ],
        "anchor": "## Verify",
        "anchorEnd": "- To revert, run the inverse brief, or load the open theme a"
      }
    ],
    "edges": [
      [
        "pf-trig",
        "pf-pool"
      ],
      [
        "pf-pool",
        "pf-body"
      ],
      [
        "pf-body",
        "pf-spec"
      ],
      [
        "pf-spec",
        "pf-matrix"
      ],
      [
        "pf-spec",
        "pf-short"
      ],
      [
        "pf-matrix",
        "pf-rule"
      ],
      [
        "pf-rule",
        "pf-voice"
      ],
      [
        "pf-short",
        "pf-voice"
      ],
      [
        "pf-voice",
        "pf-watch"
      ],
      [
        "pf-watch",
        "pf-brief"
      ],
      [
        "pf-brief",
        "pf-shape"
      ],
      [
        "pf-shape",
        "pf-cli"
      ],
      [
        "pf-cli",
        "pf-fail"
      ],
      [
        "pf-cli",
        "pf-gap"
      ],
      [
        "pf-fail",
        "pf-cli",
        "back"
      ],
      [
        "pf-gap",
        "pf-tell"
      ],
      [
        "pf-tell",
        "pf-scope"
      ],
      [
        "pf-scope",
        "pf-ver"
      ]
    ]
  },
  "adjust-geometry": {
    "id": "live-tokens-adjust-geometry",
    "title": "adjust-geometry",
    "tagline": "The request becomes a small ops file. The CLI walks each alias along its ladder and prints a report card.",
    "nodes": [
      {
        "id": "ag-trig",
        "row": 0,
        "kind": "trigger",
        "title": "The request is about shape or space",
        "desc": "Pill buttons, sharp corners, softer, tighter, airier, thicker borders. Also invoked by generate-theme for the geometry half of a whole look.",
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
        "title": "Each run reads the live config",
        "desc": "Buffer, else the open theme, else the shipped default. So \"a bit more\" and \"back one\" compound naturally.",
        "lines": [
          17,
          17
        ],
        "anchor": "Each run reads the LIVE config (buffer, else the open theme,"
      },
      {
        "id": "ag-target",
        "row": 2,
        "kind": "decide",
        "title": "Global or targeted?",
        "desc": "\"The UI\", \"everything\", or no noun at all means global, so omit target. A named component targets its id: windows and modals are dialog, cards is card, tabs is tabbar. An unknown target is a hard error.",
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
        "title": "Pick the kind",
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
        "tag": "pick one"
      },
      {
        "id": "ag-op",
        "row": 4,
        "kind": "decide",
        "title": "set or shift, exactly one",
        "desc": "set takes an existing token on that kind's ladder. shift is a whole number of steps, clamped at the ladder ends.",
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
        "title": "shift: relative",
        "desc": "\"Slightly\" or \"a bit\" is 1 step, unqualified is 1 to 2, \"much\" or \"really\" is 2 to 3. Mood words move both axes: softer is rounder plus airier.",
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
        "title": "set: absolute",
        "desc": "An exact rung. full admits --radius-full as the ladder's top rung on radius shifts; set plus full is an error, so a pill request is set: \"--radius-full\" with no full flag.",
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
        "title": "Look the request up in the idiom table",
        "desc": "Seven request phrasings map straight to ops, from pill to tighter to thicker borders.",
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
        "title": "Apply the squeeze rule",
        "desc": "A step costs a control far more than a container. A global compaction is shift: -1. When the brief wants more, spend the extra steps on containers by name and leave the controls alone. Loosening is not symmetric: airier is safe globally.",
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
        "title": "Is it a pill?",
        "desc": "--radius-full bends the corner in over the first and last glyph, so a capsule wants more horizontal inset, never less. --space-8 is the floor for a large-text pill.",
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
        "title": "Pair the radius op with a padding set",
        "desc": "On the same target, placed after any global compaction so it wins outright.",
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
        "title": "Ladders and floors",
        "chips": [
          {
            "label": "The three ladders",
            "lines": [
              73,
              73
            ],
            "anchor": "Radius runs `none, sm, md, lg, xl, 2xl, 3xl, 4xl`, with `ful"
          },
          {
            "label": "Content insets stop at --space-4",
            "lines": [
              75,
              75
            ],
            "anchor": "Content insets stop at `--space-4`. Below it the text sits a"
          },
          {
            "label": "Padding under type stops at --space-6",
            "lines": [
              77,
              77
            ],
            "anchor": "Padding that wraps a line of type stops a rung higher, at `-"
          },
          {
            "label": "Margins ride padding, unfloored",
            "lines": [
              79,
              79
            ],
            "anchor": "The floor guards `-padding` only. Outer space is exempt, bec"
          },
          {
            "label": "Off-subset aliases step onto the rung",
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
        "desc": "name is ignored: buffers are fixed slots, so a name names no file. Leave it out.",
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
        "title": "The ops file",
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
            "label": "name is ignored",
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
        "tag": "the ops file"
      },
      {
        "id": "ag-cli",
        "row": 13,
        "kind": "cli",
        "n": "2",
        "title": "npx live-tokens adjust",
        "desc": "Writes component-configs/<id>/_working.json for every component the ops change, which is the buffer the page already runs. --dry-run prints the report without writing.",
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
        "title": "Exit 1: the run was rejected",
        "desc": "The message names the offending op or the missing input. Fix it and re-run.",
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
        "title": "Read where the controls landed",
        "desc": "Every changed alias old to new, plus skips. Not only that the run succeeded: a button, badge, input or tab padding sitting at --space-6 is on its floor, and one that also carries --radius-full wants a targeted lift.",
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
        "title": "Tell the user to reload, and offer the inverse",
        "desc": "The inverse op is the undo. The edit is unsaved until they save the open theme.",
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
        "title": "Scope",
        "chips": [
          {
            "label": "No token is minted; tokens.css untouched",
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
        "title": "Verify",
        "desc": "Exit 0 with no surprising skips, the new shape after a reload, buttons still reading as buttons, and a _working.json for every component the report listed.",
        "lines": [
          87,
          93
        ],
        "anchor": "## Verify",
        "anchorEnd": "- To revert, run the inverse ops, or load a theme in the The"
      }
    ],
    "edges": [
      [
        "ag-trig",
        "ag-live"
      ],
      [
        "ag-live",
        "ag-target"
      ],
      [
        "ag-target",
        "ag-kind"
      ],
      [
        "ag-kind",
        "ag-op"
      ],
      [
        "ag-op",
        "ag-shift"
      ],
      [
        "ag-op",
        "ag-set"
      ],
      [
        "ag-shift",
        "ag-idiom"
      ],
      [
        "ag-set",
        "ag-idiom"
      ],
      [
        "ag-idiom",
        "ag-squeeze"
      ],
      [
        "ag-squeeze",
        "ag-pill"
      ],
      [
        "ag-pill",
        "ag-pillop"
      ],
      [
        "ag-pillop",
        "ag-ladder"
      ],
      [
        "ag-ladder",
        "ag-write"
      ],
      [
        "ag-write",
        "ag-shapes"
      ],
      [
        "ag-shapes",
        "ag-cli"
      ],
      [
        "ag-cli",
        "ag-fail"
      ],
      [
        "ag-cli",
        "ag-card"
      ],
      [
        "ag-fail",
        "ag-cli",
        "back"
      ],
      [
        "ag-card",
        "ag-tell"
      ],
      [
        "ag-tell",
        "ag-scope"
      ],
      [
        "ag-scope",
        "ag-ver"
      ]
    ]
  },
  "pick-component": {
    "id": "live-tokens-pick-component",
    "title": "pick-component",
    "tagline": "The catalogue is small. The hard part is semantic intent: two components can render the same UI and say different things.",
    "nodes": [
      {
        "id": "pk-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Which component should I use?",
        "desc": "Also fires on \"should I use X or Y\", \"what is the difference\", and whenever someone starts authoring a custom component before checking the catalogue.",
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
        "desc": "Six families across twenty-odd shipped components. CodeSnippet gets its own note: use it whenever the page asks the reader to run something rather than just read it.",
        "lines": [
          12,
          14
        ],
        "anchor": "## Catalogue",
        "anchorEnd": "Action: `Button`, `IconButton`, `InlineEditActions`. Input: "
      },
      {
        "id": "pk-fam",
        "row": 2,
        "kind": "decide",
        "title": "Which family does the need sit in?",
        "desc": "Each family carries the one question that separates its members.",
        "lines": [
          14,
          14
        ],
        "anchor": "Action: `Button`, `IconButton`, `InlineEditActions`. Input: "
      },
      {
        "id": "pk-act",
        "row": 3,
        "kind": "ask",
        "tag": "action",
        "title": "Is the glyph self-evident?",
        "desc": "Button carries a label. IconButton is icon-only and square, with no text slot, so an ariaLabel is required. InlineEditActions is the confirm-and-cancel pair, used rather than two loose IconButtons so every inline edit resolves the same way.",
        "lines": [
          24,
          31
        ],
        "anchor": "## Action family: Button vs IconButton",
        "anchorEnd": "- `InlineEditActions` is the confirm-and-cancel pair that fo"
      },
      {
        "id": "pk-sel",
        "row": 3,
        "kind": "ask",
        "tag": "single selection",
        "title": "Count, page-change, weight",
        "desc": "TabBar implies \"this changes the page\"; SegmentedControl implies \"one knob among others\". RadioButton when labels deserve room, MenuSelect when options would overflow. Labels long enough to wrap disqualify SegmentedControl.",
        "lines": [
          33,
          47
        ],
        "anchor": "## Single-selection family: SegmentedControl vs TabBar vs Ra",
        "anchorEnd": "- **Don't pick `SegmentedControl` when option labels are lon"
      },
      {
        "id": "pk-text",
        "row": 3,
        "kind": "ask",
        "tag": "text entry",
        "title": "Enumerable answers, or free text",
        "desc": "If you can list the answers it is the selection family: a short set inline, a long one MenuSelect. Anything you cannot write down is Input, which ships its own label, hint, and error parts rather than needing text stacked under a bare field. Yes or no is Toggle.",
        "lines": [
          49,
          55
        ],
        "anchor": "## Text entry: Input vs the selection family",
        "anchorEnd": "- Its four variants are `default`, `focused`, `disabled`, an"
      },
      {
        "id": "pk-con",
        "row": 3,
        "kind": "ask",
        "tag": "containers",
        "title": "What is the modality?",
        "desc": "Default to Card, the workhorse. CollapsibleSection only when the content is legitimately secondary. Panel is a stage, not a content container. Dialog only when the page cannot meaningfully continue.",
        "lines": [
          57,
          69
        ],
        "anchor": "## Container family: Card vs CollapsibleSection vs Dialog",
        "anchorEnd": "- **Don't use `Dialog` for routine forms.** Reach for it onl"
      },
      {
        "id": "pk-msg",
        "row": 3,
        "kind": "ask",
        "tag": "messaging",
        "title": "Content, feedback, or hint?",
        "desc": "Callout is content, written into the markup. Notification is feedback, appearing then dismissing. Tooltip is what an element means, and never the primary location of important content. Badge and CornerBadge differ only in positioning.",
        "lines": [
          71,
          84
        ],
        "anchor": "## Messaging family: Callout vs Notification vs Tooltip vs B",
        "anchorEnd": "- `Badge` and `CornerBadge` differ only in positioning. `Cor"
      },
      {
        "id": "pk-bin",
        "row": 3,
        "kind": "ask",
        "tag": "on or off",
        "title": "A setting, or two named alternatives?",
        "desc": "If the off and on states share a name, it is a Toggle. If the two states have names you want compared, SegmentedControl. Toggle flips immediately; a RadioButton pair belongs to a larger submission.",
        "lines": [
          95,
          107
        ],
        "anchor": "## Toggle vs SegmentedControl vs RadioButton (for on/off)",
        "anchorEnd": "- `Toggle` flips immediately; `RadioButton` pair is for form"
      },
      {
        "id": "pk-disp",
        "row": 3,
        "kind": "ask",
        "tag": "display",
        "title": "Shown rather than asked",
        "desc": "Image for a picture in the flow, ImageLightbox when the detail is the point, Table for records, ProgressBar as a read-out and never a control, CodeSnippet for something the reader runs. SideNavigation changes the URL; switching panels inside one page is TabBar.",
        "lines": [
          86,
          93
        ],
        "anchor": "## Display family: shown, not asked",
        "anchorEnd": "- `SectionDivider` separates sections of one page. `SideNavi"
      },
      {
        "id": "pk-fits",
        "row": 4,
        "kind": "decide",
        "title": "Does anything in the catalogue fit?",
        "desc": "A custom component is a maintenance commitment. Do not reach for one before checking.",
        "lines": [
          109,
          111
        ],
        "anchor": "---",
        "anchorEnd": "If nothing in the catalogue fits (a `DatePicker`, a `Stepper"
      },
      {
        "id": "pk-place",
        "row": 5,
        "kind": "hand",
        "title": "Place it: build-page",
        "desc": "Composing the page once the components are picked.",
        "lines": [
          10,
          10
        ],
        "anchor": "For composing a page once you've picked components, see **li"
      },
      {
        "id": "pk-make",
        "row": 5,
        "kind": "hand",
        "title": "Author it: create-component",
        "desc": "A Slider, a DatePicker, a Stepper, a custom widget.",
        "lines": [
          111,
          111
        ],
        "anchor": "If nothing in the catalogue fits (a `DatePicker`, a `Stepper"
      }
    ],
    "edges": [
      [
        "pk-trig",
        "pk-cat"
      ],
      [
        "pk-cat",
        "pk-fam"
      ],
      [
        "pk-fam",
        "pk-act"
      ],
      [
        "pk-act",
        "pk-fits"
      ],
      [
        "pk-fam",
        "pk-sel"
      ],
      [
        "pk-sel",
        "pk-fits"
      ],
      [
        "pk-fam",
        "pk-con"
      ],
      [
        "pk-con",
        "pk-fits"
      ],
      [
        "pk-fam",
        "pk-msg"
      ],
      [
        "pk-msg",
        "pk-fits"
      ],
      [
        "pk-fam",
        "pk-bin"
      ],
      [
        "pk-bin",
        "pk-fits"
      ],
      [
        "pk-fits",
        "pk-place"
      ],
      [
        "pk-fits",
        "pk-make"
      ],
      [
        "pk-fam",
        "pk-text"
      ],
      [
        "pk-text",
        "pk-fits"
      ],
      [
        "pk-fam",
        "pk-disp"
      ],
      [
        "pk-disp",
        "pk-fits"
      ]
    ]
  },
  "build-page": {
    "id": "live-tokens-build-page",
    "title": "build-page",
    "tagline": "Two rules above all else: a shipped component if one fits, and a token for every value.",
    "nodes": [
      {
        "id": "bp-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Build a page, route, or screen",
        "desc": "Hero, landing page, dashboard, settings screen, pricing page. Also \"add a route\" and \"drop this component on the page\".",
        "lines": [
          2,
          8
        ],
        "anchor": "name: live-tokens-build-page",
        "anchorEnd": "Two rules above all else:"
      },
      {
        "id": "bp-fit",
        "row": 1,
        "kind": "decide",
        "n": "1",
        "title": "Does a shipped component fit?",
        "desc": "Import from @motion-proto/live-tokens/components/<Name>.svelte. Author custom markup only when nothing fits.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-pick",
        "row": 2,
        "kind": "hand",
        "title": "Choose it: pick-component",
        "desc": "The catalogue and the confusing-pair decisions.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-make",
        "row": 2,
        "kind": "hand",
        "title": "Author it: create-component",
        "desc": "So the new piece is editable too.",
        "lines": [
          10,
          10
        ],
        "anchor": "**Use a shipped component if one fits.** Import from `@motio"
      },
      {
        "id": "bp-tok",
        "row": 3,
        "kind": "step",
        "n": "2",
        "title": "Every value is a var(--token-*)",
        "desc": "Every color, spacing, radius, font-size and font-family in page CSS. No hex literals. No pixel literals. A change in /live-tokens/editor should repaint the page.",
        "lines": [
          11,
          11
        ],
        "anchor": "**Use theme tokens for every value.** Every color, spacing, "
      },
      {
        "id": "bp-text",
        "row": 4,
        "kind": "step",
        "title": "Reach for a whole text style",
        "desc": "--heading-xl through --heading-sm, --body-md, --body-sm, --editorial-xl through --editorial-sm, --eyebrow and --code each carry family, size, weight, line-height and letter-spacing. A heading set from --heading-lg-* retypes when the theme's fonts change; one set from a raw font-size does not.",
        "lines": [
          13,
          13
        ],
        "anchor": "For text, reach for a whole text style rather than assemblin"
      },
      {
        "id": "bp-laws",
        "row": 5,
        "kind": "step",
        "title": "The purpose of a layout",
        "desc": "The page shows one thing; each mark that is not content must earn its place. Separate with the smallest difference that separates: space, then a hairline rule, then a second surface. Content, labels, and scaffolding each take their own token. On a tool page the stage takes the space and controls take the smallest size that still works.",
        "lines": [
          19,
          29
        ],
        "anchor": "**The purpose of a layout.** The page shows one thing. All o",
        "anchorEnd": "`references/layout-sources.md` names the sources for these l"
      },
      {
        "id": "bp-bands",
        "row": 6,
        "kind": "decide",
        "title": "What are the bands?",
        "desc": "Name each band by its job: what the user looks at, types into, presses. A tool page runs stage, inputs, then one toolbar along the bottom edge. Separate bands with space and a rule; stretch a band's boxes to one height so their bottom edges make one line.",
        "lines": [
          31,
          33
        ],
        "anchor": "Decide the bands before the columns. Read the page top to bo",
        "anchorEnd": "Separate bands with space and a rule, `padding-top: var(--sp"
      },
      {
        "id": "bp-grid",
        "row": 7,
        "kind": "step",
        "title": "Sit the page inside the column grid",
        "desc": "--columns-count, --columns-gutter, --columns-max-width. To place children at page-column positions, span the parent grid and redeclare repeat(var(--columns-count), 1fr). Never fabricate a local repeat(N, 1fr): the widths drift and the numbers stop matching ColumnsOverlay.",
        "lines": [
          35,
          37
        ],
        "anchor": "Pages sit inside the column grid via `--columns-count`, `--c",
        "anchorEnd": "To place children at specific page-column positions, span th"
      },
      {
        "id": "bp-contain",
        "row": 8,
        "kind": "step",
        "title": "Containers by job",
        "desc": "Panel is a stage. Card is a titled block of content, typed by its own tokens; compact drops a size. A box in a tool UI is a bare compact Card labelled from a text style. A toolbar is a flex row of small buttons with no card around it.",
        "lines": [
          39,
          44
        ],
        "anchor": "### Containers by job",
        "anchorEnd": "- A toolbar is a flex row of small buttons on the band's bot"
      },
      {
        "id": "bp-density",
        "row": 9,
        "kind": "step",
        "title": "Density",
        "desc": "size=\"small\" in toolbars and compose rows; fullWidth comes off in a row. A custom wrapper forwards size. Text in a card body inherits the card's size unless typed. MenuSelect renders open; a picker toggles it from a Button.",
        "lines": [
          46,
          51
        ],
        "anchor": "### Density",
        "anchorEnd": "- `MenuSelect` renders its list open. For a picker, toggle i"
      },
      {
        "id": "bp-wire",
        "row": 10,
        "kind": "decide",
        "title": "How does this app wire routes?",
        "desc": "Add the route the way App.svelte already does. Either way use lazy, never a static top-level import: static imports evaluate every page module at boot and leak page CSS into the editor routes.",
        "lines": [
          53,
          58
        ],
        "anchor": "## Wiring",
        "anchorEnd": "Either way use `lazy`, not a static top-level import: static"
      },
      {
        "id": "bp-router",
        "row": 11,
        "kind": "step",
        "title": "LiveTokensRouter",
        "desc": "Add a pages entry as lazy: () => import('./YourPage.svelte') with a source: 'src/...'. For a route you cannot enumerate, add a resolve(path) instead; same entry shape.",
        "lines": [
          56,
          56
        ],
        "anchor": "- **`<LiveTokensRouter pages={...}>`** (the usual case): add"
      },
      {
        "id": "bp-overlay",
        "row": 11,
        "kind": "step",
        "title": "Manual LiveEditorOverlay",
        "desc": "Dispatch with $derived.by(() => import(...)) and register the route's source in pageSources.",
        "lines": [
          57,
          57
        ],
        "anchor": "- **Manual `<LiveEditorOverlay>`**: dispatch with `$derived."
      },
      {
        "id": "bp-css",
        "row": 12,
        "kind": "step",
        "title": "Import site.css from each page",
        "desc": "From the page's script block, never from main.ts, which would leak into editor routes.",
        "lines": [
          59,
          59
        ],
        "anchor": "- Import `site.css` from each page's `<script>` block, never"
      },
      {
        "id": "bp-avoid",
        "row": 13,
        "kind": "chipset",
        "title": "Avoid",
        "chips": [
          {
            "label": "Colour and geometry literals",
            "lines": [
              78,
              78
            ],
            "anchor": "- Colour literals, and px or rem in spacing, stroke, radius, or"
          },
          {
            "label": "Hardcoded column counts",
            "lines": [
              79,
              79
            ],
            "anchor": "- Hardcoded page-grid counts (`repeat(10, 1fr)`). Use `repeat("
          },
          {
            "label": "Utility classes over components",
            "lines": [
              80,
              80
            ],
            "anchor": "- Utility classes overriding shipped components. Extend via "
          },
          {
            "label": "Card header as a section label",
            "lines": [
              81,
              81
            ],
            "anchor": "- A card header as a section label in a tool UI, and a page "
          },
          {
            "label": "Deep node_modules imports",
            "lines": [
              82,
              82
            ],
            "anchor": "- Deep imports from `node_modules/@motion-proto/live-tokens/"
          },
          {
            "label": "Editor mounted off its route",
            "lines": [
              83,
              83
            ],
            "anchor": "- Mounting `Editor` or `ComponentEditorPage` outside their d"
          }
        ],
        "lines": [
          76,
          76
        ],
        "anchor": "## Avoid",
        "tag": "avoid"
      },
      {
        "id": "bp-ver",
        "row": 14,
        "kind": "done",
        "title": "Verify",
        "desc": "Run check-page and fix what it reports until it exits 0. The checker cannot see a layout, so read the page band by band at its real width before moving on. Then change a colour in the editor and confirm the page repaints, which proves token usage. The overlay's Page Source button proves the route's source; the columns overlay shows content inside --columns-max-width.",
        "lines": [
          86,
          103
        ],
        "anchor": "## Verify",
        "anchorEnd": "Then in dev: change a colour in `/live-tokens/editor` and"
      }
    ],
    "edges": [
      [
        "bp-trig",
        "bp-fit"
      ],
      [
        "bp-fit",
        "bp-pick"
      ],
      [
        "bp-fit",
        "bp-make"
      ],
      [
        "bp-pick",
        "bp-tok"
      ],
      [
        "bp-make",
        "bp-tok"
      ],
      [
        "bp-tok",
        "bp-text"
      ],
      [
        "bp-text",
        "bp-laws"
      ],
      [
        "bp-laws",
        "bp-bands"
      ],
      [
        "bp-bands",
        "bp-grid"
      ],
      [
        "bp-grid",
        "bp-contain"
      ],
      [
        "bp-contain",
        "bp-density"
      ],
      [
        "bp-density",
        "bp-wire"
      ],
      [
        "bp-wire",
        "bp-router"
      ],
      [
        "bp-wire",
        "bp-overlay"
      ],
      [
        "bp-router",
        "bp-css"
      ],
      [
        "bp-overlay",
        "bp-css"
      ],
      [
        "bp-css",
        "bp-avoid"
      ],
      [
        "bp-avoid",
        "bp-ver"
      ]
    ]
  },
  "create-component": {
    "id": "live-tokens-create-component",
    "title": "create-component",
    "tagline": "A runtime file, an editor file, one registration, and an entry under CUSTOM with full token editing.",
    "nodes": [
      {
        "id": "cc-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Nothing in the catalogue fits",
        "desc": "Author a new tokenized component, or make an existing Svelte component editable. Read pick-component first to confirm nothing fits.",
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
        "title": "Read a worked example from node_modules",
        "desc": "Card and Badge for the simplest reads, Button and Input for multi-state, Dialog for multi-part, SegmentedControl for linked siblings. Read shipped files for pattern; ignore their location, because your two files co-locate in src/system/components/.",
        "lines": [
          10,
          22
        ],
        "anchor": "## Worked examples ship inside the package",
        "anchorEnd": "Shipped editors live in `src/editor/component-editor/` becau"
      },
      {
        "id": "cc-run",
        "row": 2,
        "kind": "step",
        "n": "1",
        "title": "Runtime file",
        "desc": "Declare every editable slot as a CSS custom property inside :global(:root), defaulting to a theme token, never a raw value. The plugin parses that block to seed default.json; variables declared anywhere else cannot be edited.",
        "lines": [
          24,
          26
        ],
        "anchor": "## The recipe",
        "anchorEnd": "**Runtime file**, `src/system/components/MyWidget.svelte`. D"
      },
      {
        "id": "cc-ed",
        "row": 3,
        "kind": "step",
        "n": "2",
        "title": "Editor file",
        "desc": "In a script module block declare the component id, build states per VariantGroup, and export the flat union as allTokens. In the runtime script block mount ComponentEditorBase with one VariantGroup per variant.",
        "lines": [
          27,
          27
        ],
        "anchor": "**Editor file**, `src/system/components/MyWidgetEditor.svelt"
      },
      {
        "id": "cc-ext",
        "row": 4,
        "kind": "chipset",
        "title": "Does it need an extension?",
        "chips": [
          {
            "label": "Linked siblings",
            "lines": [
              169,
              169
            ],
            "anchor": "- `references/linked-siblings.md`: variants that share base "
          },
          {
            "label": "Intrinsics",
            "lines": [
              170,
              170
            ],
            "anchor": "- `references/intrinsics.md`: structural or display choices "
          },
          {
            "label": "Sketch mode (always)",
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
        "tag": "extensions"
      },
      {
        "id": "cc-reg",
        "row": 5,
        "kind": "step",
        "n": "3",
        "title": "Register through bootLiveTokens",
        "desc": "It calls registerComponent internally at the right point: after the editor init hooks, before it seeds configs and mounts. Never place a standalone registerComponent before bootLiveTokens; that is the wrong window and can leave editor changes disconnected from the live page.",
        "lines": [
          28,
          45
        ],
        "anchor": "**Register** by passing the component to `bootLiveTokens` in",
        "anchorEnd": "`bootLiveTokens` calls `registerComponent` for you after its"
      },
      {
        "id": "cc-pick",
        "row": 6,
        "kind": "hand",
        "n": "4",
        "title": "Say what it is for",
        "desc": "The runtime file's header comment is the description `live-tokens components` prints beside the id, with props and variants read from the file. The picker weighs a custom component from that query, so no skill file is edited. First-party components are also added to the Catalogue line.",
        "lines": [
          46,
          46
        ],
        "anchor": "**Say what it is for.** The runtime file's leading HTML comme"
      },
      {
        "id": "cc-sk",
        "row": 7,
        "kind": "step",
        "n": "5",
        "title": "Join the sketch layer",
        "desc": "The effect draws a fixed set of parts, so a new component stays crisp while the page goes hand-drawn until it opts in. One of four reserved classes on the root plus the five --sketch-* colours. The layer takes background, border-color, box-shadow, overflow, position and both pseudo-elements away from what it draws.",
        "lines": [
          47,
          47
        ],
        "anchor": "**Join the sketch layer.** The effect draws a fixed set of p"
      },
      {
        "id": "cc-disc",
        "row": 8,
        "kind": "chipset",
        "title": "Token discipline, throughout",
        "desc": "Not a step. These constrain every name you write in steps 1 and 2.",
        "chips": [
          {
            "label": "Naming scheme",
            "lines": [
              57,
              81
            ],
            "anchor": "## Token discipline",
            "anchorEnd": ""
          },
          {
            "label": "Suffix vocabulary",
            "lines": [
              71,
              92
            ],
            "anchor": "### Suffix vocabulary",
            "anchorEnd": "compete. A suffix outside that list fails `check-component`."
          },
          {
            "label": "Rules that bite",
            "lines": [
              97,
              103
            ],
            "anchor": "### Rules that bite",
            "anchorEnd": "- **Text aliases.** Neutral scale is `--text-primary` / `--t"
          },
          {
            "label": "Typography groupKey trap",
            "lines": [
              104,
              114
            ],
            "anchor": "- **Typography `groupKey` on multi-slot components must incl",
            "anchorEnd": "The helper strips the `--<component>-` prefix and those segm"
          },
          {
            "label": "State model",
            "lines": [
              116,
              159
            ],
            "anchor": "## State model",
            "anchorEnd": "```"
          },
          {
            "label": "User-facing copy",
            "lines": [
              142,
              146
            ],
            "anchor": "## User-facing copy",
            "anchorEnd": "Custom chrome inside an editor snippet is rare, since `Compo"
          },
          {
            "label": "Public imports only",
            "lines": [
              148,
              163
            ],
            "anchor": "## Public imports only",
            "anchorEnd": "**Never deep-import `node_modules/@motion-proto/live-tokens/"
          },
          {
            "label": "Worked example: Toggle",
            "lines": [
              19,
              19
            ],
            "anchor": "- Every rule below in the fewest lines: `Toggle`. Component "
          }
        ],
        "tag": "applies throughout"
      },
      {
        "id": "cc-ver",
        "row": 9,
        "kind": "cli",
        "n": "6",
        "title": "npx live-tokens check-component <id>",
        "desc": "Enforces file layout, the :global(:root) block, suffix vocabulary, state-before-property, theme-token defaults, public imports, and that the id is registered. Exit 0 means the static contract is met; resolve warnings before shipping.",
        "lines": [
          48,
          54
        ],
        "anchor": "**Gate on the checker.** Run it, fix every error, and run it",
        "anchorEnd": "If it rejects a suffix, do not invent a new name for the rol",
        "chips": [
          {
            "label": "Verification checklist",
            "lines": [
              173,
              175
            ],
            "anchor": "## Verification checklist",
            "anchorEnd": "Step 6 of the recipe is the static gate: `npx live-tokens ch"
          }
        ],
        "command": "npx live-tokens check-component <id>"
      },
      {
        "id": "cc-test",
        "row": 10,
        "kind": "step",
        "title": "Run the registry contract test",
        "desc": "Six per-component checks: registration resolves, schema variables are unique, every editable token is declared in the runtime style block and seeded in default.json, a declared opacity floor is honoured, and setComponentAlias round-trips. checkRegistryEntry runs them for a consumer's own components; a first-party one is auto-covered the moment it lands in builtInRegistry.",
        "lines": [
          177,
          177
        ],
        "anchor": "**Then run the registry contract test.** `checkRegistryEntry"
      },
      {
        "id": "cc-intr",
        "row": 11,
        "kind": "step",
        "title": "And the intrinsics contract test",
        "desc": "Only when the component declares intrinsics. Per (intrinsic, variant) it asserts the runtime declares a default, the default is one of the spec's values, and the editor's default equals the runtime default.",
        "lines": [
          179,
          179
        ],
        "anchor": "**If your component declares `intrinsics`, the intrinsics co"
      },
      {
        "id": "cc-man",
        "row": 12,
        "kind": "done",
        "title": "Walk the runtime checklist",
        "desc": "Seven things no static check can see, at /live-tokens/components: the CUSTOM group entry, token rows and pickers, linked-block broadcast, default.json derivation, Reset, clean boot validation, and the sketch-mode pass.",
        "lines": [
          181,
          189
        ],
        "anchor": "Finally navigate to `/live-tokens/components` and confirm th",
        "anchorEnd": "- [ ] Switch Sketch mode on in the editor and walk the check"
      }
    ],
    "edges": [
      [
        "cc-trig",
        "cc-read"
      ],
      [
        "cc-read",
        "cc-run"
      ],
      [
        "cc-run",
        "cc-ed"
      ],
      [
        "cc-ed",
        "cc-ext"
      ],
      [
        "cc-ext",
        "cc-reg"
      ],
      [
        "cc-reg",
        "cc-pick"
      ],
      [
        "cc-pick",
        "cc-sk"
      ],
      [
        "cc-sk",
        "cc-disc"
      ],
      [
        "cc-disc",
        "cc-ver"
      ],
      [
        "cc-ver",
        "cc-test"
      ],
      [
        "cc-test",
        "cc-intr"
      ],
      [
        "cc-intr",
        "cc-man"
      ]
    ]
  },
  "check-compliance": {
    "id": "live-tokens-check-compliance",
    "title": "check-compliance",
    "tagline": "One command gives the facts. The skill says what they mean and what fixing them costs, then hands the list on without touching a file.",
    "nodes": [
      {
        "id": "cc2-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Check, audit, validate, review, how compliant, what would it take",
        "desc": "A request to know how things stand. Making the changes is fix-findings; a single token is the editor.",
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
        "title": "A reading, not an edit",
        "desc": "Every fact comes from one command. The reading, and what fixing would cost, is the skill's. Nothing is written.",
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
        "title": "npx live-tokens report --json",
        "desc": "Always exits 0: a reading, not a gate. Unknown command means the installed package predates it; upgrade first.",
        "lines": [
          12,
          12
        ],
        "anchor": "Run `npx live-tokens report --json`. It always exits 0: it i",
        "command": "npx live-tokens report --json"
      },
      {
        "id": "cc2-sections",
        "row": 3,
        "kind": "chipset",
        "title": "The report's sections",
        "desc": "What each section states, and what it means when it is not clean.",
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
            "label": "usage.custom*",
            "lines": [
              29,
              29
            ],
            "anchor": "| `usage.customUnregistered`, `usage.customUnused` | The pro"
          },
          {
            "label": "findings.pages, findings.components",
            "lines": [
              30,
              30
            ],
            "anchor": "| `findings.pages`, `findings.components` | Both checkers' f"
          }
        ]
      },
      {
        "id": "cc2-drill",
        "row": 3,
        "kind": "cli",
        "title": "Ask about one component or one scale",
        "desc": "components <id> prints props, values, and tokens; tokens --family <name> prints a scale. Both take --json.",
        "lines": [
          17,
          17
        ],
        "anchor": "`npx live-tokens components <id>` and `npx live-tokens token",
        "command": "npx live-tokens components <id>"
      },
      {
        "id": "cc2-read",
        "row": 4,
        "kind": "decide",
        "n": "2",
        "title": "Mechanical, or judgement?",
        "desc": "Mechanical: a literal to its nearest step, a route given its source. Judgement: a colour by role, a type axis from a text style. Name any visible shift; say what the choice is, not what you would pick.",
        "lines": [
          32,
          35
        ],
        "anchor": "## Mechanical or judgement",
        "anchorEnd": "- **Judgement**: a colour literal mapped by the role it play"
      },
      {
        "id": "cc2-deliberate",
        "row": 5,
        "kind": "step",
        "n": "3",
        "title": "A finding that looks deliberate",
        "desc": "Name the config entry that would record it: a rule severity, or an exclusion for a file that is not a themed surface. Prefer the narrower. Recording it is the user's call.",
        "lines": [
          37,
          39
        ],
        "anchor": "## Deliberate findings",
        "anchorEnd": "A translucent overlay on an app shell, or a layout size the "
      },
      {
        "id": "cc2-report",
        "row": 6,
        "kind": "chipset",
        "n": "4",
        "title": "Report in six parts, counts on every line",
        "desc": "Migrations, errors, what --strict adds, components, usage, then the fixes in the order fix-findings would take them, each marked mechanical or judgement.",
        "lines": [
          41,
          48
        ],
        "anchor": "## Summary",
        "anchorEnd": "Recommended fixes, in the order **live-tokens-fix-findings**",
        "chips": [
          {
            "label": "Migrations pending",
            "lines": [
              43,
              43
            ],
            "anchor": "Migrations pending, and the one command that clears them."
          },
          {
            "label": "What fails the build now",
            "lines": [
              44,
              44
            ],
            "anchor": "What fails the build now: errors by rule, with the files."
          },
          {
            "label": "What --strict would add",
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
        "row": 7,
        "kind": "hand",
        "title": "Hand off to fix-findings, edit nothing",
        "desc": "\"Run live-tokens-fix-findings to apply these\", or the subset the user chooses. Not even a one-line fix starts here, because the user asked how things stand.",
        "lines": [
          50,
          50
        ],
        "anchor": "End with the hand-off: \"Run live-tokens-fix-findings to appl"
      }
    ],
    "edges": [
      [
        "cc2-trig",
        "cc2-why"
      ],
      [
        "cc2-why",
        "cc2-run"
      ],
      [
        "cc2-run",
        "cc2-sections"
      ],
      [
        "cc2-run",
        "cc2-drill"
      ],
      [
        "cc2-sections",
        "cc2-read"
      ],
      [
        "cc2-drill",
        "cc2-read"
      ],
      [
        "cc2-read",
        "cc2-deliberate"
      ],
      [
        "cc2-deliberate",
        "cc2-report"
      ],
      [
        "cc2-report",
        "cc2-done"
      ]
    ]
  },
  "fix-findings": {
    "id": "live-tokens-fix-findings",
    "title": "fix-findings",
    "tagline": "The checkers say where a page or component opted out of the theme. This is the loop that brings it back: largest group of errors first, one recipe per rule, stop at exit 0.",
    "nodes": [
      {
        "id": "ff-trig",
        "row": 0,
        "kind": "trigger",
        "title": "Make the build pass, fix the warnings, replace the literals",
        "desc": "The changes, not the reading: check-compliance reports and edits nothing. New pages and components run the same gate as their last step.",
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
        "title": "Two checkers, one contract",
        "desc": "check-page holds pages to the catalogue and to tokens; check-component holds authored components to the token contract. What passes repaints when the theme changes.",
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
        "title": "Run both checkers with --json",
        "desc": "Each finding carries a stable rule, a file, and a line. A path or an id scopes the run when the user names one thing.",
        "lines": [
          14,
          19
        ],
        "anchor": "Run both checkers with `--json`. Each finding carries a stab",
        "anchorEnd": "`check-page src/pages/Home.svelte` and `check-component <id>",
        "command": "npx live-tokens check-page --json && npx live-tokens check-component --json"
      },
      {
        "id": "ff-blocked",
        "row": 3,
        "kind": "gate",
        "title": "Unknown command",
        "desc": "The installed package predates the checkers. Upgrade, then migrate --check and --write, with --tokens for a tokens.css outside the four default locations.",
        "lines": [
          19,
          19
        ],
        "anchor": "`check-page src/pages/Home.svelte` and `check-component <id>"
      },
      {
        "id": "ff-loop",
        "row": 4,
        "kind": "step",
        "n": "2",
        "title": "Group by rule, largest group of errors first",
        "desc": "Errors before warnings, and the rule with the most findings first, because one recipe clears the whole group.",
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
        "title": "Three things the loop never does",
        "desc": "--off is for one run; a severity change is the user's call and goes in config. No token is minted. A remap that moves a value is named.",
        "chips": [
          {
            "label": "Silence a rule to pass",
            "lines": [
              29,
              29
            ],
            "anchor": "- **Silence a rule to pass.** `--off=<rule>` is for a single"
          },
          {
            "label": "Mint a token",
            "lines": [
              30,
              30
            ],
            "anchor": "- **Mint a token.** A literal with no token behind it is rem"
          },
          {
            "label": "Shift the look silently",
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
        "title": "Which recipe does the rule take?",
        "desc": "Colour by role, geometry by scale, or the row in the table. A component outside the catalogue hands off.",
        "lines": [
          21,
          21
        ],
        "anchor": "Apply that rule's recipe to every finding in the group: colo"
      },
      {
        "id": "ff-colour",
        "row": 7,
        "kind": "decide",
        "title": "Colour: what does it do?",
        "desc": "The token for the colour's role, never the nearest hue, because the theme moves every role together. Text, fill, stroke, scrim, tint, transparent, gradient.",
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
        "kind": "decide",
        "title": "Geometry: which scale?",
        "desc": "Only the geometry the theme owns is reported; sizing is layout. Space to the nearest step and name the shift, strokes, corners, whole shadows, tokens inside a calc.",
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
        "title": "Every other rule",
        "desc": "One row per rule: what it holds and the fix.",
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
            "label": "unknown-component",
            "lines": [
              70,
              70
            ],
            "anchor": "| `unknown-component` | Not in the catalogue. Read **live-to"
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
            "label": "Naming rules",
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
            "label": "Editor phantoms",
            "lines": [
              80,
              80
            ],
            "anchor": "| `phantom-editor-token`, `phantom-link` | The editor names "
          },
          {
            "label": "Wiring",
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
        "title": "Not in the catalogue: pick-component, or create-component",
        "desc": "unknown-component is the one finding another skill resolves: the shipped component that fits, or a new editable one.",
        "lines": [
          70,
          70
        ],
        "anchor": "| `unknown-component` | Not in the catalogue. Read **live-to"
      },
      {
        "id": "ff-gate",
        "row": 8,
        "kind": "gate",
        "n": "4",
        "title": "Run again; anything left goes round",
        "desc": "New findings can appear as old ones clear: a token you reached for may not exist, or a moved import lands where a rule now sees it.",
        "lines": [
          22,
          22
        ],
        "anchor": "Run again. New findings can appear as old ones clear: a toke"
      },
      {
        "id": "ff-strict",
        "row": 9,
        "kind": "ok",
        "n": "5",
        "title": "Exit 0, then --strict once",
        "desc": "Report what --strict adds, so the user can decide whether warnings are worth clearing now.",
        "lines": [
          23,
          23
        ],
        "anchor": "Run once with `--strict` and report what it adds, so the use"
      },
      {
        "id": "ff-report",
        "row": 10,
        "kind": "step",
        "title": "Report by rule, with any visible shift",
        "desc": "One line per rule with the count. What was left and why, with the config entry if the user lowered a severity. The two commands and their exit codes.",
        "lines": [
          83,
          85
        ],
        "anchor": "## Report",
        "anchorEnd": "Say what changed by rule, one line per rule with the count a"
      },
      {
        "id": "ff-script",
        "row": 11,
        "kind": "step",
        "title": "Gate the build on check:design",
        "desc": "A scaffolded project has the script; give any other one the same, and put it in front of vite build once it passes.",
        "lines": [
          25,
          25
        ],
        "anchor": "A project scaffolded by `create` has a `check:design` script"
      },
      {
        "id": "ff-ver",
        "row": 12,
        "kind": "done",
        "title": "Verify: everything touched repaints",
        "desc": "Change a surface colour and a spacing step in the editor. A file that does not repaint still holds a literal the checker cannot see, which is a gap to report.",
        "lines": [
          87,
          89
        ],
        "anchor": "## Verify",
        "anchorEnd": "Open `/live-tokens/editor` in dev and change a surface colou"
      }
    ],
    "edges": [
      [
        "ff-trig",
        "ff-why"
      ],
      [
        "ff-why",
        "ff-run"
      ],
      [
        "ff-run",
        "ff-blocked"
      ],
      [
        "ff-blocked",
        "ff-run",
        "back"
      ],
      [
        "ff-run",
        "ff-loop"
      ],
      [
        "ff-loop",
        "ff-never"
      ],
      [
        "ff-never",
        "ff-recipe"
      ],
      [
        "ff-recipe",
        "ff-colour"
      ],
      [
        "ff-recipe",
        "ff-geom"
      ],
      [
        "ff-recipe",
        "ff-rest"
      ],
      [
        "ff-recipe",
        "ff-hand"
      ],
      [
        "ff-colour",
        "ff-gate"
      ],
      [
        "ff-geom",
        "ff-gate"
      ],
      [
        "ff-rest",
        "ff-gate"
      ],
      [
        "ff-hand",
        "ff-gate"
      ],
      [
        "ff-gate",
        "ff-loop",
        "back"
      ],
      [
        "ff-gate",
        "ff-strict"
      ],
      [
        "ff-strict",
        "ff-report"
      ],
      [
        "ff-report",
        "ff-script"
      ],
      [
        "ff-script",
        "ff-ver"
      ]
    ]
  }
};

export const skillKeys = Object.keys(skillTrees);
