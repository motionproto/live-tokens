export type NodeKind =
  | 'trigger' | 'step' | 'decide' | 'cli' | 'hand'
  | 'gate' | 'ok' | 'ref' | 'ask' | 'chipset' | 'done';

/** Inclusive 1-based line range into the skill's SKILL.md. */
export type LineRange = [number, number];

/**
 * Opening text of the range's first and last lines, written and verified by
 * `scripts/sync-skill-atlas.mjs`. The line numbers are derived from these, so
 * editing a skill costs a sync rather than a hand audit of every range.
 */
export interface Anchored {
  anchor?: string;
  anchorEnd?: string;
}

export interface Chip extends Anchored {
  label: string;
  lines: LineRange;
}

export interface TreeNode extends Anchored {
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
