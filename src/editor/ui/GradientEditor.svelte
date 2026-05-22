<script lang="ts">
  import { run } from 'svelte/legacy';

  /**
   * Visual gradient editor. Stops are draggable diamond handles below a live
   * ribbon; only the selected stop exposes its position + color controls.
   * Stops can be added/removed with a minimum of two.
   *
   * Backing store is supplied by a `GradientSource` adapter — defaults to the
   * theme-level gradient library when only `variable` is provided, so the
   * existing GradientsSection callsite keeps working. Pass `source` when
   * editing a component-owned gradient (e.g. SectionDivider variant slot).
   */
  import { tick, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { GradientType, GradientTokenStop } from '../core/store/editorTypes';
  import {
    themeGradientSource,
    snapshotGradient,
    type GradientSource,
    type GradientSourceSnapshot,
  } from '../core/store/gradientSource';
  import GradientStopPicker from './GradientStopPicker.svelte';
  import AngleDial from '../component-editor/scaffolding/AngleDial.svelte';
  import RadialShapePad from '../component-editor/scaffolding/RadialShapePad.svelte';
  import UISegmentedControl from './UISegmentedControl.svelte';
  import UIPillButton from './UIPillButton.svelte';
  import { snapTokenToFamily } from '../core/palettes/familySwap';

  interface Props {
    /** Theme-gradient mode: variable name (e.g. `--gradient-1`). */
    variable?: string;
    /** Component-gradient mode: pass a source adapter directly. Takes
     *  precedence over `variable` when both are provided. */
    source?: GradientSource;
    /** Optional section header rendered above the ribbon, e.g. "Background".
     *  When set, the editor lays out as a 2-column grid so this label and
     *  the radial-only "Gradient shape" label sit at the same baseline. */
    sectionLabel?: string;
    /** Stable id for per-stop GradientStopPicker scratch vars. Defaults to
     *  `variable` when in theme mode. */
    stopIdPrefix?: string;
    /** When set, the stop color picker greys out tokens outside this family
     *  prefix (e.g. `surface-accent`). Already-set out-of-family stops still
     *  render as the chosen value — the filter only scopes new picks. */
    familyFilter?: string | null;
    /** Show the "None" segment alongside Solid / Linear. Use when the editor
     *  is driving a container background that the user should be able to clear
     *  outright rather than dialing into a transparent solid. */
    showNone?: boolean;
    /** Called when the user picks "None". Lets the parent zero out any
     *  ancillary tokens that should follow the cleared background (e.g.
     *  border color); the editor itself only flips the gradient type. */
    onNone?: () => void;
    onsave?: () => void;
    oncancel?: () => void;
  }

  let {
    variable,
    source,
    sectionLabel,
    stopIdPrefix,
    familyFilter = null,
    showNone = false,
    onNone,
    onsave,
    oncancel,
  }: Props = $props();

  /** Resolved source — `source` prop wins; otherwise build a theme source.
   *  `variable` MUST be provided when `source` is absent. Captured once at
   *  mount: GradientEditor is keyed to one source for its whole lifetime,
   *  callers remount when the target gradient changes (which is the typical
   *  expand/collapse flow), so initial-value capture is the intended shape. */
  // svelte-ignore state_referenced_locally
  const gradientSource: GradientSource = source ?? themeGradientSource(variable!);
  /** Local const so Svelte 5's `$<store>` auto-subscription picks it up. */
  const gradientSourceCurrent = gradientSource.current;
  // svelte-ignore state_referenced_locally
  const stopKeyPrefix: string = stopIdPrefix ?? variable ?? 'gradient-edit';

  /** Deep snapshot at editor open, used to restore on Cancel. */
  let snapshot: GradientSourceSnapshot | null = null;
  onMount(() => {
    snapshot = snapshotGradient(gradientSource);
  });

  function save() { onsave?.(); }
  function cancel() {
    if (snapshot) gradientSource.setAll(snapshot);
    oncancel?.();
  }

  let gradient = $derived($gradientSourceCurrent);
  let stopCount = $derived(gradient?.stops.length ?? 0);

  let selected = $state(0);
  // Keep `selected` in range as stops are added/removed.
  run(() => {
    if (selected >= stopCount) selected = Math.max(0, stopCount - 1);
  });

  function setType(type: GradientType) {
    gradientSource.setType(type);
  }

  function onAngleChange(detail: { value: number }) {
    gradientSource.setAngle(detail.value);
  }

  function onAspectChange(detail: { x: number; y: number }) {
    gradientSource.setAspect(detail);
  }

  function setPosition(i: number, pct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
    gradientSource.setStop(i, { position: clamped });
  }

  function onPositionInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) setPosition(selected, v);
  }

  function handleStopChange(i: number, payload: { color: string; opacity: number }) {
    // Picking any real color while in `none` promotes the gradient back to
    // `solid` so the user doesn't have to flip the segment manually. Picking
    // the literal `transparent` (the picker's "None" choice) leaves the type
    // alone — that's still the no-fill state.
    if (gradient?.type === 'none' && payload.color !== 'transparent') {
      gradientSource.setType('solid');
    }
    gradientSource.setStop(i, { color: payload.color, opacity: payload.opacity });
  }

  /** Per-stop Monochrome toggle. On → snap the stop's color into the active
   *  family (uses `snapTokenToFamily`, no-op when the slug has no family
   *  marker). Off → mark the stop as an off-palette override; color stays put
   *  and future family swaps skip it. */
  function handleMonoToggle(i: number, mono: boolean) {
    if (mono && familyFilter) {
      const stop = gradient?.stops[i];
      if (stop) {
        const snapped = snapTokenToFamily(stop.color, familyFilter);
        gradientSource.setStop(i, { monochrome: true, color: snapped });
        return;
      }
    }
    gradientSource.setStop(i, { monochrome: mono });
  }

  /** Display label for the stop's current value. Mirrors the picker's meta
   *  format (`category-family-step` with optional opacity suffix) so the row
   *  reads consistently with other property rows. */
  function stopValueLabel(stop: GradientTokenStop): string {
    const op = stop.opacity ?? 100;
    const base = stop.color.startsWith('--') ? stop.color.slice(2) : stop.color;
    return op < 100 ? `${base} (${Math.round(op)}%)` : base;
  }

  /** Insert a stop at the given percentage, inheriting color/opacity from the
   *  given source stop. Selects the newly inserted stop once the store sort
   *  settles. */
  async function insertStopAt(pct: number, sourceStop: GradientTokenStop) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
    gradientSource.addStop({
      position: clamped,
      color: sourceStop.color,
      opacity: sourceStop.opacity ?? 100,
    });
    await tick();
    const after = get(gradientSource.current);
    if (after) {
      const idx = after.stops.findIndex((s) => s.position === clamped && s.color === sourceStop.color);
      if (idx >= 0) selected = idx;
    }
  }

  function addStop() {
    if (!gradient) return;
    const stops = gradient.stops;
    // Insert after the currently-selected stop, midway to its right neighbour
    // (or to 100% if it's the last stop).
    const anchor = stops[selected] ?? stops[stops.length - 1];
    const next = stops[selected + 1];
    const newPos = next
      ? (anchor.position + next.position) / 2
      : (anchor.position + 100) / 2;
    insertStopAt(newPos, anchor);
  }

  /** Click on the ribbon body inserts a stop at that position, picking up the
   *  color/opacity of the closest existing stop so the new handle starts from
   *  a sensible color rather than a default. */
  function onRibbonClick(e: MouseEvent) {
    if (!gradient || e.button !== 0) return;
    const rect = barEl!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let pct: number;
    if (gradient.type === 'radial') {
      // Linked pair: clicks on either side map to the same radial distance
      // from center via abs(). A one-shot click doesn't need side tracking.
      const half = rect.width / 2;
      pct = (Math.abs(x - half) / half) * 100;
    } else {
      pct = (x / rect.width) * 100;
    }
    const nearest = gradient.stops.reduce(
      (best, s) => (Math.abs(s.position - pct) < Math.abs(best.position - pct) ? s : best),
      gradient.stops[0],
    );
    insertStopAt(pct, nearest);
  }

  function removeSelected() {
    if (!gradient || gradient.stops.length <= 2) return;
    gradientSource.removeStop(selected);
    if (selected > 0) selected -= 1;
  }

  // ── Ribbon handle drag ─────────────────────────────────────────────────
  let barEl: HTMLDivElement | undefined = $state();
  let dragIndex: number | null = $state(null);
  /** Which side of the radial ribbon the drag originated on. Lets us
   *  translate pointer x → stop position symmetrically: dragging the left
   *  handle right toward center decreases position, dragging the right
   *  handle left toward center also decreases position. Past-center drags
   *  clamp at 0 (via setPosition) instead of wrapping to the other side. */
  let dragSide: 'left' | 'right' | null = $state(null);

  function pctFromEvent(e: PointerEvent): number {
    const rect = barEl!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (gradient?.type === 'radial') {
      const half = rect.width / 2;
      return dragSide === 'left'
        ? ((half - x) / half) * 100
        : ((x - half) / half) * 100;
    }
    return (x / rect.width) * 100;
  }

  function onHandleDown(e: PointerEvent, i: number, side: 'left' | 'right' | null = null) {
    selected = i;
    dragIndex = i;
    dragSide = side;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPosition(i, pctFromEvent(e));
  }
  function onHandleMove(e: PointerEvent) {
    if (dragIndex === null) return;
    setPosition(dragIndex, pctFromEvent(e));
  }
  function onHandleUp(e: PointerEvent) {
    if (dragIndex === null) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragIndex = null;
    dragSide = null;
  }

  // Live preview gradient — render the structured value here so the editor
  // renders correctly even when bound to a component-owned slot whose CSS var
  // hasn't been pushed to :root yet (the editor's renderer does the push, but
  // $derived runs in the same tick so we synthesize the ribbon background
  // from the snapshot for stability).
  //
  // Radial: ribbon is a symmetric linear-gradient — each stop emits two
  // entries (50 ± position/2). The right half is the editor, the left half
  // is a read-only mirror so the user can see what the radial preview's
  // horizontal slice looks like aligned under the editor strip.
  function stopColorCss(s: GradientTokenStop): string {
    const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
    const op = s.opacity ?? 100;
    return op >= 100 ? base : `color-mix(in srgb, ${base} ${Math.round(op)}%, transparent)`;
  }

  let ribbonBg = $derived.by(() => {
    if (!gradient) return 'transparent';
    if (gradient.type === 'none') return 'transparent';
    if (gradient.type === 'solid') {
      const first = gradient.stops[0];
      return first ? stopColorCss(first) : 'transparent';
    }
    const sorted = gradient.stops.slice().sort((a, b) => a.position - b.position);
    if (gradient.type === 'radial') {
      const leftStops = sorted.slice().reverse().map((s) => `${stopColorCss(s)} ${50 - s.position / 2}%`);
      const rightStops = sorted.map((s) => `${stopColorCss(s)} ${50 + s.position / 2}%`);
      return `linear-gradient(90deg, ${[...leftStops, ...rightStops].join(', ')})`;
    }
    const stopsCss = sorted.map((s) => `${stopColorCss(s)} ${s.position}%`).join(', ');
    return `linear-gradient(90deg, ${stopsCss})`;
  });

  // `none` and `solid` share the single-stop UI: passive ribbon, no handles,
  // no add/remove. `linear` and `radial` both show the multi-stop chrome;
  // `radial` adds the circle preview + mirrored ribbon layout.
  let isFlat = $derived(gradient?.type === 'solid' || gradient?.type === 'none');
  let isNone = $derived(gradient?.type === 'none');
  let isRadial = $derived(gradient?.type === 'radial');
  let isLinear = $derived(gradient?.type === 'linear');
  // Two-column layout when the right column has a payload: radial shape pad
  // OR linear angle dial. Solid/none stay single-column.
  let hasAside = $derived(isRadial || isLinear);

  // Stop colors rendered into the diamonds: token refs become var(...).
  let stopSwatches = $derived((gradient?.stops ?? []).map((s) => {
    const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
    const op = s.opacity ?? 100;
    return op >= 100 ? base : `color-mix(in srgb, ${base} ${Math.round(op)}%, transparent)`;
  }));

  /** Segmented-control options. `None` is conditional, so the array is
   *  rebuilt when `showNone` flips. Values match GradientType + 'none'. */
  type TypeChoice = 'none' | 'solid' | 'linear' | 'radial';
  let typeOptions = $derived(
    [
      ...(showNone ? [{ value: 'none' as TypeChoice, label: 'None' }] : []),
      { value: 'solid' as TypeChoice, label: 'Solid' },
      { value: 'linear' as TypeChoice, label: 'Linear' },
      { value: 'radial' as TypeChoice, label: 'Radial' },
    ],
  );

  function onTypeSelect(next: TypeChoice) {
    setType(next as GradientType);
    if (next === 'none') onNone?.();
  }
