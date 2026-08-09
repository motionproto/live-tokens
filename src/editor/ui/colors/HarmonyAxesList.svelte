<script lang="ts">
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { AXIS_ROLES, activeAxisCount, axisStatuses, type HarmonyMode, HARMONY_ELIGIBLE } from '../../core/palettes/colorHarmony';
  import { editorState } from '../../core/store/editorStore';
  import AxisNumeral from './AxisNumeral.svelte';
  import { modeLabel } from './harmonyModeIcons';
  import { bindFamilyToAxis, unbindFamily } from './paletteBaseColor';

  interface Props {
    /** The applied harmony mode: it deals a distinct position to some axes only,
     *  which is what leaves an axis off the wheel or unused (complementary deals two). */
    activeMode: HarmonyMode;
    /** Family selected in the swatch grid / wheel — its row (or chip) reads as active here. */
    selected: string | null;
    onSelect: (family: string) => void;
  }

  let { activeMode, selected, onSelect }: Props = $props();

  const DRAG_TYPE = 'application/x-harmony-family';
  // Unbound swatch previews the hue a dropped color would take, at fixed preview
  // L/C so only the hue reads (Reserved judgment call 4).
  const PREVIEW_L = 0.65;
  const PREVIEW_C = 0.12;

  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  let listEl: HTMLElement | undefined = $state();

  let axes = $derived($editorState.harmonyAxes);
  let unassigned = $derived(HARMONY_ELIGIBLE.filter((f) => !axes.some((a) => a.family === f)));
  let statuses = $derived(axisStatuses(activeMode, axes));
  let modeUsage = $derived(`${modeLabel(activeMode)} uses ${activeAxisCount(activeMode)}`);
  // Keyboard sequence: every axis that still accepts a family, then Unassigned.
  let axisSeq = $derived(statuses.flatMap((s, i) => (s === 'unused' ? [] : [i])));
  let positionCount = $derived(axisSeq.length + 1);
  let lastAxis = $derived(axisSeq[axisSeq.length - 1]);

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
    const pos = idx === -1 ? axisSeq.length : axisSeq.indexOf(idx);
    const target = pos + dir;
    if (target < 0 || target > axisSeq.length) return;
    if (target === axisSeq.length) unbindFamily(family);
    else bindFamilyToAxis(family, axisSeq[target]);
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
    if (typeof target === 'number' && statuses[target] === 'unused') return;
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
    if (typeof target === 'number' && statuses[target] === 'unused') return;
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
    {@const status = statuses[i]}
    {@const unused = status === 'unused'}
    {@const rowSelected = axis.family !== null && axis.family === selected}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="axis-row"
      class:unused
      class:selected={rowSelected}
      class:drop-target={dragTarget === i}
      aria-disabled={unused || undefined}
      ondragover={(e) => onDragOver(e, i)}
      ondragleave={() => onDragLeave(i)}
      ondrop={(e) => onDrop(e, i)}
    >
      <AxisNumeral index={i} {status} selected={rowSelected} />
      <span class="role">{AXIS_ROLES[i]}</span>
      {#if axis.family !== null}
        {@const family = axis.family}
        <span class="swatch" style="--fill: {familyHex(family)}"></span>
        <button
          type="button"
          class="chip"
          draggable="true"
          data-family={family}
          aria-label={`${family}, ${AXIS_ROLES[i]} axis, position ${i + 1} of ${positionCount}. Arrow up or down to move it, Delete to unbind.`}
          aria-pressed={family === selected}
          title="Drag to another axis or to Unassigned. Arrow keys move it, Delete unbinds."
          ondragstart={(e) => onDragStart(e, family)}
          ondragend={onDragEnd}
          onkeydown={(e) => onChipKeydown(e, family)}
          onclick={() => onSelect(family)}
        >
          <span class="grip" aria-hidden="true">⋮⋮</span>
          <span class="chip-swatch" style="--fill: {familyHex(family)}"></span>
          <span class="chip-name">{family}</span>
        </button>
        {#if status === 'off-wheel'}
          <span class="reason">off wheel &middot; {modeUsage}</span>
        {/if}
      {:else}
        <span class="swatch preview" style="--fill: {oklchToHexClamped(PREVIEW_L, PREVIEW_C, axis.hue)}"></span>
        {#if unused}
          <span class="reason">unused &middot; {modeUsage}</span>
        {:else}
          <span class="empty">Empty</span>
        {/if}
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
          class:selected={family === selected}
          draggable="true"
          data-family={family}
          aria-label={`${family}, unassigned, position ${positionCount} of ${positionCount}. Arrow up to bind it to ${AXIS_ROLES[lastAxis]}.`}
          aria-pressed={family === selected}
          title={`Drag onto an axis to bind it. Arrow up binds it to ${AXIS_ROLES[lastAxis]}.`}
          ondragstart={(e) => onDragStart(e, family)}
          ondragend={onDragEnd}
          onkeydown={(e) => onChipKeydown(e, family)}
          onclick={() => onSelect(family)}
          animate:flip={{ duration: 200, easing: cubicOut }}
        >
          <span class="grip" aria-hidden="true">⋮⋮</span>
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
    font-size: var(--ui-font-size-md);
    transition:
      border-color var(--ui-transition-fast),
      background var(--ui-transition-fast);
  }

  /* About to receive a drop: a doubled ring. Ring count is what separates it
     from selection, which keeps a single line. Never dashed (dashed means
     unused) and never colored. */
  .axis-row.drop-target,
  .unassigned.drop-target {
    border-color: var(--ui-text-primary);
    background: var(--ui-surface-low);
    outline: 1px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  /* The family selected in the swatch grid / wheel. The numeral inverts and the
     row takes one border; the chip inside stays plain, so the row lights up once. */
  .axis-row.selected {
    border-color: var(--ui-text-primary);
    background: var(--ui-surface-low);
  }

  .axis-row.selected .role {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .role {
    flex: none;
    width: 6.5rem;
    color: var(--ui-text-secondary);
  }

  /* Unused slot: nothing bound and no position dealt. The row states the reason
     in text; shape and dimming only echo it. */
  .axis-row.unused {
    border-style: dashed;
    opacity: 0.45;
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
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-md);
  }

  .reason {
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-sm);
  }

  .grip {
    flex: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
    line-height: 1;
    letter-spacing: -0.1em;
    user-select: none;
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
    font-size: var(--ui-font-size-md);
    line-height: 1;
    cursor: grab;
    user-select: none;
  }

  .chip:hover {
    border-color: var(--ui-border-high);
  }

  /* Tray chips only: they have no row and no numeral, so this is their sole
     selection indicator. An axis row carries its selection on the row itself. */
  .unassigned .chip.selected {
    border-color: var(--ui-text-primary);
    background: var(--ui-surface-high);
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
