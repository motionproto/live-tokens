// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { __resetCssVarSyncForTests } from '../cssVarSync';
import {
  applySketchLayer,
  buildDefsMarkup,
  buildMaskUri,
  buildStylesheet,
  removeSketchLayer,
  setSketchScope,
  PART_SELECTORS,
} from './sketchLayer';
import { SKETCH_PRESETS } from './sketchPresets';

const marker = SKETCH_PRESETS.marker;

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  __resetCssVarSyncForTests();
});

describe('sketch layer', () => {
  it('defines every filter the stylesheet references', () => {
    for (const preset of Object.values(SKETCH_PRESETS)) {
      const defined = new Set(
        [...buildDefsMarkup(preset).matchAll(/<filter id="([^"]+)"/g)].map((m) => m[1]),
      );
      // The mask and pressure data URIs carry their own inline filters; only
      // the bare url(#id) references resolve against the injected defs.
      const referenced = new Set(
        [...buildStylesheet(preset).matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]),
      );
      expect([...referenced].filter((id) => !defined.has(id))).toEqual([]);
    }
  });

  it('keeps the mask filter reference raw so encodeURIComponent cannot break it', () => {
    // Pre-encoding the # as %23 escapes the % into %25, the reference dies, and
    // the mask silently becomes a no-op.
    expect(buildMaskUri(marker)).toContain('url(%23m)');
    expect(buildMaskUri(marker)).not.toContain('%2523');
  });

  it('rewrites one style and one defs node rather than stacking them', () => {
    applySketchLayer(marker);
    applySketchLayer(SKETCH_PRESETS.napkin);

    expect(document.head.querySelectorAll('style[data-sketch-style]')).toHaveLength(1);
    expect(document.body.querySelectorAll('svg[data-sketch-defs]')).toHaveLength(1);
  });

  it('leaves no trace behind when removed', () => {
    const stage = document.createElement('div');
    document.body.appendChild(stage);
    applySketchLayer(marker);
    setSketchScope(stage, marker);
    expect(stage.getAttribute('data-sketch')).toBe('layered');

    removeSketchLayer();

    expect(document.head.querySelector('style[data-sketch-style]')).toBeNull();
    expect(document.body.querySelector('svg[data-sketch-defs]')).toBeNull();
    expect(stage.hasAttribute('data-sketch')).toBe(false);
    expect(stage.hasAttribute('data-sketch-fill')).toBe(false);
    expect(stage.hasAttribute('data-sketch-passes')).toBe(false);
  });

  it('carries the mode, fill style and pass count onto the scope element', () => {
    const stage = document.createElement('div');
    setSketchScope(stage, SKETCH_PRESETS.wireframe);

    expect(stage.getAttribute('data-sketch')).toBe('layered');
    expect(stage.getAttribute('data-sketch-fill')).toBe('none');
    expect(stage.getAttribute('data-sketch-passes')).toBe('single');

    setSketchScope(stage, SKETCH_PRESETS.global);
    expect(stage.getAttribute('data-sketch')).toBe('global');
  });
});

describe('part coverage', () => {
  const css = buildStylesheet(marker);

  /** The declaration block of every rule whose selector matches `probe`. */
  function blocksFor(probe: RegExp): string[] {
    return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => probe.test(m[1]))
      .map((m) => m[2]);
  }

  it('paints every part it selects', () => {
    expect(PART_SELECTORS.length).toBeGreaterThan(40);
    for (const sel of PART_SELECTORS) {
      // `.sketch-*` are the consumer hooks: the page supplies their colours.
      if (sel.startsWith('.sketch-')) continue;
      expect(css).toContain(`[data-sketch] ${sel}{`);
    }
  });

  // Forcing position:relative onto these would drop them back to their flow
  // position — a tooltip landing under its trigger, a corner badge in the
  // middle of the card.
  it('never forces position onto an absolutely-positioned part', () => {
    for (const block of blocksFor(/position:relative/)) {
      expect(block).not.toContain('.tooltip');
    }
    const positionRule = css.match(/\[data-sketch='layered'\] :is\(([^{]*)\)\{position:relative;\}/);
    expect(positionRule).not.toBeNull();
    expect(positionRule![1]).not.toMatch(/\.tooltip|\.corner-badge-/);
  });

  // The arrow is the tooltip's own ::after; the stroke layer would replace it.
  it('leaves the stroke layer off a part that owns ::after', () => {
    const strokeRule = css.match(/\[data-sketch='layered'\] :is\(([^{]*)\)::after\{content/);
    expect(strokeRule).not.toBeNull();
    expect(strokeRule![1]).not.toContain('.tooltip');
  });

  // The second pass rides the stroke layer. On the fill layer it inherited the
  // misregistration offset and corner-guard scale and read as one larger ring.
  it('draws the second stroke pass on the stroke layer', () => {
    expect(css).toMatch(/data-sketch-passes='double'\] :is\([^{]*\)::after\{outline:/);
    expect(css).not.toMatch(/data-sketch-passes='double'\] :is\([^{]*\)::before\{outline:/);
  });
});
