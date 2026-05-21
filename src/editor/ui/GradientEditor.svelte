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
  import { snapTokenToFamily } from '../core/palettes/familySwap';

  interface Props {
    /** Theme-gradient mode: variable name (e.g. `--gradient-1`). */
    variable?: string;
    /** Component-gradient mode: pass a source adapter directly. Takes
     *  precedence over `variable` when both are provided. */
    source?: GradientSource;
    /** Stable id for per-stop GradientStopPicker scratch vars. Defaults to
     *  `variable` when in theme mode. */
    stopIdPrefix?: string;
    /** When set, the stop color picker greys out tokens outside this family
     *  prefix (e.g. `surface-accent`). Already-set out-of-family stops still
     *  render as the chosen value — the filter only scopes new picks. */
    familyFilter?: string | null;
    onsave?: () => void;
    oncancel?: () => void;
  }

  let {
    variable,
    source,
    stopIdPrefix,
    familyFilter = null,
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

  function setPosition(i: number, pct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
    gradientSource.setStop(i, { position: clamped });
  }

  function onPositionInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) setPosition(selected, v);
  }

  function handleStopChange(i: number, payload: { color: string; opacity: number }) {
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
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
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

  function pctFromEvent(e: PointerEvent): number {
    const rect = barEl!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return (x / rect.width) * 100;
  }

  function onHandleDown(e: PointerEvent, i: number) {
    selected = i;
    dragIndex = i;
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
  }

  // Live preview gradient — render the structured value here too so this
  // component renders correctly even when bound to a component-owned slot
  // whose CSS var hasn't been pushed to :root yet (the editor's renderer
  // does the push, but $derived runs in the same tick so we synthesize
  // the ribbon background from the snapshot for stability).
  //
  // Radial data still rendered on the consumer element (formatGradientValue
  // emits the real radial-gradient CSS), but radial *editing* is removed —
  // any leftover radial values are previewed as a linear sweep so the user
  // can still see and edit their stops, then switch the type.
  let ribbonBg = $derived.by(() => {
    if (!gradient) return 'transparent';
    const stopColor = (s: GradientTokenStop): string => {
      const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
      const op = s.opacity ?? 100;
      return op >= 100 ? base : `color-mix(in srgb, ${base} ${Math.round(op)}%, transparent)`;
    };
    if (gradient.type === 'solid') {
      const first = gradient.stops[0];
      return first ? stopColor(first) : 'transparent';
    }
    const stopsCss = gradient.stops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => `${stopColor(s)} ${s.position}%`)
      .join(', ');
    return `linear-gradient(90deg, ${stopsCss})`;
  });

  let isSolid = $derived(gradient?.type === 'solid');

  // Stop colors rendered into the diamonds: token refs become var(...).
  let stopSwatches = $derived((gradient?.stops ?? []).map((s) => {
    const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
    const op = s.opacity ?? 100;
    return op >= 100 ? base : `color-mix(in srgb, ${base} ${Math.round(op)}%, transparent)`;
  }));
</script>

{#if gradient}
  <div class="gradient-editor">
    <div class="ribbon-wrap">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="ribbon"
        class:solid={isSolid}
        bind:this={barEl}
        style="background: {ribbonBg};"
        onclick={isSolid ? undefined : onRibbonClick}
        role={isSolid ? 'presentation' : 'button'}
        tabindex="-1"
        aria-label={isSolid ? 'Solid color preview' : 'Click to add a gradient stop'}
      ></div>
      {#if !isSolid}
        <div class="handles">
          {#each gradient.stops as stop, i (i)}
            <button
              type="button"
              class="handle"
              class:selected={selected === i}
              class:dragging={dragIndex === i}
              style="left: {stop.position}%; --stop-color: {stopSwatches[i]};"
              onpointerdown={(e) => onHandleDown(e, i)}
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

    <div class="controls-row">
      <div class="type-toggle" role="radiogroup">
        <button
          type="button"
          class:active={gradient.type === 'solid'}
          onclick={() => setType('solid')}
        >Solid</button>
        <button
          type="button"
          class:active={gradient.type === 'linear'}
          onclick={() => setType('linear')}
        >Linear</button>
      </div>
      {#if gradient.type === 'linear'}
        <div class="angle-slot">
          <AngleDial value={gradient.angle} onchange={onAngleChange} />
        </div>
      {/if}
      <div class="spacer"></div>
      {#if !isSolid}
        <button
          type="button"
          class="ghost-btn"
          onclick={addStop}
          title="Add stop"
        >
          <i class="fas fa-plus"></i> Add stop
        </button>
        <button
          type="button"
          class="ghost-btn"
          onclick={removeSelected}
          disabled={gradient.stops.length <= 2}
          title={gradient.stops.length <= 2 ? 'Gradient needs at least two stops' : 'Remove selected stop'}
        >
          <i class="fas fa-times"></i> Remove
        </button>
      {/if}
    </div>

    {#if gradient.stops[selected]}
      {@const stop = gradient.stops[selected]}
      {@const stopMono = stop.monochrome !== false}
      <div class="stop-edit-row">
        <span class="row-label">{isSolid ? 'Color' : `Stop ${selected + 1}`}</span>
        {#if !isSolid}
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

    {#if onsave || oncancel}
      <div class="footer-row">
        <button type="button" class="ghost-btn" onclick={cancel}>Cancel</button>
        <button type="button" class="primary-btn" onclick={save}>Save</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .gradient-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    width: 100%;
    min-width: 0;
  }

  .ribbon-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
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

  .controls-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    flex-wrap: wrap;
  }

  .spacer { flex: 1 1 auto; }

  .type-toggle {
    display: inline-flex;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }

  .type-toggle button {
    padding: var(--ui-space-4) var(--ui-space-12);
    background: transparent;
    border: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .type-toggle button.active {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .type-toggle button + button {
    border-left: 1px solid var(--ui-border-low);
  }

  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .ghost-btn:hover:not(:disabled) {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .ghost-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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

  .row-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
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
    width: 4.5rem;
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
    display: flex;
    justify-content: flex-end;
    gap: var(--ui-space-8);
    padding-top: var(--ui-space-4);
  }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-12);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .primary-btn:hover {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-higher);
  }
</style>
