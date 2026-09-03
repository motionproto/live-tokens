// The Skill Atlas as data: the tree literal parsed out of skillTrees.ts, the
// nodes in the order a sync walks them, and every rule that decides whether a
// node still points at the text it was written for. Each rule is a function of
// its inputs, so the suite can drive it; scripts/sync-skill-atlas.mjs reads the
// files, counts the repairs, and writes.

import { createHash } from 'node:crypto';

import { dispatchedVerbs } from './cliSurface.mjs';

// Long enough to be unique for all but three lines that are genuinely
// identical to another line in the same file; those resolve by proximity.
const ANCHOR_LENGTH = 60;

// A workflow step carries its own number, and renumbering one is the most
// common edit these files see. Anchoring on the prose after the marker lets a
// step move without re-anchoring, while still breaking when its words change.
export const normalize = (line) => line.trim().replace(/^\d+\.\s+/, '');
export const anchorOf = (line) => normalize(line).slice(0, ANCHOR_LENGTH);

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

/** The write path, so a caller can prove a clean tree round-trips unchanged. */
export const serializeTrees = ({ head, trees, tail }) => head + JSON.stringify(trees, null, 2) + tail;

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

// Key order is the file's diff: rebuilding in place keeps `anchor` next to the
// `lines` it explains rather than appending it after the node's prose.
export function rebuild(node, extra, after = 'lines') {
  const next = {};
  for (const [key, value] of Object.entries(node)) {
    // A key already on the node would otherwise overwrite the new value on the
    // way past, which silently dropped every digest restamp after the first.
    if (!(key in extra)) next[key] = value;
    if (key === after) Object.assign(next, extra);
  }
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, next);
}

// Nearest match wins so that a repeated line resolves to the range it was
// written for rather than to the first copy in the file.
export function locate(lines, anchor, hint, from = 0) {
  const hits = [];
  for (let i = from; i < lines.length; i += 1) {
    if (normalize(lines[i]).startsWith(anchor)) hits.push(i + 1);
  }
  if (hits.length === 0) return null;
  return hits.reduce((best, n) => (Math.abs(n - hint) < Math.abs(best - hint) ? n : best));
}

// Anchors only prove that the text a node cites is still somewhere in the file.
// They say nothing about a skill that gained a step, dropped a branch, or
// reordered its decisions while every quoted line survived — the tree is then
// wrong in the one way the atlas exists to be right about. The digest catches
// any edit at all and names the skill to re-read; re-running with --write is
// the record that someone did.
export const digestOf = (lines) => `sha256:${createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16)}`;

/** Stamps the tree under `write`, reports what to re-read otherwise. */
export function syncDigest(tree, lines, write) {
  const current = digestOf(lines);
  if (tree.digest === current) return {};
  if (!write) {
    return {
      error:
        tree.digest === undefined
          ? `${tree.id}: no digest recorded; run \`npm run sync:skill-atlas\``
          : `${tree.id}/SKILL.md has changed since the tree was written — re-read it against the tree (new steps and dropped branches are invisible to the anchors), then run \`npm run sync:skill-atlas\``,
    };
  }
  rebuild(tree, { digest: current }, 'id');
  return { digested: true };
}

/** One node against the skill body it cites: records a missing anchor, repairs
 *  a range that moved, and refuses an anchor that is gone. Mutates `node` only
 *  under `write`, which is the repair. */
export function syncNode(node, { lines, id, label, write }) {
  if (!Array.isArray(node.lines)) return {};
  const [start, end] = node.lines;

  if (typeof node.anchor !== 'string') {
    if (!write) return { error: `${label}: no anchor; run \`npm run sync:skill-atlas\` to record one` };
    // A blank line normalizes to the empty string, which would match every
    // line in the file and silently anchor the node to nothing.
    if (anchorOf(lines[start - 1]) === '' || (end > start && anchorOf(lines[end - 1]) === '')) {
      return {
        error: `${label}: lines ${start}-${end} of ${id}/SKILL.md open or close on a blank line; point the range at the text it means`,
      };
    }
    rebuild(node, {
      anchor: anchorOf(lines[start - 1]),
      ...(end > start ? { anchorEnd: anchorOf(lines[end - 1]) } : {}),
    });
    return { anchored: true };
  }

  const foundStart = locate(lines, node.anchor, start);
  if (foundStart === null) {
    return {
      error: `${label}: anchor ${JSON.stringify(node.anchor)} is no longer in ${id}/SKILL.md; re-point the node or update its anchor`,
    };
  }
  let foundEnd = foundStart;
  if (typeof node.anchorEnd === 'string') {
    foundEnd = locate(lines, node.anchorEnd, end, foundStart - 1);
    if (foundEnd === null) {
      return {
        error: `${label}: end anchor ${JSON.stringify(node.anchorEnd)} is not at or below line ${foundStart} of ${id}/SKILL.md`,
      };
    }
  } else if (end > start) {
    foundEnd = end + (foundStart - start);
  }

  if (foundStart === start && foundEnd === end) return {};
  if (!write) {
    return {
      moved: true,
      error: `${label}: cites lines ${start}-${end} of ${id}/SKILL.md, but its anchor is now at ${foundStart}-${foundEnd}`,
    };
  }
  node.lines = [foundStart, foundEnd];
  return { moved: true };
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

// The sync only ever iterates the trees that exist, so a skill dropped from
// skillTrees.ts — in full, or by a bad merge — passed with nothing to check.
export function uncoveredSkills(trees, skillDirs) {
  const covered = new Set(Object.values(trees).map((t) => t.id));
  return skillDirs.filter((dir) => !covered.has(dir)).map((dir) => `${dir}: no tree in skillTrees.ts maps this skill`);
}
