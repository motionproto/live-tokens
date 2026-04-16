<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import Button from '../components/Button.svelte';
  import { hexToOklch, oklchToHex, gamutClamp } from '../lib/oklch';
  import { type CurveAnchor, makeAnchor, sampleCurve, lightnessCurveConfig, saturationCurveConfig, textLightnessCurveConfig } from './curveEngine';
  import BezierCurveEditor from './BezierCurveEditor.svelte';
  import ColorEditPanel from './ColorEditPanel.svelte';
  import Toggle from '../components/Toggle.svelte';
  import type { PaletteConfig, GradientStyle, GradientStop } from '../lib/tokenTypes';
  import { editorConfigs, loadedConfigs, configsLoadedFromFile } from '../lib/editorConfigStore';
  import { setCssVar as setCssVarSync } from '../lib/cssVarSync';

  export let label: string;
  export let initialColor: string = '#808080';
  export let mode: 'chromatic' | 'gray' = 'chromatic';
  export let cssNamespace: string | null = null;
  export let saveSignal: number = 0;
  export let emptySelector: boolean = false;

  // --- Empty selector state ---
  let emptyMode: 'solid' | 'gradient' = 'solid';
  let emptyStep: string = '850';

  // --- Gradient state ---
  let gradientStyle: GradientStyle = 'linear';
  let gradientAngle: number = 180;
  let gradientReverse: boolean = false;
  let anchorToBase: boolean = true;
  let lockedLightnessIdx: number | null = null;
  let lockedSaturationIdx: number | null = null;
  let lastAnchorToBase: boolean = false;
  let gradientSize: 'page' | 'window' = 'page';
  let gradientStops: GradientStop[] = [
    { position: 0, paletteLabel: '800' },
    { position: 100, paletteLabel: '950' },
  ];
  let draggingStopIndex: number | null = null;
  let selectedStopIndex: number = 0;

  function stopColor(stop: GradientStop, pc: typeof paletteComputed): string {
    const ps = pc?.find(p => p.label === stop.paletteLabel);
    return ps ? ps.effective : '#000000';
  }

  let gradientColorStops = '';
  let gradientCssValue = '';
  let gradientBarPreview = '';

  // Must run after paletteComputed is defined — see reactive block below

  function addGradientStop(position: number) {
    // Find nearest palette color by interpolating between surrounding stops
    const nearest = paletteComputed.reduce((prev, curr) => {
      const prevDist = Math.abs(parseInt(prev.label) - 500);
      const currDist = Math.abs(parseInt(curr.label) - 500);
      return currDist < prevDist ? curr : prev;
    });
    gradientStops = [...gradientStops, { position, paletteLabel: nearest.label }];
    selectedStopIndex = gradientStops.length - 1;
  }

  function removeGradientStop(index: number) {
    if (gradientStops.length <= 2) return;
    gradientStops = gradientStops.filter((_, i) => i !== index);
    if (selectedStopIndex >= gradientStops.length) selectedStopIndex = gradientStops.length - 1;
  }

  function handleStopHandleMouseDown(e: MouseEvent, i: number) {
    selectedStopIndex = i;
    draggingStopIndex = i;
    const bar = (e.currentTarget as HTMLElement).parentElement!;
    const rect = bar.getBoundingClientRect();
    function onMove(me: MouseEvent) {
      if (draggingStopIndex === null) return;
      const newPos = Math.round(Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100)));
      gradientStops[draggingStopIndex].position = newPos;
      gradientStops = gradientStops;
    }
    function onUp() {
      draggingStopIndex = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleStopBarMouseDown(e: MouseEvent) {
    const bar = (e.currentTarget as HTMLElement);
    const rect = bar.getBoundingClientRect();
    const pos = Math.round(((e.clientX - rect.left) / rect.width) * 100);

    // Check if clicking near an existing stop
    const nearIdx = gradientStops.findIndex(s => Math.abs(s.position - pos) < 4);
    if (nearIdx >= 0) {
      selectedStopIndex = nearIdx;
      draggingStopIndex = nearIdx;
    } else {
      addGradientStop(Math.max(0, Math.min(100, pos)));
      draggingStopIndex = gradientStops.length - 1;
    }

    function onMove(me: MouseEvent) {
      if (draggingStopIndex === null) return;
      const newPos = Math.round(Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100)));
      gradientStops[draggingStopIndex].position = newPos;
      gradientStops = gradientStops;
    }
    function onUp() {
      draggingStopIndex = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const STORAGE_KEY = `palette-editor-${label}`;

  let baseColor = initialColor;

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

  let tintHue = 240;
  let grayEditorOpen = false;
  let showDerived = false;

  // --- Palette curve editors (lightness + saturation) ---
  let paletteEditorOpen = false;

  // Default curve anchors (used for initial state and reset)
  const DEFAULT_PALETTE_LIGHTNESS = () => [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];
  const DEFAULT_PALETTE_SATURATION = () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
  const DEFAULT_GRAY_LIGHTNESS = () => [makeAnchor(0, 92, 5), makeAnchor(100, 3, 5)];
  const DEFAULT_GRAY_SATURATION = () => [makeAnchor(0, 20, 30), makeAnchor(100, 20, 30)];

  let lightnessCurve: CurveAnchor[] = DEFAULT_PALETTE_LIGHTNESS();
  let saturationCurve: CurveAnchor[] = DEFAULT_PALETTE_SATURATION();
  let grayLightnessCurve: CurveAnchor[] = DEFAULT_GRAY_LIGHTNESS();
  let graySaturationCurve: CurveAnchor[] = DEFAULT_GRAY_SATURATION();

  function setLightnessCurve(a: CurveAnchor[]) { lightnessCurve = a; }
  function setSaturationCurve(a: CurveAnchor[]) { saturationCurve = a; }
  function setGrayLightnessCurve(a: CurveAnchor[]) { grayLightnessCurve = a; }
  function setGraySaturationCurve(a: CurveAnchor[]) { graySaturationCurve = a; }

  const gradientStyleOptions: { value: GradientStyle; icon: string; title: string }[] = [
    { value: 'linear', icon: '/', title: 'Linear' },
    { value: 'radial', icon: '\u25CB', title: 'Radial' },
    { value: 'conic',  icon: '\u25D4', title: 'Conic' },
  ];

  const gradientSizeOptions: { value: 'page' | 'window'; label: string; title: string }[] = [
    { value: 'page', label: 'Page', title: 'Gradient stretches over the full scrollable page' },
    { value: 'window', label: 'Window', title: 'Gradient stays fixed to the viewport' },
  ];

  // --- Curve offset + clipboard (shared across all curve editors) ---

  let curveOffset: Record<string, number> = { lightness: 0, saturation: 0 };

  function handleOffset(key: string, value: number) {
    curveOffset[key] = value;
    curveOffset = curveOffset;
  }

  // Gray step index to curve x-position
  function grayStepToX(index: number): number {
    return graySteps.length > 1 ? (index / (graySteps.length - 1)) * 100 : 50;
  }

  // Base chroma for gray tinting (editable via the color panel's chroma slider)
  const DEFAULT_TINT_CHROMA = 0.04;
  let tintChroma = DEFAULT_TINT_CHROMA;

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
    ? (grayComputed.find(g => g.step.label === '500')?.hex ?? '#808080')
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

  $: if (anchorToBase !== lastAnchorToBase) {
    lastAnchorToBase = anchorToBase;
    if (anchorToBase) {
      const x500 = stepIndexToX(4);
      const lResult = injectLockedAnchor(lightnessCurve, x500, hexToOklch(baseColor).l * 100);
      if (lResult.curve !== lightnessCurve) lightnessCurve = lResult.curve;
      lockedLightnessIdx = lResult.idx;
      injectedLightness = lResult.injected;
      const sResult = injectLockedAnchor(saturationCurve, x500, 100);
      if (sResult.curve !== saturationCurve) saturationCurve = sResult.curve;
      lockedSaturationIdx = sResult.idx;
      injectedSaturation = sResult.injected;
    } else {
      if (injectedLightness) lightnessCurve = removeLockedAnchor(lightnessCurve, lockedLightnessIdx);
      if (injectedSaturation) saturationCurve = removeLockedAnchor(saturationCurve, lockedSaturationIdx);
      lockedLightnessIdx = null;
      lockedSaturationIdx = null;
      injectedLightness = false;
      injectedSaturation = false;
    }
  }

  // Keep locked lightness anchor y in sync with base color
  $: if (anchorToBase && lockedLightnessIdx !== null && baseColor) {
    const targetY = hexToOklch(baseColor).l * 100;
    if (lightnessCurve[lockedLightnessIdx] && Math.abs(lightnessCurve[lockedLightnessIdx].y - targetY) > 0.01) {
      lightnessCurve = lightnessCurve.map((a, i) => i === lockedLightnessIdx ? { ...a, y: targetY } : a);
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
    const _lc = lightnessCurve, _sc = saturationCurve, _co = curveOffset, _ed = editingDraft, _ek = editingKey, _ov = overrides, _ab = anchorToBase;
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

  let scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }> = {
    Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
    Borders: { lightness: defaultScaleCurves.Borders.lightness(), saturation: defaultScaleCurves.Borders.saturation() },
    Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() },
  };

  let scaleEditorOpen: Record<string, boolean> = { Surfaces: false, Borders: false, Text: false };

  function setScaleCurve(title: string, channel: 'lightness' | 'saturation', a: CurveAnchor[]) {
    scaleCurves[title] = { ...scaleCurves[title], [channel]: a };
    scaleCurves = scaleCurves;
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

  let overrides: Record<string, string> = {};
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
      baseColor = hex;
    } else if (editingKey) {
      editingDraft = hex;
      if (editingKey in overrides) {
        overrides[editingKey] = hex;
        overrides = overrides;
      }
    }
  }

  function resetOverride(k: string) {
    if (!(k in overrides)) return;
    const { [k]: _, ...rest } = overrides;
    overrides = rest;
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
  }

  function confirmEdit() {
    if (editingKey) {
      // Promote draft to override only if it differs from computed
      if (editingDraft !== null) {
        const computed = computedValueForKey(editingKey);
        if (computed !== null && editingDraft !== computed) {
          overrides = { ...overrides, [editingKey]: editingDraft };
        } else if (computed !== null && editingKey in overrides && editingDraft === computed) {
          // Was an override but now matches computed — remove it
          const { [editingKey]: _, ...rest } = overrides;
          overrides = rest;
        }
      }

      for (const scale of scales.filter(s => !s.isText)) {
        if (snappedScales.has(scale.title) && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
          const assigned = snapScaleToPalette(scale);
          overrides = { ...overrides, ...assigned };
          break;
        }
      }
    }
    editingKey = null;
    editingSnapshot = null;
    editingDraft = null;
    snapshotTintHue = null;
    snapshotTintChroma = null;
  }

  function cancelEdit() {
    if (editingSnapshot !== null && editingKey) {
      if (isEditingBase) {
        if (mode === 'gray' && snapshotTintHue !== null && snapshotTintChroma !== null) {
          tintHue = snapshotTintHue;
          tintChroma = snapshotTintChroma;
        } else {
          baseColor = editingSnapshot;
        }
      } else if (editingKey in overrides) {
        overrides[editingKey] = editingSnapshot;
        overrides = overrides;
      }
    }
    editingKey = null;
    editingSnapshot = null;
    editingDraft = null;
    snapshotTintHue = null;
    snapshotTintChroma = null;
  }

  function removeOverride(k: string) {
    const { [k]: _, ...rest } = overrides;
    overrides = rest;
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
  function copyHex(k: string, hex: string) {
    navigator.clipboard.writeText(hex);
    copiedKey = k;
    setTimeout(() => { copiedKey = null; }, 1000);
  }

  let copiedLabelKey: string | null = null;
  function copyVarName(k: string, varName: string) {
    navigator.clipboard.writeText(varName);
    copiedLabelKey = k;
    setTimeout(() => { copiedLabelKey = null; }, 1000);
  }

  // --- Snap-all: constrain an entire scale to unique palette steps ---

  let snappedScales: Set<string> = new Set();

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
      snappedScales.delete(scale.title);
      snappedScales = snappedScales;
      snapPickerKey = null;
      const next = { ...overrides };
      for (const step of scale.steps) {
        delete next[stepKey(scale.title, step.name)];
      }
      overrides = next;
      if (editingKey && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
        editingKey = null;
        editingSnapshot = null;
      }
    } else {
      snappedScales.add(scale.title);
      snappedScales = snappedScales;
      const assigned = snapScaleToPalette(scale);
      overrides = { ...overrides, ...assigned };
    }
  }

  function clearPaletteOverrides() {
    const next = { ...overrides };
    if (mode === 'gray') {
      for (const step of graySteps) delete next[grayStepKey(step.label)];
    } else {
      for (const ps of paletteStepLightness) delete next[paletteStepKey(ps.label)];
    }
    overrides = next;
  }

  function scaleHasOverrides(scale: Scale): boolean {
    return scale.steps.some(s => stepKey(scale.title, s.name) in overrides);
  }

  function clearScaleOverrides(scale: Scale) {
    // Also unsnap the scale so resnapScales() won't re-add overrides
    snappedScales.delete(scale.title);
    snappedScales = snappedScales;
    snapPickerKey = null;
    const next = { ...overrides };
    for (const step of scale.steps) {
      delete next[stepKey(scale.title, step.name)];
    }
    overrides = next;
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

  function selectSnapValue(k: string, paletteHex: string, scaleTitle: string) {
    overrides = { ...overrides, [k]: paletteHex };
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
    if (changed) overrides = next;
  }

  $: baseColor, scaleCurves, lightnessCurve, saturationCurve, curveOffset, snappedScales, resnapScales();

  // --- Live CSS variable output ---

  function scaleToCssVar(scaleTitle: string, stepName: string): string | null {
    if (cssNamespace === null) return null;
    if (scaleTitle === 'Surfaces') {
      const suffix = stepName === 'default' ? '' : `-${stepName}`;
      if (cssNamespace === 'neutral') return `--surface-neutral${suffix}`;
      return cssNamespace ? `--surface-${cssNamespace}${suffix}` : `--surface-neutral${suffix}`;
    }
    if (scaleTitle === 'Borders') {
      const suffix = stepName === 'default' ? '' : `-${stepName}`;
      if (cssNamespace === 'neutral') return `--border-neutral${suffix}`;
      return cssNamespace ? `--border-${cssNamespace}${suffix}` : `--border-neutral${suffix}`;
    }
    if (scaleTitle === 'Text') {
      if (!cssNamespace || cssNamespace === 'neutral') return `--text-${stepName}`;
      if (cssNamespace === 'primary' && stepName === 'primary') return '--text-primary-color';
      return stepName === 'primary' ? `--text-${cssNamespace}` : `--text-${cssNamespace}-${stepName}`;
    }
    return null;
  }

  let appliedCssVars: string[] = [];

  function setCssVar(name: string, value: string) {
    setCssVarSync(name, value);
    if (!appliedCssVars.includes(name)) appliedCssVars.push(name);
  }

  // Chromatic mode: set --color-{namespace}-* palette ramp + semantic surface/border/text CSS variables
  $: if (cssNamespace !== null && mode === 'chromatic') {
    const _cv = curveVersion;
    const _ov = overrides;
    const _bc = baseColor;
    // Palette color ramp (100–950)
    const _pc = paletteComputed;
    for (const ps of _pc) {
      setCssVar(`--color-${cssNamespace}-${ps.label}`, ps.effective);
    }
    // Semantic scales (surfaces, borders, text)
    for (const scale of scales) {
      for (const step of scale.steps) {
        const k = stepKey(scale.title, step.name);
        const hex = (k in _ov) ? _ov[k] : computeDerivedColor(step, _bc, configForScale(scale.title), scale.title);
        const varName = scaleToCssVar(scale.title, step.name);
        if (varName) setCssVar(varName, hex);
      }
    }
  }

  // Gray mode: set --color-{namespace}-* variables + semantic scales (surfaces, borders, text)
  $: if (cssNamespace !== null && mode === 'gray') {
    const _ge = grayEffective;
    const _cv = curveVersion;
    const _ov = overrides;
    const _gs = grayScales;
    const _base = gray500Hex;
    for (const g of _ge) {
      setCssVar(`--color-${cssNamespace}-${g.step.label}`, g.effective);
    }
    for (const scale of _gs) {
      for (const step of scale.steps) {
        const k = stepKey(scale.title, step.name);
        const hex = (k in _ov) ? _ov[k] : computeDerivedColor(step, _base, configForScale(scale.title), scale.title);
        const varName = scaleToCssVar(scale.title, step.name);
        if (varName) setCssVar(varName, hex);
      }
    }
  }

  // Empty selector: set --empty to the selected palette step color or gradient
  $: if (emptySelector) {
    if (emptyMode === 'solid') {
      const _pc = paletteComputed;
      const selected = _pc.find(ps => ps.label === emptyStep);
      if (selected) {
        setCssVar('--empty', selected.effective);
      }
      setCssVar('--empty-attachment', 'scroll');
    } else {
      const _grad = gradientCssValue;
      if (_grad) {
        setCssVar('--empty', _grad);
      }
      setCssVar('--empty-attachment', gradientSize === 'window' ? 'fixed' : 'scroll');
    }
  }

  // --- Save / Load configuration ---

  function buildConfig(): PaletteConfig {
    return {
      baseColor,
      tintHue,
      tintChroma,
      lightnessCurve,
      saturationCurve,
      grayLightnessCurve,
      graySaturationCurve,
      scaleCurves,
      curveOffset,
      overrides,
      snappedScales: [...snappedScales],
      anchorToBase,
      ...(emptySelector ? { emptyMode, emptyStep, gradientStyle, gradientAngle, gradientReverse, gradientStops, gradientSize } : {}),
    };
  }

  function saveConfig() {
    const config = buildConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Also push to the shared store so save/load flows can collect all configs
    editorConfigs.update(m => ({ ...m, [label]: config }));
  }

  function applyConfig(config: PaletteConfig) {
    // Clear any in-progress editing
    editingKey = null;
    editingSnapshot = null;
    editingDraft = null;

    baseColor = config.baseColor;
    tintHue = config.tintHue;
    tintChroma = config.tintChroma ?? DEFAULT_TINT_CHROMA;
    lightnessCurve = config.lightnessCurve;
    saturationCurve = config.saturationCurve;
    grayLightnessCurve = config.grayLightnessCurve;
    graySaturationCurve = config.graySaturationCurve;
    scaleCurves = config.scaleCurves;
    curveOffset = config.curveOffset;
    overrides = config.overrides;
    snappedScales = new Set(config.snappedScales);
    lastAnchorToBase = false; // reset so reactive re-fires
    anchorToBase = config.anchorToBase ?? true;
    if (config.emptyMode) emptyMode = config.emptyMode;
    if (config.emptyStep) emptyStep = config.emptyStep;
    if (config.gradientStyle) gradientStyle = config.gradientStyle;
    if (config.gradientAngle !== undefined) gradientAngle = config.gradientAngle;
    if (config.gradientReverse !== undefined) gradientReverse = config.gradientReverse;
    if (config.gradientStops) gradientStops = config.gradientStops;
    if (config.gradientSize) gradientSize = config.gradientSize;
  }

  function loadFromLocalStorage(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      applyConfig(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch variables.css from disk (cache-busted), parse :root variables,
   * and set the base color to match the CSS 500 step. Curves generate
   * the full palette and derived scales — no overrides are created.
   */
  // Called directly by VariablesTab when a token file is loaded.
  export function loadConfig(config: PaletteConfig) {
    applyConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    editorConfigs.update(m => ({ ...m, [label]: config }));
  }

  // Initial load from token file on mount (set by tokenInit before mount)
  $: if ($loadedConfigs && $loadedConfigs[label]) {
    loadConfig($loadedConfigs[label]);
  }

  let initialized = false;
  let mountComplete = false;

  onMount(async () => {
    loadFromLocalStorage();
    // Push initial config to the shared store
    editorConfigs.update(m => ({ ...m, [label]: buildConfig() }));
    initialized = true;
    // Wait for the initial reactive flush to complete before marking mount done.
    // Any auto-persist run after this point is from a deliberate user edit.
    await tick();
    mountComplete = true;
  });

  // Auto-persist to localStorage so state survives HMR / remounts
  $: if (initialized) {
    // Explicit dep references for Svelte reactivity tracking
    const _deps = [baseColor, tintHue, tintChroma, lightnessCurve, saturationCurve,
      grayLightnessCurve, graySaturationCurve, scaleCurves,
      curveOffset, overrides, snappedScales,
      emptyMode, emptyStep, gradientStyle, gradientAngle, gradientReverse, gradientStops, gradientSize, anchorToBase];
    const config = buildConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    editorConfigs.update(m => ({ ...m, [label]: config }));
    // After mount completes, any reactive run means the user deliberately edited
    if (mountComplete) {
      configsLoadedFromFile.set(true);
    }
  }

  $: if (saveSignal > 0) {
    saveConfig();
  }
</script>

<div class="palette-editor" style="--editor-base: {mode === 'gray' ? gray500Hex : baseColor}">
  <div class="editor-top">
    <div class="editor-primary">
      {#if mode === 'chromatic'}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
          class="header-swatch"
          class:active={isEditingBase}
          style="background: {baseColor}"
          on:click={() => { if (editingKey === BASE_KEY) { confirmEdit(); } else { editingSnapshot = baseColor; editingKey = BASE_KEY; } }}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && (editingKey === BASE_KEY ? confirmEdit() : (editingSnapshot = baseColor, editingKey = BASE_KEY))}
        ></div>
      {:else}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
          class="header-swatch"
          class:active={isEditingBase}
          style="background: {gray500Hex}"
          on:click={() => { if (editingKey === BASE_KEY) { confirmEdit(); } else { editingSnapshot = gray500Hex; snapshotTintHue = tintHue; snapshotTintChroma = tintChroma; editingKey = BASE_KEY; } }}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && (editingKey === BASE_KEY ? confirmEdit() : (editingSnapshot = gray500Hex, snapshotTintHue = tintHue, snapshotTintChroma = tintChroma, editingKey = BASE_KEY))}
        ></div>
      {/if}
      <div class="primary-info">
        <span class="editor-label">{label}</span>
        {#if mode === 'chromatic'}
          <button
            class="base-hex clickable-hex"
            type="button"
            on:click={() => copyHex(BASE_KEY, baseColor)}
          >{copiedKey === BASE_KEY ? 'copied!' : baseColor}</button>
        {:else}
          <button
            class="base-hex clickable-hex"
            type="button"
            on:click={() => copyHex('gray-500', gray500Hex)}
          >{copiedKey === 'gray-500' ? 'copied!' : gray500Hex}</button>
        {/if}
      </div>
    </div>
  </div>

  {#if isEditingBase && panelOpen && editingColor}
    <ColorEditPanel
      color={editingColor}
      title={editPanelTitle}
      showRemoveOverride={false}
      mode={mode === 'gray' ? 'hue-chroma' : 'hsl'}
      hue={tintHue}
      chroma={tintChroma}
      onHueChromaChange={(h, c) => { tintHue = h; tintChroma = c; }}
      onColorChange={handleColorChange}
      onConfirm={confirmEdit}
      onCancel={cancelEdit}
      onRemoveOverride={() => {}}
    >
      <span slot="actions" class:hidden={mode !== 'chromatic'}>
        <Toggle bind:checked={anchorToBase} label="Lock base color to position 500" />
      </span>
    </ColorEditPanel>
  {/if}

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
              on:change={(e) => { emptyMode = e.currentTarget.checked ? 'gradient' : 'solid'; }}
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
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-white'} type="button" on:click={() => copyVarName('palette-white', `--color-${cssNamespace}-white`)}>
            {copiedLabelKey === 'palette-white' ? 'copied!' : 'white'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
        </div>
        {#each paletteComputed as ps}
          <div class="step-column">
            <button class="step-label copyable-label" class:copied={copiedLabelKey === ps.key} type="button" on:click={() => copyVarName(ps.key, `--color-${cssNamespace}-${ps.label}`)}>
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
                  on:click|stopPropagation={() => { emptyStep = ps.label; }}
                  on:keydown|stopPropagation
                  title="Page background"
                />
              {/if}
            </div>
            <button
              class="step-hex"
              class:copied={copiedKey === ps.key}
              type="button"
              on:click={() => copyHex(ps.key, ps.effective)}
            >{copiedKey === ps.key ? 'copied!' : ps.effective}</button>
          </div>
        {/each}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-black'} type="button" on:click={() => copyVarName('palette-black', `--color-${cssNamespace}-black`)}>
            {copiedLabelKey === 'palette-black' ? 'copied!' : 'black'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #000000"></div>
        </div>
      {#if paletteEditorOpen}
        <div class="curve-grid-span" style="grid-column: 2 / {paletteStepLightness.length + 2}">
          {#each [
            { key: 'lightness', anchors: lightnessCurve, cfg: lightnessCurveConfig, defaults: DEFAULT_PALETTE_LIGHTNESS(), set: setLightnessCurve, lockedIdx: lockedLightnessIdx },
            { key: 'saturation', anchors: saturationCurve, cfg: saturationCurveConfig, defaults: DEFAULT_PALETTE_SATURATION(), set: setSaturationCurve, lockedIdx: lockedSaturationIdx },
          ] as curve (curve.key)}
            <BezierCurveEditor
              anchors={curve.anchors}
              cfg={curve.cfg}
              stepCount={paletteStepLightness.length}
              defaultAnchors={curve.defaults}
              offset={curveOffset[curve.key] ?? 0}
              lockedAnchorIndex={curve.lockedIdx}
              onAnchorsChange={curve.set}
              onOffsetChange={(v) => handleOffset(curve.key, v)}
            />
          {/each}
        </div>
      {/if}
      </div>

      {#if emptySelector && emptyMode === 'gradient'}
        <div class="gradient-controls">
          <div class="gradient-row">
            <span class="gradient-label">Style:</span>
            <div class="gradient-style-buttons">
              {#each gradientStyleOptions as opt}
                <button
                  class="style-btn"
                  class:active={gradientStyle === opt.value}
                  type="button"
                  title={opt.title}
                  on:click={() => { gradientStyle = opt.value; }}
                >{opt.icon}</button>
              {/each}
            </div>
          </div>

          <div class="gradient-row">
            <span class="gradient-label">Angle:</span>
            <input
              class="gradient-angle-input"
              type="number"
              min="0"
              max="360"
              bind:value={gradientAngle}
            />
            <span class="gradient-unit">deg</span>
            <input
              class="gradient-angle-slider"
              type="range"
              min="0"
              max="360"
              bind:value={gradientAngle}
            />
          </div>

          <div class="gradient-row">
            <span class="gradient-label">Size:</span>
            <div class="gradient-style-buttons">
              {#each gradientSizeOptions as opt}
                <button
                  class="style-btn size-btn"
                  class:active={gradientSize === opt.value}
                  type="button"
                  title={opt.title}
                  on:click={() => { gradientSize = opt.value; }}
                >{opt.label}</button>
              {/each}
            </div>
          </div>

          <div class="gradient-row">
            <label class="gradient-checkbox-label">
              <input type="checkbox" bind:checked={gradientReverse} />
              Reverse
            </label>
          </div>

          <!-- Gradient stop bar -->
          <div class="gradient-stop-bar-wrapper">
            <div class="gradient-stop-handles">
              {#each gradientStops as stop, i}
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                  class="gradient-stop-handle"
                  class:selected={selectedStopIndex === i}
                  style="left: {stop.position}%; --stop-color: {stopColor(stop, paletteComputed)}"
                  on:mousedown|stopPropagation={(e) => handleStopHandleMouseDown(e, i)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') removeGradientStop(i);
                  }}
                >
                  <div class="stop-swatch" style="background: {stopColor(stop, paletteComputed)}"></div>
                  <div class="stop-arrow"></div>
                </div>
              {/each}
            </div>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <div
              class="gradient-stop-bar"
              style="background: {gradientBarPreview}"
              on:mousedown={handleStopBarMouseDown}
              role="slider"
              tabindex="0"
              aria-label="Gradient stops"
              aria-valuenow={gradientStops[selectedStopIndex]?.position ?? 0}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>

          <!-- Selected stop controls -->
          {#if gradientStops[selectedStopIndex]}
            <div class="gradient-row stop-controls">
              <span class="gradient-label">Color:</span>
              <select
                class="gradient-select"
                bind:value={gradientStops[selectedStopIndex].paletteLabel}
                on:change={() => { gradientStops = gradientStops; }}
              >
                {#each paletteComputed as ps}
                  <option value={ps.label}>{ps.label}</option>
                {/each}
              </select>
              <div class="stop-color-preview" style="background: {stopColor(gradientStops[selectedStopIndex], paletteComputed)}"></div>
              <span class="gradient-label">Pos:</span>
              <input
                class="gradient-pos-input"
                type="number"
                min="0"
                max="100"
                bind:value={gradientStops[selectedStopIndex].position}
                on:change={() => { gradientStops = gradientStops; }}
              />
              <span class="gradient-unit">%</span>
              {#if gradientStops.length > 2}
                <button
                  class="stop-remove-btn"
                  type="button"
                  title="Remove stop"
                  on:click={() => removeGradientStop(selectedStopIndex)}
                >&times;</button>
              {/if}
            </div>
          {/if}
        </div>
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
      {@const textEditorOpen = scaleEditorOpen[scale.title] ?? false}
      <div class="scale-section">
        <div class="scale-header">
          <h4 class="scale-title">{scale.title}</h4>
          <button
            class="edit-toggle"
            class:active={snappedScales.has(scale.title)}
            type="button"
            on:click={() => toggleSnapAll(scale)}
          >{snappedScales.has(scale.title) ? 'Unsnap' : 'Snap All'}</button>
          <button class="edit-toggle" type="button" on:click={() => clearScaleOverrides(scale)}>Clear Overrides</button>
          <button
            class="edit-toggle"
            type="button"
            on:click={() => { scaleEditorOpen[scale.title] = !scaleEditorOpen[scale.title]; scaleEditorOpen = scaleEditorOpen; }}
          >{textEditorOpen ? 'Close' : 'Edit'}</button>
        </div>
        <div class="swatch-grid" style="--swatch-cols: {scale.steps.length}; --swatch-gap: var(--space-8)">
          {#each scale.steps as step}
            {@const k = stepKey(scale.title, step.name)}
            {@const hex = effectiveColor(k, step, scale.title, curveVersion)}
            <div class="step-column">
              <button class="step-label copyable-label" class:copied={copiedLabelKey === k} type="button" on:click={() => { const v = scaleToCssVar(scale.title, step.name); if (v) copyVarName(k, v); }}>
                {copiedLabelKey === k ? 'copied!' : step.name}
              </button>
              <div
                class="swatch derived text-swatch"
                class:dimmed={k in overrides}
                class:clickable={k in overrides}
                on:click={() => resetOverride(k)}
                role={k in overrides ? 'button' : undefined}
                tabindex={k in overrides ? 0 : undefined}
                on:keydown={(e) => k in overrides && e.key === 'Enter' && resetOverride(k)}
              >
                <span style="color: {derivedHex(step, baseColor, scale.title, curveVersion)}">Ag</span>
              </div>
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <div
                class="swatch override-slot text-swatch"
                class:active={editingKey === k}
                class:populated={k in overrides}
                class:matching={k in overrides && overrides[k] === derivedHex(step, baseColor, scale.title, curveVersion)}
                on:click={() => handleOverrideClick(k, step, scale.title)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && handleOverrideClick(k, step, scale.title)}
              >
                {#if k in overrides}
                  <span style="color: {overrides[k]}">Ag</span>
                {/if}
              </div>
              <button
                class="step-hex"
                class:copied={copiedKey === k}
                type="button"
                on:click={() => copyHex(k, hex)}
              >{copiedKey === k ? 'copied!' : hex}</button>
            </div>
          {/each}
        {#if textEditorOpen}
          <div class="curve-grid-span" style="grid-column: 1 / -1">
            {#each [
              { key: getScaleCurveKey(scale.title, 'lightness'), anchors: scaleCurves[scale.title].lightness, cfg: textLightnessCurveConfig, defaults: defaultScaleCurves[scale.title].lightness(), set: setScaleCurve.bind(null, scale.title, 'lightness') },
              { key: getScaleCurveKey(scale.title, 'saturation'), anchors: scaleCurves[scale.title].saturation, cfg: saturationCurveConfig, defaults: defaultScaleCurves[scale.title].saturation(), set: setScaleCurve.bind(null, scale.title, 'saturation') },
            ] as curve (curve.key)}
              <BezierCurveEditor
                anchors={curve.anchors}
                cfg={curve.cfg}
                stepCount={scale.steps.length}
                defaultAnchors={curve.defaults}
                offset={curveOffset[curve.key] ?? 0}
                onAnchorsChange={curve.set}
                onOffsetChange={(v) => handleOffset(curve.key, v)}
              />
            {/each}
          </div>
        {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Surfaces & Borders — per-scale editors -->
  <div class="scales-row">
    {#each scales.filter(s => !s.isText) as scale}
      {@const cfg = configForScale(scale.title)}
      {@const editorOpen = scaleEditorOpen[scale.title] ?? false}
      <div class="scale-section">
        <div class="scale-header">
          <h4 class="scale-title">{scale.title}</h4>
          <button
            class="edit-toggle"
            class:active={snappedScales.has(scale.title)}
            type="button"
            on:click={() => toggleSnapAll(scale)}
          >{snappedScales.has(scale.title) ? 'Unsnap' : 'Snap All'}</button>
          <button class="edit-toggle" type="button" on:click={() => clearScaleOverrides(scale)}>Clear Overrides</button>
          <button
            class="edit-toggle"
            type="button"
            on:click={() => { scaleEditorOpen[scale.title] = !scaleEditorOpen[scale.title]; scaleEditorOpen = scaleEditorOpen; }}
          >{editorOpen ? 'Close' : 'Edit'}</button>
        </div>
        <div class="swatch-grid" style="--swatch-cols: {scale.steps.length}; --swatch-gap: var(--space-8)">
          {#each scale.steps as step}
            {@const k = stepKey(scale.title, step.name)}
            {@const hex = effectiveColor(k, step, scale.title, curveVersion)}
            <div class="step-column">
              <button class="step-label copyable-label" class:copied={copiedLabelKey === k} type="button" on:click={() => { const v = scaleToCssVar(scale.title, step.name); if (v) copyVarName(k, v); }}>
                {copiedLabelKey === k ? 'copied!' : step.name}
              </button>
              <div
                class="swatch derived"
                class:border-preview={scale.title === 'Borders'}
                class:dimmed={k in overrides}
                class:clickable={k in overrides}
                style={scale.title === 'Borders'
                  ? `border: 3px solid ${derivedHex(step, baseColor, scale.title, curveVersion)}`
                  : `background: ${derivedHex(step, baseColor, scale.title, curveVersion)}`}
                on:click={() => resetOverride(k)}
                role={k in overrides ? 'button' : undefined}
                tabindex={k in overrides ? 0 : undefined}
                on:keydown={(e) => k in overrides && e.key === 'Enter' && resetOverride(k)}
              ></div>
              <div class="override-slot-wrapper">
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                  class="swatch override-slot"
                  class:border-preview={scale.title === 'Borders'}
                  class:active={editingKey === k || snapPickerKey === k}
                  class:populated={k in overrides}
                  class:matching={k in overrides && overrides[k] === derivedHex(step, baseColor, scale.title, curveVersion)}
                  on:click={() => snappedScales.has(scale.title) ? handleSnappedClick(k) : handleOverrideClick(k, step, scale.title)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && (snappedScales.has(scale.title) ? handleSnappedClick(k) : handleOverrideClick(k, step, scale.title))}
                >
                  {#if k in overrides}
                    {#if scale.title === 'Borders'}
                      <div class="override-fill border-fill" style="border: 3px solid {overrides[k]}"></div>
                    {:else}
                      <div class="override-fill" style="background: {overrides[k]}"></div>
                    {/if}
                    {#if snappedScales.has(scale.title)}
                      {@const plabel = paletteComputed.find(ps => ps.hex === overrides[k])?.label ?? null}
                      {#if plabel}
                        <span class="palette-step-label">{plabel}</span>
                      {/if}
                    {/if}
                  {/if}
                </div>
                {#if snapPickerKey === k}
                  <div class="snap-picker">
                    {#each paletteComputed as ps}
                      <button
                        class="snap-picker-item"
                        class:selected={overrides[k] === ps.hex}
                        type="button"
                        on:click={() => selectSnapValue(k, ps.hex, scale.title)}
                      >
                        <span class="snap-picker-swatch" style="background: {ps.hex}"></span>
                        <span class="snap-picker-label">{ps.label}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              <button
                class="step-hex"
                class:copied={copiedKey === k}
                type="button"
                on:click={() => copyHex(k, hex)}
              >{copiedKey === k ? 'copied!' : hex}</button>
            </div>
          {/each}
        {#if editorOpen}
          <div class="curve-grid-span" style="grid-column: 1 / -1">
            {#each [
              { key: getScaleCurveKey(scale.title, 'lightness'), anchors: scaleCurves[scale.title].lightness, cfg: lightnessCurveConfig, defaults: defaultScaleCurves[scale.title].lightness(), set: setScaleCurve.bind(null, scale.title, 'lightness') },
              { key: getScaleCurveKey(scale.title, 'saturation'), anchors: scaleCurves[scale.title].saturation, cfg: saturationCurveConfig, defaults: defaultScaleCurves[scale.title].saturation(), set: setScaleCurve.bind(null, scale.title, 'saturation') },
            ] as curve (curve.key)}
              <BezierCurveEditor
                anchors={curve.anchors}
                cfg={curve.cfg}
                stepCount={scale.steps.length}
                defaultAnchors={curve.defaults}
                offset={curveOffset[curve.key] ?? 0}
                onAnchorsChange={curve.set}
                onOffsetChange={(v) => handleOffset(curve.key, v)}
              />
            {/each}
          </div>
        {/if}
        </div>
      </div>
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
        <button class="step-label copyable-label" class:copied={copiedLabelKey === 'gray-white'} type="button" on:click={() => copyVarName('gray-white', `--color-${cssNamespace}-white`)}>
          {copiedLabelKey === 'gray-white' ? 'copied!' : 'white'}
        </button>
        <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
      </div>
      {#each grayEffective as g}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === g.key} type="button" on:click={() => copyVarName(g.key, `--color-${cssNamespace}-${g.step.label}`)}>
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
            on:click={() => copyHex(g.key, g.effective)}
          >{copiedKey === g.key ? 'copied!' : g.effective}</button>
        </div>
      {/each}
      <div class="step-column">
        <button class="step-label copyable-label" class:copied={copiedLabelKey === 'gray-black'} type="button" on:click={() => copyVarName('gray-black', `--color-${cssNamespace}-black`)}>
          {copiedLabelKey === 'gray-black' ? 'copied!' : 'black'}
        </button>
        <div class="swatch gray-swatch bookend" style="background: #000000"></div>
      </div>
    {#if grayEditorOpen}
      <div class="curve-grid-span" style="grid-column: 2 / {graySteps.length + 2}">
        {#each [
          { key: 'gray-lightness', anchors: grayLightnessCurve, cfg: lightnessCurveConfig, defaults: DEFAULT_GRAY_LIGHTNESS(), set: setGrayLightnessCurve },
          { key: 'gray-saturation', anchors: graySaturationCurve, cfg: saturationCurveConfig, defaults: DEFAULT_GRAY_SATURATION(), set: setGraySaturationCurve },
        ] as curve (curve.key)}
          <BezierCurveEditor
            anchors={curve.anchors}
            cfg={curve.cfg}
            stepCount={graySteps.length}
            defaultAnchors={curve.defaults}
            offset={curveOffset[curve.key] ?? 0}
            onAnchorsChange={curve.set}
            onOffsetChange={(v) => handleOffset(curve.key, v)}
          />
        {/each}
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
    {@const textEditorOpen = scaleEditorOpen[scale.title] ?? false}
    <div class="scale-section">
      <div class="scale-header">
        <h4 class="scale-title">{scale.title}</h4>
        <button
          class="edit-toggle"
          class:active={snappedScales.has(scale.title)}
          type="button"
          on:click={() => toggleSnapAll(scale)}
        >{snappedScales.has(scale.title) ? 'Unsnap' : 'Snap All'}</button>
        <button class="edit-toggle" type="button" on:click={() => clearScaleOverrides(scale)}>Clear Overrides</button>
        <button
          class="edit-toggle"
          type="button"
          on:click={() => { scaleEditorOpen[scale.title] = !scaleEditorOpen[scale.title]; scaleEditorOpen = scaleEditorOpen; }}
        >{textEditorOpen ? 'Close' : 'Edit'}</button>
      </div>
      <div class="swatch-grid" style="--swatch-cols: {scale.steps.length}; --swatch-gap: var(--space-8)">
        {#each scale.steps as step}
          {@const k = stepKey(scale.title, step.name)}
          {@const hex = effectiveColor(k, step, scale.title, curveVersion)}
          <div class="step-column">
            <button class="step-label copyable-label" class:copied={copiedLabelKey === k} type="button" on:click={() => { const v = scaleToCssVar(scale.title, step.name); if (v) copyVarName(k, v); }}>
              {copiedLabelKey === k ? 'copied!' : step.name}
            </button>
            <div
              class="swatch derived text-swatch"
              class:dimmed={k in overrides}
              class:clickable={k in overrides}
              on:click={() => resetOverride(k)}
              role={k in overrides ? 'button' : undefined}
              tabindex={k in overrides ? 0 : undefined}
              on:keydown={(e) => k in overrides && e.key === 'Enter' && resetOverride(k)}
            >
              <span style="color: {derivedHex(step, gray500Hex, scale.title, curveVersion)}">Ag</span>
            </div>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <div
              class="swatch override-slot text-swatch"
              class:active={editingKey === k}
              class:populated={k in overrides}
              class:matching={k in overrides && overrides[k] === derivedHex(step, gray500Hex, scale.title, curveVersion)}
              on:click={() => handleOverrideClick(k, step, scale.title)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && handleOverrideClick(k, step, scale.title)}
            >
              {#if k in overrides}
                <span style="color: {overrides[k]}">Ag</span>
              {/if}
            </div>
            <button
              class="step-hex"
              class:copied={copiedKey === k}
              type="button"
              on:click={() => copyHex(k, hex)}
            >{copiedKey === k ? 'copied!' : hex}</button>
          </div>
        {/each}
      {#if textEditorOpen}
        <div class="curve-grid-span" style="grid-column: 1 / -1">
          {#each [
            { key: getScaleCurveKey(scale.title, 'lightness'), anchors: scaleCurves[scale.title].lightness, cfg: textLightnessCurveConfig, defaults: defaultScaleCurves[scale.title].lightness(), set: setScaleCurve.bind(null, scale.title, 'lightness') },
            { key: getScaleCurveKey(scale.title, 'saturation'), anchors: scaleCurves[scale.title].saturation, cfg: saturationCurveConfig, defaults: defaultScaleCurves[scale.title].saturation(), set: setScaleCurve.bind(null, scale.title, 'saturation') },
          ] as curve (curve.key)}
            <BezierCurveEditor
              anchors={curve.anchors}
              cfg={curve.cfg}
              stepCount={scale.steps.length}
              defaultAnchors={curve.defaults}
              offset={curveOffset[curve.key] ?? 0}
              onAnchorsChange={curve.set}
              onOffsetChange={(v) => handleOffset(curve.key, v)}
            />
          {/each}
        </div>
      {/if}
      </div>
    </div>
  {/each}
  </div>
  <!-- Surfaces & Borders for gray mode -->
  <div class="scales-row">
    {#each grayScales.filter(s => !s.isText) as scale}
      {@const editorOpen = scaleEditorOpen[scale.title] ?? false}
      <div class="scale-section">
        <div class="scale-header">
          <h4 class="scale-title">{scale.title}</h4>
          <button class="edit-toggle" type="button" on:click={() => clearScaleOverrides(scale)}>Clear Overrides</button>
          <button
            class="edit-toggle"
            type="button"
            on:click={() => { scaleEditorOpen[scale.title] = !scaleEditorOpen[scale.title]; scaleEditorOpen = scaleEditorOpen; }}
          >{editorOpen ? 'Close' : 'Edit'}</button>
        </div>
        <div class="swatch-grid" style="--swatch-cols: {scale.steps.length}; --swatch-gap: var(--space-8)">
          {#each scale.steps as step}
            {@const k = stepKey(scale.title, step.name)}
            {@const hex = effectiveColor(k, step, scale.title, curveVersion)}
            <div class="step-column">
              <button class="step-label copyable-label" class:copied={copiedLabelKey === k} type="button" on:click={() => { const v = scaleToCssVar(scale.title, step.name); if (v) copyVarName(k, v); }}>
                {copiedLabelKey === k ? 'copied!' : step.name}
              </button>
              <div
                class="swatch derived"
                class:border-preview={scale.title === 'Borders'}
                class:dimmed={k in overrides}
                class:clickable={k in overrides}
                style={scale.title === 'Borders'
                  ? `border: 3px solid ${derivedHex(step, gray500Hex, scale.title, curveVersion)}`
                  : `background: ${derivedHex(step, gray500Hex, scale.title, curveVersion)}`}
                on:click={() => resetOverride(k)}
                role={k in overrides ? 'button' : undefined}
                tabindex={k in overrides ? 0 : undefined}
                on:keydown={(e) => k in overrides && e.key === 'Enter' && resetOverride(k)}
              ></div>
              <div class="override-slot-wrapper">
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                  class="swatch override-slot"
                  class:border-preview={scale.title === 'Borders'}
                  class:active={editingKey === k}
                  class:populated={k in overrides}
                  class:matching={k in overrides && overrides[k] === derivedHex(step, gray500Hex, scale.title, curveVersion)}
                  on:click={() => handleOverrideClick(k, step, scale.title)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && handleOverrideClick(k, step, scale.title)}
                >
                  {#if k in overrides}
                    {#if scale.title === 'Borders'}
                      <div class="override-fill border-fill" style="border: 3px solid {overrides[k]}"></div>
                    {:else}
                      <div class="override-fill" style="background: {overrides[k]}"></div>
                    {/if}
                  {/if}
                </div>
              </div>
              <button
                class="step-hex"
                class:copied={copiedKey === k}
                type="button"
                on:click={() => copyHex(k, hex)}
              >{copiedKey === k ? 'copied!' : hex}</button>
            </div>
          {/each}
        {#if editorOpen}
          <div class="curve-grid-span" style="grid-column: 1 / -1">
            {#each [
              { key: getScaleCurveKey(scale.title, 'lightness'), anchors: scaleCurves[scale.title].lightness, cfg: lightnessCurveConfig, defaults: defaultScaleCurves[scale.title].lightness(), set: setScaleCurve.bind(null, scale.title, 'lightness') },
              { key: getScaleCurveKey(scale.title, 'saturation'), anchors: scaleCurves[scale.title].saturation, cfg: saturationCurveConfig, defaults: defaultScaleCurves[scale.title].saturation(), set: setScaleCurve.bind(null, scale.title, 'saturation') },
            ] as curve (curve.key)}
              <BezierCurveEditor
                anchors={curve.anchors}
                cfg={curve.cfg}
                stepCount={scale.steps.length}
                defaultAnchors={curve.defaults}
                offset={curveOffset[curve.key] ?? 0}
                onAnchorsChange={curve.set}
                onOffsetChange={(v) => handleOffset(curve.key, v)}
              />
            {/each}
          </div>
        {/if}
        </div>
      </div>
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
      onHueChromaChange={(h, c) => { tintHue = h; tintChroma = c; }}
      onColorChange={handleColorChange}
      onConfirm={confirmEdit}
      onCancel={cancelEdit}
      onRemoveOverride={() => editingKey && removeOverride(editingKey)}
    />
  {/if}
</div>

<style>
  .palette-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-20);
    padding: var(--space-16) var(--space-16) var(--space-24);
    background: none;
    border: none;
    border-bottom: 1px solid var(--ui-border-faint);
    font-family: var(--ui-font-sans);
    min-width: 0;
  }

  .palette-editor:last-child {
    border-bottom: none;
  }

  .editor-top {
    display: flex;
    align-items: flex-start;
    gap: var(--space-16);
    flex-wrap: wrap;
  }

  .editor-primary {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    flex-shrink: 0;
  }

  .primary-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .header-swatch {
    width: 4rem;
    height: 4rem;
    border-radius: var(--radius-md);
    border: 2px solid var(--ui-border-default);
    flex-shrink: 0;
    cursor: pointer;
  }

  .header-swatch:hover {
    border-color: var(--ui-border-strong);
  }

  .header-swatch.active {
    border-color: var(--ui-border-strong);
    outline: 2px solid var(--ui-border-medium);
    outline-offset: 1px;
  }


  .editor-label {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .base-hex {
    font-size: var(--font-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  .clickable-hex {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: var(--font-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  .clickable-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  /* Scale header with edit button */

  .scale-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .edit-toggle {
    font-size: var(--font-md);
    color: var(--ui-text-tertiary);
    background: none;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-6);
    cursor: pointer;
  }

  .edit-toggle:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .edit-toggle.active {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
    background: var(--ui-surface-high);
  }

  .hidden {
    display: none;
  }

  .derived-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-6) var(--space-4);
    background: none;
    border: none;
    color: var(--ui-text-tertiary);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: color var(--transition-fast);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .derived-toggle:hover {
    color: var(--ui-text-secondary);
  }

  .derived-toggle i {
    font-size: var(--font-xs);
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
    gap: var(--space-6);
    min-width: 0;
    max-width: 100%;
  }

  .scale-title {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
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
    gap: var(--space-2);
    width: auto;
    min-width: 0;
    overflow: visible;
  }

  .step-label {
    font-size: var(--font-sm);
    color: var(--ui-text-secondary);
    text-align: center;
    line-height: 1;
    height: var(--font-xs);
    display: flex;
    align-items: flex-end;
  }

  .step-label.copyable-label {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    font-size: var(--font-sm);
    justify-content: center;
    transition: color var(--transition-fast);
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
    border-radius: var(--radius-sm);
    border: 1px solid var(--ui-border-faint);
  }

  .swatch.text-swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
  }

  .swatch.border-preview {
    background: none;
    border-radius: var(--radius-md);
  }

  .override-fill.border-fill {
    background: none;
    border-radius: var(--radius-sm);
  }

  .swatch.derived.clickable {
    cursor: pointer;
  }

  .swatch.derived.clickable:hover {
    outline: 2px solid var(--ui-border-medium);
    outline-offset: 1px;
  }

  .swatch.derived.dimmed {
    position: relative;
  }

  .swatch.derived.dimmed::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 0.5px),
      white calc(50% - 0.5px),
      white calc(50% + 0.5px),
      transparent calc(50% + 0.5px)
    );
    border-radius: inherit;
  }

  /* Override slot */
  .override-slot {
    border-style: dashed;
    border-color: var(--ui-border-subtle);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .override-slot:hover {
    border-color: var(--ui-border-medium);
  }

  .override-slot.active {
    border-color: var(--ui-border-strong);
    outline: 1px solid var(--ui-border-medium);
    outline-offset: 1px;
  }

  .override-slot.populated {
    border-color: var(--ui-border-medium);
  }

  .override-slot.matching::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 0.5px),
      white calc(50% - 0.5px),
      white calc(50% + 0.5px),
      transparent calc(50% + 0.5px)
    );
    border-radius: inherit;
    pointer-events: none;
  }

  .override-fill {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .palette-step-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    pointer-events: none;
    z-index: 1;
  }

  .override-slot-wrapper {
    position: relative;
  }

  .snap-picker {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    margin-top: var(--space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-medium);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: 1px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 5.5rem;
  }

  .snap-picker-item {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-2) var(--space-6);
    border: none;
    background: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--ui-text-secondary);
    font-size: var(--font-md);
    font-family: var(--ui-font-mono);
    white-space: nowrap;
  }

  .snap-picker-item:hover {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .snap-picker-item.selected {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
    font-weight: var(--font-weight-semibold);
  }

  .snap-picker-swatch {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ui-border-faint);
    flex-shrink: 0;
  }

  .snap-picker-label {
    line-height: 1;
  }

  /* Step hex values */

  .step-hex {
    font-size: var(--font-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    padding: 1px var(--space-2);
    border-radius: var(--radius-sm);
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
    gap: var(--space-4) var(--swatch-gap, var(--space-4));
    align-items: start;
    justify-content: start;
    min-width: 0;
    max-width: calc(var(--swatch-cols) * 4rem + (var(--swatch-cols) - 1) * var(--swatch-gap, var(--space-4)));
  }

  .curve-grid-span {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .swatch.gray-swatch {
    width: 100%;
    height: calc(4rem + var(--space-2));
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
    gap: var(--space-6);
    font-size: var(--font-md);
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
    font-size: var(--font-md);
    font-weight: bold;
    color: black;
    line-height: 1;
  }

  /* Gradient controls */
  .gradient-controls {
    margin-top: var(--space-8);
    padding: var(--space-12);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .gradient-row {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .gradient-label {
    font-size: var(--font-md);
    color: var(--ui-text-secondary);
    min-width: 36px;
    flex-shrink: 0;
  }

  .gradient-style-buttons {
    display: flex;
    gap: var(--space-2);
  }

  .style-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    background: var(--ui-surface-lowest);
    color: var(--ui-text-secondary);
    cursor: pointer;
    font-size: var(--font-md);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .style-btn.active {
    border-color: var(--ui-text-secondary);
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .style-btn:hover {
    border-color: var(--ui-border-medium);
  }

  .size-btn {
    width: auto;
    padding: 0 8px;
  }

  .gradient-angle-input,
  .gradient-pos-input {
    width: 52px;
    padding: 2px 6px;
    font-size: var(--font-md);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    color: var(--ui-text-primary);
    text-align: center;
  }

  .gradient-angle-slider {
    flex: 1;
    min-width: 60px;
    height: 4px;
    accent-color: var(--ui-text-secondary);
  }

  .gradient-unit {
    font-size: var(--font-md);
    color: var(--ui-text-tertiary);
  }

  .gradient-checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    font-size: var(--font-md);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .gradient-checkbox-label input {
    margin: 0;
    cursor: pointer;
  }

  .gradient-select {
    padding: 2px 6px;
    font-size: var(--font-md);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    color: var(--ui-text-primary);
  }

  .stop-color-preview {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ui-border-subtle);
    flex-shrink: 0;
  }

  .gradient-stop-bar-wrapper {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .gradient-stop-handles {
    position: relative;
    height: 28px;
  }

  .gradient-stop-bar {
    position: relative;
    height: 24px;
    border-radius: var(--radius-md);
    border: 1px solid var(--ui-border-subtle);
    cursor: crosshair;
  }

  .gradient-stop-handle {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: grab;
    z-index: 1;
  }

  .gradient-stop-handle.selected {
    z-index: 2;
  }

  .stop-swatch {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--ui-border-medium);
    flex-shrink: 0;
  }

  .gradient-stop-handle.selected .stop-swatch {
    border-color: var(--ui-text-primary);
  }

  .gradient-stop-handle:hover .stop-swatch {
    border-color: var(--ui-text-secondary);
  }

  .stop-arrow {
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid var(--ui-border-medium);
  }

  .gradient-stop-handle.selected .stop-arrow {
    border-top-color: var(--ui-text-primary);
  }

  .gradient-stop-handle:hover .stop-arrow {
    border-top-color: var(--ui-text-secondary);
  }

  .stop-controls {
    flex-wrap: wrap;
  }

  .stop-remove-btn {
    width: 20px;
    height: 20px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    background: var(--ui-surface-lowest);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    font-size: var(--font-md);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: auto;
  }

  .stop-remove-btn:hover {
    border-color: var(--ui-border-strong);
    color: var(--ui-text-primary);
  }

  /* Narrow desktop: tighten palette editor spacing */
  @media (max-width: 1280px) {
    .palette-editor {
      padding: var(--space-12) var(--space-12) var(--space-20);
    }
    .scales-row {
      gap: var(--space-24);
    }
    .header-swatch {
      width: 3rem;
      height: 3rem;
    }
  }

  @media (max-width: 1024px) {
    .scales-row {
      gap: var(--space-16);
    }
  }
</style>
