<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { hexToOklch, oklchToHex, gamutClamp } from '../lib/oklch';
  import { type CurveAnchor, makeAnchor, sampleCurve, lightnessCurveConfig, saturationCurveConfig, textLightnessCurveConfig } from './curveEngine';
  import ColorEditPanel from './ColorEditPanel.svelte';
  import OverridesPanel from './palette/OverridesPanel.svelte';
  import GradientStopEditor from './palette/GradientStopEditor.svelte';
  import ScaleCurveEditor from './palette/ScaleCurveEditor.svelte';
  import PaletteBase from './palette/PaletteBase.svelte';
  import type { PaletteConfig, GradientStyle, GradientStop } from '../lib/themeTypes';
  import { editorState, mutate, setPaletteConfig, beginSliderGesture, beginScope, commitScope, cancelScope, type Scope } from '../lib/editorStore';
  import { scaleToCssVar } from '../lib/paletteDerivation';
  import { showCopyPopover } from '../lib/copyPopover';
  import { get } from 'svelte/store';

  /** Mid-gray fallback used when no base colour or computed gray-500 is available. */
  const GRAY_FALLBACK = '#808080';

  export let label: string;
  export let initialColor: string = GRAY_FALLBACK;
  export let mode: 'chromatic' | 'gray' = 'chromatic';
  export let cssNamespace: string | null = null;
  export let emptySelector: boolean = false;

  // --- Store-sourced config (single source of truth) ---
  //
  // All persistent palette state lives in `$editorState.palettes[label]`.
  // Local `$:` derivations below pull named fields with defaults; every
  // handler writes via `edit()` / `patchPalette()` so the store is the only
  // writer. No `let` mirrors, no round-trip sync reactives.
  //
  // The defaults fall back only when palettes[label] is undefined (brand-new
  // install, never seeded). Production seeds via themeInit → seedPalettesFromTheme.
  $: paletteConfig = $editorState.palettes[label];
  $: baseColor = paletteConfig?.baseColor ?? initialColor;
  $: tintHue = paletteConfig?.tintHue ?? 240;
  $: tintChroma = paletteConfig?.tintChroma ?? DEFAULT_TINT_CHROMA;
  $: lightnessCurve = paletteConfig?.lightnessCurve ?? DEFAULT_PALETTE_LIGHTNESS();
  $: saturationCurve = paletteConfig?.saturationCurve ?? DEFAULT_PALETTE_SATURATION();
  $: grayLightnessCurve = paletteConfig?.grayLightnessCurve ?? DEFAULT_GRAY_LIGHTNESS();
  $: graySaturationCurve = paletteConfig?.graySaturationCurve ?? DEFAULT_GRAY_SATURATION();
  $: scaleCurves = paletteConfig?.scaleCurves ?? defaultScaleCurvesObject();
  $: curveOffset = paletteConfig?.curveOffset ?? { lightness: 0, saturation: 0 };
  $: overrides = paletteConfig?.overrides ?? {};
  $: snappedScales = new Set(paletteConfig?.snappedScales ?? []);
  $: anchorToBase = paletteConfig?.anchorToBase ?? true;
  $: emptyMode = paletteConfig?.emptyMode ?? 'solid';
  $: emptyStep = paletteConfig?.emptyStep ?? '850';
  $: gradientStyle = paletteConfig?.gradientStyle ?? 'linear';
  $: gradientAngle = paletteConfig?.gradientAngle ?? 180;
  $: gradientReverse = paletteConfig?.gradientReverse ?? false;
  $: gradientStops = paletteConfig?.gradientStops ?? [
    { position: 0, paletteLabel: '800' },
    { position: 100, paletteLabel: '950' },
  ];
  $: gradientSize = paletteConfig?.gradientSize ?? 'page';

  function defaultPaletteConfig(): PaletteConfig {
    return {
      baseColor: initialColor,
      tintHue: 240,
      tintChroma: DEFAULT_TINT_CHROMA,
      lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
      saturationCurve: DEFAULT_PALETTE_SATURATION(),
      grayLightnessCurve: DEFAULT_GRAY_LIGHTNESS(),
      graySaturationCurve: DEFAULT_GRAY_SATURATION(),
      scaleCurves: defaultScaleCurvesObject(),
      curveOffset: { lightness: 0, saturation: 0 },
      overrides: {},
      snappedScales: [],
      anchorToBase: true,
    };
  }

  function defaultScaleCurvesObject() {
    return {
      Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
      Borders: { lightness: defaultScaleCurves.Borders.lightness(), saturation: defaultScaleCurves.Borders.saturation() },
      Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() },
    };
  }

  function edit<K extends keyof PaletteConfig>(field: K, value: PaletteConfig[K]): void {
    mutate(`${label}: ${String(field)}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = defaultPaletteConfig();
      (s.palettes[label] as any)[field] = value;
    });
  }

  function patchPalette(patch: Partial<PaletteConfig>, historyLabel: string): void {
    mutate(`${label}: ${historyLabel}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = defaultPaletteConfig();
      Object.assign(s.palettes[label], patch);
    });
  }

  // --- Transient UI state (not persisted; not in PaletteConfig) ---
  let lockedLightnessIdx: number | null = null;
  let lockedSaturationIdx: number | null = null;

  // Handle for the open palette edit scope: a clipping scope (clipUndoFloor:
  // true) bracketing one panel-open → confirm/cancel cycle. Held at component
  // scope so the inline header-swatch handlers and the function handlers
  // share the same handle for commitScope/cancelScope.
  let paletteEditScope: Scope | null = null;

  function stopColor(stop: GradientStop, pc: typeof paletteComputed): string {
    const ps = pc?.find(p => p.label === stop.paletteLabel);
    return ps ? ps.effective : '#000000';
  }

  let gradientColorStops = '';
  let gradientCssValue = '';
  let gradientBarPreview = '';

  function onEmptyModeChange(e: Event) {
    edit('emptyMode', (e.currentTarget as HTMLInputElement).checked ? 'gradient' : 'solid');
  }

  // --- Gray mode ---

  interface GrayStep {
    label: string;
    hue: number;
    saturation: number;
    lightness: number;
  }

  const graySteps: GrayStep[] = [
    { label: '100', hue: 240, saturation: 5,  lightness: 92 },
    { label: '200', hue: 220, saturation: 13, lightness: 84 },
    { label: '300', hue: 216, saturation: 12, lightness: 72 },
    { label: '400', hue: 240, saturation: 5,  lightness: 61 },
    { label: '500', hue: 240, saturation: 5,  lightness: 50 },
    { label: '600', hue: 240, saturation: 5,  lightness: 42 },
    { label: '700', hue: 240, saturation: 5,  lightness: 34 },
    { label: '800', hue: 240, saturation: 10, lightness: 25 },
    { label: '850', hue: 229, saturation: 20, lightness: 18 },
    { label: '900', hue: 240, saturation: 30, lightness: 10 },
    { label: '950', hue: 229, saturation: 34, lightness: 3 },
  ];

  let grayEditorOpen = false;
  let showDerived = false;

  // --- Palette curve editors (lightness + saturation) ---
  let paletteEditorOpen = false;

  // Default curve anchors (used for initial state and reset)
  const DEFAULT_PALETTE_LIGHTNESS = () => [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];
  const DEFAULT_PALETTE_SATURATION = () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
  const DEFAULT_GRAY_LIGHTNESS = () => [makeAnchor(0, 92, 5), makeAnchor(100, 3, 5)];
  const DEFAULT_GRAY_SATURATION = () => [makeAnchor(0, 20, 30), makeAnchor(100, 20, 30)];

  function setLightnessCurve(a: CurveAnchor[]) { edit('lightnessCurve', a); }
  function setSaturationCurve(a: CurveAnchor[]) { edit('saturationCurve', a); }
  function setGrayLightnessCurve(a: CurveAnchor[]) { edit('grayLightnessCurve', a); }
  function setGraySaturationCurve(a: CurveAnchor[]) { edit('graySaturationCurve', a); }

  // --- Curve offset + clipboard (shared across all curve editors) ---

  function handleOffset(key: string, value: number) {
    edit('curveOffset', { ...curveOffset, [key]: value });
  }

  // Gray step index to curve x-position
  function grayStepToX(index: number): number {
    return graySteps.length > 1 ? (index / (graySteps.length - 1)) * 100 : 50;
  }

  // Base chroma for gray tinting (editable via the color panel's chroma slider)
  const DEFAULT_TINT_CHROMA = 0.04;

  // Snapshots for cancel in gray base editing (avoids lossy hex round-trip)
  let snapshotTintHue: number | null = null;
  let snapshotTintChroma: number | null = null;

  function computeGrayColor(index: number, hue: number, chroma: number = tintChroma): string {
    const xPos = grayStepToX(index);
    const lOff = curveOffset['gray-lightness'] ?? 0;
    const sOff = curveOffset['gray-saturation'] ?? 0;

    const targetL = Math.max(0, Math.min(100, sampleCurve(grayLightnessCurve, xPos) + lOff)) / 100;
    const satMul = Math.max(0, Math.min(2, (sampleCurve(graySaturationCurve, xPos) + sOff) / 100));
    const targetC = chroma * satMul;

    const clamped = gamutClamp(targetL, targetC, hue);
    return oklchToHex(clamped.l, clamped.c, clamped.h);
  }

  function grayStepKey(label: string): string {
    return `gray-${label}`;
  }

  // Reactive map of computed gray colors
  $: grayComputed = (() => {
    const _gl = grayLightnessCurve, _gs = graySaturationCurve, _co = curveOffset, _tc = tintChroma, _th = tintHue;
    return graySteps.map((step, index) => ({
      step,
      index,
      key: grayStepKey(step.label),
      hex: computeGrayColor(index, _th, _tc),
    }));
  })();

  $: grayEffective = (() => {
    const _ed = editingDraft, _ek = editingKey, _ov = overrides;
    return grayComputed.map(g => ({
      ...g,
      effective: (_ek === g.key && _ed !== null) ? _ed : (g.key in _ov) ? _ov[g.key] : g.hex,
    }));
  })();

  // Gray-500 hex — always the computed (curve-derived) value so derived
  // scales (surfaces, borders, text) update in realtime when tint changes.
  $: gray500Hex = mode === 'gray'
    ? (grayComputed.find(g => g.step.label === '500')?.hex ?? GRAY_FALLBACK)
    : baseColor;


  // --- Chromatic palette steps ---

  const paletteStepLightness = [
    { label: '100', lightness: 95 },
    { label: '200', lightness: 88 },
    { label: '300', lightness: 78 },
    { label: '400', lightness: 68 },
    { label: '500', lightness: 57 },
    { label: '600', lightness: 49 },
    { label: '700', lightness: 41 },
    { label: '800', lightness: 32 },
    { label: '850', lightness: 25 },
    { label: '900', lightness: 17 },
    { label: '950', lightness: 8 },
  ];

  function paletteStepKey(label: string): string {
    return `Palette-${label}`;
  }

  function stepIndexToX(index: number): number {
    return (index / (paletteStepLightness.length - 1)) * 100;
  }

  // --- Locked anchor management ---

  let injectedLightness = false;
  let injectedSaturation = false;

  function injectLockedAnchor(curve: CurveAnchor[], x: number, y: number): { curve: CurveAnchor[], idx: number, injected: boolean } {
    const existing = curve.findIndex(a => Math.abs(a.x - x) < 0.5);
    if (existing >= 0) {
      if (curve[existing].x === x && Math.abs(curve[existing].y - y) < 0.01) return { curve, idx: existing, injected: false };
      return { curve: curve.map((a, i) => i === existing ? { ...a, x, y } : a), idx: existing, injected: false };
    }
    let insertAt = curve.findIndex(a => a.x > x);
    if (insertAt < 0) insertAt = curve.length;
    return { curve: [...curve.slice(0, insertAt), makeAnchor(x, y, 15), ...curve.slice(insertAt)], idx: insertAt, injected: true };
  }

  function removeLockedAnchor(curve: CurveAnchor[], idx: number | null): CurveAnchor[] {
    if (idx === null || idx === 0 || idx === curve.length - 1) return curve;
    return curve.filter((_, i) => i !== idx);
  }

  /**
   * Toggle anchorToBase: inject (or remove) the locked 500 anchor in both
   * curves atomically with the flag flip, so one undo reverses the whole
   * thing. Transient `injectedLightness` / `injectedSaturation` remember
   * whether we created the anchor (vs it already existed) so toggle-off
   * doesn't destroy a user-authored anchor. Not persisted — acceptable drift
   * on reload is that a pre-existing anchor would be preserved on toggle-off.
   */
  function setAnchorToBase(next: boolean) {
    if (next === anchorToBase) return;
    if (next) {
      const x500 = stepIndexToX(4);
      const lResult = injectLockedAnchor(lightnessCurve, x500, hexToOklch(baseColor).l * 100);
      const sResult = injectLockedAnchor(saturationCurve, x500, 100);
      injectedLightness = lResult.injected;
      injectedSaturation = sResult.injected;
      patchPalette({
        anchorToBase: true,
        lightnessCurve: lResult.curve,
        saturationCurve: sResult.curve,
      }, 'anchor on');
    } else {
      const lCurr = lightnessCurve;
      const sCurr = saturationCurve;
      const nextL = injectedLightness ? removeLockedAnchor(lCurr, lockedLightnessIdx) : lCurr;
      const nextS = injectedSaturation ? removeLockedAnchor(sCurr, lockedSaturationIdx) : sCurr;
      injectedLightness = false;
      injectedSaturation = false;
      patchPalette({
        anchorToBase: false,
        lightnessCurve: nextL,
        saturationCurve: nextS,
      }, 'anchor off');
    }
  }

  // Derive locked anchor indices from curve shape — no writes to state.
  $: {
    if (anchorToBase) {
      const x500 = stepIndexToX(4);
      const lIdx = lightnessCurve.findIndex(a => Math.abs(a.x - x500) < 0.5);
      lockedLightnessIdx = lIdx >= 0 ? lIdx : null;
      const sIdx = saturationCurve.findIndex(a => Math.abs(a.x - x500) < 0.5);
      lockedSaturationIdx = sIdx >= 0 ? sIdx : null;
    } else {
      lockedLightnessIdx = null;
      lockedSaturationIdx = null;
    }
  }

  /**
   * Keep the locked lightness anchor y in sync with baseColor. Idempotent —
   * only writes when the curve's anchor y differs from the baseColor-derived
   * target. During a baseColor drag (inside a slider transaction) this
   * additional curve edit merges into the same history entry. On undo/redo
   * the curve already has the correct y (they're saved together), so this
   * is a no-op.
   */
  $: if (anchorToBase && lockedLightnessIdx !== null && baseColor) {
    const targetY = hexToOklch(baseColor).l * 100;
    if (lightnessCurve[lockedLightnessIdx] && Math.abs(lightnessCurve[lockedLightnessIdx].y - targetY) > 0.01) {
      edit('lightnessCurve', lightnessCurve.map((a, i) => i === lockedLightnessIdx ? { ...a, y: targetY } : a));
    }
  }

  function computePaletteColor(index: number, base: string): string {
    const { c: baseC, h } = hexToOklch(base);
    const xPos = stepIndexToX(index);

    const targetL = Math.max(0, Math.min(100, sampleCurve(lightnessCurve, xPos) + (curveOffset['lightness'] ?? 0))) / 100;
    const satMul = Math.max(0, Math.min(2, (sampleCurve(saturationCurve, xPos) + (curveOffset['saturation'] ?? 0)) / 100));
    const targetC = baseC * satMul;

    const clamped = gamutClamp(targetL, targetC, h);
    return oklchToHex(clamped.l, clamped.c, clamped.h);
  }

  $: paletteComputed = (() => {
    const _bc = baseColor, _lc = lightnessCurve, _sc = saturationCurve, _co = curveOffset, _ed = editingDraft, _ek = editingKey, _ov = overrides, _ab = anchorToBase;
    return paletteStepLightness.map((ps, index) => {
      const k = paletteStepKey(ps.label);
      const hex = computePaletteColor(index, baseColor);
      const effective = (_ek === k && _ed !== null) ? _ed : (k in _ov) ? _ov[k] : hex;
      return {
        label: ps.label,
        lightness: ps.lightness,
        index,
        key: k,
        hex,
        effective,
      };
    });
  })();

  // Gradient reactives — must follow paletteComputed
  $: {
    const pc = paletteComputed;
    const sorted = [...gradientStops].sort((a, b) => gradientReverse ? b.position - a.position : a.position - b.position);
    gradientColorStops = sorted.map(s => `${stopColor(s, pc)} ${s.position}%`).join(', ');
    gradientBarPreview = `linear-gradient(to right, ${gradientColorStops})`;
    if (emptySelector && emptyMode === 'gradient') {
      switch (gradientStyle) {
        case 'radial': gradientCssValue = `radial-gradient(circle, ${gradientColorStops})`; break;
        case 'conic': gradientCssValue = `conic-gradient(from ${gradientAngle}deg, ${gradientColorStops})`; break;
        default: gradientCssValue = `linear-gradient(${gradientAngle}deg, ${gradientColorStops})`;
      }
    } else {
      gradientCssValue = '';
    }
  }

  function startBaseEdit() {
    if (editingKey === BASE_KEY) { confirmEdit(); return; }
    if (mode === 'gray') {
      editingSnapshot = gray500Hex;
      snapshotTintHue = tintHue;
      snapshotTintChroma = tintChroma;
    } else {
      editingSnapshot = baseColor;
    }
    editingKey = BASE_KEY;
    paletteEditScope = beginScope({ label: 'palette session', collapseToOne: true, clipUndoFloor: true });
  }

  function handlePaletteClick(ps: { label: string; lightness: number; index: number }) {
    const k = paletteStepKey(ps.label);
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computePaletteColor(ps.index, baseColor);
    editingDraft = current;
    editingSnapshot = current;
    editingKey = k;
    paletteEditScope = beginScope({ label: 'palette session', collapseToOne: true, clipUndoFloor: true });
  }

  // --- Scale types ---

  interface Step {
    name: string;
    position: number;
    lightness?: number;
    saturation?: number;
  }

  interface Scale {
    title: string;
    isText: boolean;
    steps: Step[];
  }

  const scales: Scale[] = [
    {
      title: 'Surfaces',
      isText: false,
      steps: [
        { name: 'lowest',  position: -1 },
        { name: 'lower',   position: -2/3 },
        { name: 'low',     position: -1/3 },
        { name: 'default', position: 0 },
        { name: 'high',    position: 1/3 },
        { name: 'higher',  position: 2/3 },
        { name: 'highest', position: 1 },
      ]
    },
    {
      title: 'Borders',
      isText: false,
      steps: [
        { name: 'faint',   position: -1 },
        { name: 'subtle',  position: -0.5 },
        { name: 'default', position: 0 },
        { name: 'medium',  position: 0.5 },
        { name: 'strong',  position: 1 },
      ]
    },
    {
      title: 'Text',
      isText: true,
      steps: [
        { name: 'primary',   position: 0 },
        { name: 'secondary', position: 0 },
        { name: 'tertiary',  position: 0 },
        { name: 'muted',     position: 0 },
        { name: 'disabled',  position: 0 },
      ]
    }
  ];

  // Scales to render in gray mode (varies by namespace)
  $: grayScales = mode === 'gray' ? scales.filter(scale => {
    if (scale.title === 'Surfaces') return true;
    if (scale.title === 'Borders') return true;
    if (scale.title === 'Text') return true;
    return false;
  }) : [];

  // --- Per-scale curve state (Surfaces & Borders) ---

  const defaultScaleCurves: Record<string, { lightness: () => CurveAnchor[]; saturation: () => CurveAnchor[] }> = {
    Surfaces: {
      lightness: () => [makeAnchor(0, 15, 5), makeAnchor(100, 47, 5)],
      saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
    },
    Borders: {
      lightness: () => [makeAnchor(0, 25, 5), makeAnchor(100, 80, 5)],
      saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
    },
    Text: {
      lightness: () => [makeAnchor(0, 120, 30), makeAnchor(100, 55, 30)],
      saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 15, 30)],
    },
  };

  let scaleEditorOpen: Record<string, boolean> = { Surfaces: false, Borders: false, Text: false };

  function toggleScaleEditor(title: string) {
    scaleEditorOpen[title] = !scaleEditorOpen[title];
    scaleEditorOpen = scaleEditorOpen;
  }

  function setScaleCurve(title: string, channel: 'lightness' | 'saturation', a: CurveAnchor[]) {
    const cur = scaleCurves[title] ?? { lightness: defaultScaleCurves[title].lightness(), saturation: defaultScaleCurves[title].saturation() };
    edit('scaleCurves', { ...scaleCurves, [title]: { ...cur, [channel]: a } });
  }

  function getScaleCurveKey(scaleTitle: string, channel: 'lightness' | 'saturation'): string {
    return `${scaleTitle}-${channel}`;
  }

  interface ScaleConfig {
    lightnessLow: number;
    lightnessHigh: number;
    saturation: number;
  }

  function configForScale(title: string): ScaleConfig {
    return { lightnessLow: 0, lightnessHigh: 100, saturation: 100 };
  }

  let editingKey: string | null = null;
  let editingSnapshot: string | null = null;
  let editingDraft: string | null = null;

  function stepKey(scaleTitle: string, stepName: string): string {
    return `${scaleTitle}-${stepName}`;
  }

  $: curveVersion = JSON.stringify(scaleCurves) + JSON.stringify(curveOffset) + gray500Hex;

  function derivedHex(step: Step, base: string, scaleTitle: string, _version?: string): string {
    return computeDerivedColor(step, base, configForScale(scaleTitle), scaleTitle);
  }

  /**
   * Closure factories used by `<OverridesPanel>` so the panel doesn't have to
   * know about `baseColor` / `gray500Hex` / `curveVersion`. These keep
   * reactivity intact (the parent's `$:` blocks still drive re-render).
   *
   * Note: `effectiveColor` itself always uses `gray500Hex` for non-override
   * derivation (pre-existing); the chromatic vs gray distinction here is
   * only for the `derivedHex` (the "Ag" preview / border-color base).
   */
  $: derivedHexForBase = (step: Step, scaleTitle: string) => derivedHex(step, baseColor, scaleTitle, curveVersion);
  $: derivedHexForGray = (step: Step, scaleTitle: string) => derivedHex(step, gray500Hex, scaleTitle, curveVersion);
  $: effectiveHexAny = (k: string, step: Step, scaleTitle: string) => effectiveColor(k, step, scaleTitle, curveVersion);

  // --- Reactive editing state ---

  const BASE_KEY = '__base__';

  $: isEditingBase = editingKey === BASE_KEY;

  $: editingColor = isEditingBase
    ? (mode === 'gray' ? gray500Hex : baseColor)
    : editingDraft;

  $: editingStepInfo = (() => {
    if (!editingKey || isEditingBase) return null;
    if (mode === 'gray') {
      const gs = graySteps.find(s => grayStepKey(s.label) === editingKey);
      if (gs) return { scale: 'Gray', step: gs.label };
    }
    const ps = paletteStepLightness.find(p => paletteStepKey(p.label) === editingKey);
    if (ps) return { scale: 'Palette', step: ps.label };
    for (const scale of scales) {
      for (const step of scale.steps) {
        if (stepKey(scale.title, step.name) === editingKey) {
          return { scale: scale.title, step: step.name };
        }
      }
    }
    return null;
  })();

  $: panelOpen = editingKey !== null && (isEditingBase || (editingDraft !== null && editingStepInfo !== null));

  $: editPanelTitle = isEditingBase
    ? 'Base Color'
    : editingStepInfo
      ? `${editingStepInfo.scale} \u203A ${editingStepInfo.step}`
      : null;

  // --- Compute derived color via OKLCH ---

  function scaleStepToX(step: Step, scale: Scale): number {
    const idx = scale.steps.indexOf(step);
    return scale.steps.length > 1 ? (idx / (scale.steps.length - 1)) * 100 : 50;
  }

  function computeDerivedColor(step: Step, base: string, config: ScaleConfig, scaleTitle: string): string {
    const { l: baseL, c: baseC, h: baseH } = hexToOklch(base);
    const scale = scales.find(s => s.title === scaleTitle)!;
    const xPos = scaleStepToX(step, scale);

    const lCurve = scaleCurves[scaleTitle]?.lightness ?? [];
    const sCurve = scaleCurves[scaleTitle]?.saturation ?? [];
    const lKey = getScaleCurveKey(scaleTitle, 'lightness');
    const sKey = getScaleCurveKey(scaleTitle, 'saturation');
    const lOff = curveOffset[lKey] ?? 0;
    const sOff = curveOffset[sKey] ?? 0;

    let targetL: number;
    if (scale.isText) {
      // Text: lightness curve is a multiplier (100 = 1x base lightness)
      const lMul = Math.max(0, Math.min(2, (sampleCurve(lCurve, xPos) + lOff) / 100));
      targetL = Math.max(0, Math.min(1, baseL * lMul));
    } else {
      targetL = Math.max(0, Math.min(100, sampleCurve(lCurve, xPos) + lOff)) / 100;
    }

    const satMul = Math.max(0, Math.min(2, (sampleCurve(sCurve, xPos) + sOff) / 100));
    const targetC = baseC * satMul;

    const clamped = gamutClamp(targetL, targetC, baseH);
    return oklchToHex(clamped.l, clamped.c, clamped.h);
  }

  // --- Interaction handlers ---

  function handleColorChange(hex: string) {
    if (isEditingBase) {
      // Gray mode's base is derived from tintHue/tintChroma (onHueChromaChange
      // writes those). The raw hex path only applies to chromatic palettes.
      if (mode === 'chromatic') edit('baseColor', hex);
      return;
    }
    if (editingKey) {
      editingDraft = hex;
      if (editingKey in overrides) {
        edit('overrides', { ...overrides, [editingKey]: hex });
      }
    }
  }

  function resetOverride(k: string) {
    if (!(k in overrides)) return;
    const { [k]: _, ...rest } = overrides;
    edit('overrides', rest);
  }

  function handleOverrideClick(k: string, step: Step, scaleTitle: string) {
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computeDerivedColor(step, gray500Hex, configForScale(scaleTitle), scaleTitle);
    editingDraft = current;
    editingSnapshot = current;
    editingKey = k;
    paletteEditScope = beginScope({ label: 'palette session', collapseToOne: true, clipUndoFloor: true });
  }

  function handleGrayClick(gStep: GrayStep, index: number) {
    const k = grayStepKey(gStep.label);
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computeGrayColor(index, tintHue, tintChroma);
    editingDraft = current;
    editingSnapshot = current;
    editingKey = k;
    paletteEditScope = beginScope({ label: 'palette session', collapseToOne: true, clipUndoFloor: true });
  }

  async function confirmEdit() {
    if (editingKey) {
      // Accumulate all override changes into one patch so the session commit
      // sees a single final state (no intermediate reactive round-trips).
      let nextOverrides = { ...overrides };
      if (editingDraft !== null) {
        const computed = computedValueForKey(editingKey);
        if (computed !== null && editingDraft !== computed) {
          nextOverrides[editingKey] = editingDraft;
        } else if (computed !== null && editingKey in nextOverrides && editingDraft === computed) {
          delete nextOverrides[editingKey];
        }
      }
      for (const scale of scales.filter(s => !s.isText)) {
        if (snappedScales.has(scale.title) && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
          const assigned = snapScaleToPalette(scale);
          nextOverrides = { ...nextOverrides, ...assigned };
          break;
        }
      }
      if (JSON.stringify(nextOverrides) !== JSON.stringify(overrides)) {
        edit('overrides', nextOverrides);
      }
    }
    editingKey = null;
    editingSnapshot = null;
    editingDraft = null;
    snapshotTintHue = null;
    snapshotTintChroma = null;
    // tick() lets the store-derived reactives flush before session commit
    await tick();
    if (paletteEditScope) { commitScope(paletteEditScope); paletteEditScope = null; }
  }

  function cancelEdit() {
    editingKey = null;
    editingSnapshot = null;
    editingDraft = null;
    snapshotTintHue = null;
    snapshotTintChroma = null;
    // Restoring the session snapshot in the store fires the sync reactive,
    // which pulls baseColor/tintHue/tintChroma/overrides/… back to pre-open.
    if (paletteEditScope) { cancelScope(paletteEditScope); paletteEditScope = null; }
  }

  function removeOverride(k: string) {
    const { [k]: _, ...rest } = overrides;
    edit('overrides', rest);
    if (editingKey === k) { editingKey = null; editingDraft = null; }
    editingSnapshot = null;
  }

  function computedValueForKey(key: string): string | null {
    const ps = paletteStepLightness.find(p => paletteStepKey(p.label) === key);
    if (ps) {
      const idx = paletteStepLightness.indexOf(ps);
      return computePaletteColor(idx, baseColor);
    }
    const gi = graySteps.findIndex(g => grayStepKey(g.label) === key);
    if (gi >= 0) return computeGrayColor(gi, tintHue, tintChroma);
    for (const scale of scales) {
      for (const step of scale.steps) {
        if (stepKey(scale.title, step.name) === key) {
          return computeDerivedColor(step, gray500Hex, configForScale(scale.title), scale.title);
        }
      }
    }
    return null;
  }

  function effectiveColor(k: string, step: Step, scaleTitle: string, _version?: string): string {
    if (editingKey === k && editingDraft !== null) return editingDraft;
    return (k in overrides) ? overrides[k] : computeDerivedColor(step, gray500Hex, configForScale(scaleTitle), scaleTitle);
  }

  // --- Brightness/Saturation gradient helpers for scale editor ---

  function lightnessGrad(base: string): string {
    const { c, h } = hexToOklch(base);
    const points: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const l = i / 8;
      const clamped = gamutClamp(l, c, h);
      points.push(`${oklchToHex(clamped.l, clamped.c, clamped.h)} ${Math.round((i / 8) * 100)}%`);
    }
    return `linear-gradient(to right, ${points.join(', ')})`;
  }

  function saturationGrad(base: string): string {
    const { l, c, h } = hexToOklch(base);
    const midL = Math.max(0.3, Math.min(0.7, l));
    const points: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const scale = (i / 8) * 2;
      const targetC = c * scale;
      const clamped = gamutClamp(midL, targetC, h);
      points.push(`${oklchToHex(clamped.l, clamped.c, clamped.h)} ${Math.round((i / 8) * 100)}%`);
    }
    return `linear-gradient(to right, ${points.join(', ')})`;
  }

  let copiedKey: string | null = null;
  function copyHex(k: string, hex: string, event?: MouseEvent) {
    navigator.clipboard.writeText(hex);
    copiedKey = k;
    showCopyPopover(hex, event?.currentTarget ?? null);
    setTimeout(() => { copiedKey = null; }, 1500);
  }

  let copiedLabelKey: string | null = null;
  function copyVarName(k: string, varName: string, event?: MouseEvent) {
    navigator.clipboard.writeText(varName);
    copiedLabelKey = k;
    showCopyPopover(varName, event?.currentTarget ?? null);
    setTimeout(() => { copiedLabelKey = null; }, 1500);
  }

  // --- Snap-all: constrain an entire scale to unique palette steps ---

  function snapScaleToPalette(scale: Scale): Record<string, string> {
    const cfg = configForScale(scale.title);
    const n = scale.steps.length;

    const stepL = scale.steps.map(step => {
      const derived = computeDerivedColor(step, baseColor, cfg, scale.title);
      return hexToOklch(derived).l;
    });

    const palL = paletteComputed.map(ps => hexToOklch(ps.hex).l);

    const palDarkFirst = [...paletteComputed].reverse();
    const palLDarkFirst = [...palL].reverse();

    let bestStart = 0;
    let bestCost = Infinity;
    for (let start = 0; start <= palDarkFirst.length - n; start++) {
      let cost = 0;
      for (let i = 0; i < n; i++) {
        const d = stepL[i] - palLDarkFirst[start + i];
        cost += d * d;
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestStart = start;
      }
    }

    const assigned: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      const k = stepKey(scale.title, scale.steps[i].name);
      assigned[k] = palDarkFirst[bestStart + i].hex;
    }
    return assigned;
  }

  function toggleSnapAll(scale: Scale) {
    if (snappedScales.has(scale.title)) {
      snapPickerKey = null;
      const nextOverrides = { ...overrides };
      for (const step of scale.steps) {
        delete nextOverrides[stepKey(scale.title, step.name)];
      }
      const nextSnapped = [...snappedScales].filter(s => s !== scale.title);
      patchPalette({ snappedScales: nextSnapped, overrides: nextOverrides }, 'unsnap scale');
      if (editingKey && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
        editingKey = null;
        editingSnapshot = null;
      }
    } else {
      const assigned = snapScaleToPalette(scale);
      const nextSnapped = [...snappedScales, scale.title];
      patchPalette({ snappedScales: nextSnapped, overrides: { ...overrides, ...assigned } }, 'snap scale');
    }
  }

  function clearPaletteOverrides() {
    const next = { ...overrides };
    if (mode === 'gray') {
      for (const step of graySteps) delete next[grayStepKey(step.label)];
    } else {
      for (const ps of paletteStepLightness) delete next[paletteStepKey(ps.label)];
    }
    edit('overrides', next);
  }

  function scaleHasOverrides(scale: Scale): boolean {
    return scale.steps.some(s => stepKey(scale.title, s.name) in overrides);
  }

  function clearScaleOverrides(scale: Scale) {
    snapPickerKey = null;
    const nextOverrides = { ...overrides };
    for (const step of scale.steps) {
      delete nextOverrides[stepKey(scale.title, step.name)];
    }
    const nextSnapped = [...snappedScales].filter(s => s !== scale.title);
    patchPalette({ snappedScales: nextSnapped, overrides: nextOverrides }, 'clear scale overrides');
    if (editingKey && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
      editingKey = null;
      editingSnapshot = null;
    }
  }

  let snapPickerKey: string | null = null;

  function handleDocClick(e: MouseEvent) {
    if (!snapPickerKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('.override-slot-wrapper')) return;
    snapPickerKey = null;
  }
  onMount(() => document.addEventListener('click', handleDocClick, true));
  onDestroy(() => document.removeEventListener('click', handleDocClick, true));

  function selectSnapValue(k: string, paletteHex: string, _scaleTitle: string) {
    edit('overrides', { ...overrides, [k]: paletteHex });
    snapPickerKey = null;
  }

  function handleSnappedClick(k: string) {
    if (snapPickerKey === k) {
      snapPickerKey = null;
    } else {
      snapPickerKey = k;
    }
  }

  function resnapScales() {
    if (snappedScales.size === 0) return;
    let changed = false;
    const next = { ...overrides };
    for (const scale of scales.filter(s => !s.isText)) {
      if (!snappedScales.has(scale.title)) continue;
      const assigned = snapScaleToPalette(scale);
      for (const [k, hex] of Object.entries(assigned)) {
        if (next[k] !== hex) {
          next[k] = hex;
          changed = true;
        }
      }
    }
    if (changed) edit('overrides', next);
  }

  $: baseColor, scaleCurves, lightnessCurve, saturationCurve, curveOffset, snappedScales, resnapScales();

  // CSS-var emission lives in `paletteDerivation` → `editorRenderer`; the store
  // is the single source of truth for palette config and the renderer
  // subscription writes the derived `--color-*` / `--surface-*` / `--border-*`
  // / `--text-*` / `--page-bg` variables to :root.

  // --- Load external config ---
  //
  // External file loads come through editorStore.loadFromFile, which
  // overwrites $editorState.palettes — no component-side mirroring needed.
  // This export is kept only for callers that want to push a config in
  // directly.
  export function loadConfig(config: PaletteConfig) {
    setPaletteConfig(label, config);
  }


