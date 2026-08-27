export type NodeKind =
  | 'trigger' | 'step' | 'decide' | 'cli' | 'hand'
  | 'gate' | 'ok' | 'ref' | 'ask' | 'chipset' | 'done';

/** Inclusive 1-based line range into the skill's SKILL.md. */
export type LineRange = [number, number];

export interface Chip {
  label: string;
  lines: LineRange;
}

export interface TreeNode {
  id: string;
  row: number;
  kind: NodeKind;
  title: string;
  /** Overrides the kind's default eyebrow. */
  tag?: string;
  /** The skill's own step number, where the skill numbers its workflow. */
  n?: string;
  desc?: string;
  lines?: LineRange;
  chips?: Chip[];
  command?: string;
}

/** `[from, to]`, or `[from, to, 'back']` for a re-run loop. */
export type Edge = [string, string] | [string, string, 'back'];

export interface SkillTree {
  id: string;
  title: string;
  tagline: string;
  nodes: TreeNode[];
  edges: Edge[];
}

/** A selectable target: a node, or one chip inside a chipset node. */
export interface Selection {
  key: string;
  label: string;
  lines: LineRange;
}
