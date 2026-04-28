<script lang="ts">
  import {
    editorState,
    setGradientType,
    setGradientAngle,
    setGradientStop,
    addGradientStop,
    removeGradientStop,
  } from '../lib/editorStore';
  import type { GradientType } from '../lib/editorTypes';
  import GradientStopPicker from './GradientStopPicker.svelte';

  export let variable: string;

  $: gradient = $editorState.gradients.tokens.find((t) => t.variable === variable);

  function setType(type: GradientType) {
    setGradientType(variable, type);
  }

  function onAngleInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) setGradientAngle(variable, v);
  }

  function onStopPosition(i: number, e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) {
      setGradientStop(variable, i, { position: Math.max(0, Math.min(100, v)) });
    }
  }

  function handleStopChange(i: number, e: CustomEvent<{ color: string; opacity: number }>) {
    setGradientStop(variable, i, { color: e.detail.color, opacity: e.detail.opacity });
  }

  function add() {
    if (!gradient) return;
    const last = gradient.stops[gradient.stops.length - 1];
    const prev = gradient.stops[gradient.stops.length - 2];
    const newPos = Math.round((last.position + (prev?.position ?? 0)) / 2);
    addGradientStop(variable, { position: newPos, color: last.color, opacity: last.opacity ?? 100 });
  }

  function remove(i: number) {
    removeGradientStop(variable, i);
  }
</script>

{#if gradient}
  <div class="gradient-editor">
    <div class="preview" style="background: var({variable});"></div>

    <div class="row controls-row">
      <div class="type-toggle" role="radiogroup">
        <button
          type="button"
          class:active={gradient.type === 'linear'}
          on:click={() => setType('linear')}
        >Linear</button>
        <button
          type="button"
          class:active={gradient.type === 'radial'}
          on:click={() => setType('radial')}
        >Radial</button>
      </div>
      {#if gradient.type === 'linear'}
        <label class="angle">
          <span>Angle</span>
          <input
            type="number"
            min="0"
            max="360"
            step="1"
            value={gradient.angle}
            on:change={onAngleInput}
          />
          <span class="suffix">deg</span>
        </label>
      {/if}
    </div>

    <div class="stops">
      <div class="stops-header">
        <span class="header-cell index"></span>
        <span class="header-cell">Position</span>
        <span class="header-cell">Color</span>
        <span class="header-cell"></span>
      </div>
      {#each gradient.stops as stop, i (i)}
        <div class="stop-row">
          <span class="stop-index">{i + 1}</span>
          <div class="stop-position">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={stop.position}
              on:change={(e) => onStopPosition(i, e)}
            />
            <span class="suffix">%</span>
          </div>
          <div class="stop-color-cell">
            <GradientStopPicker
              stopId={`${variable}-${i}`}
              color={stop.color}
              opacity={stop.opacity ?? 100}
              on:change={(e) => handleStopChange(i, e)}
            />
          </div>
          <button
            type="button"
            class="stop-remove"
            on:click={() => remove(i)}
            disabled={gradient.stops.length <= 2}
            title={gradient.stops.length <= 2 ? 'Gradient needs at least two stops' : 'Remove stop'}
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      {/each}
      <button type="button" class="add-stop" on:click={add}>
        <i class="fas fa-plus"></i> Add stop
      </button>
    </div>
  </div>
{/if}

<style>
  .gradient-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    width: 100%;
    min-width: 0;
  }

  .preview {
    width: 100%;
    height: 5rem;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-faint);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    flex-wrap: wrap;
  }

  .type-toggle {
    display: inline-flex;
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }

  .type-toggle button {
    padding: var(--ui-space-4) var(--ui-space-12);
    background: transparent;
    border: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .type-toggle button.active {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .type-toggle button + button {
    border-left: 1px solid var(--ui-border-faint);
  }

  .angle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .angle input {
    width: 4rem;
    padding: var(--ui-space-2) var(--ui-space-6);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
  }

  .stops {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .stops-header,
  .stop-row {
    display: grid;
    grid-template-columns: 1.5rem 8rem minmax(0, 1fr) 1.75rem;
    align-items: center;
    gap: var(--ui-space-10);
  }

  .stops-header {
    padding: 0 var(--ui-space-2);
  }

  .header-cell {
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stop-row {
    padding: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
  }

  .stop-row:hover {
    background: var(--ui-surface-low);
  }

  .stop-index {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-align: center;
  }

  .stop-position {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
  }

  .stop-position input {
    width: 5rem;
    padding: var(--ui-space-2) var(--ui-space-6);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
  }

  .suffix {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  .stop-color-cell {
    min-width: 0;
  }

  .stop-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    background: transparent;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-tertiary);
    cursor: pointer;
  }

  .stop-remove:hover:not(:disabled) {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .stop-remove:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .add-stop {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-12);
    background: var(--ui-surface-low);
    border: 1px dashed var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .add-stop:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }
</style>
