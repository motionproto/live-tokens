// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { __resetCssVarSyncForTests } from '../cssVarSync';
import {
  applySketchLayer,
  buildDefsMarkup,
  buildStylesheet,
  removeSketchLayer,
  setSketchScope,
  PART_SELECTORS,
} from './sketchLayer';
import { MASK_TILE } from './maskField';
import { SKETCH_PRESETS } from './sketchPresets';

const marker = SKETCH_PRESETS.marker;

/** Alpha at the middle of a straight run of the border once the pool blur has
    spread it, by numeric integration rather than by the layer's own maths. */
function straightRun(width: number, sigma: number, ink: number): number {
  const step = width / 400;
  let sum = 0;
  for (let x = -width / 2; x < width / 2; x += step) {
    sum += (Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))) * step;
  }
  return sum * ink;
}

/** The line each instance actually draws, read back out of the stylesheet: the
    pen-weight cycle, through the width and ink calcs emitted alongside it. */
function instances(s: typeof marker) {
  const css = buildStylesheet(s);
  const vary = Number(css.match(/var\(--sketch-jw, 0\) \* ([\d.]+)%/)?.[1] ?? 0);
  return [...css.matchAll(/nth-child\(11n \+ (\d+)\)\{--sketch-jy: -?[\d.]+; --sketch-jw: (-?[\d.]+);/g)]
    .map((m) => {
      const jw = Number(m[2]);
      return {
        bank: Number(m[1]) - 1,
        width: s.strokeWidth * (1 + jw * s.pressure),
        ink: vary ? Math.min(1, s.strokeInk + (jw * vary) / 100) : 1,
      };
    });
}

const poolFilter = (s: typeof marker, bank: number) =>
  buildDefsMarkup(s).match(new RegExp(`<filter id="lt-sketch-pool-${bank}"[\\s\\S]*?</filter>`))![0];

/** The alpha ramp one bank applies, as a function. */
function poolRamp(s: typeof marker, bank: number) {
  const m = poolFilter(s, bank).match(/values="[^"]*0 0 0 ([\d.]+) (-?[\d.]+)"/)!;
  return (alpha: number) => Number(m[1]) * alpha + Number(m[2]);
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  __resetCssVarSyncForTests();
});

