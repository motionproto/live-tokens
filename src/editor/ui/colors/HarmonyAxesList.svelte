<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { HARMONY_ELIGIBLE } from '../../core/palettes/colorHarmony';
  import { editorState } from '../../core/store/editorStore';
  import { setHarmonyOrder } from './paletteBaseColor';

  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  function hexOf(label: string): string {
    const { l, c, h } = $editorState.palettes[label]?.baseColor ?? SPEC_BY_LABEL[label].initialColor;
    return oklchToHexClamped(l, c, h);
  }

  let order = $derived($editorState.harmonyOrder);
  // Active families first in slot order, then the eligible families they leave off.
  let items = $derived([
    ...order.map((label, slot) => ({ label, hex: hexOf(label), active: true, slot })),
    ...HARMONY_ELIGIBLE.filter((l) => !order.includes(l)).map((label) => ({
      label,
      hex: hexOf(label),
      active: false,
      slot: -1,
    })),
  ]);

  function activate(label: string) {
    setHarmonyOrder([...order, label]);
  }

  function deactivate(slot: number) {
    // The anchor list can never be empty; the last active family stays on.
    if (order.length <= 1) return;
    setHarmonyOrder(order.filter((_, i) => i !== slot));
  }

  function moveBy(slot: number, delta: number) {
    const target = slot + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(slot, 1);
    next.splice(target, 0, moved);
    setHarmonyOrder(next);
  }

  function onHandleKeydown(e: KeyboardEvent, slot: number) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveBy(slot, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveBy(slot, 1);
    }
  }

  /* Reorder mirrors FontStackEditor: only the handle is draggable, and the array
     commits on drop while animate:flip slides each row to its new slot. Only
     active rows are drop targets; inactive families have no slot. */
  let dragSlot: number | null = $state(null);
  let dragOver: { slot: number; position: 'before' | 'after' } | null = $state(null);

  function onDragStart(e: DragEvent, slot: number) {
    if (!e.dataTransfer) return;
    dragSlot = slot;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-harmony-axis', String(slot));
    const rowEl = (e.currentTarget as HTMLElement).closest('.axis-row') as HTMLElement | null;
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(rowEl, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  function onDragOver(e: DragEvent, slot: number) {
    if (!(e.dataTransfer?.types ?? []).includes('application/x-harmony-axis')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    dragOver = { slot, position };
  }

  function onDragLeave() {
    dragOver = null;
  }

  function onDrop(e: DragEvent, slot: number) {
    e.preventDefault();
    const payload = e.dataTransfer?.getData('application/x-harmony-axis');
    const position = dragOver?.position ?? 'before';
    dragOver = null;
    if (payload == null || payload === '') return;
    const src = Number(payload);
    if (src === slot) return;
    const next = [...order];
    const [moved] = next.splice(src, 1);
    let target = slot;
    if (src < slot) target -= 1;
    if (position === 'after') target += 1;
    next.splice(target, 0, moved);
    setHarmonyOrder(next);
  }

  function onDragEnd() {
    dragSlot = null;
    dragOver = null;
  }
</script>

<div class="axis-list">
  {#each items as item (item.label)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="axis-row"
      class:inactive={!item.active}
      class:drop-before={item.active && dragOver?.slot === item.slot && dragOver?.position === 'before'}
      class:drop-after={item.active && dragOver?.slot === item.slot && dragOver?.position === 'after'}
      class:dragging={item.active && dragSlot === item.slot}
      ondragover={item.active ? (e) => onDragOver(e, item.slot) : undefined}
      ondragleave={item.active ? onDragLeave : undefined}
      ondrop={item.active ? (e) => onDrop(e, item.slot) : undefined}
      ondragend={item.active ? onDragEnd : undefined}
      animate:flip={{ duration: 200, easing: cubicOut }}
    >
      <input
        type="checkbox"
        class="axis-check"
        checked={item.active}
        disabled={item.active && order.length <= 1}
        aria-label={item.active ? `Turn off ${item.label}` : `Turn on ${item.label}`}
        title={item.active ? 'On the wheel' : 'Off the wheel'}
        onchange={() => (item.active ? deactivate(item.slot) : activate(item.label))}
      />
      {#if item.active}
        <button
          type="button"
          class="drag-handle"
          draggable="true"
          aria-label={`Reorder ${item.label} (arrow keys move it)`}
          title="Drag to reorder, or use arrow keys"
          ondragstart={(e) => onDragStart(e, item.slot)}
          onkeydown={(e) => onHandleKeydown(e, item.slot)}
        >⋮⋮</button>
        <span class="slot-num">{item.slot + 1}.</span>
      {:else}
        <span class="drag-handle placeholder" aria-hidden="true">⋮⋮</span>
        <span class="slot-num placeholder" aria-hidden="true">·</span>
      {/if}
      <span class="chip" style="--chip-fill: {item.hex}"></span>
      <span class="axis-label">{item.label}</span>
      {#if item.active && item.slot === 0}<span class="anchor-tag">Anchor</span>{/if}
    </div>
  {/each}
</div>

<style>
  .axis-list {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .axis-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-8);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    transition:
      opacity var(--ui-transition-fast),
      border-color var(--ui-transition-fast);
  }

  .axis-row.inactive {
    background: none;
    border-color: transparent;
    color: var(--ui-text-muted);
  }

  /* Insertion bar sits in the 6px gap between rows; absolute so it consumes no
     layout space and the list height stays put during a drag. */
  .axis-row.drop-before::before,
  .axis-row.drop-after::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--ui-text-primary);
    border-radius: 1px;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.45);
  }
  .axis-row.drop-before::before { top: -4px; }
  .axis-row.drop-after::after { bottom: -4px; }

  .axis-row.dragging {
    opacity: 0.55;
    z-index: 2;
    border-color: var(--ui-border-high);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  }

  .axis-check {
    margin: 0;
    cursor: pointer;
  }
  .axis-check:disabled {
    cursor: default;
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    padding: 0;
    background: none;
    border: none;
    cursor: grab;
    user-select: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-md);
    line-height: 1;
  }
  .drag-handle:focus-visible {
    outline: none;
    color: var(--ui-text-primary);
  }
  .axis-row.dragging .drag-handle { cursor: grabbing; }

  .placeholder {
    visibility: hidden;
  }

  .slot-num {
    min-width: 1.1rem;
    text-align: right;
    color: var(--ui-text-muted);
  }

  .chip {
    display: block;
    width: 1rem;
    height: 1rem;
    border-radius: var(--ui-radius-sm);
    background: var(--chip-fill);
    border: 1px solid var(--ui-border-low);
  }

  .axis-row.inactive .chip {
    opacity: 0.5;
  }

  .axis-label {
    color: var(--ui-text-primary);
  }

  .axis-row.inactive .axis-label {
    color: var(--ui-text-muted);
  }

  .anchor-tag {
    padding: 0 var(--ui-space-6);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-full);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
