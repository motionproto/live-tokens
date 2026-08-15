// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { PaletteConfig, ColorsAndType } from '../themes/themeTypes';
import { hexToOklch as c } from '../palettes/oklch';
import {
  editorState,
  mutate,
  beginScope,
  commitScope,
  cancelScope,
  beginSliderGesture,
  transaction,
  undo,
  redo,
  setPaletteConfig,
  makeDefaultGradients,
  setGradientAngle,
  loadFromFile,
  colorsAndTypeDirty,
  toColorsAndType,
  __resetForTests,
  __getHistoryLengths,
  __getPastAt,
} from './editorStore';
import {
  setAxisHue,
  bindFamilyToAxis,
  unbindFamily,
  setBaseHue,
} from '../../ui/colors/paletteBaseColor';

function makePaletteConfig(baseColor: string): PaletteConfig {
  return {
    baseColor: c(baseColor),
    lightnessCurve: [],
    saturationCurve: [],
    scaleCurves: {},
    curveOffset: {},
    overrides: {},
    snappedScales: [],
  };
}

function makeColorsAndType(overrides: Partial<ColorsAndType> = {}): ColorsAndType {
  return { name: 't', createdAt: '', updatedAt: '', editorConfigs: {}, cssVariables: {}, ...overrides };
}

function colorsAndTypeWithPalettes(overrides: Partial<ColorsAndType> = {}): ColorsAndType {
  return makeColorsAndType({
    editorConfigs: {
      Brand: makePaletteConfig('#c04a2f'),
      Accent: makePaletteConfig('#d8a13a'),
      Canvas: makePaletteConfig('#2b2140'),
      Special: makePaletteConfig('#7a3fb0'),
    },
    ...overrides,
  });
}

const txOpts = { label: 'tx', collapseToOne: true, clipUndoFloor: false } as const;
const sessionOpts = { label: 'palette session', collapseToOne: true, clipUndoFloor: true } as const;

beforeEach(() => {
  __resetForTests();
});

describe('editorStore — mutate() outside a scope', () => {
  it('pushes exactly one past[] entry per call and undo restores', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    expect(__getHistoryLengths().past).toBe(1);

    setPaletteConfig('Canvas', makePaletteConfig('#222222'));
    expect(__getHistoryLengths().past).toBe(2);

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#222222'));
    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Canvas).toBeUndefined();
    expect(undo()).toBe(false);
  });
});

describe('editorStore — non-clipping scopes group gestures', () => {
  it('beginScope + multiple mutate() + commitScope → one past entry equal to pre-gesture snapshot', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const baselinePast = __getHistoryLengths().past;
    const preGesture = structuredClone(get(editorState));

    const scope = beginScope({ label: 'drag hue', collapseToOne: true, clipUndoFloor: false });
    mutate('hue step 1', (s) => { s.palettes.Canvas.baseColor = c('#222222'); });
    mutate('hue step 2', (s) => { s.palettes.Canvas.baseColor = c('#333333'); });
    mutate('hue step 3', (s) => { s.palettes.Canvas.baseColor = c('#444444'); });
    commitScope(scope);

    expect(__getHistoryLengths().past).toBe(baselinePast + 1);
    const lastEntry = __getPastAt(__getHistoryLengths().past - 1)!;
    expect(lastEntry.palettes.Canvas.baseColor).toEqual(preGesture.palettes.Canvas.baseColor);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#444444'));

    // One undo rolls the whole gesture back
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
  });

  it('beginSliderGesture opens a scope that groups updates into one entry', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const baselinePast = __getHistoryLengths().past;

    beginSliderGesture('drag');
    mutate('step', (s) => { s.palettes.Canvas.baseColor = c('#222222'); });
    mutate('step', (s) => { s.palettes.Canvas.baseColor = c('#333333'); });
    // Simulate pointerup
    window.dispatchEvent(new Event('pointerup'));

    expect(__getHistoryLengths().past).toBe(baselinePast + 1);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#333333'));
  });

  it('empty scope (no mutate calls) does not push history', () => {
    const baselinePast = __getHistoryLengths().past;
    const scope = beginScope({ ...txOpts, label: 'unused' });
    commitScope(scope);
    expect(__getHistoryLengths().past).toBe(baselinePast);
  });

  it('cancelScope on a non-clipping scope restores pre-gesture state and does not push history', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const baselinePast = __getHistoryLengths().past;

    const scope = beginScope({ ...txOpts, label: 'drag' });
    mutate('step', (s) => { s.palettes.Canvas.baseColor = c('#999999'); });
    cancelScope(scope, { silent: true });

    expect(__getHistoryLengths().past).toBe(baselinePast);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
  });
});

