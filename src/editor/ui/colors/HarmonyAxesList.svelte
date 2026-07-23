<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { HARMONY_ELIGIBLE } from '../../core/palettes/colorHarmony';
  import { editorState } from '../../core/store/editorStore';
  import { setHarmonyOrder } from './paletteBaseColor';

  const DIVIDER = ' divider';
  const ROLE_LABELS = ['Anchor', 'Secondary', 'Tertiary', 'Quaternary'];
  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  function hexOf(label: string): string {
    const { l, c, h } = $editorState.palettes[label]?.baseColor ?? SPEC_BY_LABEL[label].initialColor;
    return oklchToHexClamped(l, c, h);
  }

  // One list of all four eligible families plus a divider sentinel. Families
  // above the divider are assigned (the harmony, top = anchor); below are left
  // free. The assigned slice = families bound to axes in axis order, derived
  // from the store with no local mirror; a drag across the divider (re)binds.
  let assigned = $derived(
    $editorState.harmonyAxes.filter((a) => a.family !== null).map((a) => a.family!),
  );
  let slots = $derived([...assigned, DIVIDER, ...HARMONY_ELIGIBLE.filter((l) => !assigned.includes(l))]);

  let items = $derived.by(() => {
    const di = slots.indexOf(DIVIDER);
    return slots.map((entry, i) =>
      entry === DIVIDER
        ? { divider: true as const, index: i }
        : {
            divider: false as const,
            index: i,
            label: entry,
            hex: hexOf(entry),
            on: i < di,
            slot: i < di ? i : -1,
            role: i < di ? ROLE_LABELS[i] : '',
          },
    );
  });

  function apply(next: string[]) {
    const a = next.slice(0, next.indexOf(DIVIDER));
    // The wheel needs an anchor, so at least one family stays assigned.
    if (a.length < 1) return;
    setHarmonyOrder(a);
  }

  function move(from: number, to: number, position: 'before' | 'after') {
    const next = [...slots];
    const [moved] = next.splice(from, 1);
    let target = to;
    if (from < to) target -= 1;
    if (position === 'after') target += 1;
    next.splice(target, 0, moved);
    apply(next);
  }

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= slots.length) return;
    const next = [...slots];
    [next[index], next[target]] = [next[target], next[index]];
    apply(next);
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

  /* Reorder mirrors FontStackEditor: only the handle is draggable, and the array
     commits on drop while animate:flip slides each row to its new slot. The
     divider is a drop target too, so a family can land right at the boundary. */
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
    move(src, index, position);
  }

  function onDragEnd() {
    dragIndex = null;
    dragOver = null;
  }
</script>

<div class="axis-list">
  {#each items as item (item.divider ? 'divider' : item.label)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class:divider={item.divider}
      class:axis-row={!item.divider}
      class:inactive={!item.divider && !item.on}
      class:drop-before={dragOver?.index === item.index && dragOver?.position === 'before'}
      class:drop-after={dragOver?.index === item.index && dragOver?.position === 'after'}
      class:dragging={!item.divider && dragIndex === item.index}
      ondragover={(e) => onDragOver(e, item.index)}
      ondragleave={onDragLeave}
      ondrop={(e) => onDrop(e, item.index)}
      ondragend={item.divider ? undefined : onDragEnd}
      animate:flip={{ duration: 200, easing: cubicOut }}
    >
      {#if item.divider}
        <span class="divider-label">Unassigned</span>
      {:else}
        <button
          type="button"
          class="drag-handle"
          draggable="true"
          aria-label={`Reorder ${item.label} (arrow keys move it across the divider)`}
          title="Drag to reorder or assign, or use arrow keys"
          ondragstart={(e) => onDragStart(e, item.index)}
          onkeydown={(e) => onHandleKeydown(e, item.index)}
        >⋮⋮</button>
        {#if item.on}
          <span class="slot-role"><span class="slot-num">{item.slot + 1}</span>{item.role}</span>
        {:else}
          <span class="slot-role placeholder" aria-hidden="true"></span>
        {/if}
        <span class="chip" style="--chip-fill: {item.hex}"></span>
        <span class="axis-label">{item.label}</span>
      {/if}
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

  .divider {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 1.5rem;
    padding: var(--ui-space-2) var(--ui-space-8);
  }

  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    margin-left: var(--ui-space-8);
    background: var(--ui-border-low);
  }

  .divider-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* Insertion bar sits in the 6px gap between rows; absolute so it consumes no
     layout space and the list height stays put during a drag. */
  .axis-row.drop-before::before,
  .axis-row.drop-after::after,
  .divider.drop-before::before,
  .divider.drop-after::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--ui-text-primary);
    border-radius: 1px;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.45);
  }
  .axis-row.drop-before::before,
  .divider.drop-before::before { top: -4px; }
  .axis-row.drop-after::after,
  .divider.drop-after::after { bottom: -4px; }

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

  /* Fixed width so chips and family names line up whether a row is assigned
     (number + role) or unassigned (blank). */
  .slot-role {
    display: inline-flex;
    align-items: baseline;
    gap: var(--ui-space-6);
    width: 5.5rem;
    color: var(--ui-text-secondary);
  }

  .slot-num {
    min-width: 0.9rem;
    text-align: right;
    color: var(--ui-text-muted);
    font-variant-numeric: tabular-nums;
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
</style>
