<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { HARMONY_ELIGIBLE } from '../../core/palettes/colorHarmony';
  import { editorState } from '../../core/store/editorStore';
  import { setHarmonyOrder } from './paletteBaseColor';
  import UIPillButton from '../UIPillButton.svelte';

  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  let rows = $derived(
    $editorState.harmonyOrder.map((label) => {
      const spec = SPEC_BY_LABEL[label];
      const { l, c, h } = $editorState.palettes[label]?.baseColor ?? spec.initialColor;
      return { label, hex: oklchToHexClamped(l, c, h) };
    }),
  );

  let unlisted = $derived(HARMONY_ELIGIBLE.filter((label) => !$editorState.harmonyOrder.includes(label)));

  function append(label: string) {
    setHarmonyOrder([...$editorState.harmonyOrder, label]);
  }

  function remove(index: number) {
    setHarmonyOrder($editorState.harmonyOrder.filter((_, i) => i !== index));
  }

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    const order = [...$editorState.harmonyOrder];
    if (target < 0 || target >= order.length) return;
    const [moved] = order.splice(index, 1);
    order.splice(target, 0, moved);
    setHarmonyOrder(order);
  }

  function onHandleKeydown(e: KeyboardEvent, index: number) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveBy(index, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveBy(index, 1);
    }
  }

  /* Reorder mirrors FontStackEditor: only the handle is draggable so it can't
     swallow the row's remove-button click; the array commits on drop and
     animate:flip slides each row to its new slot. */
  let dragIndex: number | null = $state(null);
  let dragOver: { index: number; position: 'before' | 'after' } | null = $state(null);

  function onDragStart(e: DragEvent, index: number) {
    if (!e.dataTransfer) return;
    dragIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-harmony-axis', String(index));
    const rowEl = (e.currentTarget as HTMLElement).closest('.axis-row') as HTMLElement | null;
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(rowEl, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  function onDragOver(e: DragEvent, index: number) {
    if (!(e.dataTransfer?.types ?? []).includes('application/x-harmony-axis')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    dragOver = { index, position };
  }

  function onDragLeave() {
    dragOver = null;
  }

  function onDrop(e: DragEvent, index: number) {
    e.preventDefault();
    const payload = e.dataTransfer?.getData('application/x-harmony-axis');
    const position = dragOver?.position ?? 'before';
    dragOver = null;
    if (payload == null || payload === '') return;
    const src = Number(payload);
    if (src === index) return;
    const order = [...$editorState.harmonyOrder];
    const [moved] = order.splice(src, 1);
    let target = index;
    if (src < index) target -= 1;
    if (position === 'after') target += 1;
    order.splice(target, 0, moved);
    setHarmonyOrder(order);
  }

  function onDragEnd() {
    dragIndex = null;
    dragOver = null;
  }
</script>

<div class="axes">
  <span class="eyebrow">Axes</span>

  <div class="axis-list">
    {#each rows as row, i (row.label)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="axis-row"
        class:drop-before={dragOver?.index === i && dragOver?.position === 'before'}
        class:drop-after={dragOver?.index === i && dragOver?.position === 'after'}
        class:dragging={dragIndex === i}
        ondragover={(e) => onDragOver(e, i)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, i)}
        ondragend={onDragEnd}
        animate:flip={{ duration: 200, easing: cubicOut }}
      >
        <button
          type="button"
          class="drag-handle"
          draggable="true"
          aria-label={`Reorder ${row.label} (arrow keys move it)`}
          title="Drag to reorder, or use arrow keys"
          ondragstart={(e) => onDragStart(e, i)}
          onkeydown={(e) => onHandleKeydown(e, i)}
        >⋮⋮</button>
        <span class="slot-num">{i + 1}.</span>
        <span class="chip" style="--chip-fill: {row.hex}"></span>
        <span class="axis-label">{row.label}</span>
        {#if i === 0}<span class="anchor-tag">Anchor</span>{/if}
        {#if rows.length > 1}
          <button
            type="button"
            class="axis-remove"
            aria-label={`Remove ${row.label}`}
            title="Remove from harmony"
            onclick={() => remove(i)}
          >×</button>
        {/if}
      </div>
    {/each}
  </div>

  {#if unlisted.length}
    <div class="axis-add">
      {#each unlisted as label (label)}
        <UIPillButton size="compact" variant="outline" icon="fa-plus" onclick={() => append(label)}>{label}</UIPillButton>
      {/each}
    </div>
  {/if}
</div>

<style>
  .axes {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .eyebrow {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

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

  .axis-label {
    color: var(--ui-text-primary);
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

  .axis-remove {
    margin-left: auto;
    width: 1.4rem;
    height: 1.4rem;
    background: none;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-md);
    line-height: 1;
    cursor: pointer;
  }
  .axis-remove:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .axis-add {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-6);
  }
</style>
