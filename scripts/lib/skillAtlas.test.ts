import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  anchorOf,
  atlasNodes,
  auditCommands,
  digestOf,
  locate,
  normalize,
  parseTrees,
  rebuild,
  serializeTrees,
  syncDigest,
  syncNode,
  uncoveredSkills,
  // @ts-expect-error — plain .mjs module, no types
} from './skillAtlas.mjs';

type Node = { id: string; title: string; lines?: number[]; anchor?: string; anchorEnd?: string; command?: string };
type Tree = { id: string; digest?: string; title: string; nodes: Node[] };

const CLI = `
if (command === 'components') {
if (command === 'set-geometry') {
if (command === 'set-type') {
`;

const atlas = (command: string) => `import type { SkillTree } from './types';

export const skillTrees: Record<string, SkillTree> = {
  "set-geometry": {
    "id": "live-tokens-set-geometry",
    "title": "set-geometry",
    "nodes": [
      {
        "id": "sg-run",
        "title": "Run the verb",
        "command": ${JSON.stringify(command)}
      }
    ]
  }
};
`;

const audit = (command: string) => auditCommands(parseTrees(atlas(command)).trees, CLI);

const BODY = [
  '---',
  'name: live-tokens-set-geometry',
  '---',
  '',
  '## Workflow',
  '',
  '1. Read the anchor column and write the ops file.',
  '2. Run the verb and read the report.',
  '',
  '## Verify',
  '',
  '- The CLI exits 0.',
];

const node = (over: Partial<Node> = {}): Node => ({ id: 'sg-steps', title: 'The steps', lines: [7, 8], ...over });
const sync = (n: Node, over: { lines?: string[]; write?: boolean } = {}) =>
  syncNode(n, { lines: over.lines ?? BODY, id: 'live-tokens-set-geometry', label: 'sg sg-steps', write: over.write ?? false });

describe('the text a line means', () => {
  it('drops a step number, so renumbering does not re-anchor', () => {
    expect(normalize('  3. Run the verb and read the report.')).toBe('Run the verb and read the report.');
  });

  it('cuts an anchor to the opening of the line', () => {
    expect(anchorOf(`1. ${'x'.repeat(80)}`)).toHaveLength(60);
  });

  it('gives a blank line the empty anchor the guard looks for', () => {
    expect(anchorOf('   ')).toBe('');
  });
});

describe('locating an anchor', () => {
  const lines = ['- The CLI exits 0.', 'other', 'other', '- The CLI exits 0.'];

  it('takes the hit nearest the line the node cites', () => {
    expect(locate(lines, '- The CLI exits 0.', 4)).toBe(4);
    expect(locate(lines, '- The CLI exits 0.', 1)).toBe(1);
  });

  it('starts where it is told, so an end anchor cannot resolve above its start', () => {
    expect(locate(lines, '- The CLI exits 0.', 1, 1)).toBe(4);
  });

  it('answers null when the text is gone', () => {
    expect(locate(lines, 'A line nobody wrote', 1)).toBeNull();
  });
});

describe('a node whose range moved', () => {
  it('reports the new range and repairs nothing', () => {
    const n = node({ anchor: 'Read the anchor column', anchorEnd: 'Run the verb and read the report.', lines: [4, 5] });

    expect(sync(n)).toEqual({
      moved: true,
      error: 'sg sg-steps: cites lines 4-5 of live-tokens-set-geometry/SKILL.md, but its anchor is now at 7-8',
    });
    expect(n.lines).toEqual([4, 5]);
  });

  it('repairs it under write', () => {
    const n = node({ anchor: 'Read the anchor column', anchorEnd: 'Run the verb and read the report.', lines: [4, 5] });

    expect(sync(n, { write: true })).toEqual({ moved: true });
    expect(n.lines).toEqual([7, 8]);
  });

  it('carries a single-line range down by the same offset', () => {
    const n = node({ anchor: 'Read the anchor column', lines: [4, 5] });

    sync(n, { write: true });
    expect(n.lines).toEqual([7, 8]);
  });

  it('leaves a range that still opens where it says', () => {
    const n = node({ anchor: 'Read the anchor column', anchorEnd: 'Run the verb and read the report.' });

    expect(sync(n, { write: true })).toEqual({});
    expect(n.lines).toEqual([7, 8]);
  });

  it('refuses an anchor the skill no longer carries', () => {
    const n = node({ anchor: 'Hand the geometry intent to the contributing skill' });

    expect(sync(n, { write: true })).toEqual({
      error:
        'sg sg-steps: anchor "Hand the geometry intent to the contributing skill" is no longer in live-tokens-set-geometry/SKILL.md; re-point the node or update its anchor',
    });
    expect(n.lines).toEqual([7, 8]);
  });

  it('refuses an end anchor that sits above its start', () => {
    const n = node({ anchor: 'Run the verb and read the report.', anchorEnd: 'Read the anchor column' });

    expect(sync(n, { write: true })).toEqual({
      error:
        'sg sg-steps: end anchor "Read the anchor column" is not at or below line 8 of live-tokens-set-geometry/SKILL.md',
    });
  });
});

