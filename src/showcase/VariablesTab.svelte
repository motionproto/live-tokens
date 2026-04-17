<script lang="ts">
  import { onMount } from 'svelte';
  import PaletteEditor from './PaletteEditor.svelte';
  import FontStackEditor from './FontStackEditor.svelte';
  import ProjectFontsSection from './ProjectFontsSection.svelte';
  import {
    editorState, mutate, beginTransaction, commitTransaction, beginSliderGesture,
    seedShadowsFromDom, shadowTokenCss, computeShadowXY,
    SCALE_SHADOW_VARIABLES, defaultShadowOverride,
  } from '../lib/editorStore';
  import type {
    ColumnsState, OverlayToken, OverlayChannelGlobals,
    ShadowToken, ShadowOverrideFlags, EditorState,
  } from '../lib/editorTypes';

  function clampNum(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  function setColumnsCount(n: number) {
    mutate('set columns count', (s) => { s.columns.count = clampNum(n, 1, 24); });
  }
  function setColumnsMaxWidth(px: number) {
    mutate('set columns max-width', (s) => { s.columns.maxWidth = clampNum(px, 320, 2560); });
  }
  function setColumnsGutter(px: number) {
    mutate('set columns gutter', (s) => { s.columns.gutter = clampNum(px, 0, 200); });
  }
  function setColumnsMargin(px: number) {
    mutate('set columns margin', (s) => { s.columns.margin = clampNum(px, 0, 400); });
  }

  let initialColumns: ColumnsState | null = null;

  function resetColumns() {
    if (!initialColumns) return;
    const snapshot = initialColumns;
    mutate('reset columns', (s) => { s.columns = { ...snapshot }; });
  }

  onMount(() => {
    initialColumns = { ...$editorState.columns };
    seedShadowsFromDom();
  });

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
    { variable: '--radius-none', value: '0' },
    { variable: '--radius-sm', value: '0.125rem (2px)' },
    { variable: '--radius-md', value: '0.25rem (4px)' },
    { variable: '--radius-lg', value: '0.375rem (6px)' },
    { variable: '--radius-xl', value: '0.5rem (8px)' },
    { variable: '--radius-2xl', value: '0.625rem (10px)' },
    { variable: '--radius-3xl', value: '0.75rem (12px)' },
    { variable: '--radius-4xl', value: '1.25rem (20px)' },
    { variable: '--radius-full', value: '9999px (pill)' }
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

  // Shadows live in $editorState.shadows. The parent onMount calls
  // seedShadowsFromDom() to capture the tokens.css baseline when the
  // store has no tokens yet. From there every mutation flows through one of
  // the setShadow* helpers below, which route into mutate()/transaction()
  // so history captures coherent edits.

  function getShadowOverride(s: EditorState, variable: string): ShadowOverrideFlags {
    let ov = s.shadows.overrides[variable];
    if (!ov) {
      ov = defaultShadowOverride();
      s.shadows.overrides[variable] = ov;
    }
    return ov;
  }

  function shadowTokenValueLabel(t: ShadowToken): string {
    return `${t.x} ${t.y} ${t.blur}px`;
  }

  function interpolateScale<T extends ShadowToken>(
    tokens: T[],
    overrides: Record<string, ShadowOverrideFlags>,
    flag: keyof ShadowOverrideFlags,
    mutateFn: (t: T, frac: number) => void,
  ) {
    const eligible = tokens.filter((t) => SCALE_SHADOW_VARIABLES.has(t.variable) && !(overrides[t.variable]?.[flag]));
    const last = eligible.length - 1;
    eligible.forEach((t, i) => mutateFn(t, last > 0 ? i / last : 0.5));
  }

  function setGlobalAngle(value: number) {
    mutate('set shadow angle', (s) => {
      s.shadows.globals.angle = ((Math.round(value) % 360) + 360) % 360;
      for (const t of s.shadows.tokens) {
        if (!SCALE_SHADOW_VARIABLES.has(t.variable)) continue;
        if (getShadowOverride(s, t.variable).angle) continue;
        t.angle = s.shadows.globals.angle;
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
      }
    });
  }

  function setGlobalOpacity(field: 'opacityMin' | 'opacityMax', value01: number) {
    mutate(`set shadow ${field}`, (s) => {
      const v = Math.max(0, Math.min(1, Math.round(value01 * 100) / 100));
      const g = s.shadows.globals;
      g[field] = v;
      if (g.opacityLocked) g[field === 'opacityMin' ? 'opacityMax' : 'opacityMin'] = v;
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'opacity', (t, frac) => {
        t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
      });
    });
  }

  function setGlobalDistance(field: 'distanceMin' | 'distanceMax', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      g[field] = Math.max(0, Math.round(value));
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'distance', (t, frac) => {
        t.distance = Math.round(g.distanceMin + frac * (g.distanceMax - g.distanceMin));
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
      });
    });
  }

  function setGlobalBlur(field: 'blurMin' | 'blurMax', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      g[field] = Math.max(0, Math.round(value));
      if (g.blurLocked) g[field === 'blurMin' ? 'blurMax' : 'blurMin'] = g[field];
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'blur', (t, frac) => {
        t.blur = Math.round(g.blurMin + frac * (g.blurMax - g.blurMin));
      });
    });
  }

  function setGlobalSize(field: 'sizeMin' | 'sizeMax', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      g[field] = Math.max(-50, Math.min(50, Math.round(value)));
      if (g.sizeLocked) g[field === 'sizeMin' ? 'sizeMax' : 'sizeMin'] = g[field];
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'size', (t, frac) => {
        t.spread = Math.round(g.sizeMin + frac * (g.sizeMax - g.sizeMin));
      });
    });
  }

  function setGlobalColor(field: 'hue' | 'saturation' | 'lightness', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      const hi = field === 'hue' ? 360 : 100;
      g[field] = Math.max(0, Math.min(hi, Math.round(value)));
      for (const t of s.shadows.tokens) {
        if (!SCALE_SHADOW_VARIABLES.has(t.variable)) continue;
        if (getShadowOverride(s, t.variable).color) continue;
        t.hue = g.hue; t.saturation = g.saturation; t.lightness = g.lightness;
      }
    });
  }

  function toggleLock(field: 'opacityLocked' | 'blurLocked' | 'sizeLocked') {
    mutate(`toggle shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      const next = !g[field];
      g[field] = next;
      if (next) {
        // Clamp max to min when re-locking and re-broadcast the scale edit.
        if (field === 'opacityLocked') {
          g.opacityMax = g.opacityMin;
          interpolateScale(s.shadows.tokens, s.shadows.overrides, 'opacity', (t, frac) => {
            t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
          });
        } else if (field === 'blurLocked') {
          g.blurMax = g.blurMin;
          interpolateScale(s.shadows.tokens, s.shadows.overrides, 'blur', (t, frac) => {
            t.blur = Math.round(g.blurMin + frac * (g.blurMax - g.blurMin));
          });
        } else {
          g.sizeMax = g.sizeMin;
          interpolateScale(s.shadows.tokens, s.shadows.overrides, 'size', (t, frac) => {
            t.spread = Math.round(g.sizeMin + frac * (g.sizeMax - g.sizeMin));
          });
        }
      }
    });
  }

  // Per-token edits set the override flag for the edited field so future
  // global broadcasts skip this token, preserving the user's manual value.
  function setTokenField(idx: number, field: 'angle' | 'distance' | 'spread' | 'blur' | 'opacity', value: number) {
    mutate(`set shadow token ${field}`, (s) => {
      const t = s.shadows.tokens[idx];
      if (!t) return;
      const ov = getShadowOverride(s, t.variable);
      if (field === 'angle') {
        t.angle = ((Math.round(value) % 360) + 360) % 360;
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
        ov.angle = true;
      } else if (field === 'distance') {
        t.distance = Math.max(0, Math.round(value));
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
        ov.distance = true;
      } else if (field === 'spread') {
        t.spread = Math.max(-50, Math.min(50, Math.round(value)));
        ov.size = true;
      } else if (field === 'blur') {
        t.blur = Math.max(0, Math.round(value));
        ov.blur = true;
      } else {
        t.opacity = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
        ov.opacity = true;
      }
    });
  }

  function setTokenColor(idx: number, field: 'hue' | 'saturation' | 'lightness', value: number) {
    mutate(`set shadow token ${field}`, (s) => {
      const t = s.shadows.tokens[idx];
      if (!t) return;
      const hi = field === 'hue' ? 360 : 100;
      t[field] = Math.max(0, Math.min(hi, Math.round(value)));
      getShadowOverride(s, t.variable).color = true;
    });
  }

  function resetToGlobal() {
    if (!editingToken || !editingIsScale) return;
    const variable = editingToken.variable;
    mutate('reset shadow token to global', (s) => {
      const scale = s.shadows.tokens.filter((t) => SCALE_SHADOW_VARIABLES.has(t.variable));
      const t = scale.find((x) => x.variable === variable);
      if (!t) return;
      const pos = scale.indexOf(t);
      const last = scale.length - 1;
      const frac = last > 0 ? pos / last : 0.5;
      const g = s.shadows.globals;
      t.hue = g.hue; t.saturation = g.saturation; t.lightness = g.lightness;
      t.angle = g.angle;
      t.distance = Math.round(g.distanceMin + frac * (g.distanceMax - g.distanceMin));
      t.blur = Math.round(g.blurMin + frac * (g.blurMax - g.blurMin));
      t.spread = Math.round(g.sizeMin + frac * (g.sizeMax - g.sizeMin));
      t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
      const { x, y } = computeShadowXY(t.angle, t.distance);
      t.x = x; t.y = y;
      s.shadows.overrides[variable] = defaultShadowOverride();
    });
  }

  // HSL gradient helpers (read from globals for their background-color cues).
  $: sg = $editorState.shadows.globals;
  $: shadowHueGrad = `linear-gradient(to right, ${
    [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${sg.saturation}%,${sg.lightness}%)`).join(',')
  })`;
  $: shadowSatGrad = `linear-gradient(to right, hsl(${sg.hue},0%,${sg.lightness}%), hsl(${sg.hue},100%,${sg.lightness}%))`;
  $: shadowLightGrad = `linear-gradient(to right, hsl(${sg.hue},${sg.saturation}%,0%), hsl(${sg.hue},${sg.saturation}%,50%), hsl(${sg.hue},${sg.saturation}%,100%))`;

  let editingShadow: string | null = null;

  $: shadowTokens = $editorState.shadows.tokens;
  $: editingToken = editingShadow ? shadowTokens.find(t => t.variable === editingShadow) ?? null : null;
  $: editingIdx = editingToken ? shadowTokens.indexOf(editingToken) : -1;
  $: editingIsScale = editingToken ? SCALE_SHADOW_VARIABLES.has(editingToken.variable) : false;

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

  // Dial drag: open a transaction, stream angle edits into it, commit on
  // pointerup (observed on window so an off-dial release still commits).
  let dialDragIdx: number | null = null;
  function handleDialDown(event: PointerEvent, idx: number) {
    dialDragIdx = idx;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    beginTransaction('drag shadow angle');
    setTokenField(idx, 'angle', angleFromPointer(event, svg));
  }
  function handleDialMove(event: PointerEvent, idx: number) {
    if (dialDragIdx !== idx) return;
    const svg = event.currentTarget as SVGSVGElement;
    setTokenField(idx, 'angle', angleFromPointer(event, svg));
  }
  function handleDialUp() {
    if (dialDragIdx === null) return;
    dialDragIdx = null;
    commitTransaction();
  }

  let globalDialDrag = false;
  function handleGlobalDialDown(event: PointerEvent) {
    globalDialDrag = true;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    beginTransaction('drag global shadow angle');
    setGlobalAngle(angleFromPointer(event, svg));
  }
  function handleGlobalDialMove(event: PointerEvent) {
    if (!globalDialDrag) return;
    const svg = event.currentTarget as SVGSVGElement;
    setGlobalAngle(angleFromPointer(event, svg));
  }
  function handleGlobalDialUp() {
    if (!globalDialDrag) return;
    globalDialDrag = false;
    commitTransaction();
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
  // Overlay + hover token arrays and their global hue/sat/light/opacity
  // controls live in $editorState.overlays. The store's subscriber fans the
  // rgba values out to :root, so this file only orchestrates mutations and
  // reads derived display state.

  let editingOverlay: string | null = null;

  function getOverlayCss(t: OverlayToken): string {
    return `rgba(${t.r}, ${t.g}, ${t.b}, ${t.opacity})`;
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

  // The global-color / global-opacity derivations touch *every* token in a
  // channel. Keeping them as functions that take the draft lets a single
  // mutate() call update the global setting and the derived tokens in one
  // history entry.
  function applyChannelColor(tokens: OverlayToken[], g: OverlayChannelGlobals): void {
    const rgb = hslToRgb(g.hue, g.saturation, g.lightness);
    for (const t of tokens) { t.r = rgb.r; t.g = rgb.g; t.b = rgb.b; }
  }
  function applyChannelOpacity(tokens: OverlayToken[], g: OverlayChannelGlobals): void {
    const last = tokens.length - 1;
    tokens.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
    });
  }

  type OverlayChannel = 'overlay' | 'hover';
  type ColorField = 'hue' | 'saturation' | 'lightness';
  type OpacityField = 'opacityMin' | 'opacityMax';

  function pickChannelTokens(s: import('../lib/editorTypes').EditorState, ch: OverlayChannel): OverlayToken[] {
    return ch === 'overlay' ? s.overlays.tokens : s.overlays.hoverTokens;
  }

  function setOverlayColor(ch: OverlayChannel, field: ColorField, value: number) {
    mutate(`${ch} ${field}`, (s) => {
      const g = s.overlays.globals[ch];
      if (field === 'hue') g.hue = clampNum(value, 0, 360);
      else if (field === 'saturation') g.saturation = clampNum(value, 0, 100);
      else g.lightness = clampNum(value, 0, 100);
      applyChannelColor(pickChannelTokens(s, ch), g);
    });
  }

  function setOverlayOpacity(ch: OverlayChannel, field: OpacityField, value01: number) {
    mutate(`${ch} ${field}`, (s) => {
      const g = s.overlays.globals[ch];
      const clamped = Math.max(0, Math.min(1, value01));
      if (field === 'opacityMin') g.opacityMin = clamped;
      else g.opacityMax = clamped;
      applyChannelOpacity(pickChannelTokens(s, ch), g);
    });
  }

  function setOverlayTokenOpacity(ch: OverlayChannel, idx: number, value01: number) {
    mutate(`${ch} token opacity`, (s) => {
      const arr = pickChannelTokens(s, ch);
      const t = arr[idx];
      if (!t) return;
      t.opacity = Math.max(0, Math.min(1, value01));
    });
  }

  function overlayHueGrad(g: OverlayChannelGlobals): string {
    return `linear-gradient(to right, ${
      [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${g.saturation}%,${g.lightness}%)`).join(',')
    })`;
  }
  function overlaySatGrad(g: OverlayChannelGlobals): string {
    return `linear-gradient(to right, hsl(${g.hue},0%,${g.lightness}%), hsl(${g.hue},100%,${g.lightness}%))`;
  }
  function overlayLightGrad(g: OverlayChannelGlobals): string {
    return `linear-gradient(to right, hsl(${g.hue},${g.saturation}%,0%), hsl(${g.hue},${g.saturation}%,50%), hsl(${g.hue},${g.saturation}%,100%))`;
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


</script>

<div class="variables-container">
  <!-- Palette Editor -->
  <section class="section" id="palette-editor">
    <h2 class="section-title">Palette Editor</h2>
    <p class="editor-intro">Derived palettes via <code>color-mix(in oklch)</code>. Change a base color to update all derived steps. Click any derived swatch to add a manual override.</p>
    <div class="palette-editors">
      <PaletteEditor mode="gray" label="Neutral" cssNamespace="neutral"/>
      <PaletteEditor mode="gray" label="Alternate" cssNamespace="alternate" />
      <PaletteEditor label="Background" initialColor="#1a1a2e" cssNamespace="bg" emptySelector />
      <PaletteEditor label="Primary" initialColor="#c93636" cssNamespace="primary" />
      <PaletteEditor label="Accent" initialColor="#f49e0b" cssNamespace="accent" />
      <PaletteEditor label="Special" initialColor="#8b5cf6" cssNamespace="special" />
      <PaletteEditor label="Success" initialColor="#21c45d" cssNamespace="success" />
      <PaletteEditor label="Warning" initialColor="#e66e1a" cssNamespace="warning" />
      <PaletteEditor label="Info" initialColor="#3077e8" cssNamespace="info" />
      <PaletteEditor label="Danger" initialColor="#e8304f" cssNamespace="danger" />
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
        <input type="range" min="1" max="24" value={$editorState.columns.count}
          on:pointerdown={() => beginSliderGesture('drag columns count')}
          on:input={(e) => setColumnsCount(+e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="1" max="24"
          value={$editorState.columns.count}
          on:change={(e) => setColumnsCount(+e.currentTarget.value)} />
        <span class="shadow-slider-unit"></span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Maximum content width">Max-Width</span>
        <input type="range" min="480" max="2560" step="10" value={$editorState.columns.maxWidth}
          on:pointerdown={() => beginSliderGesture('drag columns max-width')}
          on:input={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
        <input class="shadow-slider-input columns-input-wide" type="number" min="320" max="2560"
          value={$editorState.columns.maxWidth}
          on:change={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Space between columns">Gutter</span>
        <input type="range" min="0" max="80" value={$editorState.columns.gutter}
          on:pointerdown={() => beginSliderGesture('drag columns gutter')}
          on:input={(e) => setColumnsGutter(+e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="200"
          value={$editorState.columns.gutter}
          on:change={(e) => setColumnsGutter(+e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Outer page margin (side gutters)">Margin</span>
        <input type="range" min="0" max="200" value={$editorState.columns.margin}
          on:pointerdown={() => beginSliderGesture('drag columns margin')}
          on:input={(e) => setColumnsMargin(+e.currentTarget.value)} />
        <input class="shadow-slider-input columns-input-wide" type="number" min="0" max="400"
          value={$editorState.columns.margin}
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
        style="gap: {$editorState.columns.gutter}px; padding-inline: {$editorState.columns.margin}px; grid-template-columns: repeat({$editorState.columns.count}, 1fr);"
      >
        {#each Array($editorState.columns.count) as _, i}
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
        <ProjectFontsSection />
        <h3 class="group-title">Font Families</h3>
        <FontStackEditor />
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
      {#each shadowTokens.filter(t => SCALE_SHADOW_VARIABLES.has(t.variable)) as token}
        <div class="shadow-item" class:active={editingShadow === token.variable}>
          <div class="shadow-box" style="box-shadow: {shadowTokenCss(token)};"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{shadowTokenValueLabel(token)}</span>
          </div>
          <button class="shadow-edit-btn" on:click={() => editingShadow = editingShadow === token.variable ? null : token.variable}>
            {editingShadow === token.variable ? 'Close' : 'Edit'}
          </button>
        </div>
      {/each}
    </div>

    <div class="shadows-grid">
      {#each shadowTokens.filter(t => !SCALE_SHADOW_VARIABLES.has(t.variable)) as token}
        <div class="shadow-item" class:active={editingShadow === token.variable}>
          <div class="shadow-box" style="box-shadow: {shadowTokenCss(token)};"></div>
          <div class="token-info">
            <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copyVariable(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            <span class="token-value">{shadowTokenValueLabel(token)}</span>
          </div>
          <button class="shadow-edit-btn" on:click={() => editingShadow = editingShadow === token.variable ? null : token.variable}>
            {editingShadow === token.variable ? 'Close' : 'Edit'}
          </button>
        </div>
      {/each}
    </div>

    <h3 class="group-title" style="margin-top: var(--ui-space-16);">Text Shadows</h3>
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
          on:change={(e) => setTokenField(editingIdx, 'angle', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">&deg;</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How far the shadow is cast from the element — simulates height off the surface">Dist</span>
        <input type="range" min="0" max="60" value={editingToken.distance}
          on:pointerdown={() => beginSliderGesture('edit shadow distance')}
          on:input={(e) => setTokenField(editingIdx, 'distance', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={editingToken.distance}
          on:change={(e) => setTokenField(editingIdx, 'distance', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread</span>
        <input type="range" min="-50" max="50" value={editingToken.spread}
          on:pointerdown={() => beginSliderGesture('edit shadow spread')}
          on:input={(e) => setTokenField(editingIdx, 'spread', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="-50" max="50"
          value={editingToken.spread}
          on:change={(e) => setTokenField(editingIdx, 'spread', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur</span>
        <input type="range" min="0" max="100" value={editingToken.blur}
          on:pointerdown={() => beginSliderGesture('edit shadow blur')}
          on:input={(e) => setTokenField(editingIdx, 'blur', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={editingToken.blur}
          on:change={(e) => setTokenField(editingIdx, 'blur', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op.</span>
        <input type="range" min="0" max="100" value={Math.round(editingToken.opacity * 100)}
          on:pointerdown={() => beginSliderGesture('edit shadow opacity')}
          on:input={(e) => setTokenField(editingIdx, 'opacity', +e.currentTarget.value / 100)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={Math.round(editingToken.opacity * 100)}
          on:change={(e) => setTokenField(editingIdx, 'opacity', +e.currentTarget.value / 100)} />
        <span class="shadow-slider-unit">%</span>
      </div>
      <div class="global-color-group">
        <div class="global-color-swatch" style="background: hsl({editingToken.hue}, {editingToken.saturation}%, {editingToken.lightness}%);"></div>
        <div class="global-color-sliders">
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Hue — the base color of the shadow (0°=red, 120°=green, 240°=blue)">H</span>
            <div class="slider-track" style="background: {shadowHueGrad}">
              <input type="range" min="0" max="360" value={editingToken.hue}
                on:pointerdown={() => beginSliderGesture('edit shadow hue')}
                on:input={(e) => setTokenColor(editingIdx, 'hue', +e.currentTarget.value)} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="360"
              value={editingToken.hue}
              on:change={(e) => setTokenColor(editingIdx, 'hue', +e.currentTarget.value)} />
            <span class="shadow-slider-unit">&deg;</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Saturation — 0% is gray, 100% is full color intensity">S</span>
            <div class="slider-track" style="background: linear-gradient(to right, hsl({editingToken.hue},0%,{editingToken.lightness}%), hsl({editingToken.hue},100%,{editingToken.lightness}%))">
              <input type="range" min="0" max="100" value={editingToken.saturation}
                on:pointerdown={() => beginSliderGesture('edit shadow saturation')}
                on:input={(e) => setTokenColor(editingIdx, 'saturation', +e.currentTarget.value)} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={editingToken.saturation}
              on:change={(e) => setTokenColor(editingIdx, 'saturation', +e.currentTarget.value)} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Lightness — 0% is black, 100% is white">L</span>
            <div class="slider-track" style="background: linear-gradient(to right, hsl({editingToken.hue},{editingToken.saturation}%,0%), hsl({editingToken.hue},{editingToken.saturation}%,50%), hsl({editingToken.hue},{editingToken.saturation}%,100%))">
              <input type="range" min="0" max="100" value={editingToken.lightness}
                on:pointerdown={() => beginSliderGesture('edit shadow lightness')}
                on:input={(e) => setTokenColor(editingIdx, 'lightness', +e.currentTarget.value)} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={editingToken.lightness}
              on:change={(e) => setTokenColor(editingIdx, 'lightness', +e.currentTarget.value)} />
            <span class="shadow-slider-unit">%</span>
          </div>
        </div>
      </div>
      <div class="shadow-css-output">
        <code>{shadowTokenCss(editingToken)}</code>
        <button class="shadow-copy-btn" on:click={() => copyVariable(shadowTokenCss(editingToken))}>
          {copiedVar === shadowTokenCss(editingToken) ? 'Copied!' : 'Copy CSS'}
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
            x2={24 + 18 * Math.cos(sg.angle * Math.PI / 180)}
            y2={24 - 18 * Math.sin(sg.angle * Math.PI / 180)}
            class="dial-line" />
          <circle
            cx={24 + 18 * Math.cos(sg.angle * Math.PI / 180)}
            cy={24 - 18 * Math.sin(sg.angle * Math.PI / 180)}
            r="3" class="dial-handle" />
        </svg>
        <input class="shadow-slider-input" type="number" min="0" max="360"
          value={sg.angle}
          on:change={(e) => setGlobalAngle(+e.currentTarget.value)} />
        <span class="shadow-slider-unit">&deg;</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How far the shadow is cast — simulates height off the surface">Dist Min</span>
        <input type="range" min="0" max="60" value={sg.distanceMin}
          on:pointerdown={() => beginSliderGesture('drag global dist min')}
          on:input={(e) => setGlobalDistance('distanceMin', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={sg.distanceMin}
          on:change={(e) => setGlobalDistance('distanceMin', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How far the shadow is cast — simulates height off the surface">Dist Max</span>
        <input type="range" min="0" max="60" value={sg.distanceMax}
          on:pointerdown={() => beginSliderGesture('drag global dist max')}
          on:input={(e) => setGlobalDistance('distanceMax', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={sg.distanceMax}
          on:change={(e) => setGlobalDistance('distanceMax', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
      {#if sg.sizeLocked}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread</span>
          <input type="range" min="-50" max="50" value={sg.sizeMin}
            on:pointerdown={() => beginSliderGesture('drag global spread')}
            on:input={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
          <input class="shadow-slider-input" type="number" min="-50" max="50"
            value={sg.sizeMin}
            on:change={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn" title="Unlock min/max" on:click={() => toggleLock('sizeLocked')}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
          </button>
        </div>
      {:else}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread Min</span>
          <input type="range" min="-50" max="50" value={sg.sizeMin}
            on:pointerdown={() => beginSliderGesture('drag global spread min')}
            on:input={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
          <input class="shadow-slider-input" type="number" min="-50" max="50"
            value={sg.sizeMin}
            on:change={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn unlocked" title="Lock to single value" on:click={() => toggleLock('sizeLocked')}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread Max</span>
          <input type="range" min="-50" max="50" value={sg.sizeMax}
            on:pointerdown={() => beginSliderGesture('drag global spread max')}
            on:input={(e) => setGlobalSize('sizeMax', +e.currentTarget.value)} />
          <input class="shadow-slider-input" type="number" min="-50" max="50"
            value={sg.sizeMax}
            on:change={(e) => setGlobalSize('sizeMax', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">px</span>
        </div>
      {/if}
      {#if sg.blurLocked}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur</span>
          <input type="range" min="0" max="100" value={sg.blurMin}
            on:pointerdown={() => beginSliderGesture('drag global blur')}
            on:input={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={sg.blurMin}
            on:change={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn" title="Unlock min/max" on:click={() => toggleLock('blurLocked')}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
          </button>
        </div>
      {:else}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur Min</span>
          <input type="range" min="0" max="100" value={sg.blurMin}
            on:pointerdown={() => beginSliderGesture('drag global blur min')}
            on:input={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={sg.blurMin}
            on:change={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">px</span>
          <button class="lock-btn unlocked" title="Lock to single value" on:click={() => toggleLock('blurLocked')}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur Max</span>
          <input type="range" min="0" max="100" value={sg.blurMax}
            on:pointerdown={() => beginSliderGesture('drag global blur max')}
            on:input={(e) => setGlobalBlur('blurMax', +e.currentTarget.value)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={sg.blurMax}
            on:change={(e) => setGlobalBlur('blurMax', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">px</span>
        </div>
      {/if}
      {#if sg.opacityLocked}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op.</span>
          <input type="range" min="0" max="100" value={Math.round(sg.opacityMin * 100)}
            on:pointerdown={() => beginSliderGesture('drag global opacity')}
            on:input={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round(sg.opacityMin * 100)}
            on:change={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
          <span class="shadow-slider-unit">%</span>
          <button class="lock-btn" title="Unlock min/max" on:click={() => toggleLock('opacityLocked')}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
          </button>
        </div>
      {:else}
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op. Min</span>
          <input type="range" min="0" max="100" value={Math.round(sg.opacityMin * 100)}
            on:pointerdown={() => beginSliderGesture('drag global opacity min')}
            on:input={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round(sg.opacityMin * 100)}
            on:change={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
          <span class="shadow-slider-unit">%</span>
          <button class="lock-btn unlocked" title="Lock to single value" on:click={() => toggleLock('opacityLocked')}>
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op. Max</span>
          <input type="range" min="0" max="100" value={Math.round(sg.opacityMax * 100)}
            on:pointerdown={() => beginSliderGesture('drag global opacity max')}
            on:input={(e) => setGlobalOpacity('opacityMax', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round(sg.opacityMax * 100)}
            on:change={(e) => setGlobalOpacity('opacityMax', +e.currentTarget.value / 100)} />
          <span class="shadow-slider-unit">%</span>
        </div>
      {/if}
      <div class="global-color-group">
        <div class="global-color-swatch" style="background: hsl({sg.hue}, {sg.saturation}%, {sg.lightness}%);"></div>
        <div class="global-color-sliders">
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Hue — the base color of the shadow (0°=red, 120°=green, 240°=blue)">H</span>
            <div class="slider-track" style="background: {shadowHueGrad}">
              <input type="range" min="0" max="360" value={sg.hue}
                on:pointerdown={() => beginSliderGesture('drag global hue')}
                on:input={(e) => setGlobalColor('hue', +e.currentTarget.value)} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="360"
              value={sg.hue}
              on:change={(e) => setGlobalColor('hue', +e.currentTarget.value)} />
            <span class="shadow-slider-unit">&deg;</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Saturation — 0% is gray, 100% is full color intensity">S</span>
            <div class="slider-track" style="background: {shadowSatGrad}">
              <input type="range" min="0" max="100" value={sg.saturation}
                on:pointerdown={() => beginSliderGesture('drag global saturation')}
                on:input={(e) => setGlobalColor('saturation', +e.currentTarget.value)} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={sg.saturation}
              on:change={(e) => setGlobalColor('saturation', +e.currentTarget.value)} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label" title="Lightness — 0% is black, 100% is white">L</span>
            <div class="slider-track" style="background: {shadowLightGrad}">
              <input type="range" min="0" max="100" value={sg.lightness}
                on:pointerdown={() => beginSliderGesture('drag global lightness')}
                on:input={(e) => setGlobalColor('lightness', +e.currentTarget.value)} />
            </div>
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={sg.lightness}
              on:change={(e) => setGlobalColor('lightness', +e.currentTarget.value)} />
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
      {#each $editorState.overlays.tokens as token, i}
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
                  on:pointerdown={() => beginSliderGesture(`edit ${token.variable} opacity`)}
                  on:input={(e) => setOverlayTokenOpacity('overlay', i, +e.currentTarget.value / 100)} />
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={Math.round(token.opacity * 100)}
                  on:change={(e) => setOverlayTokenOpacity('overlay', i, Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
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
            <div class="global-color-swatch" style="background: hsl({$editorState.overlays.globals.overlay.hue}, {$editorState.overlays.globals.overlay.saturation}%, {$editorState.overlays.globals.overlay.lightness}%);"></div>
            <div class="global-color-sliders">
              <div class="global-shadow-row">
                <span class="shadow-slider-label">H</span>
                <div class="slider-track" style="background: {overlayHueGrad($editorState.overlays.globals.overlay)}">
                  <input type="range" min="0" max="360" value={$editorState.overlays.globals.overlay.hue}
                    on:pointerdown={() => beginSliderGesture('overlay hue')}
                    on:input={(e) => setOverlayColor('overlay', 'hue', +e.currentTarget.value)} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="360"
                  value={$editorState.overlays.globals.overlay.hue}
                  on:change={(e) => setOverlayColor('overlay', 'hue', +e.currentTarget.value)} />
                <span class="shadow-slider-unit">&deg;</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">S</span>
                <div class="slider-track" style="background: {overlaySatGrad($editorState.overlays.globals.overlay)}">
                  <input type="range" min="0" max="100" value={$editorState.overlays.globals.overlay.saturation}
                    on:pointerdown={() => beginSliderGesture('overlay saturation')}
                    on:input={(e) => setOverlayColor('overlay', 'saturation', +e.currentTarget.value)} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={$editorState.overlays.globals.overlay.saturation}
                  on:change={(e) => setOverlayColor('overlay', 'saturation', +e.currentTarget.value)} />
                <span class="shadow-slider-unit">%</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">L</span>
                <div class="slider-track" style="background: {overlayLightGrad($editorState.overlays.globals.overlay)}">
                  <input type="range" min="0" max="100" value={$editorState.overlays.globals.overlay.lightness}
                    on:pointerdown={() => beginSliderGesture('overlay lightness')}
                    on:input={(e) => setOverlayColor('overlay', 'lightness', +e.currentTarget.value)} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={$editorState.overlays.globals.overlay.lightness}
                  on:change={(e) => setOverlayColor('overlay', 'lightness', +e.currentTarget.value)} />
                <span class="shadow-slider-unit">%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="overlay-global-col">
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Min</span>
            <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.overlay.opacityMin * 100)}
              on:pointerdown={() => beginSliderGesture('overlay opacity min')}
              on:input={(e) => setOverlayOpacity('overlay', 'opacityMin', +e.currentTarget.value / 100)} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round($editorState.overlays.globals.overlay.opacityMin * 100)}
              on:change={(e) => setOverlayOpacity('overlay', 'opacityMin', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Max</span>
            <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.overlay.opacityMax * 100)}
              on:pointerdown={() => beginSliderGesture('overlay opacity max')}
              on:input={(e) => setOverlayOpacity('overlay', 'opacityMax', +e.currentTarget.value / 100)} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round($editorState.overlays.globals.overlay.opacityMax * 100)}
              on:change={(e) => setOverlayOpacity('overlay', 'opacityMax', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
            <span class="shadow-slider-unit">%</span>
          </div>
        </div>
      </div>
    </div>

    <h3 class="group-title" style="margin-top: var(--ui-space-16);">Hover Overlays</h3>
    <div class="overlays-grid">
      {#each $editorState.overlays.hoverTokens as token, i}
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
                  on:pointerdown={() => beginSliderGesture(`edit ${token.variable} opacity`)}
                  on:input={(e) => setOverlayTokenOpacity('hover', i, +e.currentTarget.value / 100)} />
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={Math.round(token.opacity * 100)}
                  on:change={(e) => setOverlayTokenOpacity('hover', i, Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
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
            <div class="global-color-swatch" style="background: hsl({$editorState.overlays.globals.hover.hue}, {$editorState.overlays.globals.hover.saturation}%, {$editorState.overlays.globals.hover.lightness}%);"></div>
            <div class="global-color-sliders">
              <div class="global-shadow-row">
                <span class="shadow-slider-label">H</span>
                <div class="slider-track" style="background: {overlayHueGrad($editorState.overlays.globals.hover)}">
                  <input type="range" min="0" max="360" value={$editorState.overlays.globals.hover.hue}
                    on:pointerdown={() => beginSliderGesture('hover hue')}
                    on:input={(e) => setOverlayColor('hover', 'hue', +e.currentTarget.value)} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="360"
                  value={$editorState.overlays.globals.hover.hue}
                  on:change={(e) => setOverlayColor('hover', 'hue', +e.currentTarget.value)} />
                <span class="shadow-slider-unit">&deg;</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">S</span>
                <div class="slider-track" style="background: {overlaySatGrad($editorState.overlays.globals.hover)}">
                  <input type="range" min="0" max="100" value={$editorState.overlays.globals.hover.saturation}
                    on:pointerdown={() => beginSliderGesture('hover saturation')}
                    on:input={(e) => setOverlayColor('hover', 'saturation', +e.currentTarget.value)} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={$editorState.overlays.globals.hover.saturation}
                  on:change={(e) => setOverlayColor('hover', 'saturation', +e.currentTarget.value)} />
                <span class="shadow-slider-unit">%</span>
              </div>
              <div class="global-shadow-row">
                <span class="shadow-slider-label">L</span>
                <div class="slider-track" style="background: {overlayLightGrad($editorState.overlays.globals.hover)}">
                  <input type="range" min="0" max="100" value={$editorState.overlays.globals.hover.lightness}
                    on:pointerdown={() => beginSliderGesture('hover lightness')}
                    on:input={(e) => setOverlayColor('hover', 'lightness', +e.currentTarget.value)} />
                </div>
                <input class="shadow-slider-input" type="number" min="0" max="100"
                  value={$editorState.overlays.globals.hover.lightness}
                  on:change={(e) => setOverlayColor('hover', 'lightness', +e.currentTarget.value)} />
                <span class="shadow-slider-unit">%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="overlay-global-col">
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Min</span>
            <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.hover.opacityMin * 100)}
              on:pointerdown={() => beginSliderGesture('hover opacity min')}
              on:input={(e) => setOverlayOpacity('hover', 'opacityMin', +e.currentTarget.value / 100)} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round($editorState.overlays.globals.hover.opacityMin * 100)}
              on:change={(e) => setOverlayOpacity('hover', 'opacityMin', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
            <span class="shadow-slider-unit">%</span>
          </div>
          <div class="global-shadow-row">
            <span class="shadow-slider-label">Op. Max</span>
            <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.hover.opacityMax * 100)}
              on:pointerdown={() => beginSliderGesture('hover opacity max')}
              on:input={(e) => setOverlayOpacity('hover', 'opacityMax', +e.currentTarget.value / 100)} />
            <input class="shadow-slider-input" type="number" min="0" max="100"
              value={Math.round($editorState.overlays.globals.hover.opacityMax * 100)}
              on:change={(e) => setOverlayOpacity('hover', 'opacityMax', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
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
  .variables-container {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-32);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .section-title {
    font-size: var(--ui-font-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .group-title {
    font-size: var(--ui-font-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .token-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-variable {
    font-size: var(--ui-font-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .token-value {
    font-size: var(--ui-font-md);
    color: var(--ui-text-muted);
  }

  /* Columns */
  .columns-intro {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-muted);
    margin: 0;
    line-height: var(--ui-line-height-relaxed);
  }

  .columns-intro i {
    margin-inline: 2px;
    color: var(--ui-text-tertiary);
  }

  .columns-controls {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12) var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
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
    padding-top: var(--ui-space-8);
    margin-top: var(--ui-space-4);
    border-top: 1px solid var(--ui-border-faint);
  }

  .columns-reset {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-10);
    background: transparent;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-xs);
    cursor: pointer;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
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
    border-radius: var(--ui-radius-md);
    padding: var(--ui-space-12) 0;
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
    gap: var(--ui-space-6);
  }

  .spacing-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
  }

  .spacing-bar {
    height: 1.25rem;
    background: var(--ui-text-accent);
    border-radius: var(--ui-radius-sm);
    flex-shrink: 0;
  }

  .spacing-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Border Radius */
  .radius-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: var(--ui-space-16);
  }

  .radius-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
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
    gap: var(--ui-space-24);
    align-items: start;
  }

  .typography-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .font-families-group {
    grid-column: 1 / -1;
  }

  .font-size-demos {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .font-size-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .font-size-preview {
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    line-height: 1;
    min-width: 3rem;
  }

  .font-size-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  .font-weight-demos {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .font-weight-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .font-weight-preview {
    font-size: var(--ui-font-xl);
    font-family: var(--ui-font-sans);
    color: var(--ui-text-primary);
    line-height: 1;
    min-width: 2rem;
  }

  .font-weight-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Token Table */
  .token-table {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .token-row {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    padding: var(--ui-space-4) 0;
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .token-row:last-child {
    border-bottom: none;
  }

  /* Shadows */
  .shadows-section {
    background: var(--ui-surface-highest);
    padding: var(--ui-space-16);
    border-radius: var(--ui-radius-lg);
    position: relative;
  }

  .shadows-layout {
    display: flex;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  .shadows-main {
    flex: 1;
    min-width: 0;
  }

  .shadows-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--ui-space-16);
  }

  .shadow-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .shadow-item.active {
    outline: 2px solid var(--ui-text-accent);
    outline-offset: var(--ui-space-4);
    border-radius: var(--ui-radius-md);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .reset-btn {
    all: unset;
    font-size: var(--ui-font-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-4) var(--ui-space-8);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    text-align: center;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .reset-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .shadow-box {
    width: 4rem;
    height: 4rem;
    background: var(--ui-surface-high);
    border-radius: var(--ui-radius-md);
  }

  .shadow-item .token-info {
    align-items: center;
    text-align: center;
  }

  .shadow-edit-btn {
    all: unset;
    font-size: var(--ui-font-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .shadow-edit-btn:hover {
    color: var(--ui-text-accent);
    background: var(--ui-surface-low);
  }

  .shadow-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    width: 100%;
    min-width: 14rem;
  }

  .shadow-slider-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .shadow-slider-label {
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-semibold);
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
    font-size: var(--ui-font-xs);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
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
    font-size: var(--ui-font-xs);
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
    gap: var(--ui-space-4);
    margin-top: var(--ui-space-4);
    padding-top: var(--ui-space-8);
    border-top: 1px solid var(--ui-border-faint);
  }

  .shadow-css-output code {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    word-break: break-all;
  }

  .shadow-copy-btn {
    all: unset;
    font-size: var(--ui-font-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-6);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    text-align: center;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .shadow-copy-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  /* Global shadow editor */
  .global-shadow-editor {
    position: sticky;
    top: var(--ui-space-12);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    width: 18rem;
  }

  .global-shadow-title {
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .global-shadow-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .lock-btn {
    all: unset;
    cursor: pointer;
    color: var(--ui-text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
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
    border-radius: var(--ui-radius-sm);
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
    gap: var(--ui-space-8);
    align-items: stretch;
  }

  .global-color-swatch {
    width: 2rem;
    flex-shrink: 0;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-subtle);
  }

  .global-color-sliders {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .bg-picker-btn {
    all: unset;
    font-size: var(--ui-font-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-4) var(--ui-space-8);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-low);
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .bg-picker-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .bg-picker-menu {
    position: absolute;
    bottom: calc(100% + var(--ui-space-4));
    left: 0;
    width: 14rem;
    max-width: calc(100vw - 2rem);
    max-height: 24rem;
    overflow-y: auto;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .bg-group-header {
    all: unset;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--ui-space-6) var(--ui-space-8);
    font-size: var(--ui-font-xs);
    color: var(--ui-text-secondary);
    cursor: pointer;
    border-radius: var(--ui-radius-sm);
    transition: background var(--ui-transition-fast);
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
    padding-left: var(--ui-space-8);
  }

  .bg-color-option {
    all: unset;
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-4) var(--ui-space-8);
    font-size: var(--ui-font-xs);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    border-radius: var(--ui-radius-sm);
    transition: background var(--ui-transition-fast);
  }

  .bg-color-option:hover {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .bg-color-swatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-subtle);
    flex-shrink: 0;
  }

  .text-shadow-demos {
    display: flex;
    gap: var(--ui-space-24);
    flex-wrap: wrap;
  }

  .text-shadow-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .text-shadow-preview {
    font-size: var(--ui-font-2xl);
    font-family: var(--ui-font-sans);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  /* Gradients */
  .gradients-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: var(--ui-space-16);
  }

  .gradient-item {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .gradient-box {
    height: 3rem;
    border-radius: var(--ui-radius-md);
  }

  /* Utility Tokens */
  .utility-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--ui-space-24);
    align-items: start;
  }

  .utility-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  /* Palette Editor */
  .editor-intro {
    font-size: var(--ui-font-md);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .editor-intro code {
    font-size: var(--ui-font-md);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--ui-space-2) var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
  }

  .palette-editors {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  /* Overlays */
  .overlays-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--ui-space-16);
  }

  .overlay-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .overlay-swatch-wrap {
    width: 4rem;
    height: 4rem;
    border-radius: var(--ui-radius-md);
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
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    margin-top: var(--ui-space-8);
  }

  .overlay-global-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
    gap: var(--ui-space-16);
    align-items: start;
  }

  .overlay-global-col {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
  }

  /* Gradients and utility fills tighten at narrow widths */
  .gradients-grid,
  .utility-columns {
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
  }
</style>
