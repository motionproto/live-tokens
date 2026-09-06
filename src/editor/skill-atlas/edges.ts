import type { Edge } from './types';

/** Several answers can lead to the same next step. Draw their shared wire once. */
export function mergeParallelEdges(edges: Edge[]): Edge[] {
  const groups = new Map<string, Edge>();
  for (const edge of edges) {
    const key = JSON.stringify([edge.from, edge.to, Boolean(edge.back)]);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...edge });
    } else if (edge.label) {
      const labels = new Set([...(existing.label?.split('\n') ?? []), edge.label]);
      existing.label = [...labels].join('\n');
    }
  }
  return [...groups.values()];
}
