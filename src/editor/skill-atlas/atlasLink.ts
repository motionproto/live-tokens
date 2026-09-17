import type { Selection, SkillTree } from './types';

/** A selectable target with the path segment its shared link names it by. */
export interface LinkedTarget extends Selection {
  path: string;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Every target in the tree, node and chip alike. A chip's path nests under its card's. */
export function linkTargets(tree: SkillTree): LinkedTarget[] {
  return tree.nodes.flatMap((node) => [
    ...(node.lines
      ? [{ key: node.id, label: node.title, lines: node.lines, path: slug(node.title) }]
      : []),
    ...(node.chips ?? []).map((chip, i) => ({
      key: `${node.id}:${i}`,
      label: chip.label,
      lines: chip.lines,
      path: `${slug(node.title)}/${slug(chip.label)}`,
    })),
  ]);
}

export function linkHash(skill: string, target: LinkedTarget | null): string {
  return target ? `#${skill}/${target.path}` : `#${skill}`;
}

/** Reads `#set-type/write-the-font-pairing/voice`. An unknown block still opens its skill. */
export function resolveLink(
  hash: string,
  trees: Record<string, SkillTree>,
): { skill: string; target: LinkedTarget | null } | null {
  const [skill, ...rest] = decodeURIComponent(hash.replace(/^#/, '')).split('/');
  if (!(skill in trees)) return null;
  const path = rest.join('/');
  return { skill, target: linkTargets(trees[skill]).find((t) => t.path === path) ?? null };
}