describe('sketch layer', () => {
  // Every apply used to rewrite both nodes whether or not the markup had moved,
  // which tore down the filters the page was mid-paint against and dropped the
  // mask image to be decoded again: a flash of the raw component. Two of them
  // per settings change, since the overlay's copy of the store renders into
  // this page as well as its own.
  it('leaves the injected nodes alone when nothing about the look has moved', () => {
    applySketchLayer(marker);
    const filter = document.querySelector('filter')!;
    const style = document.head.querySelector('style[data-sketch-style]')!;

    applySketchLayer(marker);

    expect(document.querySelector('filter')).toBe(filter);
    expect(document.head.querySelector('style[data-sketch-style]')).toBe(style);
  });

  it('rewrites them as soon as it does', () => {
    applySketchLayer(marker);
    const filter = document.querySelector('filter')!;

    applySketchLayer({ ...marker, strokeWidth: marker.strokeWidth + 1 });

    expect(document.querySelector('filter')).not.toBe(filter);
  });

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

  it('lays ink coverage over the fill as a mask that leaves the shadow standing', () => {
    const css = buildStylesheet(marker);
    const before = css.match(/::before\{([^}]*)\}/)![1];
    expect(before).toContain('mask-image:var(--sketch-mask, none);');
    expect(before).toContain('mask-mode:luminance');
    // A mask clips what it masks to the border box by default, and the fill's
    // shadow lies outside it: without this the shadow went with the coverage.
    expect(before).toContain('mask-clip:no-clip');
    expect(buildStylesheet({ ...marker, maskOn: false })).not.toMatch(/::before\{[^}]*mask-image/);
  });

  it('names one field for the fill and the icons to share', () => {
    const css = buildStylesheet(marker);
    expect(css.match(/--sketch-mask:url/g)).toHaveLength(1);
    expect(css).toContain(`--sketch-mask-tile:${MASK_TILE}px;`);
    // A chip narrower than one blob would come out wholly inked or wholly bare.
    expect(css).toMatch(/\.badge[^{]*\{--sketch-mask-tile:\d+px;/);
    // Nothing to build a field from, so nothing is built.
    expect(buildStylesheet({ ...marker, maskOn: false, iconMaskOn: false }))
      .toContain('--sketch-mask:none;');
  });

  // The field tiles from each element's own origin, so two buttons the same
  // size would carry the same blotches in the same places.
  it('samples the field at a different offset per instance', () => {
    const css = buildStylesheet(marker);
    const offsets = [...css.matchAll(/--sketch-mask-pos:([^;]+);/g)].map((m) => m[1]);
    expect(offsets.length).toBeGreaterThan(1);
    expect(new Set(offsets).size).toBe(offsets.length);
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
    expect(stage.getAttribute('data-sketch')).toBe('');

    removeSketchLayer();

    expect(document.head.querySelector('style[data-sketch-style]')).toBeNull();
    expect(document.body.querySelector('svg[data-sketch-defs]')).toBeNull();
    expect(stage.hasAttribute('data-sketch')).toBe(false);
    expect(stage.hasAttribute('data-sketch-fill')).toBe(false);
    expect(stage.hasAttribute('data-sketch-passes')).toBe(false);
  });

  it('carries the fill style and pass count onto the scope element', () => {
    const stage = document.createElement('div');
    setSketchScope(stage, { ...SKETCH_PRESETS.hatched, doubleStroke: true });

    expect(stage.getAttribute('data-sketch')).toBe('');
    expect(stage.getAttribute('data-sketch-fill')).toBe('hatched');
    expect(stage.getAttribute('data-sketch-passes')).toBe('double');
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
    const positionRule = css.match(/\[data-sketch\] :is\(([^{]*)\)\{position:relative;\}/);
    expect(positionRule).not.toBeNull();
    expect(positionRule![1]).not.toMatch(/\.tooltip|\.corner-badge-/);
  });

  // The arrow is the tooltip's own ::after; the stroke layer would replace it.
  it('leaves the stroke layer off a part that owns ::after', () => {
    const strokeRule = css.match(/\[data-sketch\] :is\(([^{]*)\)::after\{content/);
    expect(strokeRule).not.toBeNull();
    expect(strokeRule![1]).not.toContain('.tooltip');
  });

  // The second pass rides the stroke layer, offset rather than concentric: an
  // outline could only sit parallel, which reads as a double rule.
  it('retraces the stroke as an offset copy, not a concentric one', () => {
    expect(css).toMatch(/data-sketch-passes='double'\] :is\([^{]*\)::after\{--sketch-retrace:drop-shadow\(/);
    expect(css).not.toContain('outline-offset');
    expect(css).not.toMatch(/data-sketch-passes='double'\] :is\([^{]*\)::before\{/);
  });

  // Before pooling, so the two runs merge where they touch.
  it('lays the retrace into the stroke filter chain ahead of the goo', () => {
    const chain = css.match(/filter:var\(--sketch-stroke-filter\)[^;]*/)![0];
    expect(chain.indexOf('--sketch-retrace')).toBeLessThan(chain.indexOf('--sketch-pool'));
  });

  // The dial is a range, not a distance: one distance for every component reads
  // as a printing offset rather than as a hand.
  it("parts the passes by each component's own share of the dial", () => {
    const rule = buildStylesheet({ ...marker, retraceOffset: 3.5 })
      .match(/--sketch-retrace:drop-shadow\([^;]*/)![0];
    expect(rule).toContain('calc(var(--sketch-jx, 0.6) * 3.50px)');
    expect(rule).toContain('calc(var(--sketch-jy, -0.4) * 3.50px)');
  });
});

describe('a reseeded second pass', () => {
  const reseeded = { ...marker, retracePass: 'reseeded' } as const;
  const strokeBank = (s: typeof marker) =>
    buildDefsMarkup(s).match(/<filter id="lt-sketch-stroke-0"([\s\S]*?)<\/filter>/)![1];

  // A CSS filter chain can only duplicate what the stage before it produced, so
  // a pass on its own seed has to live inside the bank with the first.
  it('draws the second pass in the stroke bank, on its own wobble seed', () => {
    const bank = strokeBank(reseeded);
    const wobble = [...bank.matchAll(/seed="(\d+)" result="nr?"/g)].map((m) => m[1]);
    expect(wobble).toHaveLength(2);
    expect(wobble[0]).not.toEqual(wobble[1]);
    expect(bank).toContain('<feMergeNode in="drawn"/><feMergeNode in="shifted"/>');
    expect(buildStylesheet(reseeded)).not.toContain('--sketch-retrace:drop-shadow');
  });

  // The warp is the box, not the pen. Reseeded, the second pass leans a
  // different quadrilateral and the two read as two boxes.
  it('holds both passes to one warp seed', () => {
    const warp = [...strokeBank(reseeded).matchAll(/seed="(\d+)" result="wr?"/g)].map((m) => m[1]);
    expect(warp).toHaveLength(2);
    expect(warp[0]).toEqual(warp[1]);
  });

  // Same reason as the copy path, over the five banks it has to work with.
  it('lands each seed bank its own distance and its own way', () => {
    const defs = buildDefsMarkup(reseeded);
    const shifts = [...defs.matchAll(/id="lt-sketch-stroke-\d"[\s\S]*?<feOffset[^>]*dx="(-?[\d.]+)" dy="(-?[\d.]+)"/g)]
      .map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(shifts).toHaveLength(5);
    expect(new Set(shifts.map(([x, y]) => Math.hypot(x, y).toFixed(2))).size).toBe(5);
  });

  it('builds one pass when the outline is single', () => {
    expect(strokeBank({ ...reseeded, doubleStroke: false })).not.toContain('feMerge');
  });
});

describe('icons', () => {
  it('filters icon glyphs but never body type', () => {
    const css = buildStylesheet(marker);
    expect(css).toMatch(/:is\(\[class\*="fa-"\], svg:not\(\[data-sketch-defs\]\)\)\{filter:/);
    // The injected filter bank is itself an svg in the body.
    expect(css).toContain('svg:not([data-sketch-defs])');
    // A paragraph has no shape to lose; only the icon convention is targeted.
    expect(css).not.toMatch(/\{filter:[^}]*\}[^{]*\b(p|body|span)\s*\{/);
  });

  it('emits nothing for icons when both dials are off', () => {
    const off = buildStylesheet({ ...marker, iconTravel: 0, iconMaskOn: false });
    expect(off).not.toContain('[class*="fa-"]');
  });

  // The two are independent: ink coverage with no displacement is a look.
  it('still masks icons when displacement is zero', () => {
    const css = buildStylesheet({ ...marker, iconTravel: 0, iconMaskOn: true });
    expect(css).toContain('[class*="fa-"]');
    expect(css).not.toMatch(/:is\(\[class\*="fa-"[^{]*\)\{filter:/);
  });

  // A px tile is a size the glyph has no say in: anything smaller than the tile
  // sampled one flat patch of the field and came out either untouched or gone.
  it('sizes the icon mask against the glyph, not in px', () => {
    const css = buildStylesheet({ ...marker, iconMaskScale: 1 });
    expect(css).toContain('--sketch-icon-mask-tile:100%;');
    expect(css).toContain('mask-size:auto var(--sketch-icon-mask-tile);');
    // The fill keeps its px tile: a component does have a size to state one in.
    expect(css).toContain(`--sketch-mask-tile:${MASK_TILE}px;`);
  });

  it('moves the icon tile the whole way the dial does', () => {
    expect(buildStylesheet({ ...marker, iconMaskScale: 0.3 }))
      .toContain('--sketch-icon-mask-tile:30%;');
  });

  // The overlay bar lives in the host document, which is the scope root.
  it('leaves an inheriting opt-out for chrome in the host document', () => {
    expect(buildStylesheet(marker)).toContain('var(--sketch-icon-off,');
  });

  // One knob, both treatments: an opt-out that left the mask on came out
  // blotched, which is the effect reaching chrome that asked to be left alone.
  it('takes the ink mask off the same opt-out as the filter', () => {
    const css = buildStylesheet({ ...marker, iconMaskOn: true });
    expect(css).toContain('mask-image:var(--sketch-icon-off,) var(--sketch-mask, none);');
    // The parts keep the ungated mask — nothing inherits an opt-out onto them.
    expect(css).toContain('mask-image:var(--sketch-mask, none);');
  });

  it('offers a soft bank an element can name instead of going crisp', () => {
    const css = buildStylesheet(marker);
    expect(css).toContain('--sketch-icon-soft:url(#lt-sketch-icon-soft-0);');
    expect(css).toContain('--sketch-icon-soft:url(#lt-sketch-icon-soft-4);');
    expect(buildDefsMarkup(marker)).toContain('<filter id="lt-sketch-icon-soft-0"');
  });

  it('draws the soft bank at a fraction of the travel', () => {
    const defs = buildDefsMarkup(marker);
    const scale = (id: string) =>
      Number(defs.split(`<filter id="${id}"`)[1].split('</filter>')[0]
        .match(/<feDisplacementMap[^>]*scale="([\d.]+)"/)![1]);
    expect(scale('lt-sketch-icon-soft-0')).toBeLessThan(scale('lt-sketch-icon-0'));
  });
});

describe('the wave', () => {
  // The raw field crowds around its own centre, which is the map's zero: read
  // as it comes, most of an edge barely moves.
  it('squares the wave off on both map channels', () => {
    const hard = buildDefsMarkup({ ...marker, waveform: 3 });
    expect(hard).toContain('<feFuncR type="linear" slope="3.00" intercept="-1.000"/>');
    expect(hard).toContain('<feFuncG type="linear" slope="3.00" intercept="-1.000"/>');
    expect(hard).toContain('in2="nb"');
  });

  it('reads the field raw when the wave is soft, so the stage costs nothing until it is asked for', () => {
    const even = buildDefsMarkup({ ...marker, waveform: 1 });
    expect(even).not.toContain('result="nb"');
    expect(even).toContain('in2="n"');
  });

  it('stacks the layers roughness asks for and no more', () => {
    expect(buildDefsMarkup({ ...marker, roughness: 1 })).toContain('numOctaves="1" seed="0"');
    expect(buildDefsMarkup({ ...marker, roughness: 3 })).toContain('numOctaves="3" seed="0"');
  });

  it('gives the border its own wavelength without touching the fill', () => {
    const defs = buildDefsMarkup({ ...marker, borderWavelength: 0.5 });
    const bank = (id: string) =>
      defs.match(new RegExp(`<filter id="${id}".*?</filter>`, 's'))![0];
    const cycles = 1 / marker.wobble;
    expect(bank('lt-sketch-stroke-0')).toContain(`baseFrequency="${(cycles * 2).toFixed(5)}"`);
    expect(bank('lt-sketch-fill-0')).toContain(`baseFrequency="${cycles.toFixed(5)}"`);
  });
});

describe('the drawn box', () => {
  // Displacement wobbles an edge; it leaves a rectangle with four matching
  // corners, which is what still reads as machine drawn.
  it('gives each corner its own radius off the part\'s own token', () => {
    const css = buildStylesheet(marker);
    expect(css).toContain('--sketch-radius:var(--card-default-radius, 0px);');
    for (const i of [1, 2, 3, 4]) expect(css).toContain(`var(--sketch-c${i}, 0)`);
    expect(css).toMatch(/\{--sketch-c1:[-\d.]+;--sketch-c2:[-\d.]+;--sketch-c3:[-\d.]+;--sketch-c4:[-\d.]+;\}/);
  });

  // `--radius-none` is a bare `0`. Unregistered, a square part hands the corner
  // maths `calc(0 + 0.95 * 16px)`, which is invalid, and an invalid calc takes
  // the whole border-radius down to its initial value: one square component
  // flattened the corners of every other one and the dial did nothing.
  it('registers the radius as a length so a unitless zero cannot void the calc', () => {
    expect(buildStylesheet(marker)).toContain(
      '@property --sketch-radius{syntax:"<length>";inherits:true;initial-value:0px;}',
    );
  });

  // --sketch-radius inherits. A part that named no radius would draw a square
  // header with the corners of the card it sits in.
  it('states a radius for every part it paints', () => {
    const css = buildStylesheet(marker);
    for (const sel of PART_SELECTORS) {
      if (sel.startsWith('.sketch-')) continue;
      expect(css).toMatch(
        new RegExp(`\\[data-sketch\\] ${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^}]*--sketch-radius:`),
      );
    }
  });

  // The two layers disagree by displacement seed and by the fill's offset. They
  // must not also disagree about what shape they are drawing around.
  it('draws fill and outline around the same box', () => {
    const layers = [...buildStylesheet(marker).matchAll(/\{([^{}]*content:''[^{}]*)\}/g)].map((m) => m[1]);
    // The fill is drawn on a box grown by the bleed and takes that back off at
    // its content box, so it states each corner as the outline's plus the same
    // number of px. Strip the growth and the two must read alike.
    const radii = layers.map((d) => d.match(/border-radius:[^;]*/)![0]
      .replace(/calc\((.*?) \+ \d+px\)/g, '$1'));
    expect(new Set(radii).size).toBe(1);

    // Same warp stage verbatim, seed included: a different seed there would
    // give the outline a different quadrangle from the fill. Only that stage —
    // the stroke bank thins its ink first, which the fill has no business doing.
    const defs = buildDefsMarkup(marker);
    // Minus the `in=`, which names whatever stage ran before it and differs by
    // design: the stroke thins its ink first, the fill has nothing to thin.
    const warp = (id: string) =>
      defs.match(new RegExp(`<filter id="${id}"[\\s\\S]*?(<feTurbulence[^>]*result="w"/>[\\s\\S]*?<feDisplacementMap[^>]*result="box"/>)`))![1]
        .replace(/ in="[^"]*"/g, '');
    expect(warp('lt-sketch-fill-0')).toEqual(warp('lt-sketch-stroke-0'));
    expect(warp('lt-sketch-fill-0')).not.toEqual(warp('lt-sketch-fill-1'));
  });

  it('keeps the outline on the same box when the pen has its own wavelength', () => {
    const defs = buildDefsMarkup({ ...marker, borderWavelength: 0.5 });
    const warp = (id: string) =>
      defs.match(new RegExp(`<filter id="${id}"[\\s\\S]*?(<feTurbulence[^>]*result="w"/>[\\s\\S]*?<feDisplacementMap[^>]*result="box"/>)`))![1]
        .replace(/ in="[^"]*"/g, '');
    expect(warp('lt-sketch-fill-0')).toEqual(warp('lt-sketch-stroke-0'));
    expect(warp('lt-sketch-fill-sm-0')).toEqual(warp('lt-sketch-stroke-sm-0'));
  });

  // A transform moves a corner in proportion to the box, so one setting wrecks
  // a card and does nothing to a button. The shape stage is a displacement.
  it('shifts corners by pixels rather than by a transform', () => {
    const defs = buildDefsMarkup({ ...marker, cornerTravel: 6 });
    const fill = defs.match(/<filter id="lt-sketch-fill-0"(.*?)<\/filter>/)![1];
    // A map's `scale` is the full swing, so a 6px dial is written as 12.
    expect(fill).toContain('scale="12"');
    expect(fill.indexOf('result="box"')).toBeLessThan(fill.indexOf('in="box"'));
    expect(buildStylesheet(marker)).not.toContain('perspective(');
  });

  it('leaves the shape alone when both dials are at zero', () => {
    const off = { ...marker, cornerSpread: 0, cornerTravel: 0 };
    expect(buildStylesheet(off)).toContain('border-radius:inherit;');
    expect(buildStylesheet(off)).not.toContain('--sketch-c1');
    expect(buildDefsMarkup(off)).not.toContain('result="box"');
  });

  // A part is free to name a gradient as its fill. Through `background-color`
  // that was invalid at computed-value time and blanked the surface under the
  // hatch, so the fill goes in the shorthand's last layer, which takes either.
  it('lays the hatch over the fill as a layer, not beside it as a colour', () => {
    const css = buildStylesheet(marker);
    expect(css).toContain('transparent 1.5px 7px),var(--sketch-fill, var(--surface-neutral-lower));');
    expect(css).not.toContain('background-color:var(--sketch-fill');
  });

  it('shades the hatch with a second set of stripes off the first in lean and pitch', () => {
    const css = buildStylesheet(marker);
    const rule = css.match(/\[data-sketch-fill='hatched'\][^{]*\{([^}]*)\}/)![1];
    const stripes = rule.match(/repeating-linear-gradient\(([^,]*),/g)!;
    expect(stripes).toHaveLength(2);
    expect(stripes[0]).toContain('calc(var(--sketch-hatch-angle) + 2deg)');
    expect(rule).toContain('calc(var(--sketch-hatch-ink) * 0.55)');
    expect(rule).toContain('transparent 1px 6.5px)');
  });

  // Hatch ink and outline ink were one variable, so the parts that carry a
  // surface and deliberately draw no outline hatched in nothing.
  it("hatches a part whose outline is transparent in its parent's ink", () => {
    const css = buildStylesheet(marker);
    expect(css).toContain('.card-header{--sketch-fill:var(--card-default-header-surface);'
      + '--sketch-stroke:transparent;--sketch-hatch-color:var(--card-default-border);');
  });

  // Custom properties inherit, so a part that stated no ink of its own would
  // stripe itself in whatever part it sits inside. The indirection, not the
  // colour, so hover still moves it.
  it('states a hatch ink on every part', () => {
    const css = buildStylesheet(marker);
    expect(css).toContain('.card{--sketch-fill:var(--card-default-surface);'
      + '--sketch-stroke:var(--card-default-border);--sketch-hatch-color:var(--sketch-stroke);');
  });

  // The component's own shadow belongs to a rectangle the sketch is no longer
  // drawing, so it is moved onto the layer that draws the real one.
  it('re-casts the shadow on the drawn box', () => {
    const css = buildStylesheet({ ...marker, maskOn: false });
    expect(css).toContain('box-shadow:none !important;');
    expect(css).toContain('box-shadow:var(--sketch-shadow, none);');
    expect(css).toContain('--sketch-shadow:var(--card-default-shadow, none);');
  });

  // A mask's painting area stops at the border box however `mask-clip` is set,
  // so a fill drawn at inset 0 came back cut to a straight-edged rectangle
  // wherever the displacement had carried it out. The box has to be bigger than
  // anything the filter can move, and the paint held to the middle of it.
  it('draws the fill on a box the displacement cannot reach past', () => {
    const css = buildStylesheet(marker);
    const bleed = Number(css.match(/inset:-(\d+)px !important/)![1]);
    expect(bleed).toBeGreaterThan(marker.cornerTravel + marker.fillTravel);
    expect(css).toContain(`padding:${bleed}px;box-sizing:content-box;`);
    expect(css).toContain('background-clip:content-box;');
    // Padding takes the growth back off, so the paint turns where it always did.
    expect(css).toContain(`--sketch-corner-spread, 0px))) + ${bleed}px)`);
  });

  it('leaves the fill on its own box when there is no coverage to clip it', () => {
    const css = buildStylesheet({ ...marker, maskOn: false });
    expect(css).toContain('inset:0 !important');
    expect(css).not.toContain('background-clip:content-box;');
  });

  // A shadow is cast from the border box, and under coverage that box is the
  // bleed, which is not where the drawing is. Wearing it would put a halo the
  // width of the bleed around every card.
  it('drops the fill shadow while the coverage mask is on', () => {
    expect(buildStylesheet(marker)).not.toContain('box-shadow:var(--sketch-shadow, none);');
  });

  // Any clip is a flat rectangle, and a flat rectangle slicing the drawn box is
  // the one shape the effect must never show. Unclipping is the default: the
  // earlier opt-in list missed `.button`, which is most of a page.
  it('gives up the clip on every part but the few that need it', () => {
    const css = buildStylesheet(marker);
    const unclipped = css.match(/:is\(([^)]*)\)\{overflow:visible !important;\}/)![1];
    for (const sel of ['.button.primary', '.card', '.panel', '.notification.info', '.dialog']) {
      expect(unclipped).toContain(sel);
    }
    // Scrollers, a fill bar held to its track, a picture held to its frame.
    for (const sel of ['.codesnippet', '.table-wrapper', '.progress-track', '.image']) {
      expect(unclipped).not.toContain(sel);
    }
  });

  // It cannot follow the displacement, which is a filter with no geometry to
  // clip to, but it can at least turn the same way at the corners.
  it('gives the clip it keeps the same corners as the ink', () => {
    const rule = buildStylesheet(marker)
      .match(/:is\(([^)]*)\)\{border-radius:max\(0px[^}]*\}/)!;
    expect(rule[1]).toContain('.image');
    expect(rule[1]).toContain('.progress-track');
  });

  // A rule is a line. Rounding its ends reads as a mistake rather than a hand.
  it('keeps a hairline square', () => {
    const css = buildStylesheet(marker);
    const rule = css.match(/:is\(\.sd-hairline, \.sketch-rule\)\{([^}]*)\}/)![1];
    expect(rule).toContain('--sketch-corner-spread:0px;');
  });
});

describe('ink pooling', () => {
  // Pooling bulges corners. Left as a plain threshold it instead REPLACED the
  // stroke, and any line thin enough to blur under 7/18 alpha vanished — which
  // pressure made instance-dependent, so edges disappeared at random.
  it('adds to the stroke rather than replacing it', () => {
    const filter = poolFilter(marker, 0);
    expect(filter).toContain('<feMergeNode in="SourceGraphic"/>');
    expect(filter.indexOf('feColorMatrix')).toBeLessThan(filter.indexOf('feMerge'));
  });

  // Against a fixed threshold the same radius meant something different on
  // every line: a 1.25px pencil stroke fell under it past about 1.3 and pooled
  // to nothing. Anchored to the settings alone it still meant something
  // different on every INSTANCE, because pen weight is a cycle: one card came
  // out a wet blur and the next one two clean passes off the same dials.
  it('lands every instance at the same point on its own ramp', () => {
    const looks = [
      marker,
      SKETCH_PRESETS.whiteboard,
      { ...marker, strokeWidth: 1.25, pooling: 4, strokeInk: 1, pressure: 0.3 },
      { ...marker, strokeWidth: 0.5, pooling: 6, strokeInk: 0.3, pressure: 0.7 },
    ];
    for (const look of looks) {
      const drawn = instances(look);
      expect(drawn).toHaveLength(11);
      for (const inst of drawn) {
        const respond = poolRamp(look, inst.bank);
        expect(respond(straightRun(inst.width, look.pooling, inst.ink))).toBeCloseTo(0.2, 2);
      }
    }
  });

  // The ramp has to leave room above a straight run, or a corner has nothing to
  // bulge into and pooling is just a fatter line.
  it('fills solid where two runs of the line sum', () => {
    for (const inst of instances(marker)) {
      const crossing = Math.min(1, 2 * straightRun(inst.width, marker.pooling, inst.ink));
      expect(poolRamp(marker, inst.bank)(crossing)).toBeGreaterThan(1);
    }
  });

  it('leaves the chain alone when the dial is off', () => {
    expect(buildDefsMarkup({ ...marker, pooling: 0 })).not.toContain('lt-sketch-pool-0');
    expect(buildStylesheet({ ...marker, pooling: 0 })).toContain('--sketch-pool:opacity(1)');
  });
});

describe('along-stroke pressure', () => {
  // It used to be a CSS mask on the stroke layer, sitting still in the
  // element's own coordinates while the shape stage carried the line out from
  // under it. Past a certain travel the line no longer met the patches the mask
  // had been cut for and whole edges were erased instead of stretches of them,
  // which is what capped the shape dial.
  it('thins the ink inside the filter, ahead of the stage that moves it', () => {
    const stroke = buildDefsMarkup(marker)
      .match(/<filter id="lt-sketch-stroke-0"([\s\S]*?)<\/filter>/)![1];
    expect(stroke.indexOf('result="inked"')).toBeLessThan(stroke.indexOf('result="box"'));
    expect(stroke).toContain('type="luminanceToAlpha"');
    expect(stroke).toContain('<feComposite in="SourceGraphic" in2="pm" operator="in"');
  });

  // The fill carries its own coverage mask; thinning it here would double up.
  it('leaves the fill bank alone', () => {
    const fill = buildDefsMarkup(marker).match(/<filter id="lt-sketch-fill-0"([\s\S]*?)<\/filter>/)![1];
    expect(fill).not.toContain('result="inked"');
  });

  // In element space it was one field for every component; in filter space it
  // is the bank's own seed, so neighbours still thin differently.
  it('varies the thinning per seed bank', () => {
    const defs = buildDefsMarkup(marker);
    const seedOf = (id: string) =>
      defs.match(new RegExp(`<filter id="${id}"[\\s\\S]*?seed="(\\d+)" result="pn"`))![1];
    expect(seedOf('lt-sketch-stroke-0')).not.toEqual(seedOf('lt-sketch-stroke-1'));
  });

  it('emits no thinning stage at all when the dial is off', () => {
    expect(buildDefsMarkup({ ...marker, pressureMod: 0 })).not.toContain('result="inked"');
    expect(buildStylesheet({ ...marker, pressureMod: 0 })).not.toContain('--sketch-press-image');
  });
});

describe('ink density', () => {
  const wet = { ...marker, strokeInk: 0.5 };

  // A marker is translucent and a pen is not: below full ink the retrace pass
  // shows through the first one and the overlap darkens.
  it('carries the ink on the colour so overlapping passes build up', () => {
    const css = buildStylesheet(wet);
    const passes = [...css.matchAll(/(?:border-color|drop-shadow\()[^;]*color-mix[^;]*/g)];
    expect(passes.length).toBe(2);
    // Per-instance, off the same cycle that carries stroke weight: a harder
    // press lays down a wider AND a wetter line.
    for (const p of passes) expect(p[0]).toContain('var(--sketch-jw, 0)');
  });

  // Pooling thresholds alpha to 1. Left there it flattened a translucent nib
  // back to a solid one, and the ink dial did nothing under any preset that
  // pooled — which was every marker.
  it('does not let pooling flatten a translucent nib', () => {
    const filter = poolFilter(wet, 0);
    expect(filter).toContain(`<feFuncA type="linear" slope="${instances(wet)[0].ink.toFixed(3)}"/>`);
    expect(filter.indexOf('feComponentTransfer')).toBeLessThan(filter.indexOf('feMerge'));
  });

  it('leaves the colour untouched at full ink', () => {
    const dry = buildStylesheet({ ...marker, strokeInk: 1 });
    expect(dry).toContain('border-color:var(--sketch-stroke, var(--border-neutral));');
    expect(poolFilter({ ...marker, strokeInk: 1 }, 0)).not.toContain('feComponentTransfer');
  });
});

describe('claiming the pseudo-elements', () => {
  // Button parks a hover shimmer on ::before at left:-100% and slides it to
  // left:100% over 0.5s, from a rule that outweighs the layer's. Unclaimed,
  // the fill wipes across on hover and again when the effect switches on.
  it('cancels any component transition or offset on the layers it takes over', () => {
    const css = buildStylesheet(marker);
    const layers = [...css.matchAll(/\{([^{}]*content:''[^{}]*)\}/g)].map((m) => m[1]);
    expect(layers.length).toBeGreaterThanOrEqual(2);
    for (const decl of layers) {
      // The fill sits on a box the bleed grows, so the inset it states is its
      // own; what matters is that it beats whatever the component set.
      expect(decl).toMatch(/inset:[^;]* !important/);
      expect(decl).toContain('transition:none !important');
    }
  });
});
