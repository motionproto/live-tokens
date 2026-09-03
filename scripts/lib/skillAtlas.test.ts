import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module, no types
import { auditCommands, parseTrees } from './skillAtlas.mjs';

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
