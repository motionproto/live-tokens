<script lang="ts">
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import Toggle from '../Toggle.svelte';
  import { beginSliderGesture } from '../../lib/editorStore';

  /**
   * The header swatch + label + base-hex + (when active) the ColorEditPanel
   * for editing the palette's base colour. In chromatic mode the user picks
   * an arbitrary hex; in gray mode the user picks tint hue + chroma and the
   * hex is derived.
   *
   * State (`editing`, scope handle) is owned by the parent — this component
   * fires callbacks (`onStartEdit`, `onConfirm`, `onCancel`, etc.). The
   * parent decides whether to apply the chromatic-vs-gray snapshot dance.
   */

  export let label: string;
  export let mode: 'chromatic' | 'gray';
  export let baseColor: string;
  export let gray500Hex: string;
  export let tintHue: number;
  export let tintChroma: number;
  export let anchorToBase: boolean;
  export let isEditingBase: boolean;
  export let panelOpen: boolean;
  export let editingColor: string | null;
  export let editPanelTitle: string | null;
  export let copiedKey: string | null;

  export let onStartEdit: () => void;
  export let onConfirm: () => void;
  export let onCancel: () => void;
  export let onColorChange: (hex: string) => void;
  export let onTintChange: (hue: number, chroma: number) => void;
  export let onAnchorToBaseChange: (next: boolean) => void;
  export let onCopyBaseHex: (key: string, hex: string, event?: MouseEvent) => void;

  $: displayHex = mode === 'gray' ? gray500Hex : baseColor;
  $: copyKey = mode === 'gray' ? 'gray-500' : '__base__';
</script>

<div class="editor-top">
  <div class="editor-primary">
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
      class="header-swatch"
      class:active={isEditingBase}
      style="background: {displayHex}"
      on:click={onStartEdit}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Enter' && onStartEdit()}
    ></div>
    <div class="primary-info">
      <span class="editor-label">{label}</span>
      <button
        class="base-hex clickable-hex"
        type="button"
        on:click={(e) => onCopyBaseHex(copyKey, displayHex, e)}
      >{copiedKey === copyKey ? 'copied!' : displayHex}</button>
    </div>
  </div>
</div>

{#if isEditingBase && panelOpen && editingColor}
  <ColorEditPanel
    color={editingColor}
    title={editPanelTitle}
    showRemoveOverride={false}
    mode={mode === 'gray' ? 'hue-chroma' : 'hsl'}
    hue={tintHue}
    chroma={tintChroma}
    onHueChromaChange={onTintChange}
    onColorChange={onColorChange}
    onConfirm={onConfirm}
    onCancel={onCancel}
    onRemoveOverride={() => {}}
    onSliderStart={() => beginSliderGesture(`edit ${label} base`)}
  >
    <span slot="actions" class:hidden={mode !== 'chromatic'}>
      <Toggle checked={anchorToBase} on:change={(e) => onAnchorToBaseChange(e.detail ?? !anchorToBase)} label="Lock base color to position 500" />
    </span>
  </ColorEditPanel>
{/if}

<style>
  .editor-top {
    display: flex;
    align-items: flex-start;
    gap: var(--ui-space-16);
    flex-wrap: wrap;
  }

  .editor-primary {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    flex-shrink: 0;
  }

  .primary-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .header-swatch {
    width: 4rem;
    height: 4rem;
    border-radius: var(--ui-radius-md);
    border: 2px solid var(--ui-border-default);
    flex-shrink: 0;
    cursor: pointer;
  }

  .header-swatch:hover {
    border-color: var(--ui-border-strong);
  }

  .header-swatch.active {
    border-color: var(--ui-border-strong);
    outline: 2px solid var(--ui-border-medium);
    outline-offset: 1px;
  }

  .editor-label {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .base-hex {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  .clickable-hex {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  .clickable-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  .hidden {
    display: none;
  }

  @media (max-width: 1280px) {
    .header-swatch {
      width: 3rem;
      height: 3rem;
    }
  }
</style>
