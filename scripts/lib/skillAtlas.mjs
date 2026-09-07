// The Skill Atlas as data: the tree literal parsed out of one trees/*.ts file,
// the nodes in the order a sync walks them, and every rule that decides whether a
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
export const normalize = (line) => line.trim().replace(/^(?:\d+\.|[-*+])\s+/, '');
export const anchorOf = (line) => normalize(line).slice(0, ANCHOR_LENGTH);

// A tree file is a JSON literal wearing a TypeScript annotation, so it splits
// into the text before the value, the value, and the text after.
export function parseTree(source) {
  const open = source.indexOf('= {', source.indexOf(': SkillTree')) + 2;
  const close = source.lastIndexOf('}');
  return {
    head: source.slice(0, open),
    tree: JSON.parse(source.slice(open, close + 1)),
    tail: source.slice(close + 1),
  };
}

// The write path, so a caller can prove a clean tree round-trips unchanged. A
// two-number range stays on one line, so a node reads as one block instead of
// spreading its `lines` over four.
export const serializeTree = ({ head, tree, tail }) =>
  head + JSON.stringify(tree, null, 2).replace(/\[\n\s+(\d+),\n\s+(\d+)\n\s+\]/g, '[$1, $2]') + tail;

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
    if (normalize(lines[i]).startsWith(normalize(anchor))) hits.push(i + 1);
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

// The sync only ever iterates the tree files that exist, so a skill whose tree
// was never written, or was lost in a merge, passed with nothing to check.
export function uncoveredSkills(trees, skillDirs) {
  const covered = new Set(Object.values(trees).map((t) => t.id));
  return skillDirs.filter((dir) => !covered.has(dir)).map((dir) => `${dir}: no tree under src/editor/skill-atlas/trees maps this skill`);
}

/** A readable plan needs valid branches as well as valid source anchors. */
export function auditStructure(trees, skillIds = Object.values(trees).map((tree) => tree.id)) {
  const problems = [];
  const knownSkills = new Set(skillIds);
  const banned = /\b(?:look|band|box|ladder|rung|you|your|unsaved)\b|report card|[→—]/i;
  for (const tree of Object.values(trees)) {
    const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
    const fail = (id, message) => problems.push(`${tree.id} ${id}: ${message}`);
    if (nodes.size !== tree.nodes.length) fail('nodes', 'duplicate node id');
    const triggers = tree.nodes.filter((node) => node.kind === 'trigger');
    if (triggers.length !== 1) fail('nodes', 'expected one trigger');
    for (const edge of tree.edges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) { fail('edge', `missing endpoint ${edge.from} to ${edge.to}`); continue; }
      if (!edge.back && from.row >= to.row) fail(edge.from, `forward edge must descend to ${edge.to}`);
      if (edge.back && from.row <= to.row) fail(edge.from, `return edge must ascend to ${edge.to}`);
    }
    for (const node of tree.nodes) {
      const edges = tree.edges.filter((edge) => edge.from === node.id);
      if (!Number.isInteger(node.row) || node.row < 0) fail(node.id, 'invalid row');
      for (const item of [node, ...(node.chips ?? [])]) {
        if (!Array.isArray(item.lines) || item.lines.length !== 2 ||
            !item.lines.every(Number.isInteger) || item.lines[0] < 1 || item.lines[1] < item.lines[0]) {
          fail(node.id, 'missing or invalid source range');
        }
        for (const field of ['title', 'desc', 'label']) {
          // A trigger quotes the description, which may include user vocabulary.
          if (node.kind === 'trigger' && field === 'desc') continue;
          if (banned.test(item[field] ?? '')) fail(node.id, `restricted vocabulary in ${field}`);
        }
        if (/^(?:what|where|when|why|which|who|how)\b/i.test(item.title ?? item.label ?? '')) {
          fail(node.id, 'title or chip label starts with a question clause');
        }
      }
      if (['decide', 'ask'].includes(node.kind)) {
        if (edges.length < 2 || edges.some((edge) => !edge.label?.trim())) fail(node.id, 'decision needs two labelled answers');
      } else if (['hand', 'done'].includes(node.kind)) {
        if (edges.length) fail(node.id, 'terminal node has outgoing edges');
      } else if (node.kind === 'cli') {
        if (!edges.length || (edges.length > 1 && edges.some((edge) => !edge.label?.trim()))) fail(node.id, 'command needs a continuation or labelled outcomes');
      } else if (edges.length !== 1) fail(node.id, 'node needs one continuation');
      if (node.kind === 'gate' && !edges[0]?.back) fail(node.id, 'failure gate needs a return edge');
      if (node.kind === 'hand' && ![...knownSkills].some((id) => `${node.title} ${node.desc ?? ''}`.includes(id))) {
        fail(node.id, 'handoff must name an existing skill');
      }
    }
    if (triggers.length === 1) {
      const reached = new Set();
      const visit = (id) => {
        if (reached.has(id)) return;
        reached.add(id);
        tree.edges.filter((edge) => edge.from === id).forEach((edge) => visit(edge.to));
      };
      visit(triggers[0].id);
      for (const node of tree.nodes) if (!reached.has(node.id)) fail(node.id, 'unreachable from trigger');
    }
  }
  return problems;
}

/** Validate decisions against the source, including choices that share a wire. */
export function auditSource(tree, lines) {
  const problems = [];
  const plain = (text) => text.replace(/[`*_]/g, '').replace(/\s+/g, ' ').toLowerCase();
  const source = plain(lines.join('\n'));
  const description = lines.find((line) => line.startsWith('description: '))?.slice(13) ?? '';
  const sentences = (text) => text.split(/(?<=\.)\s+/).filter(Boolean);
  const scope = new Set(sentences(description).filter((sentence) => !sentence.startsWith('Use when')));
  for (const node of tree.nodes) {
    if (node.kind === 'trigger' && node.desc) {
      for (const sentence of sentences(node.desc)) {
        if (!scope.has(sentence)) problems.push(`${tree.id} ${node.id}: trigger quotes a sentence outside the description's scope sentences: ${JSON.stringify(sentence)}`);
      }
    }
    for (const item of [node, ...(node.chips ?? [])]) {
      if (!item.lines) continue;
      const [start, end] = item.lines;
      if (end > lines.length || !lines[start - 1]?.trim() || !lines[end - 1]?.trim()) {
        problems.push(`${tree.id} ${node.id}: source range ends outside meaningful text`);
        continue;
      }
      if (item.anchor !== anchorOf(lines[start - 1]) || (end > start && item.anchorEnd !== anchorOf(lines[end - 1]))) {
        problems.push(`${tree.id} ${node.id}: anchors must contain the first 60 characters of the cited lines`);
      }
    }
    if (['decide', 'ask'].includes(node.kind)) {
      for (const edge of tree.edges.filter((edge) => edge.from === node.id)) {
        if (edge.label && !source.includes(plain(edge.label))) problems.push(`${tree.id} ${node.id}: answer ${JSON.stringify(edge.label)} does not appear in the skill`);
      }
    }
    if (node.kind === 'hand') {
      const target = `${node.title} ${node.desc ?? ''}`.match(/live-tokens-[a-z-]+/)?.[0];
      if (target && !description.includes(target)) problems.push(`${tree.id} ${node.id}: handoff target is absent from the skill description`);
    }
  }
  return problems;
}
