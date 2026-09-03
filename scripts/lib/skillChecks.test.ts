import { readFileSync } from 'node:fs';
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
if (command === 'create') {
if (command === 'components') {
if (command === 'check-page') {
if (command === 'set-colors') {
if (command === 'set-geometry') {
if (command === 'set-type') {
if (command === 'save-theme') {
if (command !== 'setup-claude') {

const USAGE = \`Usage: npx @motion-proto/live-tokens <command> [options]

Commands:
  create <dir> [--force]      Scaffold a new app
  components [id] [--json]    List every component the project has
  check-page [paths...]       Validate pages against the build-page contract

check-page also accepts:
  --json                      Machine-readable findings
  --strict                    Treat warnings as errors
  --off=<rule,...>            Silence rules; --warn=/--error= change severity
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
  'live-tokens-build-page': 'build me a pricing page',
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
      'live-tokens-build-page': {
        'SKILL.md': `---
name: live-tokens-build-page
description: Compose a page from catalogue components and theme tokens.
---

Run npx live-tokens check-page src/routes/+page.svelte until it exits 0. --json
gives each finding a stable rule id, --strict fails on warnings too, and
--off=<rule> silences one rule for a run.
`,
      },
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

Ask what the page needs before reaching for a new component, and run
npx live-tokens components <id> --json for the props one takes.
`,
      },
    },
  };
  edit(r);
  return r;
}

const edited = (skill: string, from: string, to: string) => (r: Repo) => {
  const text = r.skills[skill]['SKILL.md'];
  if (!text.includes(from)) throw new Error(`fixture no longer contains ${JSON.stringify(from)}`);
  r.skills[skill]['SKILL.md'] = text.replace(from, to);
};

describe('a tree whose skills, CLI, and vocabulary agree', () => {
  it('reports nothing', () => {
    expect(checkSkills(repo())).toEqual([]);
  });
});

describe('a SKILL.md file', () => {
  it('rejects a skill directory with no SKILL.md', () => {
    const problems = checkSkills(
      repo((r) => {
        delete r.skills['live-tokens-create-component']['SKILL.md'];
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-component: SKILL.md is missing',
      'live-tokens-create-component/SKILL.md: missing, so the suffix vocabulary has nowhere to live',
    ]);
  });

  it('rejects frontmatter that names another directory', () => {
    const problems = checkSkills(repo(edited('live-tokens-set-colors', 'name: live-tokens-set-colors', 'name: recolor')));

    expect(problems).toEqual([
      'live-tokens-set-colors: frontmatter name is "recolor", directory is "live-tokens-set-colors"',
    ]);
  });

  it('rejects frontmatter with no description', () => {
    const problems = checkSkills(
      repo(edited('live-tokens-set-colors', "description: Build a theme's color identity from ten OKLCH base colors.\n", '')),
    );

    expect(problems).toEqual(['live-tokens-set-colors: frontmatter has no description']);
  });
});

describe('the shape of a body', () => {
  it('rejects a body past the line ceiling', () => {
    const problems = checkSkills(
      repo((r) => {
        const text = r.skills['live-tokens-set-colors']['SKILL.md'];
        r.skills['live-tokens-set-colors']['SKILL.md'] =
          text + 'One more line of prose.\n'.repeat(251 - text.split('\n').length);
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: SKILL.md is 251 lines (ceiling 250); move the long material to references/',
    ]);
  });

  it('rejects a fence long enough to be a pasted file', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['SKILL.md'] += ['```json', ...Array(41).fill('  "l": 0.62,'), '```', ''].join('\n');
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: code fence at line 9 is 41 lines (ceiling 40); point at the shipped file instead of pasting it',
    ]);
  });

  it('rejects a fence that never closes', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['SKILL.md'] += '```json\n{ "scheme": "light" }\n';
      }),
    );

    expect(problems).toEqual(['live-tokens-set-colors: unclosed code fence at line 9']);
  });

  it('rejects a heading that promises a step count', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['SKILL.md'] += '\n## The 4-step recipe\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: a heading promises "4-step"; counts drift, so name the recipe instead',
    ]);
  });
});

describe('reference files', () => {
  it('rejects a reference the SKILL.md names and the tree does not carry', () => {
    const problems = checkSkills(
      repo(edited('live-tokens-set-colors', 'references/color-anchors.md', 'references/colour-anchors.md')),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: names references/colour-anchors.md, which does not exist',
      'live-tokens-set-colors: references/color-anchors.md exists but SKILL.md never points at it',
    ]);
  });

  it('rejects a reference the tree carries and the SKILL.md never points at', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['references/scheme-notes.md'] = 'Light and dark.\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors: references/scheme-notes.md exists but SKILL.md never points at it',
    ]);
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
      repo((r) => { r.cli = r.cli.replace("if (command === 'create') {\n", ''); }),
    );

    expect(problems).toEqual([
      'UNSKILLED_VERBS exempts "create", which bin/cli.mjs no longer dispatches',
    ]);
  });
});

