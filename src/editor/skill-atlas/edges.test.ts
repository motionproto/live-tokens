import { describe, expect, it } from 'vitest';
import { mergeParallelEdges, withoutChipAnswers } from './edges';

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
  it('gathers the answers of merged wires', () => {
    const edges = [
      { from: 'q', to: 'reply', answers: ['Mechanical'] },
      { from: 'q', to: 'reply', answers: ['Judgement'] },
    ];
    expect(mergeParallelEdges(edges)).toEqual([{ from: 'q', to: 'reply', answers: ['Mechanical', 'Judgement'] }]);
  });
});

describe('answers already on the card', () => {
  const nodes = [
    { id: 'act', row: 1, kind: 'chipset' as const, title: 'Action family', chips: [{ label: 'Button', lines: [1, 1] as [number, number] }] },
    { id: 'order', row: 1, kind: 'decide' as const, title: 'Repair order' },
  ];
  it('leaves the wire unlabelled when its answer is a chip of the source card', () => {
    const edges = [
      { from: 'act', to: 'fits', label: 'Button' },
      { from: 'act', to: 'fits', label: 'Toggle' },
      { from: 'order', to: 'recipe', label: 'warnings' },
    ];
    expect(withoutChipAnswers(edges, nodes)).toEqual([
      { from: 'act', to: 'fits', answers: ['Button'] },
      { from: 'act', to: 'fits', label: 'Toggle' },
      { from: 'order', to: 'recipe', label: 'warnings' },
    ]);
  });
});
