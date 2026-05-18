<script module lang="ts">
  import { buildTypeGroupTokens, buildTypeGroupShareableContexts } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'menuselect';

  // Non-text tokens per state. The text/font properties live in `typeGroups`
  // below and are rendered through TypeEditor instead of TokenLayout.
  // Item-shape tokens (radius, padding) sit under `menu` so they read as a
  // single decision about how items present across every state — the same
  // pattern SegmentedControl uses for `--selected-radius`.
  const states: Record<string, Token[]> = {
    menu: [
      { label: 'surface color', groupKey: 'surface', variable: '--menuselect-menu-surface' },
      { label: 'border color', groupKey: 'border', variable: '--menuselect-menu-border' },
      { label: 'border width', groupKey: 'width', variable: '--menuselect-menu-border-width' },
      { label: 'corner radius', groupKey: 'menu-radius', variable: '--menuselect-menu-radius' },
      { label: 'padding', variable: '--menuselect-menu-padding', groupKey: 'menu-padding' },
      { label: 'padding-top', variable: '--menuselect-menu-padding-top', groupKey: 'menu-padding-top', hidden: true },
      { label: 'padding-right', variable: '--menuselect-menu-padding-right', groupKey: 'menu-padding-right', hidden: true },
      { label: 'padding-bottom', variable: '--menuselect-menu-padding-bottom', groupKey: 'menu-padding-bottom', hidden: true },
      { label: 'padding-left', variable: '--menuselect-menu-padding-left', groupKey: 'menu-padding-left', hidden: true },
      { label: 'item gap', groupKey: 'gap', variable: '--menuselect-menu-gap' },
      { label: 'shadow', groupKey: 'shadow', variable: '--menuselect-menu-shadow' },
      { label: 'item radius', groupKey: 'item-radius', variable: '--menuselect-item-radius' },
      { label: 'item padding', variable: '--menuselect-item-padding', groupKey: 'item-padding' },
      { label: 'item padding-top', variable: '--menuselect-item-padding-top', groupKey: 'item-padding-top', hidden: true },
      { label: 'item padding-right', variable: '--menuselect-item-padding-right', groupKey: 'item-padding-right', hidden: true },
      { label: 'item padding-bottom', variable: '--menuselect-item-padding-bottom', groupKey: 'item-padding-bottom', hidden: true },
      { label: 'item padding-left', variable: '--menuselect-item-padding-left', groupKey: 'item-padding-left', hidden: true },
    ],
    'default item': [
      { label: 'surface color', groupKey: 'surface', variable: '--menuselect-default-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--menuselect-default-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--menuselect-default-icon-size' },
    ],
    'hover item': [
      { label: 'surface color', groupKey: 'surface', variable: '--menuselect-hover-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--menuselect-hover-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--menuselect-hover-icon-size' },
    ],
    'selected item': [
      { label: 'surface color', groupKey: 'surface', variable: '--menuselect-selected-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--menuselect-selected-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--menuselect-selected-icon-size' },
      { label: 'indicator color', groupKey: 'indicator', variable: '--menuselect-selected-indicator' },
    ],
    'disabled item': [
      { label: 'surface color', groupKey: 'surface', variable: '--menuselect-disabled-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--menuselect-disabled-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--menuselect-disabled-icon-size' },
    ],
  };

  // Per-state typography for the item label. Four states share the same label
  // surface, exposed via linkable groupKeys so a user can collapse them all
  // onto one shared text style or diverge them per state.
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    'default item': [{
      legend: 'item label',
      colorVariable: '--menuselect-default-text',
      familyVariable: '--menuselect-default-text-font-family',
      sizeVariable: '--menuselect-default-text-font-size',
      weightVariable: '--menuselect-default-text-font-weight',
      lineHeightVariable: '--menuselect-default-text-line-height',
    }],
    'hover item': [{
      legend: 'item label',
      colorVariable: '--menuselect-hover-text',
      familyVariable: '--menuselect-hover-text-font-family',
      sizeVariable: '--menuselect-hover-text-font-size',
      weightVariable: '--menuselect-hover-text-font-weight',
      lineHeightVariable: '--menuselect-hover-text-line-height',
    }],
    'selected item': [{
      legend: 'item label',
      colorVariable: '--menuselect-selected-text',
      familyVariable: '--menuselect-selected-text-font-family',
      sizeVariable: '--menuselect-selected-text-font-size',
      weightVariable: '--menuselect-selected-text-font-weight',
      lineHeightVariable: '--menuselect-selected-text-line-height',
    }],
    'disabled item': [{
      legend: 'item label',
      colorVariable: '--menuselect-disabled-text',
      familyVariable: '--menuselect-disabled-text-font-family',
      sizeVariable: '--menuselect-disabled-text-font-size',
      weightVariable: '--menuselect-disabled-text-font-weight',
      lineHeightVariable: '--menuselect-disabled-text-line-height',
    }],
  };

  const typeGroupTokens: Token[] = buildTypeGroupTokens(typeGroups);
  export const allTokens: Token[] = [...Object.values(states).flat(), ...typeGroupTokens];

  const linkableContexts = new Map<string, string>([
    ...buildTypeGroupShareableContexts(typeGroups),
    ['--menuselect-default-icon-size', 'default item'],
    ['--menuselect-hover-icon-size', 'hover item'],
    ['--menuselect-selected-icon-size', 'selected item'],
    ['--menuselect-disabled-icon-size', 'disabled item'],
  ]);
</script>

<script lang="ts">
  import MenuSelect from '../../system/components/MenuSelect.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  type Item = { value: string; label: string; icon?: string; disabled?: boolean };
  const items: Item[] = [
    { value: 'option-1', label: 'Option one',   icon: 'fas fa-circle' },
    { value: 'option-2', label: 'Option two',   icon: 'fas fa-square' },
    { value: 'option-3', label: 'Option three', icon: 'fas fa-triangle-exclamation' },
    { value: 'option-4', label: 'Option four',  icon: 'fas fa-ban', disabled: true },
  ];

  let showIcons = $state(true);
  let previewItems = $derived(showIcons ? items : items.map((it) => ({ ...it, icon: undefined })));

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Menu Select" description="A select-style dropdown panel. Items support default, hover, selected, and disabled states." tokens={allTokens} {linked}>
  {#snippet config()}
    <label>
      <input type="checkbox" bind:checked={showIcons} />
      <span>Show icons</span>
    </label>
  {/snippet}
  <VariantGroup
    name="menuselect"
    title="Menu Select"
    states={visibleStates}
    {typeGroups}
    {component}
  >
    {#snippet children({ activeState })}
      {@const previewValue = activeState === 'selected item' ? 'option-2' : ''}
      {@const previewForceHover = activeState === 'hover item' ? 'option-1' : null}
      <MenuSelect
        items={previewItems}
        value={previewValue}
        forceHoverValue={previewForceHover}
      />
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>
