import type { SkillTree } from '../types';

export const fixFindings: SkillTree = {
  "id": "live-tokens-fix-findings",
  "digest": "sha256:c271a51766a3ea96",
  "title": "fix-findings",
  "tagline": "Repair Deviations from the Design System",
  "nodes": [
    {
      "id": "ff-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Fix design-system findings",
      "desc": "Edits the files the checkers name. Updates tokens.css only through the migration command.",
      "lines": [3, 3],
      "anchor": "description: Fix every finding of check-page and check-compo"
    },
    {
      "id": "ff-migrate",
      "row": 1,
      "kind": "step",
      "title": "Run the token migration",
      "desc": "Bring tokens.css up to the installed package first. A stale file shows as unknown tokens.",
      "lines": [14, 14],
      "anchor": "Run `npx live-tokens migrate --check` to see the plan, then ",
      "command": "npx live-tokens migrate --check\nnpx live-tokens migrate --write"
    },
    {
      "id": "ff-run",
      "row": 2,
      "kind": "cli",
      "title": "Run both checkers",
      "desc": "Each finding names a rule, a file, and a line.",
      "lines": [15, 19],
      "anchor": "Run both checkers with `--json`. Each finding carries a `rul",
      "anchorEnd": "```",
      "command": "npx live-tokens check-page --json\nnpx live-tokens check-component --json"
    },
    {
      "id": "ff-clean",
      "row": 3,
      "kind": "ok",
      "title": "Default checks pass",
      "desc": "Both checkers exit 0.",
      "lines": [24, 24],
      "anchor": "When the errors are clear, run both checkers with `--strict`"
    },
    {
      "id": "ff-group",
      "row": 5,
      "kind": "step",
      "title": "Group findings by rule",
      "desc": "Findings of one rule share one fix.",
      "lines": [20, 20],
      "anchor": "Group the findings by rule."
    },
    {
      "id": "ff-order",
      "row": 6,
      "kind": "decide",
      "title": "Repair order",
      "desc": "Errors first, largest group first. Warnings only when the repair scope includes them.",
      "lines": [21, 21],
      "anchor": "Take the largest error group first, then the remaining error",
      "chips": [
        {
          "label": "largest error group",
          "lines": [21, 21],
          "anchor": "Take the largest error group first, then the remaining error"
        },
        {
          "label": "remaining errors",
          "lines": [21, 21],
          "anchor": "Take the largest error group first, then the remaining error"
        },
        {
          "label": "warnings",
          "lines": [21, 21],
          "anchor": "Take the largest error group first, then the remaining error"
        }
      ]
    },
    {
      "id": "ff-recipe",
      "row": 7,
      "kind": "decide",
      "title": "Rule family",
      "desc": "Each rule belongs to one section, and that section gives the fix.",
      "lines": [22, 22],
      "anchor": "Fix every finding in the group with its section: Color by ro",
      "chips": [
        {
          "label": "Color by role",
          "lines": [41, 41],
          "anchor": "## Color by role"
        },
        {
          "label": "Geometry by scale",
          "lines": [57, 57],
          "anchor": "## Geometry by scale"
        },
        {
          "label": "The remaining rules",
          "lines": [71, 71],
          "anchor": "## The remaining rules"
        }
      ]
    },
    {
      "id": "ff-color",
      "row": 8,
      "kind": "chipset",
      "title": "Color by role",
      "desc": "A color literal becomes the token for the role it plays.",
      "lines": [41, 55],
      "anchor": "## Color by role",
      "anchorEnd": "| A gradient | `--gradient-*` | Or compose one from surface ",
      "chips": [
        {
          "label": "Text on a surface",
          "lines": [47, 47],
          "anchor": "| Text on a surface | `--text-primary` through `--text-disab"
        },
        {
          "label": "Light text on a dark chip",
          "lines": [48, 48],
          "anchor": "| Light text on a dark chip | `--text-inverted` | No AA guar"
        },
        {
          "label": "A surface fill",
          "lines": [49, 49],
          "anchor": "| A surface fill | `--surface-<family>-<level>` | The role n"
        },
        {
          "label": "A stroke",
          "lines": [50, 50],
          "anchor": "| A stroke | `--border-<family>-<level>` | Levels run `faint"
        },
        {
          "label": "A translucent layer that dims what is behind it",
          "lines": [51, 51],
          "anchor": "| A translucent layer that dims what is behind it | `--scrim"
        },
        {
          "label": "A translucent wash on a surface",
          "lines": [52, 52],
          "anchor": "| A translucent wash on a surface | `--tint-low`, `--tint`, "
        },
        {
          "label": "Any other translucent color",
          "lines": [53, 53],
          "anchor": "| Any other translucent color | The role's token at an opaci"
        },
        {
          "label": "Fully transparent",
          "lines": [54, 54],
          "anchor": "| Fully transparent | `--color-transparent` | |"
        },
        {
          "label": "A gradient",
          "lines": [55, 55],
          "anchor": "| A gradient | `--gradient-*` | Or compose one from surface "
        }
      ]
    },
    {
      "id": "ff-geometry",
      "row": 8,
      "kind": "chipset",
      "title": "Geometry by scale",
      "desc": "A dimension literal moves to the nearest step of its scale. A layout size stays.",
      "lines": [57, 69],
      "anchor": "## Geometry by scale",
      "anchorEnd": "| A `blur()` | `--blur-*` | No rule reports it. Fix it while",
      "chips": [
        {
          "label": "Spacing",
          "lines": [63, 63],
          "anchor": "| Spacing | `--space-<px>` | `npx live-tokens tokens --scale"
        },
        {
          "label": "A stroke width",
          "lines": [64, 64],
          "anchor": "| A stroke width | `--border-width-1`, `-2`, `-4` | Also for"
        },
        {
          "label": "A corner",
          "lines": [65, 65],
          "anchor": "| A corner | `--radius-sm` through `--radius-4xl`, or `--rad"
        },
        {
          "label": "A shadow",
          "lines": [66, 66],
          "anchor": "| A shadow | `--shadow-sm` through `--shadow-xl` | Replace t"
        },
        {
          "label": "Part of a calc()",
          "lines": [67, 67],
          "anchor": "| Part of a `calc()` | The token inside the calc | `calc(var"
        },
        {
          "label": "A duration or easing",
          "lines": [68, 68],
          "anchor": "| A duration or easing | `--duration-*`, `--ease-*` | No rul"
        },
        {
          "label": "A blur()",
          "lines": [69, 69],
          "anchor": "| A `blur()` | `--blur-*` | No rule reports it. Fix it while"
        }
      ]
    },
    {
      "id": "ff-remaining",
      "row": 8,
      "kind": "chipset",
      "title": "The remaining rules",
      "desc": "Every other rule has its fix in the table.",
      "lines": [71, 91],
      "anchor": "## The remaining rules",
      "anchorEnd": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to",
      "chips": [
        {
          "label": "unknown-token",
          "lines": [75, 75],
          "anchor": "| `unknown-token` | Search `tokens.css` for the stem. When a"
        },
        {
          "label": "raw-text-axis",
          "lines": [76, 76],
          "anchor": "| `raw-text-axis` | Set every axis from one text style, `-fo"
        },
        {
          "label": "unknown-component",
          "lines": [77, 77],
          "anchor": "| `unknown-component` | Read **live-tokens-pick-component** "
        },
        {
          "label": "unknown-prop",
          "lines": [78, 78],
          "anchor": "| `unknown-prop` | `npx live-tokens components <id>` prints "
        },
        {
          "label": "unknown-prop-value",
          "lines": [79, 79],
          "anchor": "| `unknown-prop-value` | Use a value from the union the mess"
        },
        {
          "label": "control-size",
          "lines": [80, 80],
          "anchor": "| `control-size` | Delete the `size` prop. The shipped defau"
        },
        {
          "label": "multiple-primary",
          "lines": [81, 81],
          "anchor": "| `multiple-primary` | Keep the action that completes the ma"
        },
        {
          "label": "danger-without-dialog",
          "lines": [82, 82],
          "anchor": "| `danger-without-dialog` | Open a `Dialog` from the danger "
        },
        {
          "label": "hardcoded-columns",
          "lines": [83, 83],
          "anchor": "| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` "
        },
        {
          "label": "site-css-in-main",
          "lines": [84, 84],
          "anchor": "| `site-css-in-main` | Delete the import from `main.ts`. Add"
        },
        {
          "label": "missing-source",
          "lines": [85, 85],
          "anchor": "| `missing-source` | Add `source: 'src/...'` to the route en"
        },
        {
          "label": "reserved-route",
          "lines": [86, 86],
          "anchor": "| `reserved-route` | Move the route out of `/live-tokens/*`."
        },
        {
          "label": "deep-import",
          "lines": [87, 87],
          "anchor": "| `deep-import` | Import from `@motion-proto/live-tokens`, `"
        },
        {
          "label": "Component name rules",
          "lines": [88, 88],
          "anchor": "| `unknown-suffix`, `state-after-property`, `disabled-is-ter"
        },
        {
          "label": "Component token rules",
          "lines": [89, 89],
          "anchor": "| `color-literal`, `unknown-token-ref`, `default-not-token` "
        },
        {
          "label": "Component editor rules",
          "lines": [90, 90],
          "anchor": "| `phantom-editor-token`, `phantom-link` | The editor names "
        },
        {
          "label": "Component wiring rules",
          "lines": [91, 91],
          "anchor": "| `invalid-id`, `missing-file`, `missing-root-block`, `no-to"
        }
      ]
    },
    {
      "id": "ff-rerun",
      "row": 11,
      "kind": "cli",
      "title": "Rerun both checkers",
      "desc": "Run both checkers again to see what remains.",
      "lines": [23, 23],
      "anchor": "Run both checkers again. When repairable findings remain in ",
      "command": "npx live-tokens check-page --json\nnpx live-tokens check-component --json"
    },
    {
      "id": "ff-repeat",
      "row": 12,
      "kind": "gate",
      "title": "Regroup the remaining findings",
      "desc": "Findings a token can fix go back through grouping.",
      "lines": [23, 23],
      "anchor": "Run both checkers again. When repairable findings remain in "
    },
    {
      "id": "ff-unresolved",
      "row": 12,
      "kind": "step",
      "title": "Record the unresolved findings",
      "desc": "A finding no token fits stays, and the reply says why.",
      "lines": [37, 37],
      "anchor": "Add no token to `tokens.css`. Map a literal with no matching"
    },
    {
      "id": "ff-strict",
      "row": 14,
      "kind": "cli",
      "title": "Run strict checks",
      "desc": "Strict mode counts every warning as an error.",
      "lines": [24, 24],
      "anchor": "When the errors are clear, run both checkers with `--strict`",
      "command": "npx live-tokens check-page --strict --json\nnpx live-tokens check-component --strict --json"
    },
    {
      "id": "ff-warnings",
      "row": 15,
      "kind": "decide",
      "title": "Warning scope",
      "desc": "Warnings are cleared when the request includes them. Otherwise the user chooses.",
      "lines": [24, 25],
      "anchor": "When the errors are clear, run both checkers with `--strict`",
      "anchorEnd": "When the repair scope includes warnings, return to step 3 wi",
      "chips": [
        {
          "label": "repair scope includes warnings",
          "lines": [25, 25],
          "anchor": "When the repair scope includes warnings, return to step 3 wi"
        },
        {
          "label": "user defers warnings",
          "lines": [25, 25],
          "anchor": "When the repair scope includes warnings, return to step 3 wi"
        }
      ]
    },
    {
      "id": "ff-warning-loop",
      "row": 16,
      "kind": "gate",
      "title": "Include warnings in the repair scope",
      "desc": "The warnings go back through grouping, with --strict on every run.",
      "lines": [25, 25],
      "anchor": "When the repair scope includes warnings, return to step 3 wi"
    },
    {
      "id": "ff-build",
      "row": 17,
      "kind": "step",
      "title": "Gate the existing build",
      "desc": "The build runs check:design first, so findings fail the build from now on.",
      "lines": [33, 33],
      "anchor": "When `package.json` has no `check:design` script, add `\"chec"
    },
    {
      "id": "ff-reply",
      "row": 18,
      "kind": "chipset",
      "title": "Reply with the repair results",
      "desc": "Report the changes by rule, the findings left with their reasons, and both exit codes.",
      "lines": [26, 29],
      "anchor": "Reply with:",
      "anchorEnd": "both checker commands with their exit codes",
      "chips": [
        {
          "label": "Changes by rule",
          "lines": [27, 27],
          "anchor": "the changes by rule, each with its count and any visible shi"
        },
        {
          "label": "Remaining findings",
          "lines": [28, 28],
          "anchor": "the findings left, each with its reason and any config entry"
        },
        {
          "label": "Checker commands and exit codes",
          "lines": [29, 29],
          "anchor": "both checker commands with their exit codes"
        }
      ]
    },
    {
      "id": "ff-done",
      "row": 19,
      "kind": "done",
      "title": "Repair results complete",
      "desc": "Both checkers pass, or every finding left has a reason.",
      "lines": [26, 29],
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
};