</script>

<div class="palette-editor" style="--editor-base: {mode === 'gray' ? gray500Hex : baseColor}">
  <PaletteBase
    {label}
    {mode}
    {baseColor}
    {gray500Hex}
    {tintHue}
    {tintChroma}
    {anchorToBase}
    {isEditingBase}
    {panelOpen}
    {editingColor}
    {editPanelTitle}
    {copiedKey}
    onStartEdit={startBaseEdit}
    onConfirm={confirmEdit}
    onCancel={cancelEdit}
    onColorChange={handleColorChange}
    onTintChange={(h, c) => patchPalette({ tintHue: h, tintChroma: c }, 'tint hue/chroma')}
    onAnchorToBaseChange={setAnchorToBase}
    onCopyBaseHex={copyHex}
  />

  {#if mode === 'chromatic'}
  <!-- Palette + Text row -->
  <div class="scales-row">
    <div class="scale-section">
      <div class="scale-header">
        <h4 class="scale-title">Palette</h4>
        {#if emptySelector}
          <label class="empty-mode-toggle">
            <input
              type="checkbox"
              checked={emptyMode === 'gradient'}
              on:change={onEmptyModeChange}
            />
            <span>Gradient</span>
          </label>
        {/if}
        <button class="edit-toggle" type="button" on:click={clearPaletteOverrides}>Clear Overrides</button>
        <button
          class="edit-toggle"
          type="button"
          on:click={() => paletteEditorOpen = !paletteEditorOpen}
        >{paletteEditorOpen ? 'Close' : 'Edit'}</button>
      </div>
      <div class="swatch-grid" style="--swatch-cols: {paletteStepLightness.length + 2}">
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-white'} type="button" on:click={(e) => copyVarName('palette-white', `--color-${cssNamespace}-white`, e)}>
            {copiedLabelKey === 'palette-white' ? 'copied!' : 'white'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
        </div>
        {#each paletteComputed as ps}
          <div class="step-column">
            <button class="step-label copyable-label" class:copied={copiedLabelKey === ps.key} type="button" on:click={(e) => copyVarName(ps.key, `--color-${cssNamespace}-${ps.label}`, e)}>
              {copiedLabelKey === ps.key ? 'copied!' : ps.label}
            </button>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <div
              class="swatch gray-swatch"
              class:active={editingKey === ps.key}
              class:overridden={ps.key in overrides}
              style="background: {ps.effective}"
              on:click={() => handlePaletteClick({ label: ps.label, lightness: ps.lightness, index: ps.index })}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && handlePaletteClick({ label: ps.label, lightness: ps.lightness, index: ps.index })}
            >
              {#if ps.key in overrides}
                <span class="override-dot" title="Palette override"></span>
              {/if}
              {#if emptySelector && emptyMode === 'solid'}
                <input
                  type="checkbox"
                  class="empty-check"
                  checked={emptyStep === ps.label}
                  on:click|stopPropagation={() => edit('emptyStep', ps.label)}
                  on:keydown|stopPropagation
                  title="Page background"
                />
              {/if}
            </div>
            <button
              class="step-hex"
              class:copied={copiedKey === ps.key}
              type="button"
              on:click={(e) => copyHex(ps.key, ps.effective, e)}
            >{copiedKey === ps.key ? 'copied!' : ps.effective}</button>
          </div>
        {/each}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-black'} type="button" on:click={(e) => copyVarName('palette-black', `--color-${cssNamespace}-black`, e)}>
            {copiedLabelKey === 'palette-black' ? 'copied!' : 'black'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #000000"></div>
        </div>
      {#if paletteEditorOpen}
        <div class="curve-grid-span" style="grid-column: 2 / {paletteStepLightness.length + 2}">
          <ScaleCurveEditor
            curveKey="lightness"
            anchors={lightnessCurve}
            cfg={lightnessCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_LIGHTNESS()}
            offset={curveOffset['lightness'] ?? 0}
            lockedAnchorIndex={lockedLightnessIdx}
            onAnchorsChange={setLightnessCurve}
            onOffsetChange={handleOffset}
          />
          <ScaleCurveEditor
            curveKey="saturation"
            anchors={saturationCurve}
            cfg={saturationCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_SATURATION()}
            offset={curveOffset['saturation'] ?? 0}
            lockedAnchorIndex={lockedSaturationIdx}
            onAnchorsChange={setSaturationCurve}
            onOffsetChange={handleOffset}
          />
        </div>
      {/if}
      </div>

      {#if emptySelector && emptyMode === 'gradient'}
        <GradientStopEditor
          {gradientStyle}
          {gradientAngle}
          {gradientSize}
          {gradientReverse}
          {gradientStops}
          {gradientBarPreview}
          {paletteComputed}
          onSetGradientStyle={(v) => edit('gradientStyle', v)}
          onSetGradientSize={(v) => edit('gradientSize', v)}
          onSetGradientAngle={(v) => edit('gradientAngle', v)}
          onSetGradientReverse={(v) => edit('gradientReverse', v)}
          onSetGradientStops={(v) => edit('gradientStops', v)}
        />
      {/if}
    </div>

  </div>

  <button class="derived-toggle" type="button" on:click={() => showDerived = !showDerived}>
    <i class="fas" class:fa-chevron-right={!showDerived} class:fa-chevron-down={showDerived}></i>
    <span>Text, Surfaces &amp; Borders</span>
  </button>

  {#if showDerived}
  <div class="scales-row">
    {#each scales.filter(s => s.isText) as scale}
      <OverridesPanel
        {scale}
        editorOpen={scaleEditorOpen[scale.title] ?? false}
        snapped={snappedScales.has(scale.title)}
        supportsSnap={true}
        {cssNamespace}
        {scaleCurves}
        {curveOffset}
        {defaultScaleCurves}
        {overrides}
        {editingKey}
        {snapPickerKey}
        {copiedKey}
        {copiedLabelKey}
        {paletteComputed}
        derivedHexFor={derivedHexForBase}
        effectiveHexFor={effectiveHexAny}
        stepKeyFor={stepKey}
        scaleCurveKeyFor={getScaleCurveKey}
        onToggleSnap={toggleSnapAll}
        onClearScaleOverrides={clearScaleOverrides}
        onToggleEditor={toggleScaleEditor}
        onResetOverride={resetOverride}
        onOverrideClick={handleOverrideClick}
        onSnappedClick={handleSnappedClick}
        onSelectSnapValue={selectSnapValue}
        onCopyHex={copyHex}
        onCopyVarName={copyVarName}
        onSetScaleCurve={setScaleCurve}
        onOffsetChange={handleOffset}
      />
    {/each}
  </div>

  <!-- Surfaces & Borders — per-scale editors -->
  <div class="scales-row">
    {#each scales.filter(s => !s.isText) as scale}
      <OverridesPanel
        {scale}
        editorOpen={scaleEditorOpen[scale.title] ?? false}
        snapped={snappedScales.has(scale.title)}
        supportsSnap={true}
        {cssNamespace}
        {scaleCurves}
        {curveOffset}
        {defaultScaleCurves}
        {overrides}
        {editingKey}
        {snapPickerKey}
        {copiedKey}
        {copiedLabelKey}
        {paletteComputed}
        derivedHexFor={derivedHexForBase}
        effectiveHexFor={effectiveHexAny}
        stepKeyFor={stepKey}
        scaleCurveKeyFor={getScaleCurveKey}
        onToggleSnap={toggleSnapAll}
        onClearScaleOverrides={clearScaleOverrides}
        onToggleEditor={toggleScaleEditor}
        onResetOverride={resetOverride}
        onOverrideClick={handleOverrideClick}
        onSnappedClick={handleSnappedClick}
        onSelectSnapValue={selectSnapValue}
        onCopyHex={copyHex}
        onCopyVarName={copyVarName}
        onSetScaleCurve={setScaleCurve}
        onOffsetChange={handleOffset}
      />
    {/each}
  </div>
  {/if}

  {:else}
  <!-- Gray mode: palette + text row -->
  <div class="scales-row">
  <div class="scale-section">
    <div class="scale-header">
      <h4 class="scale-title">{label}</h4>
      <button class="edit-toggle" type="button" on:click={clearPaletteOverrides}>Clear Overrides</button>
      <button
        class="edit-toggle"
        type="button"
        on:click={() => grayEditorOpen = !grayEditorOpen}
      >{grayEditorOpen ? 'Close' : 'Edit'}</button>
    </div>
    <div class="swatch-grid" style="--swatch-cols: {graySteps.length + 2}">
      <div class="step-column">
        <button class="step-label copyable-label" class:copied={copiedLabelKey === 'gray-white'} type="button" on:click={(e) => copyVarName('gray-white', `--color-${cssNamespace}-white`, e)}>
          {copiedLabelKey === 'gray-white' ? 'copied!' : 'white'}
        </button>
        <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
      </div>
      {#each grayEffective as g}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === g.key} type="button" on:click={(e) => copyVarName(g.key, `--color-${cssNamespace}-${g.step.label}`, e)}>
            {copiedLabelKey === g.key ? 'copied!' : g.step.label}
          </button>
          <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
          <div
            class="swatch gray-swatch"
            class:active={editingKey === g.key}
            class:overridden={g.key in overrides}
            style="background: {g.effective}"
            on:click={() => handleGrayClick(g.step, g.index)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && handleGrayClick(g.step, g.index)}
          >
            {#if g.key in overrides}
              <span class="override-dot" title="Palette override"></span>
            {/if}
          </div>
          <button
            class="step-hex"
            class:copied={copiedKey === g.key}
            type="button"
            on:click={(e) => copyHex(g.key, g.effective, e)}
          >{copiedKey === g.key ? 'copied!' : g.effective}</button>
        </div>
      {/each}
      <div class="step-column">
        <button class="step-label copyable-label" class:copied={copiedLabelKey === 'gray-black'} type="button" on:click={(e) => copyVarName('gray-black', `--color-${cssNamespace}-black`, e)}>
          {copiedLabelKey === 'gray-black' ? 'copied!' : 'black'}
        </button>
        <div class="swatch gray-swatch bookend" style="background: #000000"></div>
      </div>
    {#if grayEditorOpen}
      <div class="curve-grid-span" style="grid-column: 2 / {graySteps.length + 2}">
        <ScaleCurveEditor
          curveKey="gray-lightness"
          anchors={grayLightnessCurve}
          cfg={lightnessCurveConfig}
          stepCount={graySteps.length}
          defaults={DEFAULT_GRAY_LIGHTNESS()}
          offset={curveOffset['gray-lightness'] ?? 0}
          onAnchorsChange={setGrayLightnessCurve}
          onOffsetChange={handleOffset}
        />
        <ScaleCurveEditor
          curveKey="gray-saturation"
          anchors={graySaturationCurve}
          cfg={saturationCurveConfig}
          stepCount={graySteps.length}
          defaults={DEFAULT_GRAY_SATURATION()}
          offset={curveOffset['gray-saturation'] ?? 0}
          onAnchorsChange={setGraySaturationCurve}
          onOffsetChange={handleOffset}
        />
      </div>
    {/if}
    </div>
  </div>
  </div>

  <button class="derived-toggle" type="button" on:click={() => showDerived = !showDerived}>
    <i class="fas" class:fa-chevron-right={!showDerived} class:fa-chevron-down={showDerived}></i>
    <span>Text, Surfaces &amp; Borders</span>
  </button>

  {#if showDerived}
  <div class="scales-row">
    {#each grayScales.filter(s => s.isText) as scale}
      <OverridesPanel
        {scale}
        editorOpen={scaleEditorOpen[scale.title] ?? false}
        snapped={snappedScales.has(scale.title)}
        supportsSnap={true}
        {cssNamespace}
        {scaleCurves}
        {curveOffset}
        {defaultScaleCurves}
        {overrides}
        {editingKey}
        {snapPickerKey}
        {copiedKey}
        {copiedLabelKey}
        {paletteComputed}
        derivedHexFor={derivedHexForGray}
        effectiveHexFor={effectiveHexAny}
        stepKeyFor={stepKey}
        scaleCurveKeyFor={getScaleCurveKey}
        onToggleSnap={toggleSnapAll}
        onClearScaleOverrides={clearScaleOverrides}
        onToggleEditor={toggleScaleEditor}
        onResetOverride={resetOverride}
        onOverrideClick={handleOverrideClick}
        onSnappedClick={handleSnappedClick}
        onSelectSnapValue={selectSnapValue}
        onCopyHex={copyHex}
        onCopyVarName={copyVarName}
        onSetScaleCurve={setScaleCurve}
        onOffsetChange={handleOffset}
      />
    {/each}
  </div>
  <!-- Surfaces & Borders for gray mode -->
  <div class="scales-row">
    {#each grayScales.filter(s => !s.isText) as scale}
      <OverridesPanel
        {scale}
        editorOpen={scaleEditorOpen[scale.title] ?? false}
        snapped={false}
        supportsSnap={false}
        {cssNamespace}
        {scaleCurves}
        {curveOffset}
        {defaultScaleCurves}
        {overrides}
        {editingKey}
        {snapPickerKey}
        {copiedKey}
        {copiedLabelKey}
        {paletteComputed}
        derivedHexFor={derivedHexForGray}
        effectiveHexFor={effectiveHexAny}
        stepKeyFor={stepKey}
        scaleCurveKeyFor={getScaleCurveKey}
        onToggleSnap={toggleSnapAll}
        onClearScaleOverrides={clearScaleOverrides}
        onToggleEditor={toggleScaleEditor}
        onResetOverride={resetOverride}
        onOverrideClick={handleOverrideClick}
        onSnappedClick={handleSnappedClick}
        onSelectSnapValue={selectSnapValue}
        onCopyHex={copyHex}
        onCopyVarName={copyVarName}
        onSetScaleCurve={setScaleCurve}
        onOffsetChange={handleOffset}
      />
    {/each}
  </div>
  {/if}
  {/if}

  <!-- Color Edit Panel (non-base edits) -->
  {#if !isEditingBase && panelOpen && editingColor}
    <ColorEditPanel
      color={editingColor}
      title={editPanelTitle}
      showRemoveOverride={!!editingKey}
      mode={'hsl'}
      hue={tintHue}
      chroma={tintChroma}
      onHueChromaChange={(h, c) => patchPalette({ tintHue: h, tintChroma: c }, 'tint hue/chroma')}
      onColorChange={handleColorChange}
      onConfirm={confirmEdit}
      onCancel={cancelEdit}
      onRemoveOverride={() => editingKey && removeOverride(editingKey)}
      onSliderStart={() => beginSliderGesture(`edit ${label} ${editingKey ?? 'color'}`)}
    />
  {/if}
</div>

<style>
  .palette-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
    padding: var(--ui-space-16) var(--ui-space-16) var(--ui-space-24);
    background: none;
    border: none;
    border-bottom: 1px solid var(--ui-border-faint);
    font-family: var(--ui-font-sans);
    min-width: 0;
  }

  .palette-editor:last-child {
    border-bottom: none;
  }

  /* Scale header with edit button */

  .scale-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .edit-toggle {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    background: none;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-6);
    cursor: pointer;
  }

  .edit-toggle:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .derived-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-4);
    background: none;
    border: none;
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .derived-toggle:hover {
    color: var(--ui-text-secondary);
  }

  .derived-toggle i {
    font-size: var(--ui-font-size-xs);
    width: 0.75rem;
    text-align: center;
  }

  /* Scale layout */

  .scales-row {
    display: flex;
    gap: 3rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .scale-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
    max-width: 100%;
  }

  .scale-title {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Step columns */

  .step-column {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-self: stretch;
    gap: var(--ui-space-2);
    width: auto;
    min-width: 0;
    overflow: visible;
  }

  .step-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: center;
    line-height: 1;
    height: var(--ui-font-size-xs);
    display: flex;
    align-items: flex-end;
  }

  .step-label.copyable-label {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    font-size: var(--ui-font-size-sm);
    justify-content: center;
    transition: color var(--ui-transition-fast);
  }

  .step-label.copyable-label:hover {
    color: var(--ui-text-primary);
  }

  .step-label.copyable-label.copied {
    color: var(--ui-text-accent, var(--ui-text-primary));
  }

  /* Swatches */

  .swatch {
    width: 100%;
    height: 2rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-faint);
  }

  /* Step hex values */

  .step-hex {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    padding: 1px var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    white-space: nowrap;
    background: none;
    border: none;
    text-align: center;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .step-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  .step-hex.copied {
    color: var(--ui-text-accent);
  }

  /* Swatch grid */

  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(var(--swatch-cols), minmax(0, 1fr));
    gap: var(--ui-space-4) var(--swatch-gap, var(--ui-space-4));
    align-items: start;
    justify-content: start;
    min-width: 0;
    max-width: calc(var(--swatch-cols) * 4rem + (var(--swatch-cols) - 1) * var(--swatch-gap, var(--ui-space-4)));
  }

  .curve-grid-span {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .swatch.gray-swatch {
    width: 100%;
    height: calc(4rem + var(--ui-space-2));
    cursor: pointer;
    position: relative;
  }

  .swatch.gray-swatch:hover {
    border-color: var(--ui-border-medium);
  }

  .swatch.gray-swatch.active {
    border-color: var(--ui-border-strong);
    outline: 2px solid var(--ui-border-medium);
    outline-offset: 1px;
  }

  .override-dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ui-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }

  .empty-mode-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .empty-mode-toggle input {
    margin: 0;
    cursor: pointer;
  }

  .empty-check {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    bottom: 3px;
    right: 3px;
    margin: 0;
    cursor: pointer;
    width: 14px;
    height: 14px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.3);
    border-radius: 2px;
    opacity: 0.5;
  }

  .empty-check:checked {
    opacity: 1;
  }

  .empty-check:checked::after {
    content: '\2713';
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: var(--ui-font-size-md);
    font-weight: bold;
    color: black;
    line-height: 1;
  }

  /* Narrow desktop: tighten palette editor spacing */
  @media (max-width: 1280px) {
    .palette-editor {
      padding: var(--ui-space-12) var(--ui-space-12) var(--ui-space-20);
    }
    .scales-row {
      gap: var(--ui-space-24);
    }
  }

  @media (max-width: 1024px) {
    .scales-row {
      gap: var(--ui-space-16);
    }
  }
</style>