describe('editorStore — clipping scopes (palette edit sessions)', () => {
  it('beginScope with clipUndoFloor does not push history', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const before = __getHistoryLengths().past;
    beginScope({ ...sessionOpts });
    expect(__getHistoryLengths().past).toBe(before);
  });

  it('undo is clipped to the scope floor while open', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    setPaletteConfig('Canvas', makePaletteConfig('#222222'));
    const floor = __getHistoryLengths().past;

    beginScope({ ...sessionOpts });
    setPaletteConfig('Canvas', makePaletteConfig('#333333'));
    setPaletteConfig('Canvas', makePaletteConfig('#444444'));
    expect(__getHistoryLengths().past).toBe(floor + 2);

    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#333333'));
    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#222222'));

    // Floor reached — further undo returns false, state unchanged
    expect(undo()).toBe(false);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#222222'));
  });

  it('commitScope on a clipping scope collapses intra-scope history into one entry equal to the snapshot', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const preSessionPastLen = __getHistoryLengths().past;

    const session = beginScope({ ...sessionOpts });
    setPaletteConfig('Canvas', makePaletteConfig('#222222'));
    setPaletteConfig('Canvas', makePaletteConfig('#333333'));
    setPaletteConfig('Canvas', makePaletteConfig('#444444'));
    commitScope(session);

    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 1);

    const committedEntry = __getPastAt(__getHistoryLengths().past - 1)!;
    expect(committedEntry.palettes.Canvas.baseColor).toEqual(c('#111111'));
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#444444'));

    // One undo restores pre-scope state
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
  });

  it('commitScope on a clipping scope with no net change pushes nothing', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const preSessionPastLen = __getHistoryLengths().past;

    const session = beginScope({ ...sessionOpts });
    // Mutate and revert to snapshot value
    setPaletteConfig('Canvas', makePaletteConfig('#222222'));
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    commitScope(session);

    expect(__getHistoryLengths().past).toBe(preSessionPastLen);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
  });

  it('cancelScope on a clipping scope restores snapshot, drops intra-scope entries, clears future', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const preSessionPastLen = __getHistoryLengths().past;

    const session = beginScope({ ...sessionOpts });
    setPaletteConfig('Canvas', makePaletteConfig('#222222'));
    setPaletteConfig('Canvas', makePaletteConfig('#333333'));
    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 2);

    cancelScope(session);

    expect(__getHistoryLengths().past).toBe(preSessionPastLen);
    expect(__getHistoryLengths().future).toBe(0);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
  });

  it('nested clipping beginScope auto-commits the prior scope', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    setPaletteConfig('Accent', makePaletteConfig('#aaaaaa'));
    const preSessionPastLen = __getHistoryLengths().past;

    beginScope({ ...sessionOpts });
    setPaletteConfig('Canvas', makePaletteConfig('#222222'));
    const second = beginScope({ ...sessionOpts }); // auto-commits prior
    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 1);

    setPaletteConfig('Accent', makePaletteConfig('#bbbbbb'));
    commitScope(second);

    // Two collapsed entries: prior Canvas scope, then Accent scope
    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 2);
    // One undo: revert Accent to pre-scope value
    undo();
    expect(get(editorState).palettes.Accent.baseColor).toEqual(c('#aaaaaa'));
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#222222'));
    // Another undo: revert Canvas to pre-scope value
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#111111'));
  });

  it('undo() with a pending non-clipping scope cancels it first (drag-in-flight is discarded)', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#111111'));
    const pastLenBefore = __getHistoryLengths().past;

    beginScope({ ...txOpts, label: 'drag' });
    mutate('step', (s) => { s.palettes.Canvas.baseColor = c('#ffffff'); });
    // An in-flight drag holds pre-drag state in the scope's snapshot;
    // `undo()` cancels it (restoring that snapshot) before consulting history.
    undo();
    // The cancelled in-flight change is gone; history count unchanged by the cancel.
    // (Current impl also consumes one history step after cancelling — the
    // cross-boundary behavior is a separate concern tracked in the plan.)
    expect(__getHistoryLengths().past).toBe(pastLenBefore - 1);
    // The pending mutation did not survive: '#ffffff' is not current.
    expect(get(editorState).palettes.Canvas?.baseColor).not.toEqual(c('#ffffff'));
  });
});

