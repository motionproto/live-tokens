<script lang="ts">
  import UIFontFamilySelector from './UIFontFamilySelector.svelte';
  import UIFontSizeSelector from './UIFontSizeSelector.svelte';
  import UIFontWeightSelector from './UIFontWeightSelector.svelte';
  import UILetterSpacingSelector from './UILetterSpacingSelector.svelte';
  import UILineHeightSelector from './UILineHeightSelector.svelte';
  import UITextTransformSelector from './UITextTransformSelector.svelte';
  import { TEXT_STYLES } from './sections/textStyles';
</script>

<div class="text-styles">
  {#each TEXT_STYLES as style (style.prefix)}
    <div class="ts-card">
      <div class="ts-id">
        <code class="ts-name">{style.name}</code>
        <span class="ts-el">{style.defaultElement}</span>
      </div>

      <div
        class="ts-preview"
        style="font-family: var({style.prefix}-font-family); font-size: var({style.prefix}-font-size); font-weight: var({style.prefix}-font-weight); line-height: var({style.prefix}-line-height); letter-spacing: var({style.prefix}-letter-spacing);{style.hasTextTransform ? ` text-transform: var(${style.prefix}-text-transform);` : ''}"
      >{style.preview}</div>

      <div class="ts-controls">
        <div class="ts-field">
          <span class="ts-label">family</span>
          <UIFontFamilySelector variable={`${style.prefix}-font-family`} />
        </div>
        <div class="ts-field">
          <span class="ts-label">size</span>
          <UIFontSizeSelector variable={`${style.prefix}-font-size`} />
        </div>
        <div class="ts-field">
          <span class="ts-label">weight</span>
          <UIFontWeightSelector variable={`${style.prefix}-font-weight`} />
        </div>
        <div class="ts-field">
          <span class="ts-label">letter spacing</span>
          <UILetterSpacingSelector variable={`${style.prefix}-letter-spacing`} />
        </div>
        <div class="ts-field">
          <span class="ts-label">line height</span>
          <UILineHeightSelector variable={`${style.prefix}-line-height`} />
        </div>
        {#if style.hasTextTransform}
          <div class="ts-field">
            <span class="ts-label">transform</span>
            <UITextTransformSelector variable={`${style.prefix}-text-transform`} />
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  /* One frame around the stacked list; cards butt together and are separated
     by a faint rule rather than each being its own box. No overflow clipping —
     the pickers' dropdowns must be free to spill past the frame. */
  .text-styles {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ui-border);
  }

  /* Two columns: a fixed identity rail and the content column holding the
     preview (top) then the controls (below). The rail spans both rows so a
     stack of cards reads as one continuous, scannable left column. */
  .ts-card {
    display: grid;
    grid-template-columns: 8rem minmax(0, 1fr);
    column-gap: var(--ui-space-12);
    row-gap: var(--ui-space-8);
    padding: var(--ui-space-12) var(--ui-space-10);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .ts-card:last-child {
    border-bottom: none;
  }

  .ts-id {
    grid-column: 1;
    grid-row: 1 / span 2;
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

  /* Fixed-height preview well with the sample pinned to the top, so its
     cap-line meets the identity label instead of floating mid-row. Height
     clears the largest style (heading-xl) so every well is uniform and the
     rows keep a steady rhythm regardless of sample size. Preview renders
     through the bundle's own vars (letterforms, not ink); ink stays the
     editor's text colour since colour is outside the style bundle. */
  .ts-preview {
    grid-column: 2;
    grid-row: 1;
    align-self: start;
    min-height: 3rem;
    color: var(--ui-text-primary);
    max-width: 100%;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Fixed-width tracks packed to the left rather than stretching across the
     full-bleed section, so the axis pickers stay a tight, scannable cluster.
     auto-fill wraps them when the panel is too narrow for one row. */
  .ts-controls {
    grid-column: 2;
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 7.5rem));
    justify-content: start;
    gap: var(--ui-space-12);
    align-items: start;
  }

  .ts-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  /* The shared picker renders trigger + resolved value side by side (a subgrid
     spanning two parent tracks). Here we want them stacked — label, control,
     then the resolved value beneath — so flip its own layout to a column and
     left-align the value the component otherwise centres. */
  .ts-field :global(.ui-token-selector) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-4);
  }

  .ts-field :global(.ui-ts-trigger-wrap) {
    width: 100%;
    min-width: 0;
  }

  .ts-field :global(.ui-ts-meta-text) {
    align-self: flex-start;
  }

  /* Quiet eyebrow-scale labels so the eye lands on the control and its value,
     not the field name. */
  .ts-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ui-text-muted);
    white-space: nowrap;
  }
</style>