describe('a node with no anchor', () => {
  it('is a drift the check reports rather than repairs', () => {
    expect(sync(node())).toEqual({
      error: 'sg sg-steps: no anchor; run `npm run sync:skill-atlas` to record one',
    });
  });

  it('records the text at both ends under write, beside the lines it explains', () => {
    const n = node();

    expect(sync(n, { write: true })).toEqual({ anchored: true });
    expect(n.anchor).toBe('Read the anchor column and write the ops file.');
    expect(n.anchorEnd).toBe('Run the verb and read the report.');
    expect(Object.keys(n)).toEqual(['id', 'title', 'lines', 'anchor', 'anchorEnd']);
  });

  it('refuses a range that opens or closes on a blank line', () => {
    // The empty anchor would match every line in the file.
    expect(sync(node({ lines: [6, 8] }), { write: true })).toEqual({
      error:
        'sg sg-steps: lines 6-8 of live-tokens-set-geometry/SKILL.md open or close on a blank line; point the range at the text it means',
    });
    expect(sync(node({ lines: [7, 9] }), { write: true })).toEqual({
      error:
        'sg sg-steps: lines 7-9 of live-tokens-set-geometry/SKILL.md open or close on a blank line; point the range at the text it means',
    });
  });

  it('leaves a node that cites no lines alone', () => {
    expect(sync(node({ lines: undefined }))).toEqual({});
  });
});

describe('the digest of a skill body', () => {
  const tree = (over: Partial<Tree> = {}): Tree => ({ id: 'live-tokens-set-geometry', title: 'set-geometry', nodes: [], ...over });

  it('accepts a tree written against this body', () => {
    expect(syncDigest(tree({ digest: digestOf(BODY) }), BODY, false)).toEqual({});
  });

  it('names a tree with no digest', () => {
    expect(syncDigest(tree(), BODY, false)).toEqual({
      error: 'live-tokens-set-geometry: no digest recorded; run `npm run sync:skill-atlas`',
    });
  });

  it('names a skill edited since the tree was written, which no anchor can see', () => {
    const { error } = syncDigest(tree({ digest: 'sha256:0000000000000000' }), BODY, false);

    expect(error).toMatch(/live-tokens-set-geometry\/SKILL\.md has changed since the tree was written/);
  });

  it('restamps every tree in one pass, not just the first', () => {
    // Rebuilding a node used to let the key already on it overwrite the new
    // value on the way past, which dropped every restamp after the first.
    const trees = [tree({ digest: 'sha256:0000000000000000' }), tree({ id: 'live-tokens-set-type', digest: 'sha256:1111111111111111' })];

    for (const t of trees) expect(syncDigest(t, BODY, true)).toEqual({ digested: true });

    expect(trees.map((t) => t.digest)).toEqual([digestOf(BODY), digestOf(BODY)]);
    expect(Object.keys(trees[0])).toEqual(['id', 'digest', 'title', 'nodes']);
  });
});

describe('rebuilding a node', () => {
  it('puts the new keys after the one they explain and keeps the rest in order', () => {
    const n = { id: 'sg-steps', lines: [7, 8], title: 'The steps' };

    rebuild(n, { anchor: 'Read the anchor column' });

    expect(Object.keys(n)).toEqual(['id', 'lines', 'anchor', 'title']);
  });
});

describe('a command a card prints', () => {
  it('accepts a verb bin/cli.mjs dispatches', () => {
    expect(audit('npx live-tokens set-geometry scratch/geometry-ops.json')).toEqual([]);
  });

  it('rejects the verb a rename retired', () => {
    expect(audit('npx live-tokens adjust scratch/geometry-ops.json')).toEqual([
      'live-tokens-set-geometry sg-run: command runs `live-tokens adjust`, which bin/cli.mjs does not dispatch',
    ]);
  });

  it('rejects a retired verb on the second line of a two-line command', () => {
    expect(audit('npx live-tokens components <id> --json\nnpx @motion-proto/live-tokens generate-theme')).toEqual([
      'live-tokens-set-geometry sg-run: command runs `live-tokens generate-theme`, which bin/cli.mjs does not dispatch',
    ]);
  });
});

describe('the skills the trees map', () => {
  it('names a bundled skill no tree maps', () => {
    const { trees } = parseTrees(atlas('npx live-tokens set-geometry scratch/geometry-ops.json'));

    expect(uncoveredSkills(trees, ['live-tokens-set-colors', 'live-tokens-set-geometry'])).toEqual([
      'live-tokens-set-colors: no tree in skillTrees.ts maps this skill',
    ]);
  });

  it('walks every node under a tree, chips included', () => {
    const source = atlas('npx live-tokens set-geometry ops.json').replace(
      '"title": "Run the verb"',
      '"title": "Run the verb", "chips": [{ "label": "Dry run" }]',
    );

    expect(atlasNodes(parseTrees(source).trees).map((n: { label: string }) => n.label)).toEqual([
      'live-tokens-set-geometry live-tokens-set-geometry',
      'live-tokens-set-geometry sg-run',
      'live-tokens-set-geometry.nodes[0].chips[0]',
    ]);
  });
});

// `sync:skill-atlas --write` rewrites the file from the parsed value, so a
// clean tree has to serialize back to its own bytes: anything else means every
// sync carries a formatting diff nobody asked for.
describe('the shipped tree', () => {
  it('round-trips through the parse the sync writes from', () => {
    const source = readFileSync(new URL('../../src/editor/skill-atlas/skillTrees.ts', import.meta.url), 'utf8');

    expect(serializeTrees(parseTrees(source))).toBe(source);
  });
});
