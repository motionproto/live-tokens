<script lang="ts">
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import SharedBlock from './scaffolding/SharedBlock.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'segmentedcontrol';
  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };
  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];
  let showIcons = true;
  $: previewSegments = showIcons ? segments : segments.map((s) => ({ ...s, icon: undefined }));
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    familyLabel?: string;
    sizeVariable?: string;
    sizeLabel?: string;
    weightVariable?: string;
    weightLabel?: string;
    lineHeightVariable?: string;
    lineHeightLabel?: string;
  };

  // Non-text tokens per state. Text/font properties live in `typeGroups` below
  // and are rendered via TypeEditor instead of TokenLayout.
  const states: Record<string, Token[]> = {
    'control bar': [
      { label: 'surface color', variable: '--segmentedcontrol-bar-surface' },
      { label: 'border color', variable: '--segmentedcontrol-bar-border' },
      { label: 'border width', variable: '--segmentedcontrol-bar-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'bar-radius', variable: '--segmentedcontrol-bar-radius' },
      { label: 'option gap', variable: '--segmentedcontrol-bar-gap' },
      { label: 'padding', variable: '--segmentedcontrol-bar-padding', groupKey: 'bar-padding' },
      { label: 'padding-top', variable: '--segmentedcontrol-bar-padding-top', groupKey: 'bar-padding-top', hidden: true },
      { label: 'padding-right', variable: '--segmentedcontrol-bar-padding-right', groupKey: 'bar-padding-right', hidden: true },
      { label: 'padding-bottom', variable: '--segmentedcontrol-bar-padding-bottom', groupKey: 'bar-padding-bottom', hidden: true },
      { label: 'padding-left', variable: '--segmentedcontrol-bar-padding-left', groupKey: 'bar-padding-left', hidden: true },
    ],
    divider: [
      { label: 'color', variable: '--segmentedcontrol-divider-color' },
      { label: 'width', canBeShared: true, groupKey: 'divider-thickness', variable: '--segmentedcontrol-divider-thickness' },
      { label: 'height', canBeShared: true, groupKey: 'divider-height', variable: '--segmentedcontrol-divider-height' },
    ],
    'default option': [
      { label: 'icon color', variable: '--segmentedcontrol-option-icon' },
    ],
    'selected option': [
      { label: 'surface color', variable: '--segmentedcontrol-selected-surface' },
      { label: 'icon color', variable: '--segmentedcontrol-selected-icon' },
      { label: 'border color', variable: '--segmentedcontrol-selected-border' },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: '--segmentedcontrol-selected-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'selected-radius', variable: '--segmentedcontrol-selected-radius' },
    ],
    'hover option': [
      { label: 'surface color', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'icon color', variable: '--segmentedcontrol-option-hover-icon' },
    ],
    'disabled option': [
      { label: 'surface color', variable: '--segmentedcontrol-disabled-surface' },
      { label: 'icon color', variable: '--segmentedcontrol-disabled-icon' },
    ],
  };

  // Per-state typography groups for the option text element. All five
  // properties are exposed and individually share-able via groupKey across
  // the four states.
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

  // Schema entries for the type-group variables — registered for groupKey
  // resolution but not rendered through TokenLayout.
  const typeGroupTokens: Token[] = [
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-option-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-option-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-option-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-option-text-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-selected-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-selected-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-selected-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-selected-text-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-option-hover-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-option-hover-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-option-hover-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-option-hover-text-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-disabled-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-disabled-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-disabled-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-disabled-text-line-height' },
  ];
  const allTokens: Token[] = [...Object.values(states).flat(), ...typeGroupTokens];
  registerComponentSchema(component, allTokens);

  const shareableContexts = new Map<string, string>([
    ['--segmentedcontrol-bar-radius', 'control bar'],
    ['--segmentedcontrol-divider-thickness', 'divider'],
    ['--segmentedcontrol-divider-height', 'divider'],
    ['--segmentedcontrol-selected-border-width', 'selected option'],
    ['--segmentedcontrol-selected-radius', 'selected option'],
    ['--segmentedcontrol-option-text-font-family', 'default option'],
    ['--segmentedcontrol-option-text-font-size', 'default option'],
    ['--segmentedcontrol-option-text-font-weight', 'default option'],
    ['--segmentedcontrol-option-text-line-height', 'default option'],
    ['--segmentedcontrol-selected-text-font-family', 'selected option'],
    ['--segmentedcontrol-selected-text-font-size', 'selected option'],
    ['--segmentedcontrol-selected-text-font-weight', 'selected option'],
    ['--segmentedcontrol-selected-text-line-height', 'selected option'],
    ['--segmentedcontrol-option-hover-text-font-family', 'hover option'],
    ['--segmentedcontrol-option-hover-text-font-size', 'hover option'],
    ['--segmentedcontrol-option-hover-text-font-weight', 'hover option'],
    ['--segmentedcontrol-option-hover-text-line-height', 'hover option'],
    ['--segmentedcontrol-disabled-text-font-family', 'disabled option'],
    ['--segmentedcontrol-disabled-text-font-size', 'disabled option'],
    ['--segmentedcontrol-disabled-text-font-weight', 'disabled option'],
    ['--segmentedcontrol-disabled-text-line-height', 'disabled option'],
  ]);

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  let highlightedVars = new Set<string>();
  function handleTokenHover(e: CustomEvent<{ variable: string | null }>) {
    const v = e.detail.variable;
    if (!v) {
      highlightedVars = new Set();
      return;
    }
    const group = shared.groups.find((g) => g.variables.includes(v));
    highlightedVars = group ? new Set(group.variables) : new Set();
  }

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = allTokens.map((t) => t.variable);
</script>

<ComponentEditorBase {component} title="Segmented Control" description="A connected set of buttons for toggling between mutually exclusive options." resetVariables={allVariables}>
  <div class="preview-options">
    <label class="preview-toggle">
      <input type="checkbox" bind:checked={showIcons} />
      <span>Show icons</span>
    </label>
  </div>
  <VariantGroup
    name="segmentedcontrol"
    title="Segmented Control"
    states={visibleStates}
    {typeGroups}
    {component}
    {highlightedVars}
    sharedOrder={shared.sharedOrder}
    on:tokenhover={handleTokenHover}
    let:activeState
  >
    {@const previewValue = activeState === 'selected option' ? 'option-2' : ''}
    {@const previewForceHover = activeState === 'hover option' ? 'option-1' : null}
    {@const previewDisabled = activeState === 'disabled option'}
    <div>
      <SegmentedControl
        segments={previewSegments}
        value={previewValue}
        forceHoverValue={previewForceHover}
        disabled={previewDisabled}
      />
    </div>
  </VariantGroup>
  <SharedBlock {component} {shared} {highlightedVars} on:tokenhover={handleTokenHover} on:change />
</ComponentEditorBase>

<style>
  .preview-options {
    display: flex;
    gap: var(--ui-space-12);
    padding: 0 var(--ui-space-4) var(--ui-space-8);
  }

  .preview-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
