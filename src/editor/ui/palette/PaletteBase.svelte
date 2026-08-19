<script lang="ts">
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import Toggle from '../Toggle.svelte';
  import { beginSliderGesture } from '../../core/store/editorStore';
  import { oklchToHexClamped, type Oklch } from '../../core/palettes/oklch';

  // Full sRGB chroma range (gamutClamp trims per hue/lightness). Neutrals default
  // low but are not capped; their calm character comes from defaults, not a ceiling.
  const CHROMA_MAX = 0.4;
  // Where a typical neutral's chroma sits, marked on the slider as a soft nudge.
  const NEUTRAL_CALM_CHROMA = 0.05;

  


  interface Props {
    /**
   * The header swatch + label + base-hex + (when active) the OKLCH ColorEditPanel
   * for editing the palette's base colour. The picker edits hue/chroma/lightness
   * and maps them straight to the base hex. `neutral` only nudges the picker
   * (a calm-chroma hint on the slider); it does not change behaviour.
   *
   * State (`editing`, scope handle) is owned by the parent — this component
   * fires callbacks (`onStartEdit`, `onConfirm`, `onCancel`, etc.).
   */
    label: string;
    displayLabel?: string | null;
    neutral?: boolean;
    baseColor: Oklch;
    anchorToBase: boolean;
    /** Palette step label ('500', '850', …) the base color is placed at; null while off or unplaced. */
    isEditingBase: boolean;
    panelOpen: boolean;
    /** Keep the panel open in live-apply mode (no confirm/cancel session) while the curve editors are visible. */
    pinnedOpen?: boolean;
    editingColor: Oklch | null;
    editPanelTitle: string | null;
    copiedKey: string | null;
    onStartEdit: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    onBaseChange: (hue: number, chroma: number, lightness: number) => void;
    onAnchorToBaseChange: (next: boolean) => void;
    onCopyBaseHex: (key: string, hex: string, event?: MouseEvent) => void;
  }

  let {
    label,
    displayLabel = null,
    neutral = false,
    baseColor,
    anchorToBase,
    isEditingBase,
    panelOpen,
    pinnedOpen = false,
    editingColor,
    editPanelTitle,
    copiedKey,
    onStartEdit,
    onConfirm,
    onCancel,
    onBaseChange,
    onAnchorToBaseChange,
    onCopyBaseHex
  }: Props = $props();

  let baseOklch = $derived(baseColor);
  let baseHex = $derived(oklchToHexClamped(baseColor.l, baseColor.c, baseColor.h));
  let pickerChromaHint = $derived(neutral ? NEUTRAL_CALM_CHROMA : undefined);
</script>

<div class="editor-top">
  <div class="editor-primary">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="header-swatch"
      class:active={isEditingBase || pinnedOpen}
      style="background: {baseHex}"
      onclick={onStartEdit}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && onStartEdit()}
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
    </div>
  </div>

  {#if pinnedOpen || (isEditingBase && panelOpen && editingColor)}
    <div class="editor-controls">
      <ColorEditPanel
        title={isEditingBase ? editPanelTitle : 'Base Color'}
        showRemoveOverride={false}
        hideActions={!isEditingBase}
        hidePreview
        hue={baseOklch.h}
        chroma={baseOklch.c}
        lightness={baseOklch.l * 100}
        chromaMax={CHROMA_MAX}
        chromaHint={pickerChromaHint}
        onHueChromaChange={onBaseChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onRemoveOverride={() => {}}
        onSliderStart={() => beginSliderGesture(`edit ${label} base`)}
      >
        {#snippet actions()}
          <Toggle
            checked={anchorToBase}
            onchange={(v) => onAnchorToBaseChange(v ?? !anchorToBase)}
            label="Base color must appear in palette"
          />
        {/snippet}
      </ColorEditPanel>
    </div>
  {/if}
</div>

<style>
  /* Identity and controls read as one band: the sliders sit beside the swatch
     rather than under it, which is what leaves the palette below its height. */
  .editor-top {
    display: flex;
    align-items: flex-start;
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

  /* Basis, not width: the panel takes the rest of the row and drops below only
     when it can't hold that much. */
  .editor-controls {
    flex: 1 1 26rem;
    min-width: 0;
  }

  .header-swatch {
    width: 4.5rem;
    min-height: 4.5rem;
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
