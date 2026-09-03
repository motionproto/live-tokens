// The Skill Atlas as data: the tree literal parsed out of skillTrees.ts, the
// nodes in the order a sync walks them, and the one audit that no anchor can
// carry. scripts/sync-skill-atlas.mjs owns the file IO and the repair.

import { dispatchedVerbs } from './cliSurface.mjs';

// The trees are a JSON literal wearing a TypeScript annotation, so the file
// splits into the text before it, the value, and the text after.
export function parseTrees(source) {
  const open = source.indexOf('= {', source.indexOf('skillTrees')) + 2;
  const close = source.lastIndexOf('}');
  return {
    head: source.slice(0, open),
    trees: JSON.parse(source.slice(open, close + 1)),
    tail: source.slice(close + 1),
  };
}

// Collected up front rather than yielded: a caller repairs the nodes it is
// handed, and rebuilding a node's keys under a live traversal is a trap.
export function atlasNodes(trees) {
  const nodes = [];
  const walk = (value, id, label) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, id, `${label}[${i}]`));
      return;
    }
    if (value === null || typeof value !== 'object') return;
    nodes.push({ node: value, id, label: value.id ? `${id} ${value.id}` : label });
    for (const [key, child] of Object.entries(value)) walk(child, id, `${label}.${key}`);
  };
  for (const tree of Object.values(trees)) walk(tree, tree.id, tree.id);
  return nodes;
}

// A node's `command` is the one string on a card that no anchor holds, so the
// `adjust` to `set-geometry` rename left the set-geometry card printing a verb
// the CLI had stopped dispatching, with every check green.
export function auditCommands(trees, cli) {
  const verbs = dispatchedVerbs(cli);
  const problems = [];
  for (const { node, label } of atlasNodes(trees)) {
    if (typeof node.command !== 'string') continue;
    for (const [, verb] of node.command.matchAll(/npx (?:@motion-proto\/)?live-tokens ([a-z][a-z-]*)/g)) {
      if (!verbs.has(verb)) {
        problems.push(`${label}: command runs \`live-tokens ${verb}\`, which bin/cli.mjs does not dispatch`);
      }
    }
  }
  return problems;
}
