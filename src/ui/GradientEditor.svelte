<script lang="ts">
  import { run } from 'svelte/legacy';

  /**
   * Visual gradient editor. Stops are draggable diamond handles below a live
   * ribbon; only the selected stop exposes its position + color controls (the
   * old list of every stop is replaced by this single-row pattern, mirroring
   * GradientCard.svelte). Stops can be added/removed with a minimum of two.
   */
  import { tick, onMount, createEventDispatcher } from 'svelte';
  import {
    editorState,
    setGradient,
    setGradientType,
    setGradientAngle,
    setGradientStop,
    addGradientStop,
    removeGradientStop,
  } from '../lib/editorStore';
  import type { GradientType, GradientTokenStop } from '../lib/editorTypes';
  import GradientStopPicker from './GradientStopPicker.svelte';
  import AngleDial from '../component-editor/scaffolding/AngleDial.svelte';

  interface Props {
    variable: string;
  }

  let { variable }: Props = $props();

  const dispatch = createEventDispatcher<{ save: void; cancel: void }>();

  /** Deep snapshot of the gradient at editor open, used to restore on Cancel. */
  let snapshot: { type: GradientType; angle: number; stops: GradientTokenStop[] } | null = null;
  onMount(() => {
    const g = $editorState.gradients.tokens.find((t) => t.variable === variable);
    if (g) {
      snapshot = { type: g.type, angle: g.angle, stops: g.stops.map((s) => ({ ...s })) };
    }
  });

  function save() { dispatch('save'); }
  function cancel() {
    if (snapshot) setGradient(variable, snapshot);
    dispatch('cancel');
  }

  let gradient = $derived($editorState.gradients.tokens.find((t) => t.variable === variable));
  let stopCount = $derived(gradient?.stops.length ?? 0);

  let selected = $state(0);
  // Keep `selected` in range as stops are added/removed.
  run(() => {
    if (selected >= stopCount) selected = Math.max(0, stopCount - 1);
  });

  function setType(type: GradientType) {
    setGradientType(variable, type);
  }

  function onAngleChange(e: CustomEvent<{ value: number }>) {
    setGradientAngle(variable, e.detail.value);
  }

  function setPosition(i: number, pct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
    setGradientStop(variable, i, { position: clamped });
  }

  function onPositionInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) setPosition(selected, v);
  }

  function handleStopChange(i: number, e: CustomEvent<{ color: string; opacity: number }>) {
    setGradientStop(variable, i, { color: e.detail.color, opacity: e.detail.opacity });
  }

  /** Insert a stop at the given percentage, inheriting color/opacity from the
   *  given source stop. Selects the newly inserted stop once the store sort
   *  settles. */
  async function insertStopAt(pct: number, source: GradientTokenStop) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
    addGradientStop(variable, {
      position: clamped,
      color: source.color,
      opacity: source.opacity ?? 100,
    });
    await tick();
    const after = $editorState.gradients.tokens.find((t) => t.variable === variable);
    if (after) {
      const idx = after.stops.findIndex((s) => s.position === clamped && s.color === source.color);
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
    const rect = barEl.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const nearest = gradient.stops.reduce(
      (best, s) => (Math.abs(s.position - pct) < Math.abs(best.position - pct) ? s : best),
      gradient.stops[0],
    );
    insertStopAt(pct, nearest);
  }

  function removeSelected() {
    if (!gradient || gradient.stops.length <= 2) return;
    removeGradientStop(variable, selected);
    if (selected > 0) selected -= 1;
  }

  // ── Ribbon handle drag ─────────────────────────────────────────────────
  let barEl: HTMLDivElement = $state();
  let dragIndex: number | null = $state(null);

  function pctFromEvent(e: PointerEvent): number {
    const rect = barEl.getBoundingClientRect();
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
      <div
        class="ribbon"
        bind:this={barEl}
        style="background: var({variable});"
        onclick={onRibbonClick}
        role="button"
        tabindex="-1"
        aria-label="Click to add a gradient stop"
      ></div>
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
    </div>

    <div class="controls-row">
      <div class="type-toggle" role="radiogroup">
        <button
          type="button"
          class:active={gradient.type === 'linear'}
          onclick={() => setType('linear')}
        >Linear</button>
        <button
          type="button"
          class:active={gradient.type === 'radial'}
          onclick={() => setType('radial')}
        >Radial</button>
      </div>
      {#if gradient.type === 'linear'}
        <div class="angle-slot">
          <AngleDial value={gradient.angle} on:change={onAngleChange} />
        </div>
      {/if}
      <div class="spacer"></div>
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
    </div>

    {#if gradient.stops[selected]}
      <div class="stop-edit-row">
        <span class="row-label">Stop {selected + 1}</span>
        <label class="pos-input">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={gradient.stops[selected].position}
            onchange={onPositionInput}
          />
          <span class="suffix">%</span>
        </label>
        <div class="picker-slot">
          <GradientStopPicker
            stopId={`${variable}-${selected}`}
            color={gradient.stops[selected].color}
            opacity={gradient.stops[selected].opacity ?? 100}
            on:change={(e) => handleStopChange(selected, e)}
          />
        </div>
      </div>
    {/if}

    <div class="footer-row">
      <button type="button" class="ghost-btn" onclick={cancel}>Cancel</button>
      <button type="button" class="primary-btn" onclick={save}>Save</button>
    </div>
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
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .ribbon {
    position: relative;
    height: 3rem;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-faint);
    cursor: copy;
  }

  .handles {
    position: relative;
    height: 1.25rem;
  }

  /* Button is a generous (1.25rem) transparent hit target; the visible marker
     lives in `.handle-diamond` inside. Mirrors GradientCard. */
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
    border: 1px solid var(--ui-border-default);
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
    border: 1px solid var(--ui-border-faint);
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
    border-left: 1px solid var(--ui-border-faint);
  }

  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .ghost-btn:hover:not(:disabled) {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .ghost-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .stop-edit-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-12);
  }

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
    border: 1px solid var(--ui-border-faint);
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

  .picker-slot {
    flex: 1 1 12rem;
    min-width: 8rem;
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
    border: 1px solid var(--ui-border-medium);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .primary-btn:hover {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
  }
</style>
