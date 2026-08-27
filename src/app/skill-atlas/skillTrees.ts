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
        ]
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
        ]
      },
      {
        "id": "gt-anchor",
        "row": 2,
        "kind": "decide",
        "title": "Which anchor reference matches?",
        "desc": "An anchor entry fixes color, type, and geometry together and overrides the generic defaults in this file. Read it before seeding.",
        "lines": [
          118,
          126
        ]
      },
      {
        "id": "gt-mood",
        "row": 3,
        "kind": "ref",
        "title": "A feeling",
        "desc": "mood-vocabulary.md",
        "lines": [
          122,
          122
        ]
      },
      {
        "id": "gt-style",
        "row": 3,
        "kind": "ref",
        "title": "An idiom or era",
        "desc": "style-vocabulary.md",
        "lines": [
          123,
          123
        ]
      },
      {
        "id": "gt-named",
        "row": 3,
        "kind": "ref",
        "title": "A holiday or season",
        "desc": "named-themes.md",
        "lines": [
          124,
          124
        ]
      },
      {
        "id": "gt-none",
        "row": 3,
        "kind": "ref",
        "title": "None of the three",
        "desc": "Fall back to the bands and the geometry table",
        "lines": [
          126,
          126
        ]
      },
      {
        "id": "gt-seed",
        "row": 4,
        "kind": "step",
        "n": "2",
        "title": "Seed all ten palettes in OKLCH",
        "desc": "Write scratch/theme-brief.json. Ten seeds are required: Brand, Accent, Special, Canvas, Neutral, Alternate, and the four statuses.",
        "lines": [
          13,
          13
        ]
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
              23,
              46
            ]
          },
          {
            "label": "Chroma budget",
            "lines": [
              48,
              57
            ]
          },
          {
            "label": "Per-role bands",
            "lines": [
              59,
              71
            ]
          },
          {
            "label": "Commit the canvas",
            "lines": [
              73,
              86
            ]
          },
          {
            "label": "Mood dials",
            "lines": [
              87,
              93
            ]
          },
          {
            "label": "Gamut guardrails",
            "lines": [
              95,
              102
            ]
          },
          {
            "label": "Harmony offsets",
            "lines": [
              104,
              110
            ]
          },
          {
            "label": "Canvas sky",
            "lines": [
              112,
              116
            ]
          }
        ],
        "tag": "constraints"
      },
      {
        "id": "gt-cli",
        "row": 6,
        "kind": "cli",
        "n": "3",
        "title": "npx live-tokens generate-theme",
        "desc": "Writes themes/<slug>.json, opens it, prints a contrast report. --dry-run reports only; --no-activate writes without opening.",
        "lines": [
          14,
          14
        ],
        "chips": [
          {
            "label": "Flags",
            "lines": [
              21,
              21
            ]
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
          14,
          14
        ]
      },
      {
        "id": "gt-pass",
        "row": 7,
        "kind": "ok",
        "title": "Exit 0: auto-corrections are fine",
        "desc": "Regeneration replaces the theme's whole color state, including palette edits made in the editor since the last run. Say so once when iterating.",
        "lines": [
          14,
          14
        ]
      },
      {
        "id": "gt-fonts",
        "row": 8,
        "kind": "hand",
        "n": "4",
        "title": "Hand the voice to pair-fonts",
        "desc": "Same voice sentence, so the type comes from the same reading of the brief. Skip only when the user asked for color specifically and said to leave the type alone.",
        "lines": [
          15,
          15
        ]
      },
      {
        "id": "gt-geo",
        "row": 9,
        "kind": "hand",
        "n": "5",
        "title": "Hand the geometry to adjust-geometry",
        "desc": "Give it intent, not mechanics. The voice table is the fallback; an anchor entry's geometry wins over it.",
        "lines": [
          16,
          16
        ]
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
              128,
              139
            ]
          },
          {
            "label": "Order is safe as written",
            "lines": [
              19,
              19
            ]
          },
          {
            "label": "What each step writes",
            "lines": [
              147,
              149
            ]
          }
        ],
        "tag": "where it comes from"
      },
      {
        "id": "gt-tell",
        "row": 11,
        "kind": "step",
        "n": "6",
        "title": "Tell the user to look, and that it is unsaved",
        "desc": "Type and geometry sit in the unsaved buffer until they save the open theme. Offer refinements as edits to the same brief.",
        "lines": [
          17,
          17
        ]
      },
      {
        "id": "gt-ver",
        "row": 12,
        "kind": "done",
        "title": "Verify",
        "desc": "Color CLI exits 0 with every check passing, both siblings report what they changed, the app shows the whole look after a reload. Load the named theme to go back.",
        "lines": [
          151,
          155
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
            ]
          },
          {
            "label": "Same flesh, different skeleton: the failure case",
            "lines": [
              46,
              46
            ]
          },
          {
            "label": "Far apart on both: deliberate",
            "lines": [
              47,
              47
            ]
          },
          {
            "label": "When a face straddles",
            "lines": [
              49,
              49
            ]
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
        ]
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
            ]
          },
          {
            "label": "Print faces at small sizes",
            "lines": [
              77,
              77
            ]
          },
          {
            "label": "Every family is a request",
            "lines": [
              78,
              78
            ]
          },
          {
            "label": "Sets of themes",
            "lines": [
              79,
              79
            ]
          }
        ],
        "lines": [
          74,
          74
        ],
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
        ]
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
            ]
          },
          {
            "label": "State your reasoning",
            "lines": [
              17,
              17
            ]
          },
          {
            "label": "Flags",
            "lines": [
              19,
              19
            ]
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
        ]
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
        ]
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
        ]
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
            ]
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
        ]
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
        ]
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
        ]
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
        ]
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
            ]
          },
          {
            "label": "padding",
            "lines": [
              35,
              35
            ]
          },
          {
            "label": "gap",
            "lines": [
              35,
              35
            ]
          },
          {
            "label": "border-width",
            "lines": [
              35,
              35
            ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
            ]
          },
          {
            "label": "Content insets stop at --space-4",
            "lines": [
              75,
              75
            ]
          },
          {
            "label": "Padding under type stops at --space-6",
            "lines": [
              77,
              77
            ]
          },
          {
            "label": "Margins ride padding, unfloored",
            "lines": [
              79,
              79
            ]
          },
          {
            "label": "Off-subset aliases step onto the rung",
            "lines": [
              81,
              81
            ]
          }
        ],
        "lines": [
          71,
          71
        ],
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
        ]
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
            ]
          },
          {
            "label": "Targeted, absolute",
            "lines": [
              27,
              31
            ]
          },
          {
            "label": "name is ignored",
            "lines": [
              33,
              33
            ]
          }
        ],
        "lines": [
          19,
          19
        ],
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
        ]
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
        ]
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
        ]
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
            ]
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
        ]
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
        ]
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
        ]
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
        ]
      },
      {
        "id": "pk-act",
        "row": 3,
        "kind": "ask",
        "tag": "action",
        "title": "Is the glyph self-evident?",
        "desc": "Button carries a label. IconButton is icon-only and square, with no text slot, so an ariaLabel is required. InlineEditActions is the confirm-and-cancel pair, used rather than two loose IconButtons so every inline edit resolves the same way.",
        "lines": [
          16,
          23
        ]
      },
      {
        "id": "pk-sel",
        "row": 3,
        "kind": "ask",
        "tag": "single selection",
        "title": "Count, page-change, weight",
        "desc": "TabBar implies \"this changes the page\"; SegmentedControl implies \"one knob among others\". RadioButton when labels deserve room, MenuSelect when options would overflow. Labels long enough to wrap disqualify SegmentedControl.",
        "lines": [
          25,
          39
        ]
      },
      {
        "id": "pk-con",
        "row": 3,
        "kind": "ask",
        "tag": "containers",
        "title": "What is the modality?",
        "desc": "Default to Card, the workhorse. CollapsibleSection only when the content is legitimately secondary. Panel is a stage, not a content container. Dialog only when the page cannot meaningfully continue.",
        "lines": [
          41,
          53
        ]
      },
      {
        "id": "pk-msg",
        "row": 3,
        "kind": "ask",
        "tag": "messaging",
        "title": "Content, feedback, or hint?",
        "desc": "Callout is content, written into the markup. Notification is feedback, appearing then dismissing. Tooltip is what an element means, and never the primary location of important content. Badge and CornerBadge differ only in positioning.",
        "lines": [
          55,
          68
        ]
      },
      {
        "id": "pk-bin",
        "row": 3,
        "kind": "ask",
        "tag": "on or off",
        "title": "A setting, or two named alternatives?",
        "desc": "If the off and on states share a name, it is a Toggle. If the two states have names you want compared, SegmentedControl. Toggle flips immediately; a RadioButton pair belongs to a larger submission.",
        "lines": [
          79,
          91
        ]
      },
      {
        "id": "pk-fits",
        "row": 4,
        "kind": "decide",
        "title": "Does anything in the catalogue fit?",
        "desc": "A custom component is a maintenance commitment. Do not reach for one before checking.",
        "lines": [
          93,
          95
        ]
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
        ]
      },
      {
        "id": "pk-make",
        "row": 5,
        "kind": "hand",
        "title": "Author it: create-component",
        "desc": "A Slider, a DatePicker, a Stepper, a custom widget.",
        "lines": [
          95,
          95
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
      },
      {
        "id": "bp-grid",
        "row": 5,
        "kind": "step",
        "title": "Sit the page inside the column grid",
        "desc": "--columns-count, --columns-gutter, --columns-max-width. To place children at page-column positions, span the parent grid and redeclare repeat(var(--columns-count), 1fr). Never fabricate a local repeat(N, 1fr): the widths drift and the numbers stop matching ColumnsOverlay.",
        "lines": [
          17,
          21
        ]
      },
      {
        "id": "bp-wire",
        "row": 6,
        "kind": "decide",
        "title": "How does this app wire routes?",
        "desc": "Add the route the way App.svelte already does. Either way use lazy, never a static top-level import: static imports evaluate every page module at boot and leak page CSS into the editor routes.",
        "lines": [
          23,
          28
        ]
      },
      {
        "id": "bp-router",
        "row": 7,
        "kind": "step",
        "title": "LiveTokensRouter",
        "desc": "Add a pages entry as lazy: () => import('./YourPage.svelte') with a source: 'src/...'. For a route you cannot enumerate, add a resolve(path) instead; same entry shape.",
        "lines": [
          26,
          26
        ]
      },
      {
        "id": "bp-overlay",
        "row": 7,
        "kind": "step",
        "title": "Manual LiveEditorOverlay",
        "desc": "Dispatch with $derived.by(() => import(...)) and register the route's source in pageSources.",
        "lines": [
          27,
          27
        ]
      },
      {
        "id": "bp-css",
        "row": 8,
        "kind": "step",
        "title": "Import site.css from each page",
        "desc": "From the page's script block, never from main.ts, which would leak into editor routes.",
        "lines": [
          29,
          29
        ]
      },
      {
        "id": "bp-avoid",
        "row": 9,
        "kind": "chipset",
        "title": "Avoid",
        "chips": [
          {
            "label": "Hex or pixel literals",
            "lines": [
              33,
              33
            ]
          },
          {
            "label": "Hardcoded column counts",
            "lines": [
              34,
              34
            ]
          },
          {
            "label": "Utility classes over components",
            "lines": [
              35,
              35
            ]
          },
          {
            "label": "Deep node_modules imports",
            "lines": [
              36,
              36
            ]
          },
          {
            "label": "Editor mounted off its route",
            "lines": [
              37,
              37
            ]
          }
        ],
        "lines": [
          31,
          31
        ],
        "tag": "avoid"
      },
      {
        "id": "bp-ver",
        "row": 10,
        "kind": "done",
        "title": "Verify",
        "desc": "Change a colour in the editor and confirm the page repaints, which proves token usage. The overlay's Page Source button proves the route's source. Cmd+G shows content inside --columns-max-width.",
        "lines": [
          40,
          42
        ]
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
        "bp-grid"
      ],
      [
        "bp-grid",
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
        ]
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
        ]
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
        ]
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
        ]
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
              208,
              208
            ]
          },
          {
            "label": "Intrinsics",
            "lines": [
              209,
              209
            ]
          },
          {
            "label": "Sketch mode (always)",
            "lines": [
              210,
              210
            ]
          }
        ],
        "lines": [
          204,
          210
        ],
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
        ]
      },
      {
        "id": "cc-pick",
        "row": 6,
        "kind": "hand",
        "n": "4",
        "title": "Tell the picker",
        "desc": "Add the component to pick-component's Catalogue line under its family, and a decision-table row if it is confusable with an existing one. Without this the component exists but cannot be recommended.",
        "lines": [
          46,
          46
        ]
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
          54
        ]
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
              70
            ]
          },
          {
            "label": "Suffix vocabulary",
            "lines": [
              71,
              113
            ]
          },
          {
            "label": "Rules that bite",
            "lines": [
              115,
              121
            ]
          },
          {
            "label": "Typography groupKey trap",
            "lines": [
              122,
              132
            ]
          },
          {
            "label": "State model",
            "lines": [
              135,
              159
            ]
          },
          {
            "label": "User-facing copy",
            "lines": [
              161,
              165
            ]
          },
          {
            "label": "Public imports only",
            "lines": [
              167,
              182
            ]
          },
          {
            "label": "Worked example: Toggle",
            "lines": [
              184,
              202
            ]
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
          212,
          221
        ],
        "chips": [
          {
            "label": "Step 6 in the recipe",
            "lines": [
              55,
              55
            ]
          }
        ],
        "command": "npx live-tokens check-component <id>"
      },
      {
        "id": "cc-test",
        "row": 10,
        "kind": "step",
        "title": "Run the registry contract test",
        "desc": "Five per-component checks: registration resolves, schema variables are unique, every editable token is declared in the runtime style block and seeded in default.json, and setComponentAlias round-trips. A first-party component is auto-covered the moment it lands in builtInRegistry.",
        "lines": [
          223,
          231
        ]
      },
      {
        "id": "cc-intr",
        "row": 11,
        "kind": "step",
        "title": "And the intrinsics contract test",
        "desc": "Only when the component declares intrinsics. Per (intrinsic, variant) it asserts the runtime declares a default, the default is one of the spec's values, and the editor's default equals the runtime default.",
        "lines": [
          233,
          233
        ]
      },
      {
        "id": "cc-man",
        "row": 12,
        "kind": "done",
        "title": "Walk the runtime checklist",
        "desc": "Seven things no static check can see, at /live-tokens/components: the CUSTOM group entry, token rows and pickers, linked-block broadcast, default.json derivation, Reset, clean boot validation, and the sketch-mode pass.",
        "lines": [
          235,
          243
        ]
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
  }
};

export const skillKeys = Object.keys(skillTrees);
