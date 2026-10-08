import { describe, it, expect } from 'vitest';
import { requiredWeights, weightCoverage } from './weightCoverage';

const TOKENS = `:root {
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --heading-font-family: var(--font-display);
  --heading-font-weight: var(--font-weight-semibold);
  --heading-lg-font-family: var(--heading-font-family);
  --heading-lg-font-weight: var(--heading-font-weight);
  --body-font-family: var(--font-sans);
  --body-font-weight: var(--font-weight-normal);
  --body-md-font-family: var(--body-font-family);
  --body-md-font-weight: var(--body-font-weight);
  --code-font-family: var(--font-mono);
  --code-font-weight: 500;
}`;

describe('requiredWeights', () => {
  it('pairs each -font-weight with its -font-family and resolves the scale', () => {
    expect(requiredWeights(TOKENS)).toEqual([
      { variable: '--heading-font-weight', stack: '--font-display', weight: 600 },
      { variable: '--body-font-weight', stack: '--font-sans', weight: 400 },
      { variable: '--code-font-weight', stack: '--font-mono', weight: 500 },
    ]);
  });

  it('follows a step’s aliases to its usage’s face and weight', () => {
    const pinned = TOKENS.replace(
      '}',
      '  --heading-sm-font-family: var(--font-sans);\n  --heading-sm-font-weight: var(--heading-font-weight);\n}',
    );
    expect(requiredWeights(pinned)).toContainEqual({
      variable: '--heading-sm-font-weight',
      stack: '--font-sans',
      weight: 600,
    });
  });

  it('counts an alias between stacks for no stack', () => {
    const found = requiredWeights(`:root {
      --font-weight-bold: 700;
      --font-editorial: var(--font-sans);
      --editorial-font-family: var(--font-editorial);
      --editorial-font-weight: var(--font-weight-bold);
    }`);
    expect(found).toEqual([]);
  });

  it('counts a theme’s own component tokens', () => {
    const found = requiredWeights(TOKENS, {
      '--badge-trait-text-font-family': 'var(--font-sans)',
      '--badge-trait-text-font-weight': 'var(--font-weight-light)',
    });
    expect(found).toContainEqual({
      variable: '--badge-trait-text-font-weight',
      stack: '--font-sans',
      weight: 300,
    });
  });

  it('ignores a weight token that resolves to no stack', () => {
    const found = requiredWeights(`:root {
      --font-weight-bold: 700;
      --something-font-family: "Comic Sans";
      --something-font-weight: var(--font-weight-bold);
    }`);
    expect(found).toEqual([]);
  });
});

describe('weightCoverage', () => {
  it('names the weights the tokens ask for and the family lacks', () => {
    const coverage = weightCoverage(requiredWeights(TOKENS), {
      '--font-sans': { name: 'Lato', weights: [100, 300, 400, 700, 900], italics: true },
      '--font-display': { name: 'Mystery Quest', weights: [400], italics: false },
    });

    expect(coverage).toEqual([
      {
        stack: '--font-sans',
        family: 'Lato',
        required: [400],
        available: [100, 300, 400, 700, 900],
        missing: [],
        italics: true,
      },
      {
        stack: '--font-display',
        family: 'Mystery Quest',
        required: [600],
        available: [400],
        missing: [600],
        italics: false,
      },
    ]);
  });
});
