import type { SkillTree } from '../types';

export const checkCompliance: SkillTree = {
  "id": "live-tokens-check-compliance",
  "digest": "sha256:7b27443ae70ac467",
  "title": "check-compliance",
  "tagline": "Check and Fix a Project's Use of Live Tokens",
  "nodes": [
    {
      "id": "cc2-trig",
      "row": 0,
      "kind": "trigger",
      "title": "Check and fix design-system compliance",
      "desc": "Checks for correct use of components, properties, and tokens, and fixes what it finds.",
      "lines": [3, 3],
      "anchor": "description: Check an existing @motion-proto/live-tokens pro"
    },
    {
      "id": "cc2-check",
      "row": 1,
      "kind": "cli",
      "title": "Run the checks",
      "desc": "Both checkers bring tokens.css up to the installed package and apply every fix they can, then return the fixes beside the judgment calls that remain.",
      "lines": [14, 18],
      "anchor": "Run both checkers with `--json`. Each first brings `tokens.c",
      "anchorEnd": "```"
    },
    {
      "id": "cc2-judge",
      "row": 2,
      "kind": "gate",
      "title": "Make the judgment calls",
      "desc": "Each judgment call carries its guidance. Make each call, then run the checks again.",
      "lines": [19, 21],
      "anchor": "Read what remains. Each finding carries the fields under Fin",
      "anchorEnd": "Make every repair in the group from its `guidance`, within S"
    },
    {
      "id": "cc2-build",
      "row": 3,
      "kind": "step",
      "title": "Gate the build",
      "desc": "check:design runs both checkers with --no-fix before the build.",
      "lines": [63, 63],
      "anchor": "When `package.json` has no `check:design` script, add `\"chec"
    },
    {
      "id": "cc2-reply",
      "row": 4,
      "kind": "done",
      "title": "Reply with the results",
      "desc": "The fixes, the judgment calls made, the findings left with their reasons, and both exit codes.",
      "lines": [26, 30],
      "anchor": "Reply with:",
      "anchorEnd": "both checker commands with their exit codes"
    }
  ],
  "edges": [
    {
      "from": "cc2-trig",
      "to": "cc2-check"
    },
    {
      "from": "cc2-check",
      "to": "cc2-judge",
      "label": "judgment calls"
    },
    {
      "from": "cc2-check",
      "to": "cc2-build",
      "label": "fixed"
    },
    {
      "from": "cc2-judge",
      "to": "cc2-check",
      "label": "rerun",
      "back": true
    },
    {
      "from": "cc2-build",
      "to": "cc2-reply"
    }
  ]
};
