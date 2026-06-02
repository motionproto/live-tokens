<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig, IntrinsicSpec } from './scaffolding/types';

  export const component = 'card';

  // Hover overrides only border + shadow; rest inherits default. `element` groups tokens by frame/header/body.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', groupKey: 'surface', variable: '--card-default-surface', element: 'frame' },
      { label: 'border color', groupKey: 'border', variable: '--card-default-border', element: 'frame' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--card-default-border-width', element: 'frame' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--card-default-radius', element: 'frame' },
      { label: 'card shadow', canBeLinked: true, groupKey: 'shadow', variable: '--card-default-shadow', element: 'frame' },
      { label: 'background blur', canBeLinked: true, groupKey: 'blur', variable: '--card-default-blur', element: 'frame' },
      { label: 'header color', groupKey: 'surface', variable: '--card-default-header-surface', element: 'header' },
      { label: 'header padding', canBeLinked: true, groupKey: 'header-padding', variable: '--card-default-header-padding', element: 'header' },
      { label: 'icon gap', canBeLinked: true, groupKey: 'header-gap', variable: '--card-default-header-gap', element: 'header' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--card-default-icon-size', element: 'header' },
      { label: 'body padding', canBeLinked: true, groupKey: 'body-padding', variable: '--card-default-body-padding', element: 'body' },
    ],
    hover: [
      { label: 'border color', groupKey: 'border', variable: '--card-hover-border' },
      { label: 'card shadow', canBeLinked: true, groupKey: 'shadow', variable: '--card-hover-shadow' },
    ],
  };

  // Typography shared across states (no hover overrides).
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [
      {
        legend: 'title',
        element: 'header',
        colorVariable: '--card-default-title',
        familyVariable: '--card-default-title-font-family',
        sizeVariable: '--card-default-title-font-size',
        weightVariable: '--card-default-title-font-weight',
        lineHeightVariable: '--card-default-title-line-height',
      },
      {
        legend: 'body',
        element: 'body',
        colorVariable: '--card-default-body',
        familyVariable: '--card-default-body-font-family',
        sizeVariable: '--card-default-body-font-size',
        weightVariable: '--card-default-body-font-weight',
        lineHeightVariable: '--card-default-body-line-height',
      },
    ],
  };

  const typeGroupTokens: Token[] = [
    { label: 'font family', canBeLinked: true, groupKey: 'title-font-family', variable: '--card-default-title-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'title-font-size', variable: '--card-default-title-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: '--card-default-title-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'title-line-height', variable: '--card-default-title-line-height' },
    { label: 'font family', canBeLinked: true, groupKey: 'body-font-family', variable: '--card-default-body-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'body-font-size', variable: '--card-default-body-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'body-font-weight', variable: '--card-default-body-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'body-line-height', variable: '--card-default-body-line-height' },
  ];
  // Cross-state linked block; linkable props sourced from default state.
  const linkableContexts = new Map<string, string>([
    ['--card-default-border-width', 'card'],
    ['--card-default-radius', 'card'],
    ['--card-default-header-padding', 'card'],
    ['--card-default-header-gap', 'card'],
    ['--card-default-body-padding', 'card'],
    ['--card-default-shadow', 'card'],
    ['--card-default-blur', 'card'],
    ['--card-default-icon-size', 'card'],
    ['--card-default-title-font-family', 'title'],
    ['--card-default-title-font-size', 'title'],
    ['--card-default-title-font-weight', 'title'],
    ['--card-default-title-line-height', 'title'],
    ['--card-default-body-font-family', 'body'],
    ['--card-default-body-font-size', 'body'],
    ['--card-default-body-font-weight', 'body'],
    ['--card-default-body-line-height', 'body'],
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups, { component, variants: ['default'] }),
    ...typeGroupTokens,
  ];

  // Global "Use hover" default. The two `*-active` vars flip together: off = resting
  // tokens (no visible hover), on = the `--card-hover-*` tokens. Stored per-component.
  const HOVER_OFF = { border: 'var(--card-default-border)', shadow: 'var(--card-default-shadow)' };
  const HOVER_ON = { border: 'var(--card-hover-border)', shadow: 'var(--card-hover-shadow)' };
  export const intrinsics: IntrinsicSpec[] = [
    {
      key: 'hover-border',
      variants: ['default'],
      variable: () => '--card-hover-border-active',
      values: [HOVER_OFF.border, HOVER_ON.border],
      default: { default: HOVER_OFF.border },
    },
    {
      key: 'hover-shadow',
      variants: ['default'],
      variable: () => '--card-hover-shadow-active',
      values: [HOVER_OFF.shadow, HOVER_ON.shadow],
      default: { default: HOVER_OFF.shadow },
    },
  ];
</script>

<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  let aliases = $derived(
    ($editorState.components[component]?.aliases ?? {}) as Record<string, import('../core/store/editorTypes').CssVarRef>,
  );
  let hoverEnabled = $derived.by(() => {
    const ref = aliases['--card-hover-border-active'];
    const raw = ref?.kind === 'literal' ? ref.value : HOVER_OFF.border;
    return raw === HOVER_ON.border;
  });

  function setHoverEnabled(checked: boolean) {
    const v = checked ? HOVER_ON : HOVER_OFF;
    setComponentAlias(component, '--card-hover-border-active', { kind: 'literal', value: v.border });
    setComponentAlias(component, '--card-hover-shadow-active', { kind: 'literal', value: v.shadow });
  }
</script>

<ComponentEditorBase {component} title="Card" description="Generic card with icon, title, and slotted body." tokens={allTokens} {linked}>
  <VariantGroup
    name="card"
    title="Card"
    states={visibleStates}
    {typeGroups}
    {component}
  >
    {#snippet stateActions(stateName)}
      {#if stateName === 'hover'}
        <div class="hover-control">
          <label class="hover-enable">
            <input type="checkbox" checked={hoverEnabled} onchange={(e) => setHoverEnabled(e.currentTarget.checked)} />
            <span>Use hover</span>
          </label>
          <p class="hover-help">
            Checked: every card lifts on hover. Unchecked: hover is off by default and a page turns it on
            per card with the <code>hover</code> prop.
          </p>
        </div>
      {/if}
    {/snippet}
    {#snippet children({ activeState })}
      {@const previewClass = activeState === 'hover' ? 'force-hover' : ''}
      <div class="card-demo">
        <Card title="Card title" class={previewClass}>
          <p style="margin: 0;">Slotted body content. Hover the card (or switch the editor to the Hover state) to preview hover styling.</p>
        </Card>
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .card-demo {
    max-width: 28rem;
  }
  .hover-enable {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
  .hover-help {
    margin: var(--ui-space-4) 0 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }
  .hover-help code {
    font-family: var(--ui-font-mono);
  }
</style>
