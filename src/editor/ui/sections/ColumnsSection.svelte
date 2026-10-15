<script lang="ts">
  import { editorState, mutate, beginSliderGesture } from '../../core/store/editorStore';
  import {
    COLUMN_BREAKPOINTS,
    COLUMN_DEFAULTS,
    type ColumnProperty,
    type ColumnViewport,
  } from '../../core/themes/slices/columns';
  import UISegmentedControl from '../UISegmentedControl.svelte';

  const COLS_MIN = 1;
  const COLS_MAX = 24;
  // Pointer-events needed to break free of the default count once the drag
  // arrives there. The slider is bound to state, so returning early during
  // these trips keeps the thumb visually pinned even as the pointer wanders.
  const DETENT_RESISTANCE = 4;

  const VIEWPORT_OPTIONS: { value: ColumnViewport; label: string; title: string }[] = [
    { value: 'desktop', label: 'Desktop', title: `Wider than ${COLUMN_BREAKPOINTS.tablet}px` },
    { value: 'tablet', label: 'Tablet', title: `${COLUMN_BREAKPOINTS.tablet}px and narrower` },
    { value: 'phone', label: 'Phone', title: `${COLUMN_BREAKPOINTS.phone}px and narrower` },
  ];

  let viewport = $state<ColumnViewport>('desktop');
  let count = $derived($editorState.columns.count);
  let values = $derived($editorState.columns.viewports[viewport]);
  let viewportLabel = $derived(VIEWPORT_OPTIONS.find((o) => o.value === viewport)!.label.toLowerCase());
  // The preview scales the grid to the widest window it serves.
  let previewWidth = $derived(viewport === 'desktop' ? $editorState.columns.maxWidth : COLUMN_BREAKPOINTS[viewport]);

  function clampNum(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  function setViewportValue(property: ColumnProperty, value: number) {
    const target = viewport;
    mutate(`set ${target} columns ${property}`, (s) => { s.columns.viewports[target][property] = value; });
  }
  function setColumnsCount(n: number) {
    mutate('set columns count', (s) => { s.columns.count = clampNum(n, COLS_MIN, COLS_MAX); });
  }
  function setColumnsGutter(px: number) {
    setViewportValue('gutter', clampNum(px, 0, 200));
  }
  function setColumnsMargin(px: number) {
    setViewportValue('margin', clampNum(px, 0, 400));
  }
  function setColumnsMaxWidth(px: number) {
    mutate('set columns max-width', (s) => { s.columns.maxWidth = clampNum(px, 320, 2560); });
  }

  let colsDragging = false;
  let colsDetentTrips = 0;

  function onColsPointerDown() {
    beginSliderGesture('drag columns count');
    colsDragging = true;
    colsDetentTrips = 0;
  }
  function onColsPointerUp() {
    colsDragging = false;
    colsDetentTrips = 0;
  }
  function handleColsInput(raw: number, target: HTMLInputElement) {
    const detent = COLUMN_DEFAULTS.count;
    if (
      colsDragging &&
      count === detent &&
      Math.abs(raw - detent) === 1
    ) {
      colsDetentTrips += 1;
      if (colsDetentTrips < DETENT_RESISTANCE) {
        // Force the thumb back. Svelte's controlled value may not re-sync
        // when the underlying number is unchanged, so set the DOM value here.
        target.value = String(detent);
        return;
      }
      colsDetentTrips = 0;
    }
    if (raw === detent) colsDetentTrips = 0;
    setColumnsCount(raw);
  }

  // Inset by approximately one thumb-radius so the tick aligns with where the
  // thumb sits at the default count.
  const colsTickPct = ((COLUMN_DEFAULTS.count - COLS_MIN) / (COLS_MAX - COLS_MIN)) * 100;

  function resetViewport() {
    const target = viewport;
    mutate(`reset ${target} columns`, (s) => { s.columns.viewports[target] = { ...COLUMN_DEFAULTS.viewports[target] }; });
  }
</script>

<section class="section" id="columns">
  <h2 class="section-title">Columns</h2>
  <p class="columns-intro">
    Layout grid for page content. The count and the max width hold at every
    width. Desktop, tablet and phone each hold a gutter and a margin, and the
    grid switches them at {COLUMN_BREAKPOINTS.tablet}px and
    {COLUMN_BREAKPOINTS.phone}px. Toggle the live overlay from the editor bar's
    <i class="fas fa-grip-lines-vertical"></i> button to visualize.
  </p>

  <div class="columns-controls">
    <div class="global-shadow-row cols-row">
      <span class="shadow-slider-label" title="Number of columns, shared by every viewport">Cols</span>
      <div class="cols-slider-wrap">
        <input type="range" min={COLS_MIN} max={COLS_MAX} value={count}
          onpointerdown={onColsPointerDown}
          onpointerup={onColsPointerUp}
          onpointercancel={onColsPointerUp}
          oninput={(e) => handleColsInput(+e.currentTarget.value, e.currentTarget)} />
        <span class="cols-tick" style="left: {colsTickPct}%" aria-hidden="true"></span>
        <span class="cols-tick-label" style="left: {colsTickPct}%" aria-hidden="true">{COLUMN_DEFAULTS.count}</span>
      </div>
      <input class="shadow-slider-input" type="number" min={COLS_MIN} max={COLS_MAX}
        value={count}
        onchange={(e) => setColumnsCount(+e.currentTarget.value)} />
      <span class="shadow-slider-unit"></span>
    </div>
    {#if count !== COLUMN_DEFAULTS.count}
      <p class="cols-consequence" role="note">
        <i class="fas fa-circle-exclamation"></i>
        <span>Most layouts assume {COLUMN_DEFAULTS.count} cols.</span>
      </p>
    {/if}
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Maximum content width, shared by every viewport">Max-Width</span>
      <input type="range" min="480" max="2560" step="10" value={$editorState.columns.maxWidth}
        onpointerdown={() => beginSliderGesture('drag columns max-width')}
        oninput={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
      <input class="shadow-slider-input columns-input-wide" type="number" min="320" max="2560"
        value={$editorState.columns.maxWidth}
        onchange={(e) => setColumnsMaxWidth(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>

    <div class="columns-viewport">
      <UISegmentedControl bind:value={viewport} options={VIEWPORT_OPTIONS} ariaLabel="Viewport" />
    </div>

    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Space between columns">Gutter</span>
      <input type="range" min="0" max="80" value={values.gutter}
        onpointerdown={() => beginSliderGesture(`drag ${viewport} columns gutter`)}
        oninput={(e) => setColumnsGutter(+e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="0" max="200"
        value={values.gutter}
        onchange={(e) => setColumnsGutter(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Outer page margin (side gutters)">Margin</span>
      <input type="range" min="0" max="200" value={values.margin}
        onpointerdown={() => beginSliderGesture(`drag ${viewport} columns margin`)}
        oninput={(e) => setColumnsMargin(+e.currentTarget.value)} />
      <input class="shadow-slider-input columns-input-wide" type="number" min="0" max="400"
        value={values.margin}
        onchange={(e) => setColumnsMargin(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>

    <div class="columns-controls-footer">
      <button class="columns-reset" onclick={resetViewport} title="Restore the default {viewportLabel} gutter and margin">
        <i class="fas fa-rotate-left"></i>
        Reset {viewportLabel}
      </button>
    </div>
  </div>

  <!-- A scaled picture of the grid at the widest window it serves: gutter and
       margin are shares of that width, so the preview keeps its proportions in
       any panel. -->
  <div class="columns-preview">
    <div
      class="columns-preview-inner"
      style="gap: {(values.gutter / previewWidth) * 100}%; padding-inline: {(values.margin / previewWidth) * 100}%; grid-template-columns: repeat({count}, minmax(0, 1fr));"
    >
      {#each { length: count }, i (i)}
        <div class="columns-preview-col"><span>{i + 1}</span></div>
      {/each}
    </div>
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
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
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .columns-controls .shadow-slider-label {
    width: 5rem;
    text-align: left;
  }

  .columns-viewport {
    display: flex;
    padding-top: var(--ui-space-8);
    margin-top: var(--ui-space-4);
    border-top: 1px solid var(--ui-border-low);
  }

  .cols-row {
    /* Slightly more breathing room so the tick label below the slider
       does not collide with the next row. */
    padding-bottom: var(--ui-space-6);
  }

  .cols-slider-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    min-width: 4rem;
  }

  .cols-slider-wrap input[type="range"] {
    flex: 1;
    min-width: 4rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .cols-tick {
    position: absolute;
    top: 50%;
    width: 2px;
    height: 10px;
    background: var(--ui-text-muted);
    opacity: 0.55;
    transform: translate(-50%, -50%);
    pointer-events: none;
    border-radius: 1px;
  }

  .cols-tick-label {
    position: absolute;
    top: calc(50% + 9px);
    transform: translateX(-50%);
    font-size: 9px;
    font-family: var(--ui-font-mono);
    color: var(--ui-text-muted);
    pointer-events: none;
    line-height: 1;
  }

  .cols-consequence {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    margin: calc(var(--ui-space-4) * -1) 0 0;
    padding: var(--ui-space-4) 0 var(--ui-space-4) calc(5rem + var(--ui-space-8));
    font-size: var(--ui-font-size-xs);
    color: var(--ui-link-broken);
    line-height: 1.3;
  }

  .cols-consequence i {
    font-size: 10px;
    opacity: 0.85;
  }

  .columns-input-wide {
    width: 3.5rem;
  }

  .columns-controls-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--ui-space-8);
    margin-top: var(--ui-space-4);
    border-top: 1px solid var(--ui-border-low);
  }

  .columns-reset {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-10);
    background: transparent;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .columns-reset:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }

  .columns-reset i {
    font-size: 10px;
  }

  .columns-preview {
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
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
    border: 1px solid var(--ui-border-low);
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
    border-color: var(--ui-border-high);
  }

  .shadow-slider-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 1rem;
    flex-shrink: 0;
  }
</style>
