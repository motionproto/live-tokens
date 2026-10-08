<script module lang="ts">
  // Every family's header reads one drag source, because dataTransfer data is
  // unreadable during dragover.
  let swapSource: string | null = null;
  const SWAP_DRAG_TYPE = 'application/x-palette-family';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { oklchToHexClamped, type Oklch } from '../../core/palettes/oklch';
  import { BASE_KEY } from './paletteEditorState';

  interface Props {
    /**
   * The header band: swatch, label, base hex, and the palette's actions on the
   * right. The base-colour picker itself is rendered by the parent below this
   * band so it can line up with the curve editors.
   */
    label: string;
    displayLabel?: string | null;
    baseColor: Oklch;
    isEditingBase: boolean;
    /** Keep the swatch reading as active while the curve editors are visible. */
    pinnedOpen?: boolean;
    /** The same ring the ramp's anchored step wears, so the two swatches read
     *  as the one value they are. */
    selected?: boolean;
    copiedKey: string | null;
    onStartEdit: () => void;
    onCopyBaseHex: (key: string, hex: string, event?: MouseEvent) => void;
    /** Another family's header swatch dropped on this one. */
    onSwapFrom: (family: string) => void;
    actions?: Snippet;
    /** A family-level setting, shown beside the name while this family's
     *  editor is open. Collapsed families keep the band to identity + actions. */
    setting?: Snippet;
  }

  let {
    label,
    displayLabel = null,
    baseColor,
    isEditingBase,
    pinnedOpen = false,
    selected = false,
    copiedKey,
    onStartEdit,
    onCopyBaseHex,
    onSwapFrom,
    actions,
    setting
  }: Props = $props();

  let swapHover = $state(false);

  function onDragStart(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(SWAP_DRAG_TYPE, label);
    swapSource = label;
  }

  function onDragOver(e: DragEvent) {
    if (swapSource === null || swapSource === label) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    swapHover = true;
  }

  function onDrop(e: DragEvent) {
    swapHover = false;
    if (swapSource === null || swapSource === label) return;
    e.preventDefault();
    onSwapFrom(swapSource);
  }

  let baseHex = $derived(oklchToHexClamped(baseColor.l, baseColor.c, baseColor.h));

  // `pinnedOpen || isEditingBase` is exactly when the base panel shows: editing
  // the base implies both a panel and a colour to put in it.
  let showSetting = $derived(!!setting && (pinnedOpen || isEditingBase));
</script>

<div class="editor-top">
  <div class="editor-primary">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="header-swatch"
      class:active={isEditingBase || pinnedOpen}
      class:selected
      class:swap-target={swapHover}
      style="background: {baseHex}"
      data-swatch-key={BASE_KEY}
      draggable="true"
      onclick={onStartEdit}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && onStartEdit()}
      ondragstart={onDragStart}
      ondragend={() => (swapSource = null)}
      ondragover={onDragOver}
      ondragleave={() => (swapHover = false)}
      ondrop={onDrop}
    ></div>
    <div class="primary-info">
      <span class="editor-label">{displayLabel ?? label}</span>
      <button
        class="base-hex"
        class:copied={copiedKey === '__base__'}
        type="button"
        title="Copy {baseHex}"
        onclick={(e) => onCopyBaseHex('__base__', baseHex, e)}
      >
        <span class="hex-value">{baseHex}</span>
        <i
          class="fas"
          class:fa-copy={copiedKey !== '__base__'}
          class:fa-check={copiedKey === '__base__'}
          aria-hidden="true"
        ></i>
      </button>

      {#if showSetting}
        <div class="header-setting">{@render setting?.()}</div>
      {/if}
    </div>
  </div>

  {#if actions}
    <div class="header-actions">{@render actions()}</div>
  {/if}
</div>

<style>
  /* Identity on the left, actions on the right: close and reset sit where a
     panel's controls are expected, at the top-right of the band they close. */
  .editor-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--ui-space-16);
    flex-wrap: wrap;
  }

  .editor-primary {
    display: flex;
    align-items: stretch;
    gap: var(--ui-space-12);
    flex-shrink: 0;
  }

  .primary-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-2);
  }

  .header-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--ui-space-8);
  }

  /* Third line of the identity, under the hex: name, value, constraint all
     describe the family and share its left rail. Keeping it out of the band's
     row is what leaves the buttons a column of their own at every width. */
  .header-setting {
    display: flex;
    align-items: center;
    margin-top: var(--ui-space-4);
  }

  /* The setting makes the identity column taller than the swatch, and the row
     stretches its items; left alone the chip would grow into a rectangle. It is
     a colour sample, so it stays square and hangs from the top of the column. */
  .header-swatch {
    width: 4.5rem;
    min-height: 4.5rem;
    aspect-ratio: 1;
    align-self: flex-start;
    border-radius: var(--ui-radius-md);
    border: 2px solid var(--ui-border);
    flex-shrink: 0;
    cursor: pointer;
  }

  .header-swatch:hover {
    border-color: var(--ui-border-higher);
  }

  .header-swatch.active {
    border-color: var(--ui-border-higher);
    outline: 2px solid var(--ui-border-high);
    outline-offset: 1px;
  }

  .header-swatch.selected {
    border-color: var(--ui-surface-lowest);
    outline: none;
    box-shadow:
      inset 0 0 0 3px var(--ui-text-primary),
      inset 0 0 0 4px var(--ui-surface-lowest);
  }

  /* About to receive a swap: the axis row's doubled drop ring. */
  .header-swatch.swap-target {
    border-color: var(--ui-text-primary);
    outline: 1px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  .editor-label {
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .base-hex {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-4);
    margin-left: calc(-1 * var(--ui-space-4));
    border-radius: var(--ui-radius-sm);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    text-align: left;
  }

  /* The glyph only announces itself on approach; the hex is the content. */
  .base-hex i {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    transition: color var(--ui-transition-fast);
  }

  .base-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  .base-hex:hover i {
    color: var(--ui-text-secondary);
  }

  .base-hex.copied,
  .base-hex.copied i {
    color: var(--ui-text-accent);
  }

  @media (max-width: 1280px) {
    .header-swatch {
      width: 3.5rem;
      min-height: 3.5rem;
    }
  }
</style>
