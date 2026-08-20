<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { oklchToHexClamped, type Oklch } from '../core/palettes/oklch';
  import { type CurveAnchor, lightnessCurveConfig, saturationCurveConfig, hueCurveConfig } from './curveEngine';
  import ColorEditPanel from './ColorEditPanel.svelte';
  import OverridesPanel from './palette/OverridesPanel.svelte';
  import UIPillButton from './UIPillButton.svelte';
  import UIReveal from './UIReveal.svelte';
  import GradientStopEditor from './palette/GradientStopEditor.svelte';
  import ScaleCurveEditor from './palette/ScaleCurveEditor.svelte';
  import PaletteBase from './palette/PaletteBase.svelte';
  import PaletteJumpButton from './palette/PaletteJumpButton.svelte';
  import Toggle from './Toggle.svelte';
  import { type EditingState, idleState, BASE_KEY, isEditingBase as isBaseEdit } from './palette/paletteEditorState';
  import {
    type Step, type Scale,
    GRAY_FALLBACK,
    DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_SATURATION, DEFAULT_PALETTE_HUE,
    defaultScaleCurves, defaultScaleCurvesObject, defaultPaletteConfig,
    paletteStepLightness, scales,
    paletteStepKey, stepKey, scaleCurveKey as getScaleCurveKey,
    stepIndexToX,
    syncBaseAnchor, clearBaseAnchor,
    computePaletteOklch as computePaletteOklchPure,
    computeDerivedOklch as computeDerivedOklchPure,
    snapScaleToPalette as snapScaleToPalettePure,
  } from './palette/paletteMath';
  import type { PaletteConfig, GradientStop } from '../core/themes/themeTypes';
  import { editorState, mutate, setPaletteConfig, beginSliderGesture, beginScope, commitScope, cancelScope, type Scope } from '../core/store/editorStore';
  // Base-color edits route through the shared setter so a bound harmony axis
  // follows the hue (invariant 1); the local `edit` would silently detach it.
  import { setBaseColor } from './colors/paletteBaseColor';
  import { pendingPaletteFocus } from '../core/store/paletteFocus';
  import { showCopyPopover } from './copyPopover';

  // Full sRGB chroma range (gamutClamp trims per hue/lightness). Neutrals default
  // low but are not capped; their calm character comes from defaults, not a ceiling.
  const BASE_CHROMA_MAX = 0.4;
  // Where a typical neutral's chroma sits, marked on the slider as a soft nudge.
  const NEUTRAL_CALM_CHROMA = 0.05;

  interface Props {
    label: string;
    displayLabel?: string | null;
    initialColor?: Oklch;
    neutral?: boolean;
    cssNamespace?: string | null;
    emptySelector?: boolean;
  }

  let {
    label,
    displayLabel = null,
    initialColor = GRAY_FALLBACK,
    neutral = false,
    cssNamespace = null,
    emptySelector = false
  }: Props = $props();

  const toHex = (o: Oklch): string => oklchToHexClamped(o.l, o.c, o.h);

  const seedConfig = () => defaultPaletteConfig({ baseColor: initialColor, neutral });

  function edit<K extends keyof PaletteConfig>(field: K, value: PaletteConfig[K]): void {
    mutate(`${label}: ${String(field)}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = seedConfig();
      (s.palettes[label] as any)[field] = value;
    });
  }

  function patchPalette(patch: Partial<PaletteConfig>, historyLabel: string): void {
    mutate(`${label}: ${historyLabel}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = seedConfig();
      Object.assign(s.palettes[label], patch);
    });
  }

  let lockedLightnessIdx: number | null = $derived.by(() => {
    if (!anchorToBase || anchorPlacement === undefined) return null;
    const x = stepIndexToX(anchorPlacement.step);
    const idx = lightnessCurve.findIndex(a => Math.abs(a.x - x) < 0.5);
    return idx >= 0 ? idx : null;
  });
  let lockedSaturationIdx: number | null = $derived.by(() => {
    if (!anchorToBase || anchorPlacement === undefined) return null;
    const x = stepIndexToX(anchorPlacement.step);
    const idx = saturationCurve.findIndex(a => Math.abs(a.x - x) < 0.5);
    return idx >= 0 ? idx : null;
  });
  // Unlike lightness/saturation, hue has no always-present curve to search: it stays
  // undefined until the first edit (RJC 5), and there is nothing to lock before then.
  let lockedHueIdx: number | null = $derived.by(() => {
    if (!anchorToBase || anchorPlacement === undefined || hueCurve === undefined) return null;
    const x = stepIndexToX(anchorPlacement.step);
    const idx = hueCurve.findIndex(a => Math.abs(a.x - x) < 0.5);
    return idx >= 0 ? idx : null;
  });

  // Held at component scope so inline header-swatch handlers and the function
  // handlers share one handle for commit/cancel.
  let paletteEditScope: Scope | null = null;

  function openSession() {
    paletteEditScope = beginScope({ label: 'palette session', collapseToOne: true, clipUndoFloor: true });
  }

  function stopColor(stop: GradientStop, pc: typeof paletteComputed): string {
    const ps = pc?.find(p => p.label === stop.paletteLabel);
    return ps ? ps.effective : '#000000';
  }

  function onEmptyModeChange(e: Event) {
    edit('emptyMode', (e.currentTarget as HTMLInputElement).checked ? 'gradient' : 'solid');
  }

  let showDerived = $state(false);
  let paletteEditorOpen = $state(false);
  let rootEl: HTMLElement | undefined = $state();

  // Arriving from the Colors view's Edit button: open this family's controls and
  // bring it into view, since the Tokens view stacks every family.
  $effect(() => {
    if ($pendingPaletteFocus !== label) return;
    pendingPaletteFocus.set(null);
    paletteEditorOpen = true;
    tick().then(() => rootEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });

  function setLightnessCurve(a: CurveAnchor[]) { edit('lightnessCurve', a); }
  function setSaturationCurve(a: CurveAnchor[]) { edit('saturationCurve', a); }

  // First edit materializes the field (RJC 5) with `a` — the curve the UI
  // actually rendered and edited — written in BEFORE syncBaseAnchor runs, not
  // after: syncBaseAnchor pins the anchor by inserting a y=0 point into
  // whatever `cfg.hueCurve` currently holds, so calling it against the
  // about-to-be-discarded flat default and then overwriting with `a` would
  // throw the pin away. Wave 3's idempotency guarantee is what makes
  // re-running syncBaseAnchor here safe without disturbing the
  // lightness/saturation anchors it already placed.
  function setHueCurve(a: CurveAnchor[]) {
    mutate(`${label}: hueCurve`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = seedConfig();
      const cfg = s.palettes[label];
      const materializing = cfg.hueCurve === undefined;
      cfg.hueCurve = a;
      if (materializing) syncBaseAnchor(cfg);
    });
  }

  function handleOffset(key: string, value: number) {
    edit('curveOffset', { ...curveOffset, [key]: value });
  }

  function handleAutoSmooth(key: string, value: boolean) {
    edit('curveAutoSmooth', { ...curveAutoSmooth, [key]: value });
  }

  let editing: EditingState = $state(idleState);

  function computePaletteOklch(index: number, base: Oklch): Oklch {
    return computePaletteOklchPure(index, base, lightnessCurve, saturationCurve, curveOffset, hueCurve);
  }

  function computeDerivedOklch(step: Step, base: Oklch, scaleTitle: string): Oklch {
    return computeDerivedOklchPure(step, base, scaleTitle, scaleCurves, curveOffset);
  }

  // Toggle placement atomically with the flag flip so one undo reverses the
  // whole thing. The anchor's lifecycle (placement, displaced-y restore)
  // lives in syncBaseAnchor/clearBaseAnchor, shared with the store setters.
  function setAnchorToBase(next: boolean) {
    if (next === anchorToBase) return;
    mutate(`${label}: ${next ? 'anchor on' : 'anchor off'}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = seedConfig();
      const cfg = s.palettes[label];
      if (next) {
        cfg.anchorToBase = true;
        syncBaseAnchor(cfg);
      } else {
        clearBaseAnchor(cfg);
      }
    });
  }

  let anchorUnlockPrompt = $state(false);
  function confirmBaseAnchorUnlock() {
    setAnchorToBase(false);
    anchorUnlockPrompt = false;
  }


  function startBaseEdit() {
    if (editing.kind === 'editingBase') { confirmEdit(); return; }
    editing = { kind: 'editingBase' };
    openSession();
  }

  function handlePaletteClick(ps: { label: string; lightness: number; index: number }) {
    const k = paletteStepKey(ps.label);
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computePaletteOklch(ps.index, baseColor);
    editing = { kind: 'editingStep', stepKey: k, snapshot: current, draft: current };
    openSession();
  }

  let scaleEditorOpen: Record<string, boolean> = $state({ Surfaces: false, Borders: false, Text: false });

  function toggleScaleEditor(title: string) {
    scaleEditorOpen[title] = !scaleEditorOpen[title];
    scaleEditorOpen = scaleEditorOpen;
  }

  // Session-scoped (RJC 9): viewport state, never written to theme JSON.
  // Keyed by the same curveKey strings that already key curveOffset, so a
  // hue key ("hue" or "<scale>-hue") defaults closed and the rest open.
  let curveSectionOpen: Record<string, boolean> = $state({});
  const sectionOpen = (key: string) => curveSectionOpen[key] ?? !key.endsWith('hue');
  function toggleCurveSection(key: string) {
    curveSectionOpen[key] = !sectionOpen(key);
    curveSectionOpen = curveSectionOpen;
  }

  function setScaleCurve(title: string, channel: 'lightness' | 'saturation' | 'hue', a: CurveAnchor[]) {
    const cur = scaleCurves[title] ?? { lightness: defaultScaleCurves[title].lightness(), saturation: defaultScaleCurves[title].saturation() };
    edit('scaleCurves', { ...scaleCurves, [title]: { ...cur, [channel]: a } });
  }

  function handleColorChange(color: Oklch) {
    if (editing.kind === 'editingStep') {
      editing = { ...editing, draft: color };
      // Write every drag tick to the store (not just pre-existing overrides) so
      // the live page and the derived-scale preview swatches update in realtime.
      // The open session collapses these to one undo entry; cancel restores the
      // snapshot, and confirmEdit drops the override if the draft equals the
      // computed value, so a no-op edit leaves nothing behind.
      edit('overrides', { ...overrides, [editing.stepKey]: color });
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
    const current = (k in overrides) ? overrides[k] : computeDerivedOklch(step, baseColor, scaleTitle);
    editing = { kind: 'editingStep', stepKey: k, snapshot: current, draft: current };
    openSession();
  }

  async function confirmEdit() {
    if (editingKey) {
      // Accumulate override changes into one patch so the session commit sees
      // a single final state (no intermediate reactive round-trips).
      let nextOverrides = { ...overrides };
      if (editingDraft !== null) {
        const computed = computedValueForKey(editingKey);
        // Compare via the sRGB projection: an override that renders identically
        // to the computed default is dropped (same rule as the pre-Wave-2 hex
        // compare); the stored value stays the lossless numeric draft.
        const draftHex = toHex(editingDraft);
        if (computed !== null && draftHex !== toHex(computed)) {
          nextOverrides[editingKey] = editingDraft;
        } else if (computed !== null && editingKey in nextOverrides && draftHex === toHex(computed)) {
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
    editing = idleState;
    // tick() lets the store-derived reactives flush before session commit
    await tick();
    if (paletteEditScope) { commitScope(paletteEditScope); paletteEditScope = null; }
  }

  function cancelEdit() {
    editing = idleState;
    // Restoring the session snapshot pulls baseColor/overrides/… back to pre-open.
    if (paletteEditScope) { cancelScope(paletteEditScope); paletteEditScope = null; }
  }

  function removeOverride(k: string) {
    const { [k]: _, ...rest } = overrides;
    edit('overrides', rest);
    if (editingKey === k) { editing = idleState; }
  }

  function computedValueForKey(key: string): Oklch | null {
    const ps = paletteStepLightness.find(p => paletteStepKey(p.label) === key);
    if (ps) {
      const idx = paletteStepLightness.indexOf(ps);
      return computePaletteOklch(idx, baseColor);
    }
    for (const scale of scales) {
      for (const step of scale.steps) {
        if (stepKey(scale.title, step.name) === key) {
          return computeDerivedOklch(step, baseColor, scale.title);
        }
      }
    }
    return null;
  }

  function effectiveColor(k: string, step: Step, scaleTitle: string, _version?: string): string {
    if (editingKey === k && editingDraft !== null) return toHex(editingDraft);
    return (k in overrides) ? toHex(overrides[k]) : toHex(computeDerivedOklch(step, baseColor, scaleTitle));
  }

  let copiedKey: string | null = $state(null);
  function copyHex(k: string, hex: string, event?: MouseEvent) {
    navigator.clipboard.writeText(hex);
    copiedKey = k;
    showCopyPopover(hex, event?.currentTarget ?? null);
    setTimeout(() => { copiedKey = null; }, 1500);
  }

  let copiedLabelKey: string | null = $state(null);
  function copyVarName(k: string, varName: string, event?: MouseEvent) {
    navigator.clipboard.writeText(varName);
    copiedLabelKey = k;
    showCopyPopover(varName, event?.currentTarget ?? null);
    setTimeout(() => { copiedLabelKey = null; }, 1500);
  }

  function snapScaleToPalette(scale: Scale): Record<string, Oklch> {
    return snapScaleToPalettePure(scale, baseColor, scaleCurves, curveOffset, paletteComputed);
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
        editing = idleState;
      }
    } else {
      const assigned = snapScaleToPalette(scale);
      const nextSnapped = [...snappedScales, scale.title];
      patchPalette({ snappedScales: nextSnapped, overrides: { ...overrides, ...assigned } }, 'snap scale');
    }
  }

  function clearPaletteOverrides() {
    const next = { ...overrides };
    for (const ps of paletteStepLightness) delete next[paletteStepKey(ps.label)];
    edit('overrides', next);
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
      editing = idleState;
    }
  }

  let snapPickerKey: string | null = $state(null);

  function handleDocClick(e: MouseEvent) {
    if (!snapPickerKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('.override-slot-wrapper')) return;
    snapPickerKey = null;
  }
  onMount(() => document.addEventListener('click', handleDocClick, true));
  onDestroy(() => document.removeEventListener('click', handleDocClick, true));

  function selectSnapValue(k: string, value: Oklch, _scaleTitle: string) {
    edit('overrides', { ...overrides, [k]: value });
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
      for (const [k, color] of Object.entries(assigned)) {
        // Value compare, not reference: the recompute yields fresh objects, so a
        // reference test would always fire and loop the resnap effect.
        const prev = next[k];
        if (!prev || prev.l !== color.l || prev.c !== color.c || prev.h !== color.h) {
          next[k] = color;
          changed = true;
        }
      }
    }
    if (changed) edit('overrides', next);
  }

  export function loadConfig(config: PaletteConfig) {
    setPaletteConfig(label, config);
  }

  // Each field reads `$editorState.palettes[label]` directly. A chained
  // `$derived` of the whole config would return the same object reference on
  // every mutate-in-place store update (Svelte 5 uses `===` equality) and
  // short-circuit the downstream chain — swatches would freeze.
  let baseColor = $derived($editorState.palettes[label]?.baseColor ?? initialColor);
  let lightnessCurve = $derived($editorState.palettes[label]?.lightnessCurve ?? DEFAULT_PALETTE_LIGHTNESS());
  let saturationCurve = $derived($editorState.palettes[label]?.saturationCurve ?? DEFAULT_PALETTE_SATURATION());
  // Left undefined when absent (RJC 5): materializing here would seed every
  // fresh palette with a redundant flat curve it never asked for.
  let hueCurve = $derived($editorState.palettes[label]?.hueCurve);
  let scaleCurves = $derived($editorState.palettes[label]?.scaleCurves ?? defaultScaleCurvesObject());
  let curveOffset = $derived($editorState.palettes[label]?.curveOffset ?? { lightness: 0, saturation: 0 });
  let curveAutoSmooth = $derived($editorState.palettes[label]?.curveAutoSmooth ?? {});
  let overrides = $derived($editorState.palettes[label]?.overrides ?? {});
  let snappedScales = $derived(new Set($editorState.palettes[label]?.snappedScales ?? []));
  let anchorToBase = $derived($editorState.palettes[label]?.anchorToBase ?? true);
  let anchorPlacement = $derived($editorState.palettes[label]?.anchorPlacement);
  let emptyMode = $derived($editorState.palettes[label]?.emptyMode ?? 'solid');
  let gradientStyle = $derived($editorState.palettes[label]?.gradientStyle ?? 'linear');
  let gradientAngle = $derived($editorState.palettes[label]?.gradientAngle ?? 180);
  let gradientReverse = $derived($editorState.palettes[label]?.gradientReverse ?? false);
  let gradientStops = $derived($editorState.palettes[label]?.gradientStops ?? [
    { position: 0, paletteLabel: '800' },
    { position: 100, paletteLabel: '950' },
  ]);
  let gradientSize = $derived($editorState.palettes[label]?.gradientSize ?? 'page');
  let editingKey = $derived(editing.kind === 'idle' ? null : editing.kind === 'editingBase' ? BASE_KEY : editing.stepKey);
  let editingDraft = $derived(editing.kind === 'editingStep' ? editing.draft : null);
  let paletteComputed = $derived((() => {
    const _bc = baseColor, _lc = lightnessCurve, _sc = saturationCurve, _hc = hueCurve, _co = curveOffset, _ed = editingDraft, _ek = editingKey, _ov = overrides, _ab = anchorToBase, _ap = anchorPlacement;
    return paletteStepLightness.map((ps, index) => {
      const k = paletteStepKey(ps.label);
      const oklch = computePaletteOklch(index, baseColor);
      const effOklch = (_ek === k && _ed !== null) ? _ed : (k in _ov) ? _ov[k] : oklch;
      return {
        label: ps.label,
        lightness: ps.lightness,
        index,
        key: k,
        anchored: _ab && _ap?.step === index,
        // `oklch` is the numeric step (feeds snap); `hex`/`effective` are the
        // sRGB projections that paint swatches and copy to the clipboard.
        oklch,
        hex: toHex(oklch),
        effective: toHex(effOklch),
      };
    });
  })());
  let gradientBarPreview = $derived.by(() => {
    const pc = paletteComputed;
    const sorted = [...gradientStops].sort((a, b) => gradientReverse ? b.position - a.position : a.position - b.position);
    const stops = sorted.map(s => `${stopColor(s, pc)} ${s.position}%`).join(', ');
    return `linear-gradient(to right, ${stops})`;
  });
  // `editingDraft` is folded in so the effective-hex closure passed to
  // OverridesPanel re-derives on every drag tick (the per-step hex text would
  // otherwise lag the live swatch during an override edit).
  let curveVersion = $derived(JSON.stringify(scaleCurves) + JSON.stringify(curveOffset) + JSON.stringify(baseColor) + JSON.stringify(editingDraft));
  let derivedHexForBase = $derived((step: Step, scaleTitle: string) => toHex(computeDerivedOklch(step, baseColor, scaleTitle)));
  let effectiveHexAny = $derived((k: string, step: Step, scaleTitle: string) => effectiveColor(k, step, scaleTitle, curveVersion));
  // Projected hex view of the numeric overrides for the display-only panels.
  let overridesHex = $derived(Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, toHex(v)])));

  let isEditingBase = $derived(isBaseEdit(editing));
  let editingColor = $derived(isEditingBase ? baseColor : editingDraft);
  let editingStepInfo = $derived((() => {
    if (!editingKey || isEditingBase) return null;
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
  })());
  let panelOpen = $derived(editingKey !== null && (isEditingBase || (editingDraft !== null && editingStepInfo !== null)));
  let editPanelTitle = $derived(isEditingBase
    ? 'Base Color'
    : editingStepInfo
      ? `${editingStepInfo.scale} \u203A ${editingStepInfo.step}`
      : null);
  $effect(() => {
    // Touch each input so the effect tracks them (resnapScales reads indirectly).
    void baseColor;
    void scaleCurves;
    void lightnessCurve;
    void saturationCurve;
    void curveOffset;
    void snappedScales;
    resnapScales();
  });
</script>

<div class="palette-editor" bind:this={rootEl} style="--editor-base: {toHex(baseColor)}">
  <PaletteBase
    {label}
    {displayLabel}
    {baseColor}
    {isEditingBase}
    pinnedOpen={paletteEditorOpen}
    {copiedKey}
    onStartEdit={startBaseEdit}
    onCopyBaseHex={copyHex}
  >
    {#snippet actions()}
      <PaletteJumpButton family={label} {displayLabel} target="wheel" />
      <UIPillButton size="compact" variant="outline" onclick={clearPaletteOverrides}>Clear Overrides</UIPillButton>
      <UIPillButton size="compact" variant="outline" onclick={() => paletteEditorOpen = !paletteEditorOpen}>
        {paletteEditorOpen ? 'Close' : 'Edit'}
      </UIPillButton>
    {/snippet}
  </PaletteBase>

  {#if paletteEditorOpen || (isEditingBase && panelOpen && editingColor)}
    <div class="swatch-grid" style="--swatch-cols: {paletteStepLightness.length + 2}">
      <div class="base-panel" style="grid-column: 2 / {paletteStepLightness.length + 2}">
        <ColorEditPanel
          title={isEditingBase ? editPanelTitle : 'Base Color'}
          showRemoveOverride={false}
          hideActions={!isEditingBase}
          hidePreview
          hue={baseColor.h}
          chroma={baseColor.c}
          lightness={baseColor.l * 100}
          chromaMax={BASE_CHROMA_MAX}
          chromaHint={neutral ? NEUTRAL_CALM_CHROMA : undefined}
          onHueChromaChange={(h, c, l) => setBaseColor(label, { l: l / 100, c, h })}
          onConfirm={confirmEdit}
          onCancel={cancelEdit}
          onRemoveOverride={() => {}}
          onSliderStart={() => beginSliderGesture(`edit ${label} base`)}
        >
          {#snippet actions()}
            <div class="base-anchor-toggle">
              <Toggle
                checked={anchorToBase}
                onchange={(v) => setAnchorToBase(v ?? !anchorToBase)}
                label="Base color must appear in palette"
                labelFirst
              />
            </div>
          {/snippet}
        </ColorEditPanel>
      </div>
    </div>
  {/if}

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
              onchange={onEmptyModeChange}
            />
            <span>Gradient</span>
          </label>
        {/if}
      </div>
      <div class="swatch-grid" style="--swatch-cols: {paletteStepLightness.length + 2}">
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-white'} type="button" onclick={(e) => copyVarName('palette-white', `--color-${cssNamespace}-white`, e)}>
            {copiedLabelKey === 'palette-white' ? 'copied!' : 'white'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
        </div>
        {#each paletteComputed as ps}
          <div class="step-column">
            <button class="step-label copyable-label" class:copied={copiedLabelKey === ps.key} type="button" onclick={(e) => copyVarName(ps.key, `--color-${cssNamespace}-${ps.label}`, e)}>
              {copiedLabelKey === ps.key ? 'copied!' : ps.label}
            </button>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              class="swatch gray-swatch"
              class:active={editingKey === ps.key}
              class:overridden={ps.key in overrides}
              class:anchored={ps.anchored}
              title={ps.anchored ? 'Base color' : undefined}
              style="background: {ps.effective}"
              onclick={() => handlePaletteClick({ label: ps.label, lightness: ps.lightness, index: ps.index })}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && handlePaletteClick({ label: ps.label, lightness: ps.lightness, index: ps.index })}
            >
              {#if ps.key in overrides}
                <span class="override-lock" title="Palette override: this step is set by hand, not derived from the curve">
                  <i class="fas fa-lock" aria-hidden="true"></i>
                </span>
              {/if}
            </div>
            <button
              class="step-hex"
              class:copied={copiedKey === ps.key}
              type="button"
              onclick={(e) => copyHex(ps.key, ps.effective, e)}
            >{copiedKey === ps.key ? 'copied!' : ps.effective}</button>
          </div>
        {/each}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-black'} type="button" onclick={(e) => copyVarName('palette-black', `--color-${cssNamespace}-black`, e)}>
            {copiedLabelKey === 'palette-black' ? 'copied!' : 'black'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #000000"></div>
        </div>
      <UIReveal open={paletteEditorOpen} style="grid-column: 2 / {paletteStepLightness.length + 2}">
        <div class="curve-grid-span">
          {#if anchorUnlockPrompt && anchorToBase}
            <div class="anchor-unlock-notice" role="alert">
              <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
              <span>Unlock the base color anchor? The palette will no longer pass through the base color.</span>
              <div class="anchor-unlock-actions">
                <UIPillButton size="compact" onclick={confirmBaseAnchorUnlock}>Unlock</UIPillButton>
                <UIPillButton size="compact" variant="outline" onclick={() => anchorUnlockPrompt = false}>Cancel</UIPillButton>
              </div>
            </div>
          {/if}
          <ScaleCurveEditor
            curveKey="hue"
            anchors={hueCurve ?? DEFAULT_PALETTE_HUE()}
            cfg={hueCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_HUE()}
            offset={curveOffset['hue'] ?? 0}
            autoSmooth={curveAutoSmooth['hue']}
            lockedAnchorIndex={lockedHueIdx}
            open={sectionOpen('hue')}
            onToggleOpen={() => toggleCurveSection('hue')}
            onLockedAnchorUnlock={() => anchorUnlockPrompt = true}
            onAnchorsChange={setHueCurve}
            onOffsetChange={handleOffset}
            onAutoSmoothChange={handleAutoSmooth}
          />
          <ScaleCurveEditor
            curveKey="saturation"
            anchors={saturationCurve}
            cfg={saturationCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_SATURATION()}
            offset={curveOffset['saturation'] ?? 0}
            autoSmooth={curveAutoSmooth['saturation']}
            lockedAnchorIndex={lockedSaturationIdx}
            open={sectionOpen('saturation')}
            onToggleOpen={() => toggleCurveSection('saturation')}
            onLockedAnchorUnlock={() => anchorUnlockPrompt = true}
            onAnchorsChange={setSaturationCurve}
            onOffsetChange={handleOffset}
            onAutoSmoothChange={handleAutoSmooth}
          />
          <ScaleCurveEditor
            curveKey="lightness"
            anchors={lightnessCurve}
            cfg={lightnessCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_LIGHTNESS()}
            offset={curveOffset['lightness'] ?? 0}
            autoSmooth={curveAutoSmooth['lightness']}
            lockedAnchorIndex={lockedLightnessIdx}
            open={sectionOpen('lightness')}
            onToggleOpen={() => toggleCurveSection('lightness')}
            onLockedAnchorUnlock={() => anchorUnlockPrompt = true}
            onAnchorsChange={setLightnessCurve}
            onOffsetChange={handleOffset}
            onAutoSmoothChange={handleAutoSmooth}
          />
        </div>
      </UIReveal>
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

  {#snippet overridesPanel(scale: Scale, canSnap: boolean, derivedHexFor: (step: Step, scaleTitle: string) => string)}
    <OverridesPanel
      {scale}
      editorOpen={scaleEditorOpen[scale.title] ?? false}
      snapped={canSnap && snappedScales.has(scale.title)}
      supportsSnap={canSnap}
      {cssNamespace}
      {scaleCurves}
      {curveOffset}
      {curveAutoSmooth}
      {defaultScaleCurves}
      overrides={overridesHex}
      {editingKey}
      {snapPickerKey}
      {copiedKey}
      {copiedLabelKey}
      {paletteComputed}
      {derivedHexFor}
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
      onAutoSmoothChange={handleAutoSmooth}
      {sectionOpen}
      onToggleCurveSection={toggleCurveSection}
    />
  {/snippet}

  <button class="derived-toggle" type="button" onclick={() => showDerived = !showDerived}>
    <i class="fas" class:fa-chevron-right={!showDerived} class:fa-chevron-down={showDerived}></i>
    <span>Text, Surfaces &amp; Borders</span>
  </button>

  <UIReveal open={showDerived}>
    <div class="derived-rows">
      <div class="scales-row">
        {#each scales.filter(s => s.isText) as scale}
          {@render overridesPanel(scale, true, derivedHexForBase)}
        {/each}
      </div>
      <div class="scales-row">
        {#each scales.filter(s => !s.isText) as scale}
          {@render overridesPanel(scale, true, derivedHexForBase)}
        {/each}
      </div>
    </div>
  </UIReveal>

  <!-- Color Edit Panel (non-base edits) -->
  {#if !isEditingBase && panelOpen && editingColor}
    <ColorEditPanel
      title={editPanelTitle}
      showRemoveOverride={!!editingKey}
      hue={editingColor.h}
      chroma={editingColor.c}
      lightness={editingColor.l * 100}
      onHueChromaChange={(h, c, l) => handleColorChange({ l: l / 100, c, h })}
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
    border-bottom: 1px solid var(--ui-border-low);
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
    padding-bottom: 0.5rem;
  }

  .derived-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-4);
    background: none;
    border: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-light);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .derived-toggle:hover {
    color: var(--ui-text-primary);
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

  /* Carries the column gap the two rows used to get from .palette-editor,
     now that the reveal wrapper sits between them and it. */
  .derived-rows {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
  }

  .scale-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
    max-width: 100%;
  }

  .scale-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-right: 1rem;
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
    border: 1px solid var(--ui-border-low);
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
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    margin-top: var(--ui-space-2);
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
    /* Even tracks: the curve editors below plot one step per column, so a wider
       anchored column would slide every swatch out from under its own point. */
    grid-template-columns: repeat(var(--swatch-cols), minmax(0, 1fr));
    gap: var(--ui-space-4) var(--swatch-gap, var(--ui-space-4));
    align-items: start;
    justify-content: start;
    min-width: 0;
    /* Definite width, not max-width: the grid is a shrink-to-fit flex item, so
       without it the palette sized itself to the curve row below and shrank
       every time the graphs were collapsed. */
    width: calc(var(--swatch-cols) * 4.5rem + (var(--swatch-cols) - 1) * var(--swatch-gap, var(--ui-space-4)));
    max-width: 100%;
  }

  /* The picker rides the same track geometry as the curve editors below, so
     the two graphs share one left and right edge. */
  .base-panel {
    min-width: 0;
  }

  .base-anchor-toggle {
    margin-left: auto;
  }

  .curve-grid-span {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .anchor-unlock-notice {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-12);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
  }

  .anchor-unlock-notice i {
    color: var(--ui-text-tertiary);
  }

  .anchor-unlock-actions {
    display: flex;
    gap: var(--ui-space-4);
    margin-left: auto;
  }

  .swatch.gray-swatch {
    width: 100%;
    height: calc(4.75rem + var(--ui-space-2));
    /* Compensating margin: height + margin-bottom is constant every frame of
       the magnification, so the grid's row height never dips mid-transition
       (the dip bounced everything below the palette). Also keeps the hex row
       aligned across anchored and plain columns. */
    margin-bottom: 1rem;
    transition: height var(--ui-transition-fast), margin-bottom var(--ui-transition-fast);
    cursor: pointer;
    position: relative;
  }

  /* Bookends (white/black endpoints) are display-only, not clickable. */
  .swatch.gray-swatch.bookend {
    cursor: default;
  }

  .swatch.gray-swatch:not(.bookend):hover {
    border-color: var(--ui-border-high);
  }

  .swatch.gray-swatch.active {
    border-color: var(--ui-border-higher);
    outline: 2px solid var(--ui-border-high);
    outline-offset: 1px;
  }

  /* The step the base color is placed at: taller, with an emphasized border. It
     keeps its column width so the curve editors stay aligned. No fill change:
     the swatch itself already IS the picked color. */
  .swatch.gray-swatch.anchored {
    border-color: var(--ui-border-higher);
    height: calc(5.75rem + var(--ui-space-2));
    margin-bottom: 0;
  }

  /* An overridden step is held by hand and no longer follows the curve, which a
     lock says and a dot could not. The badge carries its own dark disc: the
     ramp runs from near-white to near-black, so no single glyph colour reads
     against every swatch it can land on. */
  .override-lock {
    position: absolute;
    top: var(--ui-space-4);
    right: var(--ui-space-4);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: var(--ui-radius-full);
    background: rgba(0, 0, 0, 0.55);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.45);
    color: #fff;
    font-size: var(--ui-font-size-xs);
    line-height: 1;
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
