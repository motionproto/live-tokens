<script lang="ts">
  import type { Snippet } from 'svelte';
  import { oklchToHexClamped, type Oklch } from '../../core/palettes/oklch';

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
    copiedKey: string | null;
    onStartEdit: () => void;
    onCopyBaseHex: (key: string, hex: string, event?: MouseEvent) => void;
    actions?: Snippet;
  }

  let {
    label,
    displayLabel = null,
    baseColor,
    isEditingBase,
    pinnedOpen = false,
    copiedKey,
    onStartEdit,
    onCopyBaseHex,
    actions
  }: Props = $props();

  let baseHex = $derived(oklchToHexClamped(baseColor.l, baseColor.c, baseColor.h));
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
    gap: var(--ui-space-8);
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
