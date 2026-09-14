import type { SkillTree } from '../types';

export const fixFindings: SkillTree = {
  "id": "live-tokens-fix-findings",
  "digest": "sha256:171374ad04149a44",
  "title": "fix-findings",
  "tagline": "Repair Deviations from the Design System",
  "nodes": [
    {
      "id": "ff-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Fix design-system findings",
      "desc": "Repairs every finding the two checkers report, mapping each literal to the token for its role or scale, until both exit 0.",
      "lines": [3, 3],
      "anchor": "description: Fix every finding of check-page and check-compo"
    },
    {
      "id": "ff-migrate",
      "row": 1,
      "kind": "step",
      "title": "Run the token migration",
      "desc": "Bring tokens.css up to the installed package first. A stale file shows as unknown tokens.",
      "lines": [12, 12],
      "anchor": "Run `npx live-tokens migrate --check` to see the plan, then "
    },
    {
      "id": "ff-fix",
      "row": 2,
      "kind": "cli",
      "title": "Apply automatic fixes",
      "desc": "Both checkers apply every finding whose repair is auto, then return each fix beside what remains.",
      "lines": [13, 17],
      "anchor": "Run both checkers with `--json`. Each first applies every fi",
      "anchorEnd": "```"
    },
    {
      "id": "ff-run",
      "row": 3,
      "kind": "cli",
      "title": "Read what remains",
      "desc": "Every finding left carries a rule, a file, a line, and a repair of choice or authored.",
      "lines": [18, 18],
      "anchor": "Read what remains. Each finding carries a `rule`, a file, a "
    },
    {
      "id": "ff-clean",
      "row": 4,
      "kind": "ok",
      "title": "Default checks pass",
      "desc": "Both checkers exit 0.",
      "lines": [23, 23],
      "anchor": "When the errors are clear, run both checkers with `--strict`"
    },
    {
      "id": "ff-group",
      "row": 6,
      "kind": "step",
      "title": "Group findings by rule",
      "desc": "Findings of one rule share one fix.",
      "lines": [19, 19],
      "anchor": "Group the findings by rule."
    },
    {
      "id": "ff-order",
      "row": 7,
      "kind": "chipset",
      "title": "Repair order",
      "desc": "Errors first, largest group first. Warnings only when the repair scope includes them.",
      "lines": [20, 20],
      "anchor": "Take the largest error group first, then the remaining error"
    },
    {
      "id": "ff-recipe",
      "row": 8,
      "kind": "decide",
      "title": "Rule family",
      "desc": "Each rule belongs to one section, and that section gives the fix.",
      "lines": [21, 21],
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
      "row": 9,
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
      "row": 9,
      "kind": "chipset",
      "title": "Geometry by scale",
      "desc": "A dimension literal moves to the nearest step of its scale. A layout size stays.",
      "lines": [57, 69],
      "anchor": "## Geometry by scale",
      "anchorEnd": "| A `blur()` | `--blur-*` | No rule reports it. Fix it while"
    },
    {
      "id": "ff-remaining",
      "row": 9,
      "kind": "chipset",
      "title": "The remaining rules",
      "desc": "Every other rule has its fix in the table.",
      "lines": [71, 112],
      "anchor": "## The remaining rules",
      "anchorEnd": "| `fix: routing` | The rule is `reserved-route`, `site-css-i",
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
          "anchor": "| `control-size` | The checker deletes the attribute it can "
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
          "label": "native-control",
          "lines": [83, 83],
          "anchor": "| `native-control` | Replace the native element with the shi"
        },
        {
          "label": "property-override",
          "lines": [84, 84],
          "anchor": "| `property-override` | The checker deletes the declaration "
        },
        {
          "label": "page-component-paint",
          "lines": [85, 85],
          "anchor": "| `page-component-paint` | The finding names the page file a"
        },
        {
          "label": "page-text-style",
          "lines": [86, 86],
          "anchor": "| `page-text-style` | The finding names the page file and th"
        },
        {
          "label": "page-contrast",
          "lines": [87, 87],
          "anchor": "| `page-contrast` | The finding names the page file and the "
        },
        {
          "label": "page-grid",
          "lines": [88, 88],
          "anchor": "| `page-grid` | The finding names the page file and the line"
        },
        {
          "label": "page-overflow",
          "lines": [89, 89],
          "anchor": "| `page-overflow` | The finding names the page file and the "
        },
        {
          "label": "hardcoded-columns",
          "lines": [90, 90],
          "anchor": "| `hardcoded-columns` | `repeat(var(--columns-count), 1fr)` "
        },
        {
          "label": "site-css-in-main",
          "lines": [91, 91],
          "anchor": "| `site-css-in-main` | Delete the import from `main.ts`. Add"
        },
        {
          "label": "missing-source",
          "lines": [92, 92],
          "anchor": "| `missing-source` | Add `source: 'src/...'` to the route en"
        },
        {
          "label": "reserved-route",
          "lines": [93, 93],
          "anchor": "| `reserved-route` | Move the route out of `/live-tokens/*`."
        },
        {
          "label": "deep-import",
          "lines": [94, 94],
          "anchor": "| `deep-import` | The checker rewrites a `/src/system/compon"
        },
        {
          "label": "unread-token",
          "lines": [95, 95],
          "anchor": "| `unread-token` | The message names the property the runtim"
        },
        {
          "label": "missing-description",
          "lines": [96, 96],
          "anchor": "| `missing-description` | Add the `catalogue` export with `d"
        },
        {
          "label": "config-token",
          "lines": [97, 97],
          "anchor": "| `config-token` | The message names the alias in `component"
        },
        {
          "label": "contract-behavior",
          "lines": [98, 98],
          "anchor": "| `contract-behavior` | A declared case in the component's c"
        },
        {
          "label": "Component name rules",
          "lines": [99, 99],
          "anchor": "| `fix: property-name` | Rename the token to the name a ship"
        },
        {
          "label": "Component token rules",
          "lines": [100, 100],
          "anchor": "| `fix: property-token` | Make the `:global(:root)` default "
        },
        {
          "label": "Component editor rules",
          "lines": [103, 103],
          "anchor": "| `fix: editor` | The editor names a token the runtime never"
        },
        {
          "label": "Component wiring rules",
          "lines": [101, 101],
          "anchor": "| `fix: runtime` | Wire the component as the recipe in **liv"
        },
        {
          "label": "fix: page-token",
          "lines": [108, 108],
          "anchor": "| `fix: page-token` | The rule is `unknown-token`, `color-li"
        },
        {
          "label": "fix: page-component",
          "lines": [109, 109],
          "anchor": "| `fix: page-component` | The rule is `unknown-component`, `"
        },
        {
          "label": "fix: page-layout",
          "lines": [110, 110],
          "anchor": "| `fix: page-layout` | The rule is `hardcoded-columns`, `pag"
        },
        {
          "label": "fix: page-paint",
          "lines": [111, 111],
          "anchor": "| `fix: page-paint` | The rule is `page-component-paint`, `p"
        },
        {
          "label": "fix: routing",
          "lines": [112, 112],
          "anchor": "| `fix: routing` | The rule is `reserved-route`, `site-css-i"
        }
      ]
    },
    {
      "id": "ff-rerun",
      "row": 12,
      "kind": "cli",
      "title": "Rerun both checkers",
      "desc": "Run both checkers again to see what remains.",
      "lines": [22, 22],
      "anchor": "Run both checkers again. When repairable findings remain in "
    },
    {
      "id": "ff-repeat",
      "row": 13,
      "kind": "gate",
      "title": "Regroup the remaining findings",
      "desc": "Findings a token can fix go back through grouping.",
      "lines": [22, 22],
      "anchor": "Run both checkers again. When repairable findings remain in "
    },
    {
      "id": "ff-unresolved",
      "row": 13,
      "kind": "step",
      "title": "Record the unresolved findings",
      "desc": "A finding no token fits stays, and the reply says why.",
      "lines": [37, 37],
      "anchor": "Add no token to `tokens.css`. Map a literal with no matching"
    },
    {
      "id": "ff-strict",
      "row": 15,
      "kind": "cli",
      "title": "Run strict checks",
      "desc": "Strict mode counts every warning as an error.",
      "lines": [23, 23],
      "anchor": "When the errors are clear, run both checkers with `--strict`"
    },
    {
      "id": "ff-warnings",
      "row": 16,
      "kind": "decide",
      "title": "Warning scope",
      "desc": "Warnings are cleared when the request includes them. Otherwise the user chooses.",
      "lines": [23, 24],
      "anchor": "When the errors are clear, run both checkers with `--strict`",
      "anchorEnd": "When the repair scope includes warnings, return to step 4 wi",
      "chips": [
        {
          "label": "repair scope includes warnings",
          "lines": [24, 24],
          "anchor": "When the repair scope includes warnings, return to step 4 wi"
        },
        {
          "label": "user defers warnings",
          "lines": [24, 24],
          "anchor": "When the repair scope includes warnings, return to step 4 wi"
        }
      ]
    },
    {
      "id": "ff-warning-loop",
      "row": 17,
      "kind": "gate",
      "title": "Include warnings in the repair scope",
      "desc": "The warnings go back through grouping, with --strict on every run.",
      "lines": [24, 24],
      "anchor": "When the repair scope includes warnings, return to step 4 wi"
    },
    {
      "id": "ff-build",
      "row": 18,
      "kind": "step",
      "title": "Gate the existing build",
      "desc": "The build runs check:design first, so findings fail the build from now on.",
      "lines": [33, 33],
      "anchor": "When `package.json` has no `check:design` script, add `\"chec"
    },
    {
      "id": "ff-reply",
      "row": 19,
      "kind": "chipset",
      "title": "Reply with the repair results",
      "desc": "Report the fixes the checkers applied, the remaining changes by rule, the findings left with their reasons, and both exit codes.",
      "lines": [25, 29],
      "anchor": "Reply with:",
      "anchorEnd": "both checker commands with their exit codes"
    },
    {
      "id": "ff-done",
      "row": 20,
      "kind": "done",
      "title": "Repair results complete",
      "desc": "Both checkers pass, or every finding left has a reason.",
      "lines": [25, 29],
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
      "to": "ff-fix",
      "from": "ff-migrate"
    },
    {
      "to": "ff-run",
      "from": "ff-fix"
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
      "label": "return to step 4",
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
    },
    {
      "to": "ff-recipe",
      "from": "ff-order"
    }
  ]
};
