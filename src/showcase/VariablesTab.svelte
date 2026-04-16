<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PaletteEditor from './PaletteEditor.svelte';
  import { setCssVar, removeCssVar } from '../lib/cssVarSync';
  import { storageKey } from '../lib/editorConfig';
  import type { PaletteConfig } from '../lib/tokenTypes';

  export let saveSignal: number = 0;

  // Column-layout tokens. Values are kept as plain numbers for the editor
  // controls; the corresponding CSS vars (--columns-*) are written back on
  // every change so the live overlay (see ColumnsOverlay.svelte) updates
  // immediately.
  let columnsCount = 12;
  let columnsMaxWidth = 1440;
  let columnsGutter = 16;
  let columnsMargin = 0;

  function readColumnsTokens() {
    const cs = getComputedStyle(document.documentElement);
    const cols = parseInt(cs.getPropertyValue('--columns-count').trim(), 10);
    if (!Number.isNaN(cols) && cols > 0) columnsCount = cols;
    const maxW = parseFloat(cs.getPropertyValue('--columns-max-width'));
    if (!Number.isNaN(maxW)) columnsMaxWidth = Math.round(maxW);
    const gutter = parseFloat(cs.getPropertyValue('--columns-gutter'));
    if (!Number.isNaN(gutter)) columnsGutter = Math.round(gutter);
    const margin = parseFloat(cs.getPropertyValue('--columns-margin'));
    if (!Number.isNaN(margin)) columnsMargin = Math.round(margin);
  }

  function clampNum(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  function setColumnsCount(n: number) {
    columnsCount = clampNum(n, 1, 24);
    setCssVar('--columns-count', String(columnsCount));
  }
  function setColumnsMaxWidth(px: number) {
    columnsMaxWidth = clampNum(px, 320, 2560);
    setCssVar('--columns-max-width', `${columnsMaxWidth}px`);
  }
  function setColumnsGutter(px: number) {
    columnsGutter = clampNum(px, 0, 200);
    setCssVar('--columns-gutter', `${columnsGutter}px`);
  }
  function setColumnsMargin(px: number) {
    columnsMargin = clampNum(px, 0, 400);
    setCssVar('--columns-margin', `${columnsMargin}px`);
  }

  let columnsObserver: MutationObserver | null = null;

  // Snapshot of the inline --columns-* values at mount time. A null entry
  // means the property was *not* inline on :root when the editor opened, so
  // reset should remove the inline override (letting variables.css win).
  const COLUMNS_TOKENS = [
    '--columns-count',
    '--columns-max-width',
    '--columns-gutter',
    '--columns-margin',
  ] as const;
  let columnsInitialSnapshot: Record<string, string | null> = {};

  function resetColumns() {
    for (const name of COLUMNS_TOKENS) {
      const initial = columnsInitialSnapshot[name];
      if (initial) {
        setCssVar(name, initial);
      } else {
        removeCssVar(name);
      }
    }
    // MutationObserver will pick up the style change and re-sync the numeric
    // state via readColumnsTokens().
  }

  onMount(() => {
    const style = document.documentElement.style;
    for (const name of COLUMNS_TOKENS) {
      columnsInitialSnapshot[name] = style.getPropertyValue(name) || null;
    }
    readColumnsTokens();
    columnsObserver = new MutationObserver(readColumnsTokens);
    columnsObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
  });

  onDestroy(() => {
    columnsObserver?.disconnect();
  });

  let editors: PaletteEditor[] = [];

  // Map of editor label → array index (matches template order)
  const EDITOR_LABELS = ['Neutral', 'Alternate', 'Background', 'Primary', 'Accent', 'Special', 'Success', 'Warning', 'Info', 'Danger'];

  /** Called by VisualsTab when a token file is loaded. */
  export function loadAllConfigs(configs: Record<string, PaletteConfig>) {
    for (let i = 0; i < EDITOR_LABELS.length; i++) {
      const config = configs[EDITOR_LABELS[i]];
      if (config && editors[i]) {
        editors[i].loadConfig(config);
      }
    }
  }

  interface TokenItem {
    variable: string;
    value: string;
  }

  interface TokenGroup {
    title: string;
    tokens: TokenItem[];
  }

  const spacingTokens: TokenItem[] = [
    { variable: '--space-2', value: '0.125rem (2px)' },
    { variable: '--space-4', value: '0.25rem (4px)' },
    { variable: '--space-6', value: '0.375rem (6px)' },
    { variable: '--space-8', value: '0.5rem (8px)' },
    { variable: '--space-10', value: '0.625rem (10px)' },
    { variable: '--space-12', value: '0.75rem (12px)' },
    { variable: '--space-16', value: '1rem (16px)' },
    { variable: '--space-20', value: '1.25rem (20px)' },
    { variable: '--space-24', value: '1.5rem (24px)' },
    { variable: '--space-32', value: '2rem (32px)' },
    { variable: '--space-48', value: '3rem (48px)' }
  ];

  const radiusTokens: TokenItem[] = [
    { variable: '--radius-sm', value: '0.125rem (2px)' },
    { variable: '--radius-md', value: '0.25rem (4px)' },
    { variable: '--radius-lg', value: '0.375rem (6px)' },
    { variable: '--radius-xl', value: '0.5rem (8px)' },
    { variable: '--radius-2xl', value: '0.625rem (10px)' },
    { variable: '--radius-3xl', value: '0.75rem (12px)' },
    { variable: '--radius-full', value: '1.25rem (20px)' }
  ];

  const fontSizeTokens: TokenItem[] = [
    { variable: '--font-xs', value: '0.875rem (14px)' },
    { variable: '--font-sm', value: '1rem (16px)' },
    { variable: '--font-md', value: '1.125rem (18px)' },
    { variable: '--font-lg', value: '1.25rem (20px)' },
    { variable: '--font-xl', value: '1.375rem (22px)' },
    { variable: '--font-2xl', value: '1.625rem (26px)' },
    { variable: '--font-3xl', value: '2rem (32px)' },
    { variable: '--font-4xl', value: '2.5rem (40px)' },
    { variable: '--font-5xl', value: '3rem (48px)' },
    { variable: '--font-6xl', value: '3.5rem (56px)' }
  ];

  const fontWeightTokens: TokenItem[] = [
    { variable: '--font-weight-thin', value: '100' },
    { variable: '--font-weight-light', value: '200' },
    { variable: '--font-weight-medium', value: '300' },
    { variable: '--font-weight-semibold', value: '500' },
    { variable: '--font-weight-bold', value: '800' }
  ];

  const lineHeightTokens: TokenItem[] = [
    { variable: '--line-height-tight', value: '1' },
    { variable: '--line-height-snug', value: '1.2' },
    { variable: '--line-height-normal', value: '1.4' },
    { variable: '--line-height-relaxed', value: '1.5' },
    { variable: '--line-height-loose', value: '2' }
  ];

  interface ShadowToken {
    variable: string;
    value: string;
    x: number;
    y: number;
    blur: number;
    spread: number;
    opacity: number;
    hue: number;
    saturation: number;
    lightness: number;
    angle: number;
    distance: number;
  }

  function computeXY(angle: number, distance: number): { x: number; y: number } {
    const rad = angle * (Math.PI / 180);
    return {
      x: Math.round(-distance * Math.cos(rad)),
      y: Math.round(distance * Math.sin(rad))
    };
  }

  function computeAngleDistance(x: number, y: number): { angle: number; distance: number } {
    const distance = Math.round(Math.sqrt(x * x + y * y));
    if (distance === 0) return { angle: 135, distance: 0 };
    let angle = Math.atan2(y, -x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return { angle: Math.round(angle), distance };
  }

  function initShadow(variable: string, value: string, x: number, y: number, blur: number, spread: number, opacity: number, hue: number, saturation: number, lightness: number): ShadowToken {
    const { angle, distance } = computeAngleDistance(x, y);
    return { variable, value, x, y, blur, spread, opacity, hue, saturation, lightness, angle, distance };
  }

  function parseShadowFromCss(variable: string): ShadowToken | null {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    if (!raw) return null;
    const m = raw.match(/^(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(-?\d+)px\s+hsla\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)$/);
    if (!m) return null;
    const x = parseInt(m[1], 10);
    const y = parseInt(m[2], 10);
    const blur = parseInt(m[3], 10);
    const spread = parseInt(m[4], 10);
    const hue = Math.round(parseFloat(m[5]));
    const saturation = Math.round(parseFloat(m[6]));
    const lightness = Math.round(parseFloat(m[7]));
    const opacity = parseFloat(m[8]);
    const { angle, distance } = computeAngleDistance(x, y);
    return { variable, value: `${x} ${y} ${blur}px`, x, y, blur, spread, opacity, hue, saturation, lightness, angle, distance };
  }

  const shadowVariableNames = [
    '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl',
    '--shadow-app', '--shadow-focus', '--shadow-glow-green', '--shadow-card', '--shadow-overlay'
  ];

  let shadowTokens: ShadowToken[] = shadowVariableNames.map(v =>
    parseShadowFromCss(v) ?? initShadow(v, '0 0 0', 0, 0, 0, 0, 0.1, 0, 0, 0)
  );

  // Scale tokens that interpolate between global min/max
  const scaleVariables = new Set(['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl']);

  // Global shadow settings — persisted to localStorage so HMR / remounts don't reset
  const SHADOW_STORAGE_KEY = storageKey('shadow-globals');

  interface ShadowGlobals {
    globalAngle: number;
    globalOpacityMin: number;
    globalOpacityMax: number;
    opacityLocked: boolean;
    globalDistanceMin: number;
    globalDistanceMax: number;
    globalBlurMin: number;
    globalBlurMax: number;
    blurLocked: boolean;
    globalSizeMin: number;
    globalSizeMax: number;
    sizeLocked: boolean;
    globalHue: number;
    globalSaturation: number;
    globalLightness: number;
    overrides: Record<string, { angle: boolean; opacity: boolean; color: boolean; distance: boolean; blur: boolean; size: boolean }>;
    tokens: Array<{ variable: string; x: number; y: number; blur: number; spread: number; opacity: number; hue: number; saturation: number; lightness: number; angle: number; distance: number }>;
  }

  function loadShadowGlobals(): Partial<ShadowGlobals> {
    try {
      const raw = localStorage.getItem(SHADOW_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  const saved = loadShadowGlobals();

  let globalAngle = saved.globalAngle ?? 90;
  let globalOpacityMin = saved.globalOpacityMin ?? 0.15;
  let globalOpacityMax = saved.globalOpacityMax ?? 0.15;
  let opacityLocked = saved.opacityLocked ?? true;
  let globalDistanceMin = saved.globalDistanceMin ?? 1;
  let globalDistanceMax = saved.globalDistanceMax ?? 25;
  let globalBlurMin = saved.globalBlurMin ?? 2;
  let globalBlurMax = saved.globalBlurMax ?? 50;
  let blurLocked = saved.blurLocked ?? false;
  let globalSizeMin = saved.globalSizeMin ?? 0;
  let globalSizeMax = saved.globalSizeMax ?? 0;
  let sizeLocked = saved.sizeLocked ?? true;
  let globalHue = saved.globalHue ?? 0;
  let globalSaturation = saved.globalSaturation ?? 0;
  let globalLightness = saved.globalLightness ?? 0;
  let globalDialDrag = false;

  // Per-token overrides: when true, the token ignores global values
  let overrides: Record<string, { angle: boolean; opacity: boolean; color: boolean; distance: boolean; blur: boolean; size: boolean }> = saved.overrides ?? {};

  // Restore per-token values from localStorage
  if (saved.tokens) {
    for (const st of saved.tokens) {
      const token = shadowTokens.find(t => t.variable === st.variable);
      if (token) {
        token.x = st.x; token.y = st.y; token.blur = st.blur; token.spread = st.spread;
        token.opacity = st.opacity; token.hue = st.hue; token.saturation = st.saturation;
        token.lightness = st.lightness; token.angle = st.angle; token.distance = st.distance;
        token.value = `${st.x} ${st.y} ${st.blur}px`;
      }
    }
  }

  function saveShadowGlobals() {
    const data: ShadowGlobals = {
      globalAngle, globalOpacityMin, globalOpacityMax, opacityLocked,
      globalDistanceMin, globalDistanceMax,
      globalBlurMin, globalBlurMax, blurLocked,
      globalSizeMin, globalSizeMax, sizeLocked,
      globalHue, globalSaturation, globalLightness, overrides,
      tokens: shadowTokens.map(t => ({
        variable: t.variable, x: t.x, y: t.y, blur: t.blur, spread: t.spread,
        opacity: t.opacity, hue: t.hue, saturation: t.saturation, lightness: t.lightness,
        angle: t.angle, distance: t.distance,
      })),
    };
    localStorage.setItem(SHADOW_STORAGE_KEY, JSON.stringify(data));
  }

  function getOverride(variable: string) {
    if (!overrides[variable]) overrides[variable] = { angle: false, opacity: false, color: false, distance: false, blur: false, size: false };
    return overrides[variable];
  }

  function applyGlobalAngle() {
    for (const t of shadowTokens) {
      if (scaleVariables.has(t.variable) && !getOverride(t.variable).angle) {
        t.angle = globalAngle;
        const { x, y } = computeXY(t.angle, t.distance);
        t.x = x;
        t.y = y;
        applyShadow(t);
      }
    }
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function applyGlobalOpacity() {
    const eligible = shadowTokens.filter(t => scaleVariables.has(t.variable) && !getOverride(t.variable).opacity);
    if (eligible.length === 0) return;
    const last = eligible.length - 1;
    eligible.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.opacity = Math.round((globalOpacityMin + frac * (globalOpacityMax - globalOpacityMin)) * 100) / 100;
      applyShadow(t);
    });
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function applyGlobalDistance() {
    const eligible = shadowTokens.filter(t => scaleVariables.has(t.variable) && !getOverride(t.variable).distance);
    if (eligible.length === 0) return;
    const last = eligible.length - 1;
    eligible.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.distance = Math.round(globalDistanceMin + frac * (globalDistanceMax - globalDistanceMin));
      const { x, y } = computeXY(t.angle, t.distance);
      t.x = x;
      t.y = y;
      applyShadow(t);
    });
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function applyGlobalBlur() {
    const eligible = shadowTokens.filter(t => scaleVariables.has(t.variable) && !getOverride(t.variable).blur);
    if (eligible.length === 0) return;
    const last = eligible.length - 1;
    eligible.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.blur = Math.round(globalBlurMin + frac * (globalBlurMax - globalBlurMin));
      applyShadow(t);
    });
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function applyGlobalSize() {
    const eligible = shadowTokens.filter(t => scaleVariables.has(t.variable) && !getOverride(t.variable).size);
    if (eligible.length === 0) return;
    const last = eligible.length - 1;
    eligible.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.spread = Math.round(globalSizeMin + frac * (globalSizeMax - globalSizeMin));
      applyShadow(t);
    });
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function applyGlobalColor() {
    for (const t of shadowTokens) {
      if (scaleVariables.has(t.variable) && !getOverride(t.variable).color) {
        t.hue = globalHue;
        t.saturation = globalSaturation;
        t.lightness = globalLightness;
        applyShadow(t);
      }
    }
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function handleGlobalDialDown(event: PointerEvent) {
    globalDialDrag = true;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    globalAngle = angleFromPointer(event, svg);
    applyGlobalAngle();
  }

  function handleGlobalDialMove(event: PointerEvent) {
    if (!globalDialDrag) return;
    const svg = event.currentTarget as SVGSVGElement;
    globalAngle = angleFromPointer(event, svg);
    applyGlobalAngle();
  }

  function handleGlobalDialUp() {
    globalDialDrag = false;
  }

  // HSL gradient helpers for shadow color picker
  function shadowHueGrad(): string {
    return `linear-gradient(to right, ${
      [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${globalSaturation}%,${globalLightness}%)`).join(',')
    })`;
  }
  function shadowSatGrad(): string {
    return `linear-gradient(to right, hsl(${globalHue},0%,${globalLightness}%), hsl(${globalHue},100%,${globalLightness}%))`;
  }
  function shadowLightGrad(): string {
    return `linear-gradient(to right, hsl(${globalHue},${globalSaturation}%,0%), hsl(${globalHue},${globalSaturation}%,50%), hsl(${globalHue},${globalSaturation}%,100%))`;
  }

  let editingShadow: string | null = null;
  let dialDragIdx: number | null = null;

  function getShadowCss(t: ShadowToken): string {
    return `${t.x}px ${t.y}px ${t.blur}px ${t.spread}px hsla(${t.hue}, ${t.saturation}%, ${t.lightness}%, ${t.opacity})`;
  }

  function applyShadow(t: ShadowToken, persist = false) {
    t.value = `${t.x} ${t.y} ${t.blur}px`;
    setCssVar(t.variable, getShadowCss(t));
    if (persist) saveShadowGlobals();
  }

  // Apply restored CSS vars on init
  for (const t of shadowTokens) applyShadow(t);

  function handleAngleChange(idx: number, newAngle: number) {
    const t = shadowTokens[idx];
    t.angle = ((Math.round(newAngle) % 360) + 360) % 360;
    const { x, y } = computeXY(t.angle, t.distance);
    t.x = x;
    t.y = y;
    applyShadow(t);
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function handleDistanceChange(idx: number, newDist: number) {
    const t = shadowTokens[idx];
    t.distance = Math.max(0, Math.round(newDist));
    const { x, y } = computeXY(t.angle, t.distance);
    t.x = x;
    t.y = y;
    applyShadow(t);
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  function angleFromPointer(event: PointerEvent, dialEl: SVGSVGElement): number {
    const rect = dialEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  function handleDialDown(event: PointerEvent, idx: number) {
    dialDragIdx = idx;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    handleAngleChange(idx, angleFromPointer(event, svg));
  }

  function handleDialMove(event: PointerEvent, idx: number) {
    if (dialDragIdx !== idx) return;
    const svg = event.currentTarget as SVGSVGElement;
    handleAngleChange(idx, angleFromPointer(event, svg));
  }

  function handleDialUp() {
    dialDragIdx = null;
  }

  $: editingToken = editingShadow ? shadowTokens.find(t => t.variable === editingShadow) ?? null : null;
  $: editingIdx = editingToken ? shadowTokens.indexOf(editingToken) : -1;
  $: editingIsScale = editingToken ? scaleVariables.has(editingToken.variable) : false;

  function resetToGlobal() {
    if (!editingToken || !editingIsScale) return;
    const eligible = shadowTokens.filter(t => scaleVariables.has(t.variable));
    const pos = eligible.indexOf(editingToken);
    const last = eligible.length - 1;
    const frac = last > 0 ? pos / last : 0.5;
    const ov = getOverride(editingToken.variable);
    // Reset color
    editingToken.hue = globalHue;
    editingToken.saturation = globalSaturation;
    editingToken.lightness = globalLightness;
    ov.color = false;
    // Reset angle
    editingToken.angle = globalAngle;
    ov.angle = false;
    // Reset distance (interpolated)
    editingToken.distance = Math.round(globalDistanceMin + frac * (globalDistanceMax - globalDistanceMin));
    ov.distance = false;
    // Reset blur (interpolated)
    editingToken.blur = Math.round(globalBlurMin + frac * (globalBlurMax - globalBlurMin));
    ov.blur = false;
    // Reset spread (interpolated)
    editingToken.spread = Math.round(globalSizeMin + frac * (globalSizeMax - globalSizeMin));
    ov.size = false;
    // Reset opacity (interpolated)
    editingToken.opacity = Math.round((globalOpacityMin + frac * (globalOpacityMax - globalOpacityMin)) * 100) / 100;
    ov.opacity = false;
    const { x, y } = computeXY(editingToken.angle, editingToken.distance);
    editingToken.x = x;
    editingToken.y = y;
    applyShadow(editingToken);
    overrides = overrides;
    shadowTokens = shadowTokens;
    saveShadowGlobals();
  }

  // Background picker for shadows section
  interface ColorGroup {
    label: string;
    colors: { label: string; value: string }[];
  }

  const bgColorGroups: ColorGroup[] = [
    {
      label: 'Surfaces',
      colors: [
        { label: 'Neutral Lowest', value: 'var(--surface-neutral-lowest)' },
        { label: 'Neutral Lower', value: 'var(--surface-neutral-lower)' },
        { label: 'Neutral Low', value: 'var(--surface-neutral-low)' },
        { label: 'Neutral', value: 'var(--surface-neutral)' },
        { label: 'Neutral High', value: 'var(--surface-neutral-high)' },
        { label: 'Neutral Higher', value: 'var(--surface-neutral-higher)' },
        { label: 'Neutral Highest', value: 'var(--surface-neutral-highest)' },
      ]
    },
    {
      label: 'Alternate',
      colors: [
        { label: 'Lowest', value: 'var(--surface-alternate-lowest)' },
        { label: 'Lower', value: 'var(--surface-alternate-lower)' },
        { label: 'Low', value: 'var(--surface-alternate-low)' },
        { label: 'Base', value: 'var(--surface-alternate)' },
        { label: 'High', value: 'var(--surface-alternate-high)' },
        { label: 'Higher', value: 'var(--surface-alternate-higher)' },
        { label: 'Highest', value: 'var(--surface-alternate-highest)' },
      ]
    },
    {
      label: 'Background',
      colors: [
        { label: 'Lowest', value: 'var(--surface-bg-lowest)' },
        { label: 'Lower', value: 'var(--surface-bg-lower)' },
        { label: 'Low', value: 'var(--surface-bg-low)' },
        { label: 'Base', value: 'var(--surface-bg)' },
        { label: 'High', value: 'var(--surface-bg-high)' },
        { label: 'Higher', value: 'var(--surface-bg-higher)' },
        { label: 'Highest', value: 'var(--surface-bg-highest)' },
      ]
    },
    {
      label: 'Primary',
      colors: [
        { label: 'Lowest', value: 'var(--surface-primary-lowest)' },
        { label: 'Lower', value: 'var(--surface-primary-lower)' },
        { label: 'Low', value: 'var(--surface-primary-low)' },
        { label: 'Base', value: 'var(--surface-primary)' },
        { label: 'High', value: 'var(--surface-primary-high)' },
        { label: 'Higher', value: 'var(--surface-primary-higher)' },
        { label: 'Highest', value: 'var(--surface-primary-highest)' },
      ]
    },
    {
      label: 'Accent',
      colors: [
        { label: 'Lowest', value: 'var(--surface-accent-lowest)' },
        { label: 'Lower', value: 'var(--surface-accent-lower)' },
        { label: 'Low', value: 'var(--surface-accent-low)' },
        { label: 'Base', value: 'var(--surface-accent)' },
        { label: 'High', value: 'var(--surface-accent-high)' },
        { label: 'Higher', value: 'var(--surface-accent-higher)' },
        { label: 'Highest', value: 'var(--surface-accent-highest)' },
      ]
    },
    {
      label: 'Special',
      colors: [
        { label: 'Lowest', value: 'var(--surface-special-lowest)' },
        { label: 'Lower', value: 'var(--surface-special-lower)' },
        { label: 'Low', value: 'var(--surface-special-low)' },
        { label: 'Base', value: 'var(--surface-special)' },
        { label: 'High', value: 'var(--surface-special-high)' },
        { label: 'Higher', value: 'var(--surface-special-higher)' },
        { label: 'Highest', value: 'var(--surface-special-highest)' },
      ]
    },
    {
      label: 'Color Ramps',
      colors: [
        { label: 'Neutral 800', value: 'var(--color-neutral-800)' },
        { label: 'Neutral 700', value: 'var(--color-neutral-700)' },
        { label: 'Neutral 600', value: 'var(--color-neutral-600)' },
        { label: 'Neutral 500', value: 'var(--color-neutral-500)' },
        { label: 'Neutral 400', value: 'var(--color-neutral-400)' },
        { label: 'Neutral 300', value: 'var(--color-neutral-300)' },
        { label: 'Neutral 200', value: 'var(--color-neutral-200)' },
        { label: 'Neutral 100', value: 'var(--color-neutral-100)' },
        { label: 'White', value: '#ffffff' },
      ]
    },
  ];

  let shadowBg = 'var(--ui-surface-highest)';
  let bgPickerOpen = false;
  let expandedGroup: string | null = null;

  function pickBg(value: string) {
    shadowBg = value;
    bgPickerOpen = false;
    expandedGroup = null;
  }

  function toggleBgPicker() {
    bgPickerOpen = !bgPickerOpen;
    if (!bgPickerOpen) expandedGroup = null;
  }

  // ── Overlay tokens ──
  interface OverlayToken {
    variable: string;
    label: string;
    r: number;
    g: number;
    b: number;
    opacity: number;
  }

  function initOverlay(variable: string, label: string, r: number, g: number, b: number, opacity: number): OverlayToken {
    return { variable, label, r, g, b, opacity };
  }

  let overlayTokens: OverlayToken[] = [
    initOverlay('--overlay-lowest', 'Lowest', 0, 0, 0, 0.05),
    initOverlay('--overlay-lower', 'Lower', 0, 0, 0, 0.1),
    initOverlay('--overlay-low', 'Low', 0, 0, 0, 0.2),
    initOverlay('--overlay', 'Base', 0, 0, 0, 0.3),
    initOverlay('--overlay-high', 'High', 0, 0, 0, 0.5),
    initOverlay('--overlay-higher', 'Higher', 0, 0, 0, 0.7),
    initOverlay('--overlay-highest', 'Highest', 0, 0, 0, 0.95),
  ];

  let hoverTokens: OverlayToken[] = [
    initOverlay('--hover-low', 'Low', 255, 255, 255, 0.05),
    initOverlay('--hover', 'Base', 255, 255, 255, 0.1),
    initOverlay('--hover-high', 'High', 255, 255, 255, 0.15),
  ];

  // Global overlay settings
  let overlayHue = 0;
  let overlaySaturation = 0;
  let overlayLightness = 0;
  let overlayOpacityMin = 0.05;
  let overlayOpacityMax = 0.95;

  let hoverHue = 0;
  let hoverSaturation = 0;
  let hoverLightness = 100;
  let hoverOpacityMin = 0.05;
  let hoverOpacityMax = 0.15;

  let editingOverlay: string | null = null;

  function getOverlayCss(t: OverlayToken): string {
    return `rgba(${t.r}, ${t.g}, ${t.b}, ${t.opacity})`;
  }

  function applyOverlay(t: OverlayToken) {
    setCssVar(t.variable, getOverlayCss(t));
  }

  function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60) { r1 = c; g1 = x; }
    else if (h < 120) { r1 = x; g1 = c; }
    else if (h < 180) { g1 = c; b1 = x; }
    else if (h < 240) { g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  function applyGlobalOverlayColor() {
    const { r, g, b } = hslToRgb(overlayHue, overlaySaturation, overlayLightness);
    for (const t of overlayTokens) {
      t.r = r; t.g = g; t.b = b;
      applyOverlay(t);
    }
    overlayTokens = overlayTokens;
  }

  function applyGlobalOverlayOpacity() {
    const last = overlayTokens.length - 1;
    overlayTokens.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.opacity = Math.round((overlayOpacityMin + frac * (overlayOpacityMax - overlayOpacityMin)) * 100) / 100;
      applyOverlay(t);
    });
    overlayTokens = overlayTokens;
  }

  function applyGlobalHoverColor() {
    const { r, g, b } = hslToRgb(hoverHue, hoverSaturation, hoverLightness);
    for (const t of hoverTokens) {
      t.r = r; t.g = g; t.b = b;
      applyOverlay(t);
    }
    hoverTokens = hoverTokens;
  }

  function applyGlobalHoverOpacity() {
    const last = hoverTokens.length - 1;
    hoverTokens.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.opacity = Math.round((hoverOpacityMin + frac * (hoverOpacityMax - hoverOpacityMin)) * 100) / 100;
      applyOverlay(t);
    });
    hoverTokens = hoverTokens;
  }

  function overlayHueGrad(): string {
    return `linear-gradient(to right, ${
      [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${overlaySaturation}%,${overlayLightness}%)`).join(',')
    })`;
  }
  function overlaySatGrad(): string {
    return `linear-gradient(to right, hsl(${overlayHue},0%,${overlayLightness}%), hsl(${overlayHue},100%,${overlayLightness}%))`;
  }
  function overlayLightGrad(): string {
    return `linear-gradient(to right, hsl(${overlayHue},${overlaySaturation}%,0%), hsl(${overlayHue},${overlaySaturation}%,50%), hsl(${overlayHue},${overlaySaturation}%,100%))`;
  }

  function hoverHueGrad(): string {
    return `linear-gradient(to right, ${
      [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${hoverSaturation}%,${hoverLightness}%)`).join(',')
    })`;
  }
  function hoverSatGrad(): string {
    return `linear-gradient(to right, hsl(${hoverHue},0%,${hoverLightness}%), hsl(${hoverHue},100%,${hoverLightness}%))`;
  }
  function hoverLightGrad(): string {
    return `linear-gradient(to right, hsl(${hoverHue},${hoverSaturation}%,0%), hsl(${hoverHue},${hoverSaturation}%,50%), hsl(${hoverHue},${hoverSaturation}%,100%))`;
  }

  const textShadowTokens: TokenItem[] = [
    { variable: '--text-shadow-sm', value: '1px 1px 2px' },
    { variable: '--text-shadow-md', value: '2px 2px 4px' }
  ];

  const transitionTokens: TokenItem[] = [
    { variable: '--transition-fast', value: '150ms cubic-bezier' },
    { variable: '--transition-base', value: '200ms ease' },
    { variable: '--transition-slow', value: '300ms ease' }
  ];

  const zIndexTokens: TokenItem[] = [
    { variable: '--z-base', value: '0' },
    { variable: '--z-dropdown', value: '100' },
    { variable: '--z-sticky', value: '200' },
    { variable: '--z-overlay', value: '1000' },
    { variable: '--z-modal', value: '1100' },
    { variable: '--z-popover', value: '1200' },
    { variable: '--z-tooltip', value: '1300' }
  ];

  const opacityTokens: TokenItem[] = [
    { variable: '--opacity-disabled', value: '0.6' },
    { variable: '--opacity-hover', value: '0.8' },
    { variable: '--opacity-muted', value: '0.5' }
  ];

  const gradientTokens: TokenItem[] = [
    { variable: '--gradient-progress', value: 'crimson → gold (90deg)' }
  ];

  let copiedVar: string | null = null;
  function copyVariable(v: string) {
    navigator.clipboard.writeText(v);
    copiedVar = v;
    setTimeout(() => { copiedVar = null; }, 1000);
  }

  interface FontStack {
    variable: string;
    fonts: Array<{ name: string; family: string }>;
  }

  const fontStacks: FontStack[] = [
    {
      variable: '--font-display',
      fonts: [
        { name: 'Astounder Squared BB', family: '"astounder-squared-bb", sans-serif' },
        { name: 'Astounder Squared LC BB', family: '"astounder-squared-lc-bb", sans-serif' },
        { name: 'Signika', family: '"Signika", sans-serif' },
        { name: 'sans-serif', family: 'sans-serif' }
      ]
    },
    {
      variable: '--font-sans',
      fonts: [
        { name: 'Montserrat', family: '"Montserrat", sans-serif' },
        { name: 'Segoe UI', family: '"Segoe UI", sans-serif' },
        { name: 'Open Sans', family: '"Open Sans", sans-serif' },
        { name: 'Helvetica Neue', family: '"Helvetica Neue", sans-serif' },
        { name: 'sans-serif', family: 'sans-serif' }
      ]
    },
    {
      variable: '--font-serif',
      fonts: [
        { name: 'Domine', family: '"Domine", serif' },
        { name: 'serif', family: 'serif' }
      ]
    },
    {
      variable: '--font-mono',
      fonts: [
        { name: 'Fira Code', family: '"fira-code", monospace' },
        { name: 'Source Code Pro', family: '"Source Code Pro", monospace' },
        { name: 'Courier New', family: '"Courier New", monospace' },
        { name: 'monospace', family: 'monospace' }
      ]
    }
  ];

</script>

<div class="variables-container">
  <!-- Palette Editor -->
  <section class="section" id="palette-editor">
    <h2 class="section-title">Palette Editor</h2>
    <p class="editor-intro">Derived palettes via <code>color-mix(in oklch)</code>. Change a base color to update all derived steps. Click any derived swatch to add a manual override.</p>
    <div class="palette-editors">
      <PaletteEditor bind:this={editors[0]} mode="gray" label="Neutral" cssNamespace="neutral" {saveSignal} />
      <PaletteEditor bind:this={editors[1]} mode="gray" label="Alternate" cssNamespace="alternate" {saveSignal} />
      <PaletteEditor bind:this={editors[2]} label="Background" initialColor="#1a1a2e" cssNamespace="bg" emptySelector {saveSignal} />
      <PaletteEditor bind:this={editors[3]} label="Primary" initialColor="#c93636" cssNamespace="primary" {saveSignal} />
      <PaletteEditor bind:this={editors[4]} label="Accent" initialColor="#f49e0b" cssNamespace="accent" {saveSignal} />
      <PaletteEditor bind:this={editors[5]} label="Special" initialColor="#8b5cf6" cssNamespace="special" {saveSignal} />
      <PaletteEditor bind:this={editors[6]} label="Success" initialColor="#21c45d" cssNamespace="success" {saveSignal} />
      <PaletteEditor bind:this={editors[7]} label="Warning" initialColor="#e66e1a" cssNamespace="warning" {saveSignal} />
      <PaletteEditor bind:this={editors[8]} label="Info" initialColor="#3077e8" cssNamespace="info" {saveSignal} />
      <PaletteEditor bind:this={editors[9]} label="Danger" initialColor="#e8304f" cssNamespace="danger" {saveSignal} />
    </div>
  </section>

  <!-- Spacing -->
  <section class="section" id="spacing">
    <h2 class="section-title">Spacing</h2>
    <div class="spacing-grid">
      {#each spacingTokens as token}
        <div class="spacing-item">
          <div class="spacing-bar" style="width: var({token.variable}); min-width: 2px;"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.value}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Columns -->
  <section class="section" id="columns">
    <h2 class="section-title">Columns</h2>
    <p class="columns-intro">
      Layout grid for page content. Toggle the live overlay from the admin bar's
      <i class="fas fa-grip-lines-vertical"></i> button to visualize.
    </p>

    <div class="columns-controls">
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Number of columns">Cols</span>
        <input type="range" min="1" max="24" value={columnsCount}
          on:input={(e) => setColumnsCount(+e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="1" max="24"
          value={columnsCount}
          on:change={(e) => setColumnsCount(+e.currentTarget.value)} />
        <span class="shadow-slider-unit"></span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Maximum content width">Max-Width</span>
        <input type="range" min="480" max="2560" step="10" value={columnsMaxWidth}
          on:input={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
        <input class="shadow-slider-input columns-input-wide" type="number" min="320" max="2560"
          value={columnsMaxWidth}
          on:change={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Space between columns">Gutter</span>
        <input type="range" min="0" max="80" value={columnsGutter}
          on:input={(e) => setColumnsGutter(+e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="200"
          value={columnsGutter}
          on:change={(e) => setColumnsGutter(+e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Outer page margin (side gutters)">Margin</span>
        <input type="range" min="0" max="200" value={columnsMargin}
          on:input={(e) => setColumnsMargin(+e.currentTarget.value)} />
        <input class="shadow-slider-input columns-input-wide" type="number" min="0" max="400"
          value={columnsMargin}
          on:change={(e) => setColumnsMargin(+e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>

      <div class="columns-controls-footer">
        <button class="columns-reset" on:click={resetColumns} title="Restore values from when this editor session opened">
          <i class="fas fa-rotate-left"></i>
          Reset to initial
        </button>
      </div>
    </div>

    <div class="columns-preview">
      <div
        class="columns-preview-inner"
        style="gap: {columnsGutter}px; padding-inline: {columnsMargin}px; grid-template-columns: repeat({columnsCount}, 1fr);"
      >
        {#each Array(columnsCount) as _, i}
          <div class="columns-preview-col"><span>{i + 1}</span></div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Border Radius -->
  <section class="section" id="border-radius">
    <h2 class="section-title">Border Radius</h2>
    <div class="radius-grid">
      {#each radiusTokens as token}
        <div class="radius-item">
          <div class="radius-box" style="border-radius: var({token.variable});"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.value}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Typography -->
  <section class="section" id="typography">
    <h2 class="section-title">Typography</h2>

    <div class="typography-columns">
      <div class="typography-group font-families-group">
        <h3 class="group-title">Font Families</h3>
        <div class="font-stacks-columns">
          {#each fontStacks as stack}
            <div class="font-stack">
              <button class="token-variable copyable" class:copied={copiedVar === stack.variable} on:click={() => copyVariable(stack.variable)}>{copiedVar === stack.variable ? 'copied!' : stack.variable}</button>
              <div class="font-stack-list">
                {#each stack.fonts as font, i}
                  <div class="font-stack-item">
                    <span class="font-stack-position">{i + 1}.</span>
                    <div class="font-stack-preview-block">
                      <span class="font-stack-preview" style="font-family: {font.family};{stack.variable === '--font-display' ? ' font-size: var(--font-2xl);' : ''}">The quick brown fox jumps over the lazy dog</span>
                      <span class="font-stack-name">{font.name}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Sizes</h3>
        <div class="font-size-demos">
          {#each fontSizeTokens as token}
            <div class="font-size-item">
              <span class="font-size-preview" style="font-size: var({token.variable});">Ag</span>
              <div class="token-info">
                <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
                <span class="token-value">{token.value}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Weights</h3>
        <div class="font-weight-demos">
          {#each fontWeightTokens as token}
            <div class="font-weight-item">
              <span class="font-weight-preview" style="font-weight: var({token.variable});">Ag</span>
              <div class="token-info">
                <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
                <span class="token-value">{token.value}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="typography-group">
        <h3 class="group-title">Line Heights</h3>
        <div class="token-table">
          {#each lineHeightTokens as token}
            <div class="token-row">
              <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
              <span class="token-value">{token.value}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Shadows -->
  <section class="section shadows-section" id="shadows" style="background: {shadowBg};">
    <h2 class="section-title">Shadows</h2>

    <div class="shadows-layout">
    <div class="shadows-main">
    <div class="shadows-grid">
      {#each shadowTokens.filter(t => scaleVariables.has(t.variable)) as token}
        <div class="shadow-item" class:active={editingShadow === token.variable}>
          <div class="shadow-box" style="box-shadow: {getShadowCss(token)};"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.value}</span>
          </div>
          <button class="shadow-edit-btn" on:click={() => editingShadow = editingShadow === token.variable ? null : token.variable}>
            {editingShadow === token.variable ? 'Close' : 'Edit'}
          </button>
        </div>
      {/each}
    </div>

    <div class="shadows-grid">
      {#each shadowTokens.filter(t => !scaleVariables.has(t.variable)) as token}
        <div class="shadow-item" class:active={editingShadow === token.variable}>
          <div class="shadow-box" style="box-shadow: {getShadowCss(token)};"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.value}</span>
          </div>
          <button class="shadow-edit-btn" on:click={() => editingShadow = editingShadow === token.variable ? null : token.variable}>
            {editingShadow === token.variable ? 'Close' : 'Edit'}
          </button>
        </div>
      {/each}
    </div>

    <h3 class="group-title" style="margin-top: var(--space-16);">Text Shadows</h3>
    <div class="text-shadow-demos">
      {#each textShadowTokens as token}
        <div class="text-shadow-item">
          <span class="text-shadow-preview" style="text-shadow: var({token.variable});">Sample Text</span>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.value}</span>
          </div>
        </div>
      {/each}
    </div>
    </div><!-- /.shadows-main -->

    <!-- Shadow editor sidebar -->
    <div class="global-shadow-editor">
    {#if editingToken}
      <div class="editor-header">
        <h4 class="global-shadow-title">{editingToken.variable}</h4>
        <button class="shadow-edit-btn" on:click={() => editingShadow = null}>Close</button>
      </div>
      {#if editingIsScale}
        <button class="reset-btn" on:click={resetToGlobal}>Reset to Global</button>
      {/if}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Direction the light source is coming from — controls which side the shadow falls on">Angle</span>
        <svg class="angle-dial" viewBox="0 0 48 48" width="48" height="48"
          on:pointerdown={(e) => handleDialDown(e, editingIdx)}
          on:pointermove={(e) => handleDialMove(e, editingIdx)}
          on:pointerup={handleDialUp}
        >
          <circle cx="24" cy="24" r="20" class="dial-ring" />
          <line x1="24" y1="24"
            x2={24 + 18 * Math.cos(editingToken.angle * Math.PI / 180)}
            y2={24 - 18 * Math.sin(editingToken.angle * Math.PI / 180)}
            class="dial-line" />
          <circle
            cx={24 + 18 * Math.cos(editingToken.angle * Math.PI / 180)}
            cy={24 - 18 * Math.sin(editingToken.angle * Math.PI / 180)}
            r="3" class="dial-handle" />
        </svg>
        <input class="shadow-slider-input" type="number" min="0" max="360"
          value={editingToken.angle}
          on:change={(e) => handleAngleChange(editingIdx, +e.currentTarget.value)} />
        <span class="shadow-slider-unit">&deg;</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How far the shadow is cast from the element — simulates height off the surface">Dist</span>
        <input type="range" min="0" max="60" value={editingToken.distance}
          on:input={(e) => handleDistanceChange(editingIdx, +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={editingToken.distance}
          on:change={(e) => handleDistanceChange(editingIdx, +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread</span>
        <input type="range" min="-50" max="50" value={editingToken.spread}
          on:input={(e) => { editingToken.spread = +e.currentTarget.value; applyShadow(editingToken); shadowTokens = shadowTokens; }} />
        <input class="shadow-slider-input" type="number" min="-50" max="50"
          value={editingToken.spread}
          on:change={(e) => { editingToken.spread = Math.max(-50, Math.min(50, +e.currentTarget.value)); applyShadow(editingToken, true); shadowTokens = shadowTokens; }} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur</span>
        <input type="range" min="0" max="100" value={editingToken.blur}
          on:input={(e) => { editingToken.blur = +e.currentTarget.value; applyShadow(editingToken); shadowTokens = shadowTokens; }} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={editingToken.blur}
          on:change={(e) => { editingToken.blur = Math.max(0, +e.currentTarget.value); applyShadow(editingToken, true); shadowTokens = shadowTokens; }} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op.</span>
        <input type="range" min="0" max="100" value={Math.round(editingToken.opacity * 100)}
          on:input={(e) => { editingToken.opacity = +e.currentTarget.value / 100; applyShadow(editingToken); shadowTokens = shadowTokens; }} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={Math.round(editingToken.opacity * 100)}
          on:change={(e) => { editingToken.opacity = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyShadow(editingToken, true); shadowTokens = shadowTokens; }} />
        <span class="shadow-slider-unit">%</span>
      </div>
      <div class="global-color-group">
        <div class="global-color-swatch" style="background: hsl({editingToken.hue}, {editingToken.saturation}%, {editingToken.lightness}%);"></div>
        <div class="global-color-sliders">
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Hue — the base color of the shadow (0°=red, 120°=green, 240°=blue)">H</span>
            <div class="slider-track" style="background: {shadowHueGrad()}">
              <input type="range" min="0" max="360" value={editingToken.hue}
                on:input={(e) => { editingToken.hue = +e.currentTarget.value; applyShadow(editingToken); shadowTokens = shadowTokens; }} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="360"
              value={editingToken.hue}
              on:change={(e) => { editingToken.hue = Math.min(360, Math.max(0, +e.currentTarget.value)); applyShadow(editingToken, true); shadowTokens = shadowTokens; }} />
            <span class="shadow-slider-unit">&deg;</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Saturation — 0% is gray, 100% is full color intensity">S</span>
            <div class="slider-track" style="background: linear-gradient(to right, hsl({editingToken.hue},0%,{editingToken.lightness}%), hsl({editingToken.hue},100%,{editingToken.lightness}%))">
              <input type="range" min="0" max="100" value={editingToken.saturation}
                on:input={(e) => { editingToken.saturation = +e.currentTarget.value; applyShadow(editingToken); shadowTokens = shadowTokens; }} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={editingToken.saturation}
              on:change={(e) => { editingToken.saturation = Math.min(100, Math.max(0, +e.currentTarget.value)); applyShadow(editingToken, true); shadowTokens = shadowTokens; }} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Lightness — 0% is black, 100% is white">L</span>
            <div class="slider-track" style="background: linear-gradient(to right, hsl({editingToken.hue},{editingToken.saturation}%,0%), hsl({editingToken.hue},{editingToken.saturation}%,50%), hsl({editingToken.hue},{editingToken.saturation}%,100%))">
              <input type="range" min="0" max="100" value={editingToken.lightness}
                on:input={(e) => { editingToken.lightness = +e.currentTarget.value; applyShadow(editingToken); shadowTokens = shadowTokens; }} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={editingToken.lightness}
              on:change={(e) => { editingToken.lightness = Math.min(100, Math.max(0, +e.currentTarget.value)); applyShadow(editingToken, true); shadowTokens = shadowTokens; }} />
            <span class="shadow-slider-unit">%</span>
          </div>
        </div>
      </div>
      <div class="shadow-css-output">
        <code>{getShadowCss(editingToken)}</code>
        <button class="shadow-copy-btn" on:click={() => copyVariable(getShadowCss(editingToken))}>
          {copiedVar === getShadowCss(editingToken) ? 'Copied!' : 'Copy CSS'}
        </button>
      </div>
    {:else}
      <h4 class="global-shadow-title">Global Light</h4>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Direction the light source is coming from — controls which side the shadow falls on">Angle</span>
        <svg class="angle-dial" viewBox="0 0 48 48" width="48" height="48"
          on:pointerdown={handleGlobalDialDown}
          on:pointermove={handleGlobalDialMove}
          on:pointerup={handleGlobalDialUp}
        >
          <circle cx="24" cy="24" r="20" class="dial-ring" />
          <line x1="24" y1="24"
            x2={24 + 18 * Math.cos(globalAngle * Math.PI / 180)}
            y2={24 - 18 * Math.sin(globalAngle * Math.PI / 180)}
            class="dial-line" />
          <circle
            cx={24 + 18 * Math.cos(globalAngle * Math.PI / 180)}
            cy={24 - 18 * Math.sin(globalAngle * Math.PI / 180)}
            r="3" class="dial-handle" />
        </svg>
        <input class="shadow-slider-input" type="number" min="0" max="360"
          value={globalAngle}
          on:change={(e) => { globalAngle = ((+e.currentTarget.value % 360) + 360) % 360; applyGlobalAngle(); }} />
        <span class="shadow-slider-unit">&deg;</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How far the shadow is cast — simulates height off the surface">Dist Min</span>
        <input type="range" min="0" max="60" value={globalDistanceMin}
          on:input={(e) => { globalDistanceMin = +e.currentTarget.value; applyGlobalDistance(); }} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={globalDistanceMin}
          on:change={(e) => { globalDistanceMin = Math.max(0, +e.currentTarget.value); applyGlobalDistance(); }} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How far the shadow is cast — simulates height off the surface">Dist Max</span>
        <input type="range" min="0" max="60" value={globalDistanceMax}
          on:input={(e) => { globalDistanceMax = +e.currentTarget.value; applyGlobalDistance(); }} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={globalDistanceMax}
          on:change={(e) => { globalDistanceMax = Math.max(0, +e.currentTarget.value); applyGlobalDistance(); }} />
        <span class="shadow-slider-unit">px</span>
      </div>
      {#if sizeLocked}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread</span>
          <input type="range" min="-50" max="50" value={globalSizeMin}
            on:input={(e) => { globalSizeMin = globalSizeMax = +e.currentTarget.value; applyGlobalSize(); }} />
          <input class="shadow-slider-input" type="number" min="-50" max="50"
            value={globalSizeMin}
            on:change={(e) => { globalSizeMin = globalSizeMax = Math.max(-50, Math.min(50, +e.currentTarget.value)); applyGlobalSize(); }} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn" title="Unlock min/max" on:click={() => { sizeLocked = false; }}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
          </button>
        </div>
      {:else}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread Min</span>
          <input type="range" min="-50" max="50" value={globalSizeMin}
            on:input={(e) => { globalSizeMin = +e.currentTarget.value; applyGlobalSize(); }} />
          <input class="shadow-slider-input" type="number" min="-50" max="50"
            value={globalSizeMin}
            on:change={(e) => { globalSizeMin = Math.max(-50, Math.min(50, +e.currentTarget.value)); applyGlobalSize(); }} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn unlocked" title="Lock to single value" on:click={() => { sizeLocked = true; globalSizeMax = globalSizeMin; applyGlobalSize(); }}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread Max</span>
          <input type="range" min="-50" max="50" value={globalSizeMax}
            on:input={(e) => { globalSizeMax = +e.currentTarget.value; applyGlobalSize(); }} />
          <input class="shadow-slider-input" type="number" min="-50" max="50"
            value={globalSizeMax}
            on:change={(e) => { globalSizeMax = Math.max(-50, Math.min(50, +e.currentTarget.value)); applyGlobalSize(); }} />
          <span class="shadow-slider-unit">px</span>
        </div>
      {/if}
      {#if blurLocked}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur</span>
          <input type="range" min="0" max="100" value={globalBlurMin}
            on:input={(e) => { globalBlurMin = globalBlurMax = +e.currentTarget.value; applyGlobalBlur(); }} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={globalBlurMin}
            on:change={(e) => { globalBlurMin = globalBlurMax = Math.max(0, +e.currentTarget.value); applyGlobalBlur(); }} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn" title="Unlock min/max" on:click={() => { blurLocked = false; }}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
          </button>
        </div>
      {:else}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur Min</span>
          <input type="range" min="0" max="100" value={globalBlurMin}
            on:input={(e) => { globalBlurMin = +e.currentTarget.value; applyGlobalBlur(); }} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={globalBlurMin}
            on:change={(e) => { globalBlurMin = Math.max(0, +e.currentTarget.value); applyGlobalBlur(); }} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn unlocked" title="Lock to single value" on:click={() => { blurLocked = true; globalBlurMax = globalBlurMin; applyGlobalBlur(); }}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur Max</span>
          <input type="range" min="0" max="100" value={globalBlurMax}
            on:input={(e) => { globalBlurMax = +e.currentTarget.value; applyGlobalBlur(); }} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={globalBlurMax}
            on:change={(e) => { globalBlurMax = Math.max(0, +e.currentTarget.value); applyGlobalBlur(); }} />
          <span class="shadow-slider-unit">px</span>
        </div>
      {/if}
      {#if opacityLocked}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op.</span>
          <input type="range" min="0" max="100" value={Math.round(globalOpacityMin * 100)}
            on:input={(e) => { globalOpacityMin = globalOpacityMax = +e.currentTarget.value / 100; applyGlobalOpacity(); }} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round(globalOpacityMin * 100)}
            on:change={(e) => { globalOpacityMin = globalOpacityMax = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalOpacity(); }} />
          <span class="shadow-slider-unit">%</span>
          <button class="lock-btn" title="Unlock min/max" on:click={() => { opacityLocked = false; }}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
          </button>
        </div>
      {:else}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op. Min</span>
          <input type="range" min="0" max="100" value={Math.round(globalOpacityMin * 100)}
            on:input={(e) => { globalOpacityMin = +e.currentTarget.value / 100; applyGlobalOpacity(); }} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round(globalOpacityMin * 100)}
            on:change={(e) => { globalOpacityMin = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalOpacity(); }} />
          <span class="shadow-slider-unit">%</span>
          <button class="lock-btn unlocked" title="Lock to single value" on:click={() => { opacityLocked = true; globalOpacityMax = globalOpacityMin; applyGlobalOpacity(); }}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op. Max</span>
          <input type="range" min="0" max="100" value={Math.round(globalOpacityMax * 100)}
            on:input={(e) => { globalOpacityMax = +e.currentTarget.value / 100; applyGlobalOpacity(); }} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round(globalOpacityMax * 100)}
            on:change={(e) => { globalOpacityMax = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalOpacity(); }} />
          <span class="shadow-slider-unit">%</span>
        </div>
      {/if}
      <div class="global-color-group">
        <div class="global-color-swatch" style="background: hsl({globalHue}, {globalSaturation}%, {globalLightness}%);"></div>
        <div class="global-color-sliders">
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Hue — the base color of the shadow (0°=red, 120°=green, 240°=blue)">H</span>
            <div class="slider-track" style="background: {shadowHueGrad()}">
              <input type="range" min="0" max="360" value={globalHue}
                on:input={(e) => { globalHue = +e.currentTarget.value; applyGlobalColor(); }} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="360"
              value={globalHue}
              on:change={(e) => { globalHue = Math.min(360, Math.max(0, +e.currentTarget.value)); applyGlobalColor(); }} />
            <span class="shadow-slider-unit">&deg;</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Saturation — 0% is gray, 100% is full color intensity">S</span>
            <div class="slider-track" style="background: {shadowSatGrad()}">
              <input type="range" min="0" max="100" value={globalSaturation}
                on:input={(e) => { globalSaturation = +e.currentTarget.value; applyGlobalColor(); }} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={globalSaturation}
              on:change={(e) => { globalSaturation = Math.min(100, Math.max(0, +e.currentTarget.value)); applyGlobalColor(); }} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Lightness — 0% is black, 100% is white">L</span>
            <div class="slider-track" style="background: {shadowLightGrad()}">
              <input type="range" min="0" max="100" value={globalLightness}
                on:input={(e) => { globalLightness = +e.currentTarget.value; applyGlobalColor(); }} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={globalLightness}
              on:change={(e) => { globalLightness = Math.min(100, Math.max(0, +e.currentTarget.value)); applyGlobalColor(); }} />
            <span class="shadow-slider-unit">%</span>
          </div>
        </div>
      </div>
      <button class="bg-picker-btn" on:click={toggleBgPicker}>BG</button>
      {#if bgPickerOpen}
        <div class="bg-picker-menu">
          {#each bgColorGroups as group}
            <button class="bg-group-header" on:click={() => expandedGroup = expandedGroup === group.label ? null : group.label}>
              <span>{group.label}</span>
              <span class="bg-group-arrow">{expandedGroup === group.label ? '\u25B4' : '\u25BE'}</span>
            </button>
            {#if expandedGroup === group.label}
              <div class="bg-group-colors">
                {#each group.colors as color}
                  <button class="bg-color-option" on:click={() => pickBg(color.value)}>
                    <span class="bg-color-swatch" style="background: {color.value};"></span>
                    <span>{color.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    {/if}
    </div>
    </div><!-- /.shadows-layout -->
  </section>

  <!-- Overlays -->
  <section class="section" id="overlays">
    <h2 class="section-title">Overlays</h2>

    <h3 class="group-title">Dark Overlays</h3>
    <div class="overlays-grid">
      {#each overlayTokens as token, i}
        <div class="overlay-item">
          <div class="overlay-swatch-wrap">
            <div class="overlay-swatch" style="background: {getOverlayCss(token)};"></div>
          </div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.label} — {Math.round(token.opacity * 100)}%</span>
          </div>
          <button class="shadow-edit-btn" on:click={() => editingOverlay = editingOverlay === token.variable ? null : token.variable}>
            {editingOverlay === token.variable ? 'Close' : 'Edit'}
          </button>
          {#if editingOverlay === token.variable}
            <div class="shadow-editor">
              <div class="shadow-slider-row">
                <span class="shadow-slider-label">Opacity</span>
                <input type="range" min="0" max="100" value={Math.round(token.opacity * 100)}
                  on:input={(e) => { token.opacity = +e.currentTarget.value / 100; applyOverlay(token); overlayTokens = overlayTokens; }} />
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={Math.round(token.opacity * 100)}
                  on:change={(e) => { token.opacity = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyOverlay(token); overlayTokens = overlayTokens; }} />
                <span class="shadow-slider-unit">%</span>
              </div>
              <div class="shadow-css-output">
                <code>{getOverlayCss(token)}</code>
                <button class="shadow-copy-btn" on:click={() => copyVariable(getOverlayCss(token))}>
                  {copiedVar === getOverlayCss(token) ? 'Copied!' : 'Copy CSS'}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Global overlay editor -->
    <div class="overlay-global-editor">
      <h4 class="global-shadow-title">Global Overlay Controls</h4>
      <div class="overlay-global-columns">
        <div class="overlay-global-col">
          <div class="global-color-group">
            <div class="global-color-swatch" style="background: hsl({overlayHue}, {overlaySaturation}%, {overlayLightness}%);"></div>
            <div class="global-color-sliders">
              <div class="global-shadow-row">
                <span class="shadow-slider-label">H</span>
                <div class="slider-track" style="background: {overlayHueGrad()}">
                  <input type="range" min="0" max="360" value={overlayHue}
                    on:input={(e) => { overlayHue = +e.currentTarget.value; applyGlobalOverlayColor(); }} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="360"
                  value={overlayHue}
                  on:change={(e) => { overlayHue = Math.min(360, Math.max(0, +e.currentTarget.value)); applyGlobalOverlayColor(); }} />
                <span class="shadow-slider-unit">&deg;</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">S</span>
                <div class="slider-track" style="background: {overlaySatGrad()}">
                  <input type="range" min="0" max="100" value={overlaySaturation}
                    on:input={(e) => { overlaySaturation = +e.currentTarget.value; applyGlobalOverlayColor(); }} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={overlaySaturation}
                  on:change={(e) => { overlaySaturation = Math.min(100, Math.max(0, +e.currentTarget.value)); applyGlobalOverlayColor(); }} />
                <span class="shadow-slider-unit">%</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">L</span>
                <div class="slider-track" style="background: {overlayLightGrad()}">
                  <input type="range" min="0" max="100" value={overlayLightness}
                    on:input={(e) => { overlayLightness = +e.currentTarget.value; applyGlobalOverlayColor(); }} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={overlayLightness}
                  on:change={(e) => { overlayLightness = Math.min(100, Math.max(0, +e.currentTarget.value)); applyGlobalOverlayColor(); }} />
                <span class="shadow-slider-unit">%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="overlay-global-col">
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Min</span>
            <input type="range" min="0" max="100" value={Math.round(overlayOpacityMin * 100)}
              on:input={(e) => { overlayOpacityMin = +e.currentTarget.value / 100; applyGlobalOverlayOpacity(); }} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round(overlayOpacityMin * 100)}
              on:change={(e) => { overlayOpacityMin = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalOverlayOpacity(); }} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Max</span>
            <input type="range" min="0" max="100" value={Math.round(overlayOpacityMax * 100)}
              on:input={(e) => { overlayOpacityMax = +e.currentTarget.value / 100; applyGlobalOverlayOpacity(); }} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round(overlayOpacityMax * 100)}
              on:change={(e) => { overlayOpacityMax = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalOverlayOpacity(); }} />
            <span class="shadow-slider-unit">%</span>
          </div>
        </div>
      </div>
    </div>

    <h3 class="group-title" style="margin-top: var(--space-16);">Hover Overlays</h3>
    <div class="overlays-grid">
      {#each hoverTokens as token, i}
        <div class="overlay-item">
          <div class="overlay-swatch-wrap overlay-swatch-wrap--dark">
            <div class="overlay-swatch" style="background: {getOverlayCss(token)};"></div>
          </div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.label} — {Math.round(token.opacity * 100)}%</span>
          </div>
          <button class="shadow-edit-btn" on:click={() => editingOverlay = editingOverlay === token.variable ? null : token.variable}>
            {editingOverlay === token.variable ? 'Close' : 'Edit'}
          </button>
          {#if editingOverlay === token.variable}
            <div class="shadow-editor">
              <div class="shadow-slider-row">
                <span class="shadow-slider-label">Opacity</span>
                <input type="range" min="0" max="100" value={Math.round(token.opacity * 100)}
                  on:input={(e) => { token.opacity = +e.currentTarget.value / 100; applyOverlay(token); hoverTokens = hoverTokens; }} />
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={Math.round(token.opacity * 100)}
                  on:change={(e) => { token.opacity = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyOverlay(token); hoverTokens = hoverTokens; }} />
                <span class="shadow-slider-unit">%</span>
              </div>
              <div class="shadow-css-output">
                <code>{getOverlayCss(token)}</code>
                <button class="shadow-copy-btn" on:click={() => copyVariable(getOverlayCss(token))}>
                  {copiedVar === getOverlayCss(token) ? 'Copied!' : 'Copy CSS'}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Global hover editor -->
    <div class="overlay-global-editor">
      <h4 class="global-shadow-title">Global Hover Controls</h4>
      <div class="overlay-global-columns">
        <div class="overlay-global-col">
          <div class="global-color-group">
            <div class="global-color-swatch" style="background: hsl({hoverHue}, {hoverSaturation}%, {hoverLightness}%);"></div>
            <div class="global-color-sliders">
              <div class="global-shadow-row">
                <span class="shadow-slider-label">H</span>
                <div class="slider-track" style="background: {hoverHueGrad()}">
                  <input type="range" min="0" max="360" value={hoverHue}
                    on:input={(e) => { hoverHue = +e.currentTarget.value; applyGlobalHoverColor(); }} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="360"
                  value={hoverHue}
                  on:change={(e) => { hoverHue = Math.min(360, Math.max(0, +e.currentTarget.value)); applyGlobalHoverColor(); }} />
                <span class="shadow-slider-unit">&deg;</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">S</span>
                <div class="slider-track" style="background: {hoverSatGrad()}">
                  <input type="range" min="0" max="100" value={hoverSaturation}
                    on:input={(e) => { hoverSaturation = +e.currentTarget.value; applyGlobalHoverColor(); }} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={hoverSaturation}
                  on:change={(e) => { hoverSaturation = Math.min(100, Math.max(0, +e.currentTarget.value)); applyGlobalHoverColor(); }} />
                <span class="shadow-slider-unit">%</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">L</span>
                <div class="slider-track" style="background: {hoverLightGrad()}">
                  <input type="range" min="0" max="100" value={hoverLightness}
                    on:input={(e) => { hoverLightness = +e.currentTarget.value; applyGlobalHoverColor(); }} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={hoverLightness}
                  on:change={(e) => { hoverLightness = Math.min(100, Math.max(0, +e.currentTarget.value)); applyGlobalHoverColor(); }} />
                <span class="shadow-slider-unit">%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="overlay-global-col">
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Min</span>
            <input type="range" min="0" max="100" value={Math.round(hoverOpacityMin * 100)}
              on:input={(e) => { hoverOpacityMin = +e.currentTarget.value / 100; applyGlobalHoverOpacity(); }} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round(hoverOpacityMin * 100)}
              on:change={(e) => { hoverOpacityMin = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalHoverOpacity(); }} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Max</span>
            <input type="range" min="0" max="100" value={Math.round(hoverOpacityMax * 100)}
              on:input={(e) => { hoverOpacityMax = +e.currentTarget.value / 100; applyGlobalHoverOpacity(); }} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round(hoverOpacityMax * 100)}
              on:change={(e) => { hoverOpacityMax = Math.min(100, Math.max(0, +e.currentTarget.value)) / 100; applyGlobalHoverOpacity(); }} />
            <span class="shadow-slider-unit">%</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Gradients -->
  <section class="section" id="gradients">
    <h2 class="section-title">Gradients</h2>
    <div class="gradients-grid">
      {#each gradientTokens as token}
        <div class="gradient-item">
          <div class="gradient-box" style="background: var({token.variable});"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{token.value}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Utility Tokens -->
  <section class="section" id="utility-tokens">
    <h2 class="section-title">Utility Tokens</h2>
    <div class="utility-columns">
      <div class="utility-group">
        <h3 class="group-title">Transitions</h3>
        <div class="token-table">
          {#each transitionTokens as token}
            <div class="token-row">
              <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
              <span class="token-value">{token.value}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="utility-group">
        <h3 class="group-title">Z-Index Layers</h3>
        <div class="token-table">
          {#each zIndexTokens as token}
            <div class="token-row">
              <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
              <span class="token-value">{token.value}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="utility-group">
        <h3 class="group-title">Opacity</h3>
        <div class="token-table">
          {#each opacityTokens as token}
            <div class="token-row">
              <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
              <span class="token-value">{token.value}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  @import '../styles/variables.css';

  .variables-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-32);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .section-title {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .group-title {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .token-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .token-variable {
    font-size: var(--font-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--font-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .token-value {
    font-size: var(--font-md);
    color: var(--ui-text-muted);
  }

  /* Columns */
  .columns-intro {
    font-size: var(--font-sm);
    color: var(--ui-text-muted);
    margin: 0;
    line-height: var(--line-height-relaxed);
  }

  .columns-intro i {
    margin-inline: 2px;
    color: var(--ui-text-tertiary);
  }

  .columns-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--radius-md);
  }

  .columns-controls .shadow-slider-label {
    width: 5rem;
    text-align: left;
  }

  .columns-input-wide {
    width: 3.5rem;
  }

  .columns-controls-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-8);
    margin-top: var(--space-4);
    border-top: 1px solid var(--ui-border-faint);
  }

  .columns-reset {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-10);
    background: transparent;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--font-xs);
    cursor: pointer;
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .columns-reset:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .columns-reset i {
    font-size: 10px;
  }

  .columns-preview {
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--radius-md);
    padding: var(--space-12) 0;
    overflow: hidden;
  }

  .columns-preview-inner {
    display: grid;
    min-height: 64px;
  }

  .columns-preview-col {
    background: rgba(239, 68, 68, 0.08);
    border-left: 1px dashed rgba(239, 68, 68, 0.3);
    border-right: 1px dashed rgba(239, 68, 68, 0.3);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 48px;
  }

  .columns-preview-col span {
    font-family: var(--ui-font-mono);
    font-size: 9px;
    color: var(--ui-text-muted);
    padding-top: 4px;
  }

  /* Spacing */
  .spacing-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .spacing-item {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }

  .spacing-bar {
    height: 1.25rem;
    background: var(--ui-text-accent);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .spacing-item .token-info {
    flex-direction: row;
    gap: var(--space-8);
    align-items: baseline;
  }

  /* Border Radius */
  .radius-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: var(--space-16);
  }

  .radius-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
  }

  .radius-box {
    width: 3.5rem;
    height: 3.5rem;
    background: none;
    border: 2px solid var(--ui-border-medium);
  }

  /* Typography */
  .typography-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(22rem, 100%), 1fr));
    gap: var(--space-24);
    align-items: start;
  }

  .typography-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    min-width: 0;
  }

  .font-families-group {
    grid-column: 1 / -1;
  }

  .font-stacks-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
    gap: var(--space-8);
  }

  .font-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-12);
    background: none;
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--radius-md);
  }

  .font-stack-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .font-stack-item {
    display: flex;
    align-items: baseline;
    gap: var(--space-8);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .font-stack-item:last-child {
    border-bottom: none;
  }

  .font-stack-position {
    font-size: var(--font-md);
    color: var(--ui-text-muted);
    min-width: 1.25rem;
    text-align: right;
  }

  .font-stack-preview-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .font-stack-preview {
    font-size: var(--font-md);
    color: var(--ui-text-primary);
    line-height: var(--line-height-normal);
  }

  .font-stack-name {
    font-size: var(--font-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .font-size-demos {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .font-size-item {
    display: flex;
    align-items: baseline;
    gap: var(--space-12);
  }

  .font-size-preview {
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    line-height: 1;
    min-width: 3rem;
  }

  .font-size-item .token-info {
    flex-direction: row;
    gap: var(--space-8);
    align-items: baseline;
  }

  .font-weight-demos {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .font-weight-item {
    display: flex;
    align-items: baseline;
    gap: var(--space-12);
  }

  .font-weight-preview {
    font-size: var(--font-xl);
    font-family: var(--ui-font-sans);
    color: var(--ui-text-primary);
    line-height: 1;
    min-width: 2rem;
  }

  .font-weight-item .token-info {
    flex-direction: row;
    gap: var(--space-8);
    align-items: baseline;
  }

  /* Token Table */
  .token-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .token-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-12);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .token-row:last-child {
    border-bottom: none;
  }

  /* Shadows */
  .shadows-section {
    background: var(--ui-surface-highest);
    padding: var(--space-16);
    border-radius: var(--radius-lg);
    position: relative;
  }

  .shadows-layout {
    display: flex;
    gap: var(--space-16);
    align-items: flex-start;
  }

  .shadows-main {
    flex: 1;
    min-width: 0;
  }

  .shadows-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--space-16);
  }

  .shadow-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
  }

  .shadow-item.active {
    outline: 2px solid var(--ui-text-accent);
    outline-offset: var(--space-4);
    border-radius: var(--radius-md);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .reset-btn {
    all: unset;
    font-size: var(--font-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    text-align: center;
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .reset-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .shadow-box {
    width: 4rem;
    height: 4rem;
    background: var(--ui-surface-high);
    border-radius: var(--radius-md);
  }

  .shadow-item .token-info {
    align-items: center;
    text-align: center;
  }

  .shadow-edit-btn {
    all: unset;
    font-size: var(--font-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--space-2) var(--space-8);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .shadow-edit-btn:hover {
    color: var(--ui-text-accent);
    background: var(--ui-surface-low);
  }

  .shadow-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    width: 100%;
    min-width: 14rem;
  }

  .shadow-slider-row {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .shadow-slider-label {
    font-size: var(--font-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }

  .shadow-slider-row input[type="range"] {
    flex: 1;
    min-width: 5rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .shadow-slider-input {
    font-size: var(--font-xs);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-4);
    -moz-appearance: textfield;
  }

  .shadow-slider-input::-webkit-inner-spin-button,
  .shadow-slider-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .shadow-slider-input:focus {
    outline: none;
    border-color: var(--ui-border-medium);
  }

  .shadow-slider-unit {
    font-size: var(--font-xs);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 1rem;
    flex-shrink: 0;
  }

  /* Angle dial */
  .angle-dial {
    cursor: pointer;
    touch-action: none;
    flex-shrink: 0;
  }

  .dial-ring {
    fill: none;
    stroke: var(--ui-border-subtle);
    stroke-width: 1.5;
  }

  .dial-line {
    stroke: var(--ui-text-secondary);
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  .dial-handle {
    fill: var(--ui-text-accent);
    stroke: none;
  }

  .angle-dial:hover .dial-ring {
    stroke: var(--ui-border-medium);
  }

  .angle-dial:hover .dial-handle {
    fill: var(--ui-text-primary);
  }

  .shadow-css-output {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding-top: var(--space-8);
    border-top: 1px solid var(--ui-border-faint);
  }

  .shadow-css-output code {
    font-size: var(--font-xs);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    word-break: break-all;
  }

  .shadow-copy-btn {
    all: unset;
    font-size: var(--font-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--space-2) var(--space-6);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    text-align: center;
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .shadow-copy-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  /* Global shadow editor */
  .global-shadow-editor {
    position: sticky;
    top: var(--space-12);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    width: 18rem;
  }

  .global-shadow-title {
    font-size: var(--font-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .global-shadow-row {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .lock-btn {
    all: unset;
    cursor: pointer;
    color: var(--ui-text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .lock-btn:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-low);
  }

  .lock-btn.unlocked {
    color: var(--ui-text-accent);
  }

  .global-shadow-row .shadow-slider-label {
    width: 3rem;
  }

  .global-shadow-row input[type="range"] {
    flex: 1;
    min-width: 4rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .slider-track {
    flex: 1;
    min-width: 4rem;
    position: relative;
    height: 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ui-border-subtle);
  }

  .slider-track input[type="range"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .slider-track input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: white;
    border: 1px solid var(--ui-border-subtle);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-thumb {
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: white;
    border: 1px solid var(--ui-border-subtle);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }

  .global-color-group {
    display: flex;
    gap: var(--space-8);
    align-items: stretch;
  }

  .global-color-swatch {
    width: 2rem;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ui-border-subtle);
  }

  .global-color-sliders {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .bg-picker-btn {
    all: unset;
    font-size: var(--font-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    background: var(--ui-surface-low);
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .bg-picker-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .bg-picker-menu {
    position: absolute;
    bottom: calc(100% + var(--space-4));
    left: 0;
    width: 14rem;
    max-width: calc(100vw - 2rem);
    max-height: 24rem;
    overflow-y: auto;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .bg-group-header {
    all: unset;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-6) var(--space-8);
    font-size: var(--font-xs);
    color: var(--ui-text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
  }

  .bg-group-header:hover {
    background: var(--ui-surface-high);
  }

  .bg-group-arrow {
    font-size: 0.65rem;
    color: var(--ui-text-muted);
  }

  .bg-group-colors {
    display: flex;
    flex-direction: column;
    padding-left: var(--space-8);
  }

  .bg-color-option {
    all: unset;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-4) var(--space-8);
    font-size: var(--font-xs);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
  }

  .bg-color-option:hover {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .bg-color-swatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ui-border-subtle);
    flex-shrink: 0;
  }

  .text-shadow-demos {
    display: flex;
    gap: var(--space-24);
    flex-wrap: wrap;
  }

  .text-shadow-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
  }

  .text-shadow-preview {
    font-size: var(--font-2xl);
    font-family: var(--ui-font-sans);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
  }

  /* Gradients */
  .gradients-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: var(--space-16);
  }

  .gradient-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .gradient-box {
    height: 3rem;
    border-radius: var(--radius-md);
  }

  /* Utility Tokens */
  .utility-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-24);
    align-items: start;
  }

  .utility-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  /* Palette Editor */
  .editor-intro {
    font-size: var(--font-md);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .editor-intro code {
    font-size: var(--font-md);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: var(--ui-font-mono);
  }

  .palette-editors {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  /* Overlays */
  .overlays-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--space-16);
  }

  .overlay-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
  }

  .overlay-swatch-wrap {
    width: 4rem;
    height: 4rem;
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ui-border-subtle);
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
    background-color: #fff;
  }

  .overlay-swatch-wrap--dark {
    background-color: #222;
    background-image:
      linear-gradient(45deg, #333 25%, transparent 25%),
      linear-gradient(-45deg, #333 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #333 75%),
      linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  }

  .overlay-swatch {
    position: absolute;
    inset: 0;
  }

  .overlay-item .token-info {
    align-items: center;
    text-align: center;
  }

  .overlay-global-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    margin-top: var(--space-8);
  }

  .overlay-global-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
    gap: var(--space-16);
    align-items: start;
  }

  .overlay-global-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    min-width: 0;
  }

  /* Gradients and utility fills tighten at narrow widths */
  .gradients-grid,
  .utility-columns {
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
  }
</style>
