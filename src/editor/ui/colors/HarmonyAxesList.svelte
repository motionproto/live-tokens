<script lang="ts">
  import { tick } from 'svelte';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { AXIS_COUNT, activeAxisCount, axisLabel, axisStatuses, type HarmonyMode, HARMONY_ELIGIBLE } from '../../core/palettes/colorHarmony';
  import { editorState } from '../../core/store/editorStore';
  import UIMenuButton from '../UIMenuButton.svelte';
  import UIOptionItem from '../UIOptionItem.svelte';
  import UIOptionList from '../UIOptionList.svelte';
  import UISegmentedControl from '../UISegmentedControl.svelte';
  import { modeLabel } from './harmonyModeIcons';
  import { bindFamilyToAxis, unbindFamily, type AdoptOnAssign } from './paletteBaseColor';
  import { HARMONY_DRAG_TYPE, startFamilyDrag } from './harmonyDrag';

  interface Props {
    /** The applied harmony mode: it deals a distinct position to some axes only,
     *  which is what leaves an axis off the wheel or unused (complementary deals two). */
    activeMode: HarmonyMode;
    /** Family selected in the swatch grid / wheel — its row reads as active here. */
    selected: string | null;
    /** An assignment moves its axis to the color's hue, which leaves an applied
     *  mode no longer describing the geometry. Mirrors the wheel's handle drag. */
    oncustomize: () => void;
  }

  let { activeMode, selected, oncustomize }: Props = $props();

  const ADOPT_OPTIONS = [
    {
      value: 'axis',
      label: 'Adopt axis',
      title: 'The color moves to the hue its new axis holds, so an applied harmony stays true',
    },
    {
      value: 'swatch',
      label: 'Adopt swatch',
      title: "The axis moves to the color's hue, which leaves the harmony custom",
    },
  ] as const satisfies ReadonlyArray<{ value: AdoptOnAssign; label: string; title: string }>;

  let adopt = $state<AdoptOnAssign>('swatch');

  function assign(family: string, index: number) {
    if (bindFamilyToAxis(family, index, adopt)) oncustomize();
  }

  // Empty-row swatch shows the axis's own hue, at fixed preview L/C so only the
  // hue reads. An assignment overwrites it with the color's hue.
  const PREVIEW_L = 0.65;
  const PREVIEW_C = 0.12;

  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  let listEl: HTMLElement | undefined = $state();

  let axes = $derived($editorState.harmonyAxes);
  let statuses = $derived(axisStatuses(activeMode, axes));
  let modeUsage = $derived(`${modeLabel(activeMode)} uses ${activeAxisCount(activeMode)}`);
  // Keyboard move sequence: every axis that still accepts a family.
  let axisSeq = $derived(statuses.flatMap((s, i) => (s === 'unused' ? [] : [i])));

  function familyHex(family: string): string {
    const { l, c, h } = $editorState.palettes[family]?.baseColor ?? SPEC_BY_LABEL[family].initialColor;
    return oklchToHexClamped(l, c, h);
  }

  // Keep focus on the moved family so keyboard moves chain without hunting for
  // the row it landed in.
  async function refocus(family: string) {
    await tick();
    listEl?.querySelector<HTMLElement>(`[data-family="${family}"]`)?.focus();
  }

  // The row a family leaves is where focus goes when it stops being a chip:
  // both trigger forms answer to this selector, so an emptied row keeps focus.
  async function refocusAxis(i: number) {
    await tick();
    listEl?.querySelector<HTMLElement>(`[data-axis="${i}"] [aria-haspopup="menu"]`)?.focus();
  }

  function moveFamily(family: string, dir: -1 | 1) {
    const idx = axes.findIndex((a) => a.family === family);
    const target = axisSeq.indexOf(idx) + dir;
    if (target < 0 || target >= axisSeq.length) return;
    assign(family, axisSeq[target]);
    refocus(family);
  }

  function onChipKeydown(e: KeyboardEvent, family: string, i: number) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFamily(family, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFamily(family, 1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      unbindFamily(family);
      refocusAxis(i);
    }
  }

  function assignFromMenu(family: string, index: number) {
    const wasEmpty = axes[index].family === null;
    assign(family, index);
    // An empty row's text trigger is replaced by the chip, so focus would die
    // with it; follow the family, as every keyboard move does.
    if (wasEmpty) refocus(family);
  }

  function clearFromMenu(index: number) {
    const family = axes[index].family;
    if (family === null) return;
    unbindFamily(family);
    // Same reason: the chevron trigger leaves with the chip.
    refocusAxis(index);
  }

  // The row is the control, so a click anywhere in it opens the menu. Routed
  // through the trigger's own click rather than an imperative open, so the
  // button keeps sole ownership of the open state and of aria-expanded.
  function onRowClick(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (el.closest('[aria-haspopup="menu"]')) return;
    (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.click();
  }

  let dragTarget = $state<number | null>(null);

  function onDragOver(e: DragEvent, target: number) {
    if (!(e.dataTransfer?.types ?? []).includes(HARMONY_DRAG_TYPE)) return;
    if (statuses[target] === 'unused') return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragTarget = target;
  }

  function onDragLeave(target: number) {
    if (dragTarget === target) dragTarget = null;
  }

  function onDrop(e: DragEvent, target: number) {
    e.preventDefault();
    const family = e.dataTransfer?.getData(HARMONY_DRAG_TYPE);
    dragTarget = null;
    if (!family) return;
    if (statuses[target] === 'unused') return;
    // Self-drop is a no-op: the setters early-return when nothing changes.
    assign(family, target);
  }

  // Window-scoped: a drag can start in the swatch row, whose dragend never
  // reaches this component, and abandoning it there would strand the highlight.
  function onDragEnd() {
    dragTarget = null;
  }

  // Opening the whole page as a drop zone is what lets a release over dead
  // space mean something. Only our own payload, so file drops are untouched.
  function onWindowDragOver(e: DragEvent) {
    if (!(e.dataTransfer?.types ?? []).includes(HARMONY_DRAG_TYPE)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  /** The drop no axis row and no swatch row claimed: letting a color go over
   *  dead space is the quickest way off an axis. A drop target that handled it
   *  has already called preventDefault on this same event. Escape cancels a
   *  drag without ever firing a drop, so it still leaves the color where it is. */
  function onWindowDrop(e: DragEvent) {
    if (e.defaultPrevented) return;
    e.preventDefault();
    dragTarget = null;
    const family = e.dataTransfer?.getData(HARMONY_DRAG_TYPE);
    if (family) unbindFamily(family);
  }
</script>

<svelte:window ondragend={onDragEnd} ondragover={onWindowDragOver} ondrop={onWindowDrop} />

{#snippet axisMenu(i: number, close: () => void)}
  <UIOptionList>
    {#each HARMONY_ELIGIBLE as family (family)}
      {@const from = axes.findIndex((a) => a.family === family)}
      <UIOptionItem
        active={from === i}
        onclick={() => {
          assignFromMenu(family, i);
          close();
        }}
      >
        {#snippet preview()}<span class="menu-swatch" style="--fill: {familyHex(family)}"></span>{/snippet}
        {#snippet label()}{family}{/snippet}
        {#snippet meta()}{#if from !== -1 && from !== i}moves from {axisLabel(from)}{/if}{/snippet}
      </UIOptionItem>
    {/each}
  </UIOptionList>
  <div class="menu-sep" role="separator"></div>
  <UIOptionList>
    <UIOptionItem
      active={axes[i].family === null}
      onclick={() => {
        clearFromMenu(i);
        close();
      }}
    >
      {#snippet label()}Leave empty{/snippet}
    </UIOptionItem>
  </UIOptionList>
{/snippet}

<div class="axes-list" bind:this={listEl}>
  <div class="adopt-row">
    <span class="adopt-caption">On assign</span>
    <UISegmentedControl
      bind:value={adopt}
      options={ADOPT_OPTIONS}
      ariaLabel="Which hue survives an assignment"
    />
  </div>
  <span class="anchor-caption">Anchor</span>
  {#each axes as axis, i (i)}
    {@const status = statuses[i]}
    {@const unused = status === 'unused'}
    {@const rowSelected = axis.family !== null && axis.family === selected}
    <!-- The click is a shortcut to the trigger button inside, which stays the
         keyboard and screen-reader path. -->
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div
      class="axis-row"
      class:unused
      class:selected={rowSelected}
      class:drop-target={dragTarget === i}
      class:off-wheel={status === 'off-wheel'}
      class:openable={!unused}
      data-axis={i}
      aria-disabled={unused || undefined}
      onclick={onRowClick}
      ondragover={(e) => onDragOver(e, i)}
      ondragleave={() => onDragLeave(i)}
      ondrop={(e) => onDrop(e, i)}
    >
      {#if axis.family !== null}
        {@const family = axis.family}
        <span class="swatch" style="--fill: {familyHex(family)}"></span>
        <button
          type="button"
          class="chip"
          draggable="true"
          data-family={family}
          aria-label={`${family}, on ${axisLabel(i)}${i === 0 ? '' : ` of ${AXIS_COUNT}`}. Arrow up or down to move it, Delete to unassign.`}
          title="Drag to another axis, or anywhere off the list to unassign. Arrow keys move it, Delete unassigns."
          ondragstart={(e) => startFamilyDrag(e, family)}
          onkeydown={(e) => onChipKeydown(e, family, i)}
        >
          <span class="grip" aria-hidden="true">⋮⋮</span>
          <span class="chip-swatch" style="--fill: {familyHex(family)}"></span>
          <span class="chip-name">{family}</span>
        </button>
        {#if status === 'off-wheel'}
          <span
            class="warn fas fa-triangle-exclamation"
            role="img"
            aria-label={`Off the wheel. ${modeUsage}.`}
            title={`Off the wheel &middot; ${modeUsage}`}
          ></span>
        {/if}
        <UIMenuButton
          header={`Assign to ${axisLabel(i)}`}
          triggerLabel={`Assign to ${axisLabel(i)}`}
          triggerClass="axis-menu-trigger"
        >
          {#snippet trigger()}<i class="fas fa-chevron-down chev" aria-hidden="true"></i>{/snippet}
          {#snippet children({ close })}{@render axisMenu(i, close)}{/snippet}
        </UIMenuButton>
      {:else}
        <span class="swatch preview" style="--fill: {oklchToHexClamped(PREVIEW_L, PREVIEW_C, axis.hue)}"></span>
        {#if unused}
          <span class="reason">unused &middot; {modeUsage}</span>
        {:else}
          <UIMenuButton header={`Assign to ${axisLabel(i)}`} triggerClass="assign-trigger">
            {#snippet trigger()}<span>Assign a color…</span><i class="fas fa-chevron-down chev" aria-hidden="true"></i>{/snippet}
            {#snippet children({ close })}{@render axisMenu(i, close)}{/snippet}
          </UIMenuButton>
        {/if}
      {/if}
    </div>
  {/each}
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
  .axis-row.drop-target {
    border-color: var(--ui-text-primary);
    background: var(--ui-surface-low);
    outline: 1px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  /* The whole row opens the menu, so it hovers as one control. */
  .axis-row.openable {
    cursor: pointer;
  }

  /* Selection and the drop ring already own the border; hover must not undo them. */
  .axis-row.openable:not(.selected):not(.drop-target):hover {
    border-color: var(--ui-border-high);
  }

  .axis-row.openable:hover :global(.axis-menu-trigger),
  .axis-row.openable:hover :global(.assign-trigger) {
    color: var(--ui-text-primary);
  }

  /* The family selected in the swatch grid / wheel. The row takes one border and
     the chip inside stays plain, so the row lights up once. */
  .axis-row.selected {
    border-color: var(--ui-text-primary);
    background: var(--ui-surface-low);
  }

  .adopt-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    margin-bottom: var(--ui-space-4);
  }

  .adopt-caption {
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-xs);
  }

  /* Names the first row alone. Sitting above the list rather than in a column
     every row reserves, so no row carries dead space for a word only one has. */
  .anchor-caption {
    padding-inline-start: calc(var(--ui-space-8) + 1px);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-xs);
  }

  /* Unused slot: nothing bound and no position dealt. The row states the reason
     in text; shape and dimming only echo it. */
  .axis-row.unused {
    border-style: dashed;
    opacity: 0.45;
  }

  /* Bound, but the applied mode deals this axis no position. Dimming carries it
     and the triangle names it; never dashed, which is reserved for unused. */
  .axis-row.off-wheel {
    opacity: 0.6;
  }

  .warn {
    flex: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
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

  .reason {
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-sm);
  }

  .grip {
    flex: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: 1;
    letter-spacing: -0.1em;
    user-select: none;
  }

  .chip:hover .grip {
    color: var(--ui-text-primary);
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

  /* Row furniture, not pills: the triggers match the editor's quiet
     icon-button idiom (see UIInfoPopover's info-btn). */
  .axis-row :global(.axis-menu-trigger) {
    margin-left: auto;
    width: var(--ui-space-24);
    height: var(--ui-space-24);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-xs);
    transition: color var(--ui-transition-fast);
  }

  .axis-row :global(.axis-menu-trigger:hover),
  .axis-row :global(.axis-menu-trigger[aria-expanded='true']) {
    color: var(--ui-text-primary);
  }

  /* Claims the rest of the row so its chevron lands where a filled row's does:
     every row carries the same control, whether or not it holds a color. */
  .axis-row :global(.assign-trigger) {
    flex: 1;
    justify-content: space-between;
    padding: var(--ui-space-4) 0;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    transition: color var(--ui-transition-fast);
  }

  .chev {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--ui-space-24);
    font-size: var(--ui-font-size-xs);
  }

  .axis-row :global(.assign-trigger:hover),
  .axis-row :global(.assign-trigger[aria-expanded='true']) {
    color: var(--ui-text-primary);
  }

  .menu-swatch {
    flex: none;
    width: 0.85rem;
    height: 0.85rem;
    border-radius: var(--ui-radius-sm);
    background: var(--fill);
    border: 1px solid var(--ui-border-low);
  }

  .menu-sep {
    border-top: 1px solid var(--ui-border-low);
  }

</style>