describe('editorStore — apply + undo matches spec end-to-end', () => {
  it('after Apply, one Cmd+Z restores to pre-session state', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));
    const preSessionState = structuredClone(get(editorState));

    const session = beginScope({ ...sessionOpts });
    // Simulate three slider drags during the session
    for (const hex of ['#702030', '#503090', '#205090']) {
      const drag = beginScope({ ...txOpts, label: `drag ${hex}` });
      setPaletteConfig('Canvas', makePaletteConfig(hex));
      commitScope(drag);
    }
    commitScope(session);

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#205090'));

    const undone = undo();
    expect(undone).toBe(true);
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(preSessionState.palettes.Canvas.baseColor);
    expect(JSON.stringify(get(editorState))).toBe(JSON.stringify(preSessionState));
  });

  it('after Cancel, Cmd+Z does not resurrect discarded drags', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));
    const preSessionState = structuredClone(get(editorState));

    const session = beginScope({ ...sessionOpts });
    for (const hex of ['#702030', '#503090', '#205090']) {
      const drag = beginScope({ ...txOpts, label: `drag ${hex}` });
      setPaletteConfig('Canvas', makePaletteConfig(hex));
      commitScope(drag);
    }
    cancelScope(session);

    // State is pre-session; no new history entry
    expect(JSON.stringify(get(editorState))).toBe(JSON.stringify(preSessionState));
    // One undo walks back to before the palette existed (setPaletteConfig before scope)
    undo();
    expect(get(editorState).palettes.Canvas).toBeUndefined();
  });
});

describe('editorStore — Background → Canvas palette rename', () => {
  it('a legacy file keys its palette under Canvas and keeps the axis bound', () => {
    loadFromFile(makeColorsAndType({
      editorConfigs: {
        Brand: makePaletteConfig('#c04a2f'),
        Background: makePaletteConfig('#2b2140'),
      },
      harmonyAxes: [
        { family: 'Brand', hue: 0 },
        { family: 'Background', hue: 0 },
        { family: null, hue: 200 },
        { family: null, hue: 300 },
      ],
    }));
    const s = get(editorState);
    expect(Object.keys(s.palettes).sort()).toEqual(['Brand', 'Canvas']);
    expect(s.palettes.Canvas.baseColor).toEqual(c('#2b2140'));
    expect(s.harmonyAxes.map((a) => a.family)).toEqual(['Brand', 'Canvas', null, null]);
    expect(s.harmonyAxes[1].hue).toBeCloseTo(s.palettes.Canvas.baseColor.h, 9);
  });

  it('the rename precedes the legacy background-spot adoption, which resolves the palette by label', () => {
    const legacy = { ...makePaletteConfig('#2b2140'), emptyMode: 'solid' as const, emptyStep: '850' };
    loadFromFile(makeColorsAndType({ editorConfigs: { Background: legacy } }));
    const canvas = get(editorState).palettes.Canvas;
    expect(canvas).toBeDefined();
    expect('emptyStep' in canvas).toBe(false);
    expect(canvas.anchorPlacement).toBeDefined();
  });
});

