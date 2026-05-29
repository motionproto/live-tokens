<script module lang="ts">
  import { buildTypeGroupTokens, buildTypeGroupShareableContexts } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'segmentedcontrol';

  // Default-size schema. Non-text tokens per state; typography lives in
  // `typeGroups` below and is rendered via TypeEditor. Per-option shape +
  // icon-size are promoted into "option base" (one source of truth) since
  // they don't vary per state in the runtime.
  const defaultStates: Record<string, Token[]> = {
    'control bar': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-bar-surface' },
      { label: 'border color', groupKey: 'border', variable: '--segmentedcontrol-bar-border' },
      { label: 'border width', groupKey: 'width', variable: '--segmentedcontrol-bar-border-width' },
      { label: 'divider color', groupKey: 'color', variable: '--segmentedcontrol-divider-color' },
      { label: 'divider width', groupKey: 'thickness', variable: '--segmentedcontrol-divider-thickness' },
      { label: 'divider inset', groupKey: 'divider-inset', variable: '--segmentedcontrol-divider-inset' },
      { label: 'corner radius', groupKey: 'radius', variable: '--segmentedcontrol-bar-radius' },
      { label: 'option gap', groupKey: 'gap', variable: '--segmentedcontrol-bar-gap' },
      { label: 'padding', variable: '--segmentedcontrol-bar-padding', groupKey: 'bar-padding' },
    ],
    'option base': [
      { label: 'padding', variable: '--segmentedcontrol-option-padding', groupKey: 'option-padding' },
      { label: 'icon gap', groupKey: 'option-gap', variable: '--segmentedcontrol-option-gap' },
      { label: 'icon size', groupKey: 'icon-size', variable: '--segmentedcontrol-option-icon-size' },
    ],
    'default option': [
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-option-icon' },
    ],
    'selected option': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-selected-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-selected-icon' },
      { label: 'border color', groupKey: 'border', variable: '--segmentedcontrol-selected-border' },
      { label: 'border width', groupKey: 'width', variable: '--segmentedcontrol-selected-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--segmentedcontrol-selected-radius' },
    ],
    'hover option': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-option-hover-icon' },
    ],
    'disabled option': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-disabled-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-disabled-icon' },
    ],
  };

  // Small-size schema. Thin delta layer — only the size-driven properties.
  // Per-state colors, borders, font-family/weight stay shared with default.
  // States with no small overrides are omitted entirely so they don't render
  // empty fieldsets. Typography is regular rows (no typeGroups at small)
  // since family/weight/color don't differ.
  const smallStates: Record<string, Token[]> = {
    'control bar': [
      { label: 'divider inset', groupKey: 'small-divider-inset', variable: '--segmentedcontrol-divider-small-inset' },
      { label: 'divider width', groupKey: 'small-thickness', variable: '--segmentedcontrol-divider-small-thickness' },
      { label: 'corner radius', groupKey: 'small-radius', variable: '--segmentedcontrol-bar-small-radius' },
      { label: 'padding', variable: '--segmentedcontrol-bar-small-padding', groupKey: 'bar-small-padding' },
    ],
    'option base': [
      { label: 'icon size', groupKey: 'small-icon-size', variable: '--segmentedcontrol-option-small-icon-size' },
      { label: 'font size', groupKey: 'small-text-font-size', variable: '--segmentedcontrol-option-small-text-font-size' },
      { label: 'line height', groupKey: 'small-text-line-height', variable: '--segmentedcontrol-option-small-text-line-height' },
      { label: 'padding', variable: '--segmentedcontrol-option-small-padding', groupKey: 'option-small-padding' },
      { label: 'icon gap', groupKey: 'option-small-gap', variable: '--segmentedcontrol-option-small-gap' },
    ],
    'selected option': [
      { label: 'corner radius', groupKey: 'small-radius', variable: '--segmentedcontrol-selected-small-radius' },
    ],
  };

  // Per-state typography groups (default size only).
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    'default option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-option-text',
      familyVariable: '--segmentedcontrol-option-text-font-family',
      sizeVariable: '--segmentedcontrol-option-text-font-size',
      weightVariable: '--segmentedcontrol-option-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-option-text-line-height',
    }],
    'selected option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-selected-text',
      familyVariable: '--segmentedcontrol-selected-text-font-family',
      sizeVariable: '--segmentedcontrol-selected-text-font-size',
      weightVariable: '--segmentedcontrol-selected-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-selected-text-line-height',
    }],
    'hover option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-option-hover-text',
      familyVariable: '--segmentedcontrol-option-hover-text-font-family',
      sizeVariable: '--segmentedcontrol-option-hover-text-font-size',
      weightVariable: '--segmentedcontrol-option-hover-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-option-hover-text-line-height',
    }],
    'disabled option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-disabled-text',
      familyVariable: '--segmentedcontrol-disabled-text-font-family',
      sizeVariable: '--segmentedcontrol-disabled-text-font-size',
      weightVariable: '--segmentedcontrol-disabled-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-disabled-text-line-height',
    }],
  };

  const emptyTypeGroups: Record<string, TypeGroupConfig[]> = {};

  // allTokens unions BOTH sizes so the store registers every editable variable.
  // The visibleStates filter is purely UI (which subset to render now).
  const typeGroupTokens: Token[] = buildTypeGroupTokens(typeGroups);
  export const allTokens: Token[] = [
    ...Object.values(defaultStates).flat(),
    ...Object.values(smallStates).flat(),
    ...typeGroupTokens,
  ];

  // Cross-size linkage is intentionally not declared: small lives in its own
  // namespace. The per-state icon-size links are gone now that icon-size is a
  // single source-of-truth token in "option base".
  const linkableContexts = new Map<string, string>(
    buildTypeGroupShareableContexts(typeGroups),
  );
</script>

<script lang="ts">
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };
  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];
  let showIcons = $state(true);
  let previewSize = $state<'default' | 'small'>('default');
  let previewSegments = $derived(showIcons ? segments : segments.map((s) => ({ ...s, icon: undefined })));

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let activeStates = $derived(previewSize === 'small' ? smallStates : defaultStates);
  let activeTypeGroups = $derived(previewSize === 'small' ? emptyTypeGroups : typeGroups);

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(activeStates).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Segmented Control" description="A connected set of buttons for toggling between mutually exclusive options." tokens={allTokens} {linked}>
  <VariantGroup
    name="segmentedcontrol"
    title="Segmented Control"
    states={visibleStates}
    typeGroups={activeTypeGroups}
    {component}
  >
    {#snippet previewActions()}
      <label>
        <span>Size</span>
        <select bind:value={previewSize}>
          <option value="default">Default</option>
          <option value="small">Small</option>
        </select>
      </label>
    {/snippet}
    {#snippet canvasToolbarExtras()}
      <hr class="canvas-toolbar-divider" />
      <label class="sc-preview-check">
        <input type="checkbox" bind:checked={showIcons} />
        <span>Show icons</span>
      </label>
    {/snippet}
    {#snippet children({ activeState })}
      {@const previewValue = activeState === 'selected option' ? 'option-2' : ''}
      {@const previewForceHover = activeState === 'hover option' ? 'option-1' : null}
      {@const previewDisabled = activeState === 'disabled option'}
      <div>
        <SegmentedControl
          segments={previewSegments}
          value={previewValue}
          forceHoverValue={previewForceHover}
          disabled={previewDisabled}
          size={previewSize}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .sc-preview-check {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
