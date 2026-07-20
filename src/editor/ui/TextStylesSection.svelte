<script lang="ts">
  import { editorState } from '../core/store/editorStore';
  import UIFontFamilySelector from './UIFontFamilySelector.svelte';
  import UIFontSizeSelector from './UIFontSizeSelector.svelte';
  import UIFontWeightSelector from './UIFontWeightSelector.svelte';
  import UILetterSpacingSelector from './UILetterSpacingSelector.svelte';
  import { TEXT_STYLES } from './sections/textStyles';

  interface Props {
    /** Bumped by the parent on breakpoint flips so locked values re-resolve
     *  (heading-xl/lg line-height tightens at ≤768px). */
    liveVersion?: number;
  }

  let { liveVersion = 0 }: Props = $props();

  // Locked axes read live from the resolved cascade. liveVersion + $editorState
  // are touched so the values re-resolve on breakpoint flips and editor edits.
  let locked = $derived.by(() => {
    void liveVersion;
    void $editorState;
    const out: Record<string, { lineHeight: string; textTransform: string }> = {};
    if (typeof document === 'undefined') return out;
    const cs = getComputedStyle(document.documentElement);
    for (const s of TEXT_STYLES) {
      out[s.prefix] = {
        lineHeight: cs.getPropertyValue(`${s.prefix}-line-height`).trim(),
        textTransform: cs.getPropertyValue(`${s.prefix}-text-transform`).trim(),
      };
    }
    return out;
  });
</script>

<div class="text-styles-table">
  <div class="ts-header">
    <span class="ts-h">Style</span>
    <span class="ts-h">Preview</span>
    <span class="ts-h h-span2">Family</span>
    <span class="ts-h h-span2">Size</span>
    <span class="ts-h h-span2">Weight</span>
    <span class="ts-h h-span2">Letter spacing</span>
    <span class="ts-h">Line height</span>
    <span class="ts-h">Transform</span>
  </div>

  {#each TEXT_STYLES as style (style.prefix)}
    {@const ro = locked[style.prefix]}
    <div class="ts-row">
      <div class="ts-style">
        <code class="ts-name">{style.name}</code>
        <span class="ts-el">{style.defaultElement}</span>
      </div>

      <div
        class="ts-preview"
        style="font-family: var({style.prefix}-font-family); font-size: var({style.prefix}-font-size); font-weight: var({style.prefix}-font-weight); line-height: var({style.prefix}-line-height); letter-spacing: var({style.prefix}-letter-spacing);{style.lockedAxes.includes('text-transform') ? ` text-transform: var(${style.prefix}-text-transform);` : ''}"
      >{style.preview}</div>

      <UIFontFamilySelector variable={`${style.prefix}-font-family`} />
      <UIFontSizeSelector variable={`${style.prefix}-font-size`} />
      <UIFontWeightSelector variable={`${style.prefix}-font-weight`} />
      <UILetterSpacingSelector variable={`${style.prefix}-letter-spacing`} />

      <div class="ts-locked" title="Line height is locked in v1">
        <i class="fas fa-lock ts-lock-glyph" aria-hidden="true"></i>
        <span class="ts-locked-value">{ro?.lineHeight ?? ''}</span>
      </div>

      {#if style.lockedAxes.includes('text-transform')}
        <div class="ts-locked" title="Text transform is part of the eyebrow style">
          <i class="fas fa-lock ts-lock-glyph" aria-hidden="true"></i>
          <span class="ts-locked-value">{ro?.textTransform ?? ''}</span>
        </div>
      {:else}
        <span class="ts-empty" aria-hidden="true"></span>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* Single grid template shared by the header and every row (custom prop so
     the row grids and the header stay column-aligned). Each font picker is a
     subgrid spanning two tracks — trigger + resolved-value meta. */
  .text-styles-table {
    --ts-grid:
      9rem
      minmax(9rem, 1.4fr)
      minmax(5.5rem, 0.9fr) minmax(2.5rem, max-content)
      minmax(4rem, 0.7fr) minmax(2.5rem, max-content)
      minmax(5.5rem, 0.9fr) minmax(2.5rem, max-content)
      minmax(5rem, 0.8fr) minmax(2.5rem, max-content)
      4.5rem
      5rem;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    overflow-x: auto;
  }

  .ts-header,
  .ts-row {
    display: grid;
    grid-template-columns: var(--ts-grid);
    column-gap: var(--ui-space-10);
    align-items: center;
    min-width: max-content;
  }

  .ts-header {
    padding: 0 var(--ui-space-8) var(--ui-space-6);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .ts-h {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
  }

  .h-span2 {
    grid-column: span 2;
  }

  .ts-row {
    padding: var(--ui-space-6) var(--ui-space-8);
    border-radius: var(--ui-radius-md);
    row-gap: var(--ui-space-4);
  }

  .ts-row:hover {
    background: var(--ui-surface-low);
  }

  .ts-style {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    min-width: 0;
  }

  .ts-name {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
  }

  .ts-el {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
  }

  /* Preview renders through the bundle's own vars (letterforms, not ink); ink
     stays the editor's text colour since colour is outside the style bundle. */
  .ts-preview {
    color: var(--ui-text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ts-locked {
    display: inline-flex;
    align-items: baseline;
    gap: var(--ui-space-6);
    min-width: 0;
  }

  .ts-lock-glyph {
    align-self: center;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    opacity: 0.55;
  }

  .ts-locked-value {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
