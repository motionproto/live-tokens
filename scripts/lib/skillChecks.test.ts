import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module, no types
import { checkSkills } from './skillChecks.mjs';

type Repo = {
  skills: Record<string, Record<string, string>>;
  cli: string;
  components: string[];
  aliasKinds: string;
};

const CLI = `
if (command === 'create' || command === 'init') {
if (command === 'set-colors') {
if (command === 'set-geometry') {
if (command === 'set-type') {
if (command === 'save-theme') {
if (command !== 'setup-claude') {

const USAGE = \`Usage: npx @motion-proto/live-tokens <command> [options]

Commands:
  create <dir> [--force]      Scaffold a new app
  set-colors <base-colors.json> [--dry-run]
                              Build the whole color identity from 10 base colors.
  set-geometry <ops.json> [--dry-run]
                              Move aliases along their token scales.
  set-type <pairing.json> [--dry-run] [--no-verify]
                              Bind families to the font tokens.
  save-theme <name> [--no-activate] [--dry-run]
                              Compose the live state into themes/<slug>.json.
\`;

const SAMPLE_PROMPTS = {
  'live-tokens-create-theme': 'make me a bright and cheerful theme',
  'live-tokens-set-colors': 'give me a cooler palette, same fonts',
  'live-tokens-set-type': 'pair some fonts for this theme',
  'live-tokens-set-geometry': 'make the buttons pill shaped',
  'live-tokens-create-component': 'author a new Toggle component',
  'live-tokens-pick-component': 'which component groups a title and a body?',
};
`;

const ALIAS_KINDS = `export const KIND_RULES: KindRule[] = [
  { suffix: ['-radius'], kind: 'length' },
  { suffix: ['-padding'], kind: 'length' },
];
`;

const anchorTable = (title: string, column: string) => `# ${title}

## Feelings

| Anchor | ${column} |
| --- | --- |
| Calm, quiet | the quiet end of the scale |
`;

function repo(edit: (r: Repo) => void = () => {}): Repo {
  const r: Repo = {
    cli: CLI,
    components: ['button', 'card'],
    aliasKinds: ALIAS_KINDS,
    skills: {
      'live-tokens-create-theme': {
        'SKILL.md': `---
name: live-tokens-create-theme
description: Turn a theme request into three intents and save the result.
---

Name the anchor from references/design-directions.md, hand each dimension to its
skill, then run npx live-tokens save-theme "<name>". Every save but the last takes
--no-activate, and --dry-run prints the report without writing.
`,
        'references/design-directions.md': anchorTable('Design directions', 'Reading'),
      },
      'live-tokens-set-colors': {
        'SKILL.md': `---
name: live-tokens-set-colors
description: Build a theme's color identity from ten OKLCH base colors.
---

Read the anchor's column in references/color-anchors.md, write the base colors,
then run npx live-tokens set-colors scratch/base-colors.json. --dry-run prints the
contrast report without writing.
`,
        'references/color-anchors.md': anchorTable('Color anchors', 'Seeds'),
      },
      'live-tokens-set-type': {
        'SKILL.md': `---
name: live-tokens-set-type
description: Pair Google Fonts families and bind them to the font tokens.
---

Read the anchor's column in references/type-anchors.md, write the pairing, then run
npx live-tokens set-type scratch/font-pairing.json. --dry-run prints the report
without writing, and --no-verify skips the network.
`,
        'references/type-anchors.md': anchorTable('Type anchors', 'Families'),
      },
      'live-tokens-set-geometry': {
        'SKILL.md': `---
name: live-tokens-set-geometry
description: Move radius, padding, gap, and border-width aliases along their scales.
---

Read the anchor's column in references/geometry-anchors.md, write the ops, then run
npx live-tokens set-geometry scratch/geometry-ops.json. --dry-run prints the report
without writing.
`,
        'references/geometry-anchors.md': anchorTable('Geometry anchors', 'Moves'),
      },
      'live-tokens-create-component': {
        'SKILL.md': `---
name: live-tokens-create-component
description: Author a component against the contract the checker enforces.
---

### Suffix vocabulary

\`-radius\` rounds the frame. \`-padding\` is the space inside it.

### Naming

The whole table is in references/token-naming.md.
`,
        'references/token-naming.md': 'Corners take \`-radius\`. Space inside a frame takes \`-padding\`.\n',
      },
      'live-tokens-pick-component': {
        'SKILL.md': `---
name: live-tokens-pick-component
description: Choose the component that already does the job.
---

## Catalogue

\`Button\` fires an action. \`Card\` groups a title and a body.

Ask what the page needs before reaching for a new component.
`,
      },
    },
  };
  edit(r);
  return r;
}

describe('a tree whose skills, CLI, and vocabulary agree', () => {
  it('reports nothing', () => {
    expect(checkSkills(repo())).toEqual([]);
  });
});

describe('verbs a skill runs', () => {
  it('rejects a verb bin/cli.mjs does not dispatch', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-create-theme']['SKILL.md'] += 'Start with npx live-tokens generate-theme scratch/brief.json.\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-theme: mentions `live-tokens generate-theme`, which bin/cli.mjs does not dispatch',
    ]);
  });

  it('rejects a dispatched verb no skill runs', () => {
    const problems = checkSkills(repo((r) => { r.cli += "if (command === 'adopt') {\n"; }));

    expect(problems).toEqual([
      'bin/cli.mjs dispatches `live-tokens adopt`, which no bundled skill runs; ' +
        'name the skill that runs it, or add it to UNSKILLED_VERBS with the reason',
    ]);
  });

  it('rejects an exemption for a verb bin/cli.mjs stopped dispatching', () => {
    const problems = checkSkills(
      repo((r) => { r.cli = r.cli.replace("if (command === 'create' || command === 'init') {\n", ''); }),
    );

    expect(problems).toEqual([
      'UNSKILLED_VERBS exempts "create", which bin/cli.mjs no longer dispatches',
      'UNSKILLED_VERBS exempts "init", which bin/cli.mjs no longer dispatches',
    ]);
  });
});

describe('flags a skill names', () => {
  it('rejects a flag USAGE offers on the verb the skill runs and the skill omits', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-type']['SKILL.md'] = r.skills['live-tokens-set-type']['SKILL.md'].replace(
          ', and --no-verify skips the network',
          '',
        );
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-type: documents `live-tokens set-type` but never names --no-verify, which bin/cli.mjs offers',
    ]);
  });

  it('rejects a flag the CLI has retired', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['SKILL.md'] += 'Carry the open theme forward with --carry-from <slug>.\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: names --carry-from, which the CLI no longer takes',
    ]);
  });

  it('rejects a flag that is real on another verb', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['SKILL.md'] += 'Pass --no-verify to skip the network.\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: names --no-verify, which bin/cli.mjs offers on `set-type` and not on `set-colors`, the verb(s) this skill runs',
    ]);
  });

  it('accepts a flag from another verb the skill also runs', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['SKILL.md'] +=
          'For the fonts, run npx live-tokens set-type scratch/font-pairing.json --no-verify.\n';
      }),
    );

    expect(problems).toEqual([]);
  });
});
