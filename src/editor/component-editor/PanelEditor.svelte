<script module lang="ts">
  import type { Token } from './scaffolding/types';
  export const component = 'panel';

  // Frame + the non-surface stage props render as ordinary token rows. The
  // stage surface is a structured (tokenized) gradient edited via the
  // GradientEditor below, so it lives outside the row list — `kind: 'gradient'`
  // marks it as a structured payload and folds it back into `allTokens` for the
  // schema without rendering a flat color row for it.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'border color',  variable: '--panel-frame-border',       element: 'frame' },
      { label: 'border width',  variable: '--panel-frame-border-width', element: 'frame' },
      { label: 'corner radius', variable: '--panel-frame-radius',       element: 'frame' },

      { label: 'vertical padding', variable: '--panel-stage-padding',        splittable: false, element: 'stage' },
      { label: 'side padding',     variable: '--panel-stage-inline-padding', splittable: false, element: 'stage' },
      { label: 'content gap',      variable: '--panel-stage-gap',                               element: 'stage' },
    ],
  };
  const surfaceToken: Token = {
    label: 'surface',
    variable: '--panel-stage-surface',
    kind: 'gradient',
    family: 'neutral',
    element: 'stage',
  };
  export const allTokens: Token[] = [...Object.values(states).flat(), surfaceToken];
</script>

<script lang="ts">
  import Panel from '../../system/components/Panel.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import GradientEditor from '../ui/GradientEditor.svelte';
  import { componentGradientSource } from '../core/store/gradientSource';

  const surfaceGradient = componentGradientSource(component, surfaceToken.variable);
</script>

<ComponentEditorBase
  {component}
  title="Panel"
  description="Framed container with a tokenized border and gradient surface."
  tokens={allTokens}
>
  <VariantGroup name="panel" title="Panel" {states} {component} elementOrder={['frame', 'stage']}>
    {#snippet compositeControls(_stateName)}
      <div class="panel-surface-section">
        <GradientEditor
          sectionLabel="Surface"
          source={surfaceGradient}
          stopIdPrefix="panel-surface"
          familyFilter="neutral"
        />
      </div>
    {/snippet}
    {#snippet children()}
      <div class="panel-demo">
        <Panel minHeight="6rem">
          <div class="content-placeholder">Content Placeholder</div>
        </Panel>
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .panel-demo {
    width: 100%;
    max-width: 34rem;
  }
  .content-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    width: 100%;
    background: color-mix(in srgb, white 8%, transparent);
    border-radius: var(--ui-radius-sm);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