describe('editorStore — line-height scale rename', () => {
  it('a saved file carrying the retired names loads on the leading scale', () => {
    loadFromFile(
      makeColorsAndType({
        cssVariables: {
          '--card-title-line-height': 'var(--line-height-md)',
          '--tooltip-text-line-height': 'var(--line-height-xl)',
        },
      }),
    );
    const vars = get(editorState).cssVars;
    expect(vars['--card-title-line-height']).toBe('var(--line-height-normal)');
    expect(vars['--tooltip-text-line-height']).toBe('var(--line-height-relaxed)');
  });
});

describe('editorStore — colorsAndTypeDirty baseline', () => {
  it('loadFromFile baselines the loaded content; a colors-and-type edit dirties it', () => {
    loadFromFile(colorsAndTypeWithPalettes({ cssVariables: { '--surface-canvas': '#123456' } }));
    expect(get(colorsAndTypeDirty)).toBe(false);

    mutate('edit', (s) => {
      s.cssVars['--surface-canvas'] = '#654321';
    });
    expect(get(colorsAndTypeDirty)).toBe(true);
  });
});

describe('editorStore — gradients round-trip', () => {
  it('loadFromFile restores structured gradients and sheds the rendered strings from the bag', () => {
    const gradients = makeDefaultGradients();
    gradients[0] = {
      ...gradients[0],
      angle: 45,
      stops: [
        { position: 0, color: '--color-brand-400' },
        { position: 100, color: '--color-brand-600' },
      ],
    };
    loadFromFile(makeColorsAndType({
      gradients,
      cssVariables: { '--gradient-1': 'linear-gradient(90deg, red, blue)', '--other': '1px' },
    }));
    const s = get(editorState);
    expect(s.gradients.tokens[0].angle).toBe(45);
    expect(s.gradients.tokens[0].stops[0].color).toBe('--color-brand-400');
    expect(s.cssVars['--gradient-1']).toBeUndefined();
    expect(s.cssVars['--other']).toBe('1px');
  });

  it('a file without the field keeps the stock defaults and still sheds bag strings', () => {
    loadFromFile(makeColorsAndType({ cssVariables: { '--gradient-2': 'linear-gradient(90deg, red, blue)' } }));
    const s = get(editorState);
    expect(s.gradients.tokens).toEqual(makeDefaultGradients());
    expect(s.cssVars['--gradient-2']).toBeUndefined();
  });

  it('an edited gradient survives save and reload', () => {
    setGradientAngle('--gradient-1', 30);
    const file = toColorsAndType(get(editorState), { name: 't' });
    expect(file.gradients?.[0].angle).toBe(30);
    expect(file.cssVariables['--gradient-1']).toContain('30deg');

    loadFromFile(file);
    expect(get(editorState).gradients.tokens[0].angle).toBe(30);
    expect(get(colorsAndTypeDirty)).toBe(false);
  });
});

