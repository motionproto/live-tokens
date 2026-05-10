<script lang="ts">
  import { onMount } from 'svelte';
  import PaletteEditor from './PaletteEditor.svelte';
  import FontStackEditor from './FontStackEditor.svelte';
  import ProjectFontsSection from './ProjectFontsSection.svelte';
  import ColumnsSection from './sections/ColumnsSection.svelte';
  import TokenScaleTable from './sections/TokenScaleTable.svelte';
  import OverlaysSection from './sections/OverlaysSection.svelte';
  import GradientsSection from './sections/GradientsSection.svelte';
  import {
    editorState, mutate, beginScope, commitScope, beginSliderGesture,
    seedShadowsFromDom, shadowTokenCss, computeShadowXY,
    SCALE_SHADOW_VARIABLES, defaultShadowOverride,
    type Scope,
  } from '../lib/editorStore';
  import type {
    ShadowToken, ShadowOverrideFlags, EditorState,
  } from '../lib/editorTypes';

  /** Visual flash for the copy-to-clipboard chip, kept short enough to
   *  feel like immediate confirmation but long enough to register. */
  const COPIED_FLASH_MS = 1000;

  interface TokenItem {
    variable: string;
    value: string;
  }

  interface TokenGroup {
    title: string;
    tokens: TokenItem[];
  }

  // Variable names for each scale we render below. Values are read live from
  // the stylesheet via getComputedStyle, so tokens.css stays the single source
  // of truth — no hand-maintained list of values to drift out of sync.
  const SPACING_VARS = [
    '--space-2', '--space-4', '--space-6', '--space-8', '--space-10',
    '--space-12', '--space-16', '--space-20', '--space-24', '--space-32',
    '--space-48',
  ];
  const BORDER_WIDTH_VARS = [
    '--border-width-0', '--border-width-1', '--border-width-2', '--border-width-3',
    '--border-width-4', '--border-width-5', '--border-width-6', '--border-width-8',
    '--border-width-10', '--border-width-12', '--border-width-16', '--border-width-20',
    '--border-width-24',
  ];
  const RADIUS_VARS = [
    '--radius-none', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
    '--radius-2xl', '--radius-3xl', '--radius-4xl', '--radius-full',
  ];
  const FONT_SIZE_VARS = [
    '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-lg',
    '--font-size-xl', '--font-size-2xl', '--font-size-3xl', '--font-size-4xl',
    '--font-size-5xl', '--font-size-6xl',
  ];
  const ICON_SIZE_VARS = [
    '--icon-size-xs', '--icon-size-sm', '--icon-size-md', '--icon-size-lg',
    '--icon-size-xl', '--icon-size-2xl', '--icon-size-3xl', '--icon-size-4xl',
    '--icon-size-5xl', '--icon-size-6xl',
  ];
  const FONT_WEIGHT_VARS = [
    '--font-weight-thin', '--font-weight-extralight', '--font-weight-light',
    '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold',
    '--font-weight-bold', '--font-weight-extrabold', '--font-weight-black',
  ];
  const LINE_HEIGHT_VARS = [
    '--line-height-tight', '--line-height-snug', '--line-height-normal',
    '--line-height-relaxed', '--line-height-loose',
  ];

  // Bumped whenever the live CSS values might have changed (breakpoint flip,
  // editor mutation). Used as a reactivity trigger below.
  let liveVersion = 0;

  function readVar(name: string): string {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function formatValueHint(raw: string): string {
    if (!raw) return '';
    // 9999px reads as "9999px"; label it "pill" to match the prior convention.
    if (raw === '9999px') return '9999px (pill)';
    const rem = raw.match(/^(-?[\d.]+)rem$/);
    if (rem) {
      const px = Math.round(parseFloat(rem[1]) * 16 * 100) / 100;
      return `${raw} (${px}px)`;
    }
    return raw;
  }

  function toItems(names: readonly string[]): TokenItem[] {
    return names.map((variable) => ({ variable, value: formatValueHint(readVar(variable)) }));
  }

  // Re-read whenever liveVersion bumps OR the editor mutates any CSS var
  // (editor edits fan out via cssVarSync to :root). Depending on
  // $editorState keeps the display in sync with user edits for free.
  let spacingTokens: TokenItem[] = [];
  let borderWidthTokens: TokenItem[] = [];
  let radiusTokens: TokenItem[] = [];
  let fontSizeTokens: TokenItem[] = [];
  let fontWeightTokens: TokenItem[] = [];
  let lineHeightTokens: TokenItem[] = [];
  let iconSizeTokens: TokenItem[] = [];
  $: {
    liveVersion;
    $editorState;
    spacingTokens = toItems(SPACING_VARS);
    borderWidthTokens = toItems(BORDER_WIDTH_VARS);
    radiusTokens = toItems(RADIUS_VARS);
    fontSizeTokens = toItems(FONT_SIZE_VARS);
    fontWeightTokens = toItems(FONT_WEIGHT_VARS);
    lineHeightTokens = toItems(LINE_HEIGHT_VARS);
    iconSizeTokens = toItems(ICON_SIZE_VARS);
  }

  // tokens.css declares responsive overrides at 768px and 480px; refresh when
  // those breakpoints flip so the font-size hints reflect the active viewport.
  const BREAKPOINTS = ['(max-width: 768px)', '(max-width: 480px)'] as const;

  onMount(() => {
    seedShadowsFromDom();
    liveVersion++; // initial read once the DOM has tokens.css applied
    if (typeof window === 'undefined') return;
    const mqls = BREAKPOINTS.map((q) => window.matchMedia(q));
    const bump = () => { liveVersion++; };
    for (const m of mqls) m.addEventListener('change', bump);
    return () => {
      for (const m of mqls) m.removeEventListener('change', bump);
    };
  });

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

  /** Locate token at `idx` and run `mut` inside a single `mutate(...)` action.
   *  Token-field handlers below collapse to one or two lines via this helper —
   *  per-field clamp/round semantics stay distinct, but the mutate/find/early-
   *  return prelude doesn't repeat. */
  function withShadowToken(label: string, idx: number, mut: (t: ShadowToken, s: EditorState) => void) {
    mutate(`set shadow token ${label}`, (s) => {
      const t = s.shadows.tokens[idx];
      if (!t) return;
      mut(t, s);
    });
  }

  // Per-token edits set the override flag for the edited field so future
  // global broadcasts skip this token, preserving the user's manual value.
  function setTokenField(idx: number, field: 'angle' | 'distance' | 'spread' | 'blur' | 'opacity', value: number) {
    withShadowToken(field, idx, (t, s) => {
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
    withShadowToken(field, idx, (t, s) => {
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

  // Dial drag: open a scope, stream angle edits into it, commit on pointerup
  // (observed on window so an off-dial release still commits).
  let dialDragIdx: number | null = null;
  let dialDragScope: Scope | null = null;
  function handleDialDown(event: PointerEvent, idx: number) {
    dialDragIdx = idx;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    dialDragScope = beginScope({ label: 'drag shadow angle', collapseToOne: true, clipUndoFloor: false });
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
    if (dialDragScope) { commitScope(dialDragScope); dialDragScope = null; }
  }

  let globalDialDrag = false;
  let globalDialScope: Scope | null = null;
  function handleGlobalDialDown(event: PointerEvent) {
    globalDialDrag = true;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    globalDialScope = beginScope({ label: 'drag global shadow angle', collapseToOne: true, clipUndoFloor: false });
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
    if (globalDialScope) { commitScope(globalDialScope); globalDialScope = null; }
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
        { label: 'Lowest', value: 'var(--surface-canvas-lowest)' },
        { label: 'Lower', value: 'var(--surface-canvas-lower)' },
        { label: 'Low', value: 'var(--surface-canvas-low)' },
        { label: 'Base', value: 'var(--surface-canvas)' },
        { label: 'High', value: 'var(--surface-canvas-high)' },
        { label: 'Higher', value: 'var(--surface-canvas-higher)' },
        { label: 'Highest', value: 'var(--surface-canvas-highest)' },
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

  const durationTokens: TokenItem[] = [
    { variable: '--duration-75', value: '75ms' },
    { variable: '--duration-150', value: '150ms' },
    { variable: '--duration-200', value: '200ms' },
    { variable: '--duration-300', value: '300ms' },
    { variable: '--duration-500', value: '500ms' },
    { variable: '--duration-750', value: '750ms' },
    { variable: '--duration-1000', value: '1000ms' }
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

  let copiedVar: string | null = null;
  function copyVariable(v: string) {
    navigator.clipboard.writeText(v);
    copiedVar = v;
    setTimeout(() => { copiedVar = null; }, COPIED_FLASH_MS);
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
      <PaletteEditor label="Background" initialColor="#1a1a2e" cssNamespace="canvas" emptySelector />
      <PaletteEditor label="Primary" initialColor="#c93636" cssNamespace="primary" />
      <PaletteEditor label="Accent" initialColor="#f49e0b" cssNamespace="accent" />
      <PaletteEditor label="Special" initialColor="#8b5cf6" cssNamespace="special" />
      <PaletteEditor label="Success" initialColor="#21c45d" cssNamespace="success" />
      <PaletteEditor label="Warning" initialColor="#e66e1a" cssNamespace="warning" />
      <PaletteEditor label="Info" initialColor="#3077e8" cssNamespace="info" />
      <PaletteEditor label="Danger" initialColor="#e8304f" cssNamespace="danger" />
    </div>
  </section>

  <!-- Spacing & Borders -->
  <section class="section" id="spacing">
    <h2 class="section-title">Spacing &amp; Borders</h2>
    <h3 class="subsection-title">Spacing</h3>
    <TokenScaleTable kind="spacing" tokens={spacingTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
    <h3 class="subsection-title">Borders</h3>
    <TokenScaleTable kind="border" tokens={borderWidthTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
  </section>

  <!-- Columns -->
  <ColumnsSection />

  <!-- Border Radius -->
  <section class="section" id="border-radius">
    <h2 class="section-title">Border Radius</h2>
    <TokenScaleTable kind="radius" tokens={radiusTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
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
        <TokenScaleTable kind="font-size" tokens={fontSizeTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Weights</h3>
        <TokenScaleTable kind="font-weight" tokens={fontWeightTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Line Heights</h3>
        <TokenScaleTable kind="line-height" tokens={lineHeightTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>
    </div>
  </section>

  <!-- Icon Sizes -->
  <section class="section" id="icon-sizes">
    <h2 class="section-title">Icon Sizes</h2>
    <TokenScaleTable kind="icon-size" tokens={iconSizeTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
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
  <OverlaysSection {copiedVar} on:copy={(e) => copyVariable(e.detail)} />

  <!-- Gradients -->
  <GradientsSection {copiedVar} on:copy={(e) => copyVariable(e.detail)} />

  <!-- Utility Tokens -->
  <section class="section" id="utility-tokens">
    <h2 class="section-title">Utility Tokens</h2>
    <div class="utility-columns">
      <div class="utility-group">
        <h3 class="group-title">Durations</h3>
        <TokenScaleTable kind="line-height" tokens={durationTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="utility-group">
        <h3 class="group-title">Z-Index Layers</h3>
        <TokenScaleTable kind="line-height" tokens={zIndexTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="utility-group">
        <h3 class="group-title">Opacity</h3>
        <TokenScaleTable kind="line-height" tokens={opacityTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
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
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .group-title {
    font-size: var(--ui-font-size-md);
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
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
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
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
  }

  /* Subsection title (used by Spacing & Borders) */
  .subsection-title {
    margin: var(--ui-space-16) 0 var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .subsection-title:first-child,
  .section-title + .subsection-title {
    margin-top: 0;
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
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-xs);
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

  .shadow-slider-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }

  .shadow-slider-input {
    font-size: var(--ui-font-size-xs);
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
    appearance: textfield;
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
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    word-break: break-all;
  }

  .shadow-copy-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-xs);
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
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .editor-intro code {
    font-size: var(--ui-font-size-md);
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

  /* Utility fill tightens at narrow widths */
  .utility-columns {
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
  }
</style>
