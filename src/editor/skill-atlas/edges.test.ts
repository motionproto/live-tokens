import { describe, expect, it } from 'vitest';
import { mergeParallelEdges } from './edges';

describe('parallel answers', () => {
  it('draws one wire while retaining every distinct answer in order', () => {
    const edges = [
      { from: 'layout', to: 'grid', label: 'Stacked sections' },
      { from: 'layout', to: 'grid', label: 'Single column' },
      { from: 'layout', to: 'grid', label: 'Stacked sections' },
    ];
    expect(mergeParallelEdges(edges)).toEqual([
      { from: 'layout', to: 'grid', label: 'Stacked sections\nSingle column' },
    ]);
    expect(edges[0].label).toBe('Stacked sections');
  });
  it('keeps distinct endpoints and return paths separate', () => {
    const edges = [
      { from: 'a', to: 'b', label: 'yes' },
      { from: 'a', to: 'c', label: 'no' },
      { from: 'a', to: 'b', label: 'retry', back: true },
    ];
    expect(mergeParallelEdges(edges)).toEqual(edges);
  });
});
