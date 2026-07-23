<script lang="ts">
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { AXIS_ROLES, HARMONY_ELIGIBLE } from '../../core/palettes/colorHarmony';
  import { editorState } from '../../core/store/editorStore';
  import { bindFamilyToAxis, unbindFamily } from './paletteBaseColor';

  const DRAG_TYPE = 'application/x-harmony-family';
  // Unbound swatch previews the hue a dropped color would take, at fixed preview
  // L/C so only the hue reads (Reserved judgment call 4).
  const PREVIEW_L = 0.65;
  const PREVIEW_C = 0.12;
  // Keyboard sequence: the four axes then Unassigned.
  const POSITION_COUNT = AXIS_ROLES.length + 1;
  const LAST_AXIS = AXIS_ROLES.length - 1;

  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  let listEl: HTMLElement | undefined = $state();

  let axes = $derived($editorState.harmonyAxes);
  let unassigned = $derived(HARMONY_ELIGIBLE.filter((f) => !axes.some((a) => a.family === f)));

  function familyHex(family: string): string {
    const { l, c, h } = $editorState.palettes[family]?.baseColor ?? SPEC_BY_LABEL[family].initialColor;
    return oklchToHexClamped(l, c, h);
  }

  // Keep focus on the moved family so keyboard bind/move/unbind chains without
  // hunting for the row it landed in.
  async function refocus(family: string) {
    await tick();
    listEl?.querySelector<HTMLElement>(`[data-family="${family}"]`)?.focus();
  }

  function moveFamily(family: string, dir: -1 | 1) {
    const idx = axes.findIndex((a) => a.family === family);
    const pos = idx === -1 ? LAST_AXIS + 1 : idx;
    const target = pos + dir;
    if (target < 0 || target > LAST_AXIS + 1) return;
    if (target > LAST_AXIS) unbindFamily(family);
    else bindFamilyToAxis(family, target);
    refocus(family);
  }

  function onChipKeydown(e: KeyboardEvent, family: string) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFamily(family, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFamily(family, 1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      unbindFamily(family);
      refocus(family);
    }
  }

  let dragTarget = $state<number | 'unassigned' | null>(null);

  function onDragStart(e: DragEvent, family: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DRAG_TYPE, family);
  }

  function onDragOver(e: DragEvent, target: number | 'unassigned') {
    if (!(e.dataTransfer?.types ?? []).includes(DRAG_TYPE)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragTarget = target;
  }

  function onDragLeave(target: number | 'unassigned') {
    if (dragTarget === target) dragTarget = null;
  }

  function onDrop(e: DragEvent, target: number | 'unassigned') {
    e.preventDefault();
    const family = e.dataTransfer?.getData(DRAG_TYPE);
    dragTarget = null;
    if (!family) return;
    // Self-drop is a no-op: the setters early-return when nothing changes.
    if (target === 'unassigned') unbindFamily(family);
    else bindFamilyToAxis(family, target);
  }

  function onDragEnd() {
    dragTarget = null;
  }
</script>

<div class="axes-list" bind:this={listEl}>
  {#each axes as axis, i (i)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="axis-row"
      class:drop-target={dragTarget === i}
      ondragover={(e) => onDragOver(e, i)}
      ondragleave={() => onDragLeave(i)}
      ondrop={(e) => onDrop(e, i)}
    >
      <span class="role">{AXIS_ROLES[i]}</span>
      {#if axis.family !== null}
        {@const family = axis.family}
        <span class="swatch" style="--fill: {familyHex(family)}"></span>
        <button
          type="button"
          class="chip"
          draggable="true"
          data-family={family}
          aria-label={`${family}, ${AXIS_ROLES[i]} axis, position ${i + 1} of ${POSITION_COUNT}. Arrow up or down to move it, Delete to unbind.`}
          title="Drag to another axis or to Unassigned. Arrow keys move it, Delete unbinds."
          ondragstart={(e) => onDragStart(e, family)}
          ondragend={onDragEnd}
          onkeydown={(e) => onChipKeydown(e, family)}
        >
          <span class="chip-swatch" style="--fill: {familyHex(family)}"></span>
          <span class="chip-name">{family}</span>
        </button>
      {:else}
        <span class="swatch preview" style="--fill: {oklchToHexClamped(PREVIEW_L, PREVIEW_C, axis.hue)}"></span>
        <span class="empty">Empty</span>
      {/if}
    </div>
  {/each}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="unassigned"
    class:drop-target={dragTarget === 'unassigned'}
    ondragover={(e) => onDragOver(e, 'unassigned')}
    ondragleave={() => onDragLeave('unassigned')}
    ondrop={(e) => onDrop(e, 'unassigned')}
  >
    <span class="eyebrow">Unassigned</span>
    <div class="chips">
      {#each unassigned as family (family)}
        <button
          type="button"
          class="chip"
          draggable="true"
          data-family={family}
          aria-label={`${family}, unassigned, position ${POSITION_COUNT} of ${POSITION_COUNT}. Arrow up to bind it to ${AXIS_ROLES[LAST_AXIS]}.`}
          title="Drag onto an axis to bind it. Arrow up binds it to Quaternary."
          ondragstart={(e) => onDragStart(e, family)}
          ondragend={onDragEnd}
          onkeydown={(e) => onChipKeydown(e, family)}
          animate:flip={{ duration: 200, easing: cubicOut }}
        >
          <span class="chip-swatch" style="--fill: {familyHex(family)}"></span>
          <span class="chip-name">{family}</span>
        </button>
      {/each}
      {#if unassigned.length === 0}
        <span class="empty">Every color is bound to an axis.</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .axes-list {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .axis-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-10);
    padding: var(--ui-space-6) var(--ui-space-8);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    font-size: var(--ui-font-size-sm);
    transition:
      border-color var(--ui-transition-fast),
      background var(--ui-transition-fast);
  }

  .axis-row.drop-target,
  .unassigned.drop-target {
    border-color: var(--ui-border-higher);
    background: var(--ui-surface-low);
  }

  .role {
    flex: none;
    width: 5.5rem;
    color: var(--ui-text-secondary);
  }

  .swatch {
    flex: none;
    width: 0.375rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    background: var(--fill);
    border: 1px solid var(--ui-border-low);
  }

  .swatch.preview {
    border-style: dashed;
    opacity: 0.7;
  }

  .empty {
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-sm);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    line-height: 1;
    cursor: grab;
    user-select: none;
  }

  .chip:hover {
    border-color: var(--ui-border-high);
  }

  .chip:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }

  .chip:active {
    cursor: grabbing;
  }

  .chip-swatch {
    flex: none;
    width: 0.85rem;
    height: 0.85rem;
    border-radius: var(--ui-radius-sm);
    background: var(--fill);
    border: 1px solid var(--ui-border-low);
  }

  .unassigned {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    margin-top: var(--ui-space-4);
    padding: var(--ui-space-8);
    border: 1px dashed var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    transition:
      border-color var(--ui-transition-fast),
      background var(--ui-transition-fast);
  }

  .eyebrow {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-6);
    min-height: 1.75rem;
    align-items: center;
  }
</style>
