<script lang="ts">
  import { onMount } from 'svelte';
  import { editorState, mutate, beginSliderGesture } from '../../lib/editorStore';
  import type { ColumnsState } from '../../lib/editorTypes';

  function clampNum(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  function setColumnsCount(n: number) {
    mutate('set columns count', (s) => { s.columns.count = clampNum(n, 1, 24); });
  }
  function setColumnsMaxWidth(px: number) {
    mutate('set columns max-width', (s) => { s.columns.maxWidth = clampNum(px, 320, 2560); });
  }
  function setColumnsGutter(px: number) {
    mutate('set columns gutter', (s) => { s.columns.gutter = clampNum(px, 0, 200); });
  }
  function setColumnsMargin(px: number) {
    mutate('set columns margin', (s) => { s.columns.margin = clampNum(px, 0, 400); });
  }

  let initialColumns: ColumnsState | null = null;

  onMount(() => {
    initialColumns = { ...$editorState.columns };
  });

  function resetColumns() {
    if (!initialColumns) return;
    const snapshot = initialColumns;
    mutate('reset columns', (s) => { s.columns = { ...snapshot }; });
  }
</script>

<section class="section" id="columns">
  <h2 class="section-title">Columns</h2>
  <p class="columns-intro">
    Layout grid for page content. Toggle the live overlay from the editor bar's
    <i class="fas fa-grip-lines-vertical"></i> button to visualize.
  </p>

  <div class="columns-controls">
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Number of columns">Cols</span>
      <input type="range" min="1" max="24" value={$editorState.columns.count}
        onpointerdown={() => beginSliderGesture('drag columns count')}
        oninput={(e) => setColumnsCount(+e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="1" max="24"
        value={$editorState.columns.count}
        onchange={(e) => setColumnsCount(+e.currentTarget.value)} />
      <span class="shadow-slider-unit"></span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Maximum content width">Max-Width</span>
      <input type="range" min="480" max="2560" step="10" value={$editorState.columns.maxWidth}
        onpointerdown={() => beginSliderGesture('drag columns max-width')}
        oninput={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
      <input class="shadow-slider-input columns-input-wide" type="number" min="320" max="2560"
        value={$editorState.columns.maxWidth}
        onchange={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Space between columns">Gutter</span>
      <input type="range" min="0" max="80" value={$editorState.columns.gutter}
        onpointerdown={() => beginSliderGesture('drag columns gutter')}
        oninput={(e) => setColumnsGutter(+e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="0" max="200"
        value={$editorState.columns.gutter}
        onchange={(e) => setColumnsGutter(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Outer page margin (side gutters)">Margin</span>
      <input type="range" min="0" max="200" value={$editorState.columns.margin}
        onpointerdown={() => beginSliderGesture('drag columns margin')}
        oninput={(e) => setColumnsMargin(+e.currentTarget.value)} />
      <input class="shadow-slider-input columns-input-wide" type="number" min="0" max="400"
        value={$editorState.columns.margin}
        onchange={(e) => setColumnsMargin(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>

    <div class="columns-controls-footer">
      <button class="columns-reset" onclick={resetColumns} title="Restore values from when this editor session opened">
        <i class="fas fa-rotate-left"></i>
        Reset to initial
      </button>
    </div>
  </div>

  <div class="columns-preview">
    <div
      class="columns-preview-inner"
      style="gap: {$editorState.columns.gutter}px; padding-inline: {$editorState.columns.margin}px; grid-template-columns: repeat({$editorState.columns.count}, 1fr);"
    >
      {#each Array($editorState.columns.count) as _, i}
        <div class="columns-preview-col"><span>{i + 1}</span></div>
      {/each}
    </div>
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .section-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .columns-intro {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-muted);
    margin: 0;
    line-height: var(--ui-line-height-relaxed);
  }

  .columns-intro i {
    margin-inline: 2px;
    color: var(--ui-text-tertiary);
  }

  .columns-controls {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12) var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
  }

  .columns-controls .shadow-slider-label {
    width: 5rem;
    text-align: left;
  }

  .columns-input-wide {
    width: 3.5rem;
  }

  .columns-controls-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--ui-space-8);
    margin-top: var(--ui-space-4);
    border-top: 1px solid var(--ui-border-faint);
  }

  .columns-reset {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-10);
    background: transparent;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .columns-reset:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-medium);
  }

  .columns-reset i {
    font-size: 10px;
  }

  .columns-preview {
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    padding: var(--ui-space-12) 0;
    overflow: hidden;
  }

  .columns-preview-inner {
    display: grid;
    min-height: 64px;
  }

  .columns-preview-col {
    background: rgba(239, 68, 68, 0.08);
    border-left: 1px dashed rgba(239, 68, 68, 0.3);
    border-right: 1px dashed rgba(239, 68, 68, 0.3);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 48px;
  }

  .columns-preview-col span {
    font-family: var(--ui-font-mono);
    font-size: 9px;
    color: var(--ui-text-muted);
    padding-top: 4px;
  }

  /* Slider rows shared with VariablesTab — duplicated locally so this section
     is self-contained. Same names used because the hidden inputs/units are
     positioned with the same flex layout as elsewhere in VariablesTab. */
  .global-shadow-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .global-shadow-row input[type="range"] {
    flex: 1;
    min-width: 4rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .shadow-slider-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }

  .shadow-slider-input {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .shadow-slider-input::-webkit-inner-spin-button,
  .shadow-slider-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .shadow-slider-input:focus {
    outline: none;
    border-color: var(--ui-border-medium);
  }

  .shadow-slider-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 1rem;
    flex-shrink: 0;
  }
</style>