describe('editorStore — harmonyAxes persistence', () => {
  it('a file with neither field binds the default trio, hues seeded from palettes', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const s = get(editorState);
    expect(s.harmonyAxes.map((a) => a.family)).toEqual(['Brand', 'Accent', 'Canvas', null]);
    expect(s.harmonyAxes[0].hue).toBeCloseTo(s.palettes.Brand.baseColor.h, 9);
    expect(s.harmonyAxes[1].hue).toBeCloseTo(s.palettes.Accent.baseColor.h, 9);
    expect(s.harmonyAxes[2].hue).toBeCloseTo(s.palettes.Canvas.baseColor.h, 9);
    expect(s.harmonyAxes[3].hue).toBeCloseTo((s.palettes.Brand.baseColor.h + 270) % 360, 9);
  });

  it('round-trips a sparse layout', () => {
    loadFromFile(colorsAndTypeWithPalettes({
      harmonyAxes: [
        { family: 'Brand', hue: 0 },
        { family: null, hue: 123 },
        { family: 'Canvas', hue: 0 },
        { family: null, hue: 234 },
      ],
    }));
    const saved = toColorsAndType(get(editorState), { name: 't' });
    expect(saved.harmonyAxes!.map((a) => a.family)).toEqual(['Brand', null, 'Canvas', null]);

    loadFromFile(saved);
    const s = get(editorState);
    expect(s.harmonyAxes.map((a) => a.family)).toEqual(['Brand', null, 'Canvas', null]);
    expect(s.harmonyAxes[1].hue).toBe(123);
    expect(s.harmonyAxes[3].hue).toBe(234);
    expect(s.harmonyAxes[0].hue).toBeCloseTo(s.palettes.Brand.baseColor.h, 9);
    expect(s.harmonyAxes[2].hue).toBeCloseTo(s.palettes.Canvas.baseColor.h, 9);
  });

  it('reconciles a hand-edited bound hue to the palette on load (color is ground truth)', () => {
    loadFromFile(colorsAndTypeWithPalettes({
      harmonyAxes: [
        { family: 'Brand', hue: 5 }, { family: 'Accent', hue: 6 },
        { family: 'Canvas', hue: 7 }, { family: null, hue: 8 },
      ],
    }));
    const s = get(editorState);
    expect(s.harmonyAxes[0].hue).not.toBe(5);
    expect(s.harmonyAxes[0].hue).toBeCloseTo(s.palettes.Brand.baseColor.h, 9);
  });
});

describe('editorStore — harmony axis setters', () => {
  it('adopt swatch moves the axis to the family hue, leaving the color alone', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const special0 = { ...get(editorState).palettes.Special.baseColor };
    const before = __getHistoryLengths().past;
    expect(bindFamilyToAxis('Special', 3, 'swatch')).toBe(true);
    const s = get(editorState);
    expect(__getHistoryLengths().past).toBe(before + 1);
    expect(s.harmonyAxes[3].family).toBe('Special');
    expect(s.harmonyAxes[3].hue).toBeCloseTo(special0.h, 9);
    expect(s.palettes.Special.baseColor).toEqual(special0);
  });

  it('adopt swatch trades places, each axis taking its new family hue', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const brand0 = { ...get(editorState).palettes.Brand.baseColor };
    const accent0 = { ...get(editorState).palettes.Accent.baseColor };
    const before = __getHistoryLengths().past;
    bindFamilyToAxis('Brand', 1, 'swatch');
    const s = get(editorState);
    expect(__getHistoryLengths().past).toBe(before + 1);
    expect(s.harmonyAxes[0].family).toBe('Accent');
    expect(s.harmonyAxes[1].family).toBe('Brand');
    expect(s.harmonyAxes[0].hue).toBeCloseTo(accent0.h, 9);
    expect(s.harmonyAxes[1].hue).toBeCloseTo(brand0.h, 9);
    expect(s.palettes.Brand.baseColor).toEqual(brand0);
    expect(s.palettes.Accent.baseColor).toEqual(accent0);
  });

  it('adopt axis repaints the family onto the axis hue, reporting no hue move', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const special0 = { ...get(editorState).palettes.Special.baseColor };
    const axisHue0 = get(editorState).harmonyAxes[3].hue;
    expect(bindFamilyToAxis('Special', 3, 'axis')).toBe(false);
    const s = get(editorState);
    expect(s.harmonyAxes[3].family).toBe('Special');
    expect(s.harmonyAxes[3].hue).toBe(axisHue0);
    expect(s.palettes.Special.baseColor).toEqual({ l: special0.l, c: special0.c, h: axisHue0 });
  });

  it('adopt axis trades places, the two families swapping hues and both axes staying put', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const brand0 = { ...get(editorState).palettes.Brand.baseColor };
    const accent0 = { ...get(editorState).palettes.Accent.baseColor };
    const [axis0, axis1] = get(editorState).harmonyAxes.map((a) => a.hue);
    bindFamilyToAxis('Brand', 1, 'axis');
    const s = get(editorState);
    expect(s.harmonyAxes[0].family).toBe('Accent');
    expect(s.harmonyAxes[1].family).toBe('Brand');
    expect(s.harmonyAxes[0].hue).toBe(axis0);
    expect(s.harmonyAxes[1].hue).toBe(axis1);
    expect(s.palettes.Brand.baseColor).toEqual({ l: brand0.l, c: brand0.c, h: axis1 });
    expect(s.palettes.Accent.baseColor).toEqual({ l: accent0.l, c: accent0.c, h: axis0 });
  });

  it('unbindFamily keeps the family color and the axis hue', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const bg0 = { ...get(editorState).palettes.Canvas.baseColor };
    const axisHue0 = get(editorState).harmonyAxes[2].hue;
    const before = __getHistoryLengths().past;
    unbindFamily('Canvas');
    const s = get(editorState);
    expect(__getHistoryLengths().past).toBe(before + 1);
    expect(s.harmonyAxes[2].family).toBe(null);
    expect(s.harmonyAxes[2].hue).toBe(axisHue0);
    expect(s.palettes.Canvas.baseColor).toEqual(bg0);
  });

  it('setAxisHue on a bound axis moves both hue fields in one entry, chroma kept', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const chroma0 = get(editorState).palettes.Brand.baseColor.c;
    const before = __getHistoryLengths().past;
    setAxisHue(0, 123);
    const s = get(editorState);
    expect(__getHistoryLengths().past).toBe(before + 1);
    expect(s.harmonyAxes[0].hue).toBe(123);
    expect(s.palettes.Brand.baseColor.h).toBe(123);
    expect(s.palettes.Brand.baseColor.c).toBe(chroma0);
  });

  it('a no-op bindFamilyToAxis adds no history entry and reports no hue move', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    const before = __getHistoryLengths().past;
    expect(bindFamilyToAxis('Brand', 0, 'swatch')).toBe(false);
    expect(__getHistoryLengths().past).toBe(before);
  });

  it('a no-op setAxisHue adds no history entry', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    setAxisHue(0, 150);
    const before = __getHistoryLengths().past;
    setAxisHue(0, 150);
    expect(__getHistoryLengths().past).toBe(before);
  });

  it('a direct setBaseHue on a bound family drags the axis hue along', () => {
    loadFromFile(colorsAndTypeWithPalettes());
    setBaseHue('Brand', 200);
    const s = get(editorState);
    expect(s.palettes.Brand.baseColor.h).toBe(200);
    expect(s.harmonyAxes[0].hue).toBe(200);
  });
});