describe('flags a skill names', () => {
  it('rejects a flag USAGE offers on the verb the skill runs and the skill omits', () => {
    const problems = checkSkills(
      repo(edited('live-tokens-set-type', ', and --no-verify skips the network', '')),
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

// --json sits on `components` too, and USAGE declares it for the checkers in a
// block under their signatures. While that block belonged to no verb, this
// skill was told the flag it runs check-page with lives somewhere else, and no
// skill running a checker owed --strict or --off= at all.
describe('flags USAGE shares between the check commands', () => {
  it('belong to the verb the skill runs, not to the other verb that lists one', () => {
    expect(checkSkills(repo()).filter((p: string) => p.includes('--json'))).toEqual([]);
  });

  it('are owed by the skill that runs the checker', () => {
    const problems = checkSkills(
      repo(edited('live-tokens-build-page', '--strict fails on warnings too, and\n', '')),
    );

    expect(problems).toEqual([
      'live-tokens-build-page: documents `live-tokens check-page` but never names --strict, which bin/cli.mjs offers',
    ]);
  });
});

describe('skills a skill names', () => {
  it('rejects a sibling that is not bundled', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-create-theme']['SKILL.md'] += 'Then hand the result to live-tokens-adopt-theme.\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-theme: refers to skill "live-tokens-adopt-theme", which is not bundled',
    ]);
  });

  it('rejects a skill with no SAMPLE_PROMPTS entry', () => {
    const problems = checkSkills(
      repo((r) => {
        r.cli = r.cli.replace("  'live-tokens-set-type': 'pair some fonts for this theme',\n", '');
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-type: no SAMPLE_PROMPTS entry in bin/cli.mjs, so setup-claude cannot show how to trigger it',
    ]);
  });

  it('rejects a SAMPLE_PROMPTS entry for a skill that is not bundled', () => {
    const problems = checkSkills(
      repo((r) => {
        r.cli = r.cli.replace(
          "  'live-tokens-build-page':",
          "  'live-tokens-adopt-theme': 'ship the open theme',\n  'live-tokens-build-page':",
        );
      }),
    );

    expect(problems).toEqual([
      'bin/cli.mjs: SAMPLE_PROMPTS names "live-tokens-adopt-theme", which is not bundled',
    ]);
  });
});

describe('the picker catalogue', () => {
  it('rejects a component the catalogue does not list', () => {
    const problems = checkSkills(repo((r) => { r.components = [...r.components, 'banner']; }));

    expect(problems).toEqual([
      'live-tokens-pick-component: catalogue does not list "banner" (src/live-tokens/data/component-configs/banner)',
    ]);
  });

  it('rejects a catalogue entry with no component config', () => {
    const problems = checkSkills(
      repo(edited('live-tokens-pick-component', '`Card` groups a title and a body.', '`Card` groups a title and a body. `Banner` announces.')),
    );

    expect(problems).toEqual([
      'live-tokens-pick-component: catalogue lists "banner", which has no component config',
    ]);
  });
});

describe('the anchor index', () => {
  it('rejects a missing index', () => {
    const problems = checkSkills(
      repo((r) => {
        delete r.skills['live-tokens-create-theme']['references/design-directions.md'];
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-theme: names references/design-directions.md, which does not exist',
      'live-tokens-create-theme/references/design-directions.md: missing, so no anchor has an index',
    ]);
  });

  it('rejects a dimension with no anchor file', () => {
    const problems = checkSkills(
      repo((r) => {
        delete r.skills['live-tokens-set-type']['references/type-anchors.md'];
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-type: names references/type-anchors.md, which does not exist',
      'live-tokens-set-type/references/type-anchors.md: missing, so one dimension has no anchors',
    ]);
  });

  it('rejects an anchor one dimension holds and the index does not', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-set-colors']['references/color-anchors.md'] += '| Brash, loud | the loud end of the scale |\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-set-colors/references/color-anchors.md: anchors "brash", which live-tokens-create-theme/references/design-directions.md does not index',
    ]);
  });

  it('rejects an indexed anchor no dimension holds', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-create-theme']['references/design-directions.md'] += '| Brash, loud | turn everything up |\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-theme/references/design-directions.md: indexes "brash", which no dimension anchors',
    ]);
  });
});

describe('the suffix vocabulary', () => {
  it('rejects a source that is not there', () => {
    const problems = checkSkills(
      repo((r) => {
        delete r.skills['live-tokens-create-component']['references/token-naming.md'];
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-component: names references/token-naming.md, which does not exist',
      'live-tokens-create-component/references/token-naming.md: missing, so the suffix vocabulary has nowhere to live',
    ]);
  });

  it('rejects a source missing a suffix check-component accepts', () => {
    const problems = checkSkills(
      repo(edited('live-tokens-create-component', ' \`-padding\` is the space inside it.', '')),
    );

    expect(problems).toEqual([
      'live-tokens-create-component/SKILL.md: does not list `-padding`, which check-component accepts',
    ]);
  });

  it('rejects a source listing a suffix check-component rejects', () => {
    const problems = checkSkills(
      repo((r) => {
        r.skills['live-tokens-create-component']['references/token-naming.md'] += 'A drop shadow takes \`-shadow\`.\n';
      }),
    );

    expect(problems).toEqual([
      'live-tokens-create-component/references/token-naming.md: lists `-shadow`, which check-component rejects',
    ]);
  });
});

// The module's comment claims the tests prove each rule bites, and six of
// twenty-seven did: MAX_SKILL_LINES could go to 99999 and the picker catalogue
// loop could return nothing with the whole suite green. Every `errors.push` is
// one rule and has a case above, so a twenty-eighth arrives with its own case
// or this fails.
describe('the rules this file pins', () => {
  it('is every rule the module carries', () => {
    const source = readFileSync(new URL('./skillChecks.mjs', import.meta.url), 'utf8');

    expect(source.match(/errors\.push\(/g)).toHaveLength(27);
  });
});
