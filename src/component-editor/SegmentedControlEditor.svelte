<script lang="ts">
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import DemoHeader from './scaffolding/DemoHeader.svelte';

  const targetFile = 'src/components/SegmentedControl.svelte';
  const component = 'segmentedcontrol';

  let selectedValue = 'option-2';

  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };

  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];

  const disabledSegments: Segment[] = [
    { value: 'a', label: 'Enabled', icon: 'fas fa-star' },
    { value: 'b', label: 'Disabled', icon: 'fas fa-ban', disabled: true },
    { value: 'c', label: 'Enabled', icon: 'fas fa-check' },
  ];

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const barTokens: Token[] = [
    { label: 'surface color', variable: '--segment-bar-surface' },
    { label: 'border color', variable: '--segment-bar-border' },
    { label: 'border width', canBeShared: true, variable: '--segment-bar-border-width' },
    { label: 'radius', canBeShared: true, variable: '--segment-bar-radius' },
  ];

  const dividerTokens: Token[] = [
    { label: 'color', variable: '--segment-divider-color' },
    { label: 'width', canBeShared: true, variable: '--segment-divider-width' },
    { label: 'height', canBeShared: true, variable: '--segment-divider-height' },
  ];

  const optionStates: Record<string, Token[]> = {
    default: [
      { label: 'text color', variable: '--segment-option-text' },
      { label: 'font family', canBeShared: true, variable: '--segment-option-text-font-family' },
      { label: 'font weight', canBeShared: true, variable: '--segment-option-text-font-weight' },
      { label: 'icon color', variable: '--segment-option-icon' },
    ],
    hover: [
      { label: 'surface color', variable: '--segment-option-hover-surface' },
      { label: 'text color', variable: '--segment-option-hover-text' },
      { label: 'icon color', variable: '--segment-option-hover-icon' },
    ],
    disabled: [
      { label: 'surface color', variable: '--segment-option-disabled-surface' },
      { label: 'text color', variable: '--segment-option-disabled-text' },
      { label: 'font weight', canBeShared: true, variable: '--segment-option-disabled-text-font-weight' },
      { label: 'icon color', variable: '--segment-option-disabled-icon' },
    ],
  };

  const selectedTokens: Record<string, Token[]> = {
    selected: [
      { label: 'surface color', variable: '--segment-selected-surface' },
      { label: 'text color', variable: '--segment-selected-text' },
      { label: 'font weight', canBeShared: true, variable: '--segment-selected-text-font-weight' },
      { label: 'icon color', variable: '--segment-selected-icon' },
      { label: 'border color', variable: '--segment-selected-border' },
      { label: 'border width', canBeShared: true, variable: '--segment-selected-border-width' },
      { label: 'radius', canBeShared: true, variable: '--segment-selected-radius' },
    ],
  };

  $: hoverTarget = selectedValue === 'option-1' ? 'option-3' : 'option-1';
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Segmented Control"
    description="A connected set of buttons for toggling between mutually exclusive options."
  />

  <VariantGroup name="bar" title="Control Bar" tokens={barTokens} {targetFile} {component}>
    <div class="segmented-demo-container">
      <SegmentedControl {segments} bind:value={selectedValue} />
    </div>
  </VariantGroup>

  <VariantGroup name="divider" title="Divider" tokens={dividerTokens} {targetFile} {component}>
    <div class="segmented-demo-container">
      <SegmentedControl {segments} bind:value={selectedValue} />
    </div>
  </VariantGroup>

  <VariantGroup name="option" title="Option" states={optionStates} {targetFile} {component} let:activeState>
    <div class="segmented-demo-container">
      <SegmentedControl
        {segments}
        bind:value={selectedValue}
        forceHoverValue={activeState === 'hover' ? hoverTarget : null}
      />
      {#if activeState === 'disabled'}
        <SegmentedControl segments={disabledSegments} value="a" />
      {/if}
    </div>
  </VariantGroup>

  <VariantGroup name="selected" title="Selected Option" states={selectedTokens} {targetFile} {component}>
    <div class="segmented-demo-container">
      <SegmentedControl {segments} bind:value={selectedValue} />
    </div>
  </VariantGroup>
</div>

<style>
  .segmented-demo-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-12);
  }
</style>