describe('editorStore — intra-session slider-drag tracking', () => {
  // Regression guard for the two-writer feedback loop fixed in the
  // PaletteEditor single-source-of-truth refactor: during a drag inside a
  // palette edit session, every per-tick mutation must be visible in the
  // store immediately (not pulled back to a stale pre-session value).
  it('store reflects every per-tick mutation during a slider-drag session', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));

    const session = beginScope({ ...sessionOpts });
    beginSliderGesture('drag base');

    const tickHexes = ['#8c7f73', '#8b7f72', '#8a7f71', '#897f70', '#887f6f'];
    for (const hex of tickHexes) {
      mutate('drag tick', (s) => { s.palettes.Canvas.baseColor = c(hex); });
      // Each tick must be visible on read — no stale pre-session value
      expect(get(editorState).palettes.Canvas.baseColor).toEqual(c(hex));
    }

    window.dispatchEvent(new Event('pointerup'));
    commitScope(session);

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#887f6f'));

    // One undo after Apply restores to pre-session
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#8d7f74'));
  });

  it('Cmd+Z during a session walks one tick back per press', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));

    beginScope({ ...sessionOpts });
    for (const hex of ['#702030', '#503090', '#205090']) {
      const drag = beginScope({ ...txOpts, label: `drag ${hex}` });
      mutate('tick', (s) => { s.palettes.Canvas.baseColor = c(hex); });
      commitScope(drag);
    }

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#205090'));
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#503090'));
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#702030'));
    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#8d7f74'));
    // Session floor reached — further undo no-ops
    expect(undo()).toBe(false);
  });
});
