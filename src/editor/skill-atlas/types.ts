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
  /** A `references/*.md` the node stands for, opened as a tab in the source pane. */
  reference?: string;
  lines?: LineRange;
  chips?: Chip[];
  command?: string;
}

export interface Edge {
  from: string;
  to: string;
  /** The answer that selects this branch, drawn on the wire. */
  label?: string;
  /** A re-run loop, routed up the gutter lane. */
  back?: boolean;
}

export interface SkillTree {
  id: string;
  /** Hash of the SKILL.md this tree was written against, so a rewrite that the
   *  anchors survive still fails `check:skill-atlas`. */
  digest: string;
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
