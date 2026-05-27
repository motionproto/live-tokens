<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'toggle';

  // Single variant: the default carries the off baseline plus all geometry and
  // label typography. The other states layer hover, on, on+hover, and disabled
  // on top of that baseline.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'track surface',     variable: '--toggle-track-surface' },
      { label: 'track border',      variable: '--toggle-track-border' },
      { label: 'track border width',variable: '--toggle-track-border-width' },
      { label: 'track radius',      variable: '--toggle-track-radius' },
      { label: 'track width',       variable: '--toggle-track-width' },
      { label: 'track thickness',   variable: '--toggle-track-thickness' },
      { label: 'thumb surface',     variable: '--toggle-thumb-surface' },
      { label: 'thumb border',      variable: '--toggle-thumb-border' },
      { label: 'thumb size',        variable: '--toggle-thumb-size' },
      { label: 'label text',        variable: '--toggle-label-text' },
      { label: 'label font family', variable: '--toggle-label-font-family' },
      { label: 'label font size',   variable: '--toggle-label-font-size' },
      { label: 'label font weight', variable: '--toggle-label-font-weight' },
      { label: 'label gap',         variable: '--toggle-gap' },
    ],
    hover: [
      { label: 'track surface', variable: '--toggle-hover-track-surface' },
      { label: 'thumb surface', variable: '--toggle-hover-thumb-surface' },
    ],
    on: [
      { label: 'track surface', variable: '--toggle-on-track-surface' },
      { label: 'track border',  variable: '--toggle-on-track-border' },
      { label: 'thumb surface', variable: '--toggle-on-thumb-surface' },
      { label: 'thumb border',  variable: '--toggle-on-thumb-border' },
    ],
    'on hover': [
      { label: 'track surface', variable: '--toggle-on-hover-track-surface' },
      { label: 'thumb surface', variable: '--toggle-on-hover-thumb-surface' },
    ],
    disabled: [
      { label: 'track surface', variable: '--toggle-disabled-track-surface' },
      { label: 'thumb surface', variable: '--toggle-disabled-thumb-surface' },
      { label: 'label text',    variable: '--toggle-disabled-label-text' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import Toggle from '../../system/components/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  // Preview reflects the state being edited: "on" / "on hover" show checked;
  // hover variants apply force-hover; disabled is terminal.
  function previewProps(activeState: string) {
    return {
      checked: activeState === 'on' || activeState === 'on hover',
      disabled: activeState === 'disabled',
      forceClass: activeState === 'hover' || activeState === 'on hover' ? 'force-hover' : '',
    };
  }
</script>

<ComponentEditorBase
  {component}
  title="Toggle"
  description="On/off switch with a sliding thumb. The default state is off; on is a state with its own track and thumb colors."
  tokens={allTokens}
>
  <VariantGroup
    name="toggle"
    title="Toggle"
    {states}
    {component}
  >
    {#snippet children({ activeState })}
      {@const p = previewProps(activeState)}
      <div class="toggle-preview">
        <Toggle checked={p.checked} disabled={p.disabled} class={p.forceClass} label="Enable feature" />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .toggle-preview {
    display: flex;
    gap: var(--ui-space-16);
    padding: var(--ui-space-16);
  }
</style>
