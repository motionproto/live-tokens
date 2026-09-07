import type { Edge, TreeNode } from './types';

/** An answer the card already shows as a chip says nothing more on the wire. It
 *  moves to `answers`, so selecting the chip still lights its wire. */
export function withoutChipAnswers(edges: Edge[], nodes: TreeNode[]): Edge[] {
  const chips = new Map(nodes.map((node) => [node.id, new Set((node.chips ?? []).map((chip) => chip.label))]));
  return edges.map((edge) => {
    if (!edge.label || !chips.get(edge.from)?.has(edge.label)) return edge;
    const { label, ...bare } = edge;
    return { ...bare, answers: [label] };
  });
}

/** Several answers can lead to the same next step. Draw their shared wire once. */
export function mergeParallelEdges(edges: Edge[]): Edge[] {
  const groups = new Map<string, Edge>();
  for (const edge of edges) {
    const key = JSON.stringify([edge.from, edge.to, Boolean(edge.back)]);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...edge });
    } else {
      if (edge.label) {
        const labels = new Set([...(existing.label?.split('\n') ?? []), edge.label]);
        existing.label = [...labels].join('\n');
      }
      if (edge.answers) existing.answers = [...new Set([...(existing.answers ?? []), ...edge.answers])];
    }
  }
  return [...groups.values()];
}