</script>

{#if gradient}
  <div class="gradient-editor" class:has-pad={hasAside}>
    {#if sectionLabel || hasAside}
      <div class="editor-header editor-section-left">
        <span class="editor-section-label">{sectionLabel ?? ''}</span>
        {#if !isFlat}
          <div class="stop-actions">
            <UIPillButton
              variant="secondary"
              size="compact"
              icon="fa-plus"
              title="Add stop"
              onclick={addStop}
            >Add stop</UIPillButton>
            <UIPillButton
              variant="secondary"
              size="compact"
              icon="fa-times"
              title={gradient.stops.length <= 2 ? 'Gradient needs at least two stops' : 'Remove selected stop'}
              disabled={gradient.stops.length <= 2}
              onclick={removeSelected}
            >Remove stop</UIPillButton>
          </div>
        {/if}
      </div>
      {#if isRadial}
        <span class="editor-section-label editor-section-right">Gradient shape</span>
      {:else if isLinear}
        <span class="editor-section-label editor-section-right">Gradient angle</span>
      {/if}
    {/if}
    <div class="ribbon-stack">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="ribbon"
          class:solid={isFlat}
          class:none={isNone}
          class:radial={isRadial}
          bind:this={barEl}
          style="background: {ribbonBg};"
          onclick={isFlat ? undefined : onRibbonClick}
          role={isFlat ? 'presentation' : 'button'}
          tabindex="-1"
          aria-label={isNone ? 'No fill' : isFlat ? 'Solid color preview' : isRadial ? 'Click the right side to add a gradient stop' : 'Click to add a gradient stop'}
        >
          {#if isRadial}<span class="center-divider" aria-hidden="true"></span>{/if}
        </div>
        {#if !isFlat}
          <div class="handles" class:radial={isRadial}>
            {#if isRadial}
              {#each gradient.stops as stop, i (`mirror-${i}`)}
                <button
                  type="button"
                  class="handle"
                  class:selected={selected === i}
                  class:dragging={dragIndex === i && dragSide === 'left'}
                  style="left: {50 - stop.position / 2}%; --stop-color: {stopSwatches[i]};"
                  onpointerdown={(e) => onHandleDown(e, i, 'left')}
                  onpointermove={onHandleMove}
                  onpointerup={onHandleUp}
                  onpointercancel={onHandleUp}
                  title={`Stop ${i + 1} (${stop.position}%) — linked pair`}
                  aria-label={`Gradient stop ${i + 1}, mirrored side`}
                >
                  <span class="handle-diamond"></span>
                </button>
              {/each}
            {/if}
            {#each gradient.stops as stop, i (i)}
              <button
                type="button"
                class="handle"
                class:selected={selected === i}
                class:dragging={dragIndex === i && dragSide !== 'left'}
                style="left: {isRadial ? 50 + stop.position / 2 : stop.position}%; --stop-color: {stopSwatches[i]};"
                onpointerdown={(e) => onHandleDown(e, i, isRadial ? 'right' : null)}
                onpointermove={onHandleMove}
                onpointerup={onHandleUp}
                onpointercancel={onHandleUp}
                title={`Stop ${i + 1} (${stop.position}%)`}
                aria-label={`Gradient stop ${i + 1}`}
              >
                <span class="handle-diamond"></span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {#if gradient.type === 'radial'}
      <div class="ribbon-pad">
        <RadialShapePad
          x={gradient.aspectX ?? 1}
          y={gradient.aspectY ?? 1}
          onchange={onAspectChange}
        />
      </div>
    {:else if gradient.type === 'linear'}
      <div class="ribbon-pad ribbon-pad-linear">
        <AngleDial value={gradient.angle} size={64} orientation="vertical" label="" onchange={onAngleChange} />
      </div>
    {/if}

    <div class="lower-row">
      <UISegmentedControl
        value={gradient.type as TypeChoice}
        options={typeOptions}
        ariaLabel="Gradient fill type"
        onchange={onTypeSelect}
      />
      {#if gradient.stops[selected]}
        {@const stop = gradient.stops[selected]}
        {@const stopMono = stop.monochrome !== false}
        <div class="stop-edit-row">
          <span class="row-label">{isFlat ? 'Color' : `Stop ${selected + 1}`}</span>
          {#if !isFlat}
            <label class="pos-input">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={stop.position}
                onchange={onPositionInput}
              />
              <span class="suffix">%</span>
            </label>
          {/if}
          <div class="picker-column">
            <div class="picker-slot">
              <GradientStopPicker
                stopId={`${stopKeyPrefix}-${selected}`}
                color={stop.color}
                opacity={stop.opacity ?? 100}
                familyFilter={stopMono ? familyFilter : null}
                onchange={(payload) => handleStopChange(selected, payload)}
              />
            </div>
            {#if familyFilter !== null}
              <label class="stop-mono-check">
                <input
                  type="checkbox"
                  checked={stopMono}
                  onchange={(e) => handleMonoToggle(selected, (e.currentTarget as HTMLInputElement).checked)}
                />
                <span>Monochrome</span>
              </label>
            {/if}
          </div>
          <span class="stop-value-text" title={stopValueLabel(stop)}>{stopValueLabel(stop)}</span>
        </div>
      {/if}
    </div>

    {#if onsave || oncancel}
      <div class="footer-row">
        <UIPillButton variant="secondary" size="compact" onclick={cancel}>Cancel</UIPillButton>
        <UIPillButton variant="primary" size="compact" onclick={save}>Save</UIPillButton>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Outer grid. One column when there's no radial pad (linear/solid/none);
     two columns when there is, with the pad sitting in the right column
     beside the ribbon. The header labels (section + "Gradient shape")
     live in row 1 of the SAME grid so they share column tracks with the
     ribbon and pad below — that's what makes them "straight across". */
  .gradient-editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--ui-space-12);
    width: 100%;
    min-width: 0;
  }
  .gradient-editor.has-pad {
    grid-template-columns: minmax(0, 1fr) max-content;
    column-gap: var(--ui-space-16);
  }

  /* Section header labels. Styled to match SectionDivider's "Background"
     wording so the right-column "Gradient shape" reads as a peer header. */
  .editor-section-label {
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
    line-height: 1;
  }
  .editor-section-left { grid-column: 1; }
  .editor-section-right { grid-column: 2; }

  /* Section header doubles as a toolbar: section label on the left,
     list-level actions (Add stop / Remove) flush to the right edge of the
     ribbon column above the ribbon itself. Baseline-aligned so the pill
     row sits on the same optical line as the label. */
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-12);
    min-width: 0;
  }

  .ribbon-stack {
    grid-column: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  /* Right-column slot for the radial shape pad / linear angle dial. The
     min-height reserves the radial pad's natural height (80px pad + 14px
     bottom slider) so switching gradient type between radial and linear
     doesn't shift the lower row vertically. */
  .ribbon-pad {
    grid-column: 2;
    align-self: start;
    min-height: 94px;
  }
  /* Center the smaller angle dial cluster within the reserved height so it
     sits visually in the same band as the radial pad above its baseline. */
  .ribbon-pad-linear {
    display: flex;
    justify-content: center;
  }

  .ribbon {
    position: relative;
    height: 3rem;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-low);
    cursor: copy;
  }

  /* Solid mode: ribbon is a passive swatch, no handles to click into. */
  .ribbon.solid {
    cursor: default;
  }

  /* Radial mode: only the right half accepts clicks (the left is a mirror),
     so the copy cursor would be misleading over the left half. We keep the
     default cursor on the whole ribbon — the right-half affordance is the
     existing handle hover + the center divider line. */
  .ribbon.radial {
    cursor: default;
  }

  /* Thin vertical line at the join between mirror and editor halves —
     reads as the radial center (position 0) and helps the user line up the
     ribbon with the circle's center above. */
  .center-divider {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: var(--ui-border);
    pointer-events: none;
    transform: translateX(-0.5px);
  }


  .handles {
    position: relative;
    height: 1.25rem;
  }

  /* Button is a generous (1.25rem) transparent hit target; the visible marker
     lives in `.handle-diamond` inside. */
  .handle {
    position: absolute;
    top: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-left: -0.625rem;
    padding: 0;
    background: transparent;
    border: none;
    cursor: ew-resize;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .handle-diamond {
    width: 0.7rem;
    height: 0.7rem;
    background: var(--stop-color, var(--ui-surface-high));
    border: 1px solid var(--ui-border);
    transform: rotate(45deg);
    border-radius: 1px;
    transition: border-color var(--ui-transition-fast), box-shadow var(--ui-transition-fast);
  }

  .handle:hover .handle-diamond {
    border-color: var(--ui-text-secondary);
  }

  .handle.selected .handle-diamond {
    border-color: var(--ui-text-primary);
    box-shadow: 0 0 0 1px var(--ui-text-primary);
  }

  .handle.dragging {
    z-index: 2;
  }
  .handle.dragging .handle-diamond {
    border-color: var(--ui-text-primary);
    box-shadow: 0 0 0 2px var(--ui-text-primary);
  }


  /* One row carries every per-gradient control beneath the ribbon: type
     segmented control on the left, optional angle dial (linear only),
     stop-edit row (grows to fill), and Add stop / Remove pinned to the
     right. The radial shape pad lives up beside the ribbon, not here. */
  .lower-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: flex-start;
    gap: var(--ui-space-12);
    flex-wrap: wrap;
  }

  /* Add stop / Remove pair sitting in the editor header beside the section
     label. Compact pills keep the toolbar slim so the header row's vertical
     footprint matches a single label baseline. */
  .stop-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    flex: 0 0 auto;
  }

  /* Two-row layout: row 1 holds label / percent / picker chrome / slug; row 2
     holds the per-stop Monochrome checkbox stacked under the picker. The
     other row-1 items get an explicit line-height matching the picker
     trigger's min-height so they top-align visually with the chrome instead
     of riding above it. */
  .stop-edit-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--ui-space-12);
    flex: 1 1 18rem;
    min-width: 0;
  }
  .stop-edit-row > .row-label,
  .stop-edit-row > .pos-input,
  .stop-edit-row > .stop-value-text {
    line-height: 1.75rem;
  }

  .picker-column {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-6);
    flex: 0 0 auto;
  }

  /* The picker carries its own meta label via subgrid, but in this row the
     picker-slot isn't laid out as a subgrid parent — the meta wraps awkwardly
     under the chrome. We render the slug ourselves (`.stop-value-text`) and
     keep the picker's internal copy hidden so the row stays single-line. */
  .stop-edit-row :global(.ui-ts-meta-text) {
    display: none;
  }

  /* Stop slug — mirrors UITokenSelector's meta typography so this row reads
     consistently with property rows elsewhere. Grows to fill remaining row
     space and ellipsizes on overflow. */
  .stop-value-text {
    flex: 1 1 0;
    min-width: 0;
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stop-mono-check {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
    flex: 0 0 auto;
  }
  .stop-mono-check:hover { color: var(--ui-text-primary); }
  .stop-mono-check input { margin: 0; cursor: pointer; }

  /* Match .editor-section-label (the "Background" header) so the stop label
     reads as a peer heading. 1.5rem left padding indents it inside the lower
     row so it sits aligned with the ribbon's content edge above. */
  .row-label {
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
    line-height: 1;
    padding-left: 1.5rem;
    white-space: nowrap;
  }

  .pos-input {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
  }

  .pos-input input {
    width: 2.25rem;
    padding: var(--ui-space-2) var(--ui-space-6);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    text-align: right;
  }

  .pos-input input::-webkit-outer-spin-button,
  .pos-input input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .suffix {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  /* Match the property-row token-selector width (8rem, see TokenLayout) so
     the picker reads as a normal property control rather than expanding to
     fill the row. */
  .picker-slot {
    flex: 0 0 auto;
    width: 8rem;
  }

  .footer-row {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: var(--ui-space-8);
    padding-top: var(--ui-space-4);
  }
</style>
