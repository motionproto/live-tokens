<script module lang="ts">
  import type { Token } from '@motion-proto/live-tokens/component-editor';

  export const component = 'beacon';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface',      element: 'track', variable: '--beacon-track-surface' },
      { label: 'border',       element: 'track', variable: '--beacon-track-border' },
      { label: 'border width', element: 'track', variable: '--beacon-track-border-width' },
      { label: 'radius',       element: 'track', variable: '--beacon-track-radius' },
      { label: 'padding',      element: 'track', variable: '--beacon-track-padding' },
      { label: 'surface',      element: 'thumb', variable: '--beacon-thumb-surface' },
      { label: 'border',       element: 'thumb', variable: '--beacon-thumb-border' },
      { label: 'size',         element: 'thumb', variable: '--beacon-thumb-size' },
      { label: 'text',         element: 'label', variable: '--beacon-label-text' },
      { label: 'font family',  element: 'label', variable: '--beacon-label-font-family' },
      { label: 'font size',    element: 'label', variable: '--beacon-label-font-size' },
      { label: 'font weight',  element: 'label', variable: '--beacon-label-font-weight' },
      { label: 'gap',          element: 'label', variable: '--beacon-gap' },
    ],
    hover: [
      { label: 'track surface', variable: '--beacon-hover-track-surface' },
      { label: 'thumb surface', variable: '--beacon-hover-thumb-surface' },
    ],
    on: [
      { label: 'surface', element: 'track', variable: '--beacon-on-track-surface' },
      { label: 'border',  element: 'track', variable: '--beacon-on-track-border' },
      { label: 'surface', element: 'thumb', variable: '--beacon-on-thumb-surface' },
      { label: 'border',  element: 'thumb', variable: '--beacon-on-thumb-border' },
    ],
    'on hover': [
      { label: 'track surface', variable: '--beacon-on-hover-track-surface' },
      { label: 'thumb surface', variable: '--beacon-on-hover-thumb-surface' },
    ],
    disabled: [
      { label: 'track surface', variable: '--beacon-disabled-track-surface' },
      { label: 'thumb surface', variable: '--beacon-disabled-thumb-surface' },
      { label: 'label text',    variable: '--beacon-disabled-label-text' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import Beacon from './Beacon.svelte';
  import { ComponentEditorBase, VariantGroup } from '@motion-proto/live-tokens/component-editor';

  function previewProps(activeState: string) {
    return {
      on: activeState === 'on' || activeState === 'on hover',
      disabled: activeState === 'disabled',
      forceClass: activeState === 'hover' || activeState === 'on hover' ? 'force-hover' : '',
    };
  }
</script>

<ComponentEditorBase
  {component}
  title="Beacon"
  description="On/off status light with a label. Fixture component for the shipped-tests consumer acceptance gate."
  tokens={allTokens}
>
  <VariantGroup name="beacon" title="Beacon" {states} {component}>
    {#snippet children({ activeState })}
      {@const p = previewProps(activeState)}
      <div class="beacon-preview">
        <Beacon on={p.on} disabled={p.disabled} class={p.forceClass} label="Enable feature" />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .beacon-preview {
    display: flex;
    gap: var(--ui-space-16);
    padding: var(--ui-space-16);
  }
</style>
