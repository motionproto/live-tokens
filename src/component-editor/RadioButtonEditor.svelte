<script lang="ts">
  import RadioButton from '../components/RadioButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import DemoHeader from './scaffolding/DemoHeader.svelte';

  const targetFile = 'src/components/RadioButton.svelte';
  const component = 'radiobutton';

  let selectedRadio = 'option-b';

  type Token = { label: string; variable: string };

  const radioStates: Record<string, Token[]> = {
    default: [
      { label: 'dot border color', variable: '--radio-dot-border' },
      { label: 'label color', variable: '--radio-label' },
      { label: 'surface color', variable: '--radio-surface' },
      { label: 'radius', variable: '--radio-radius' },
    ],
    hover: [
      { label: 'dot border color', variable: '--radio-hover-dot-border' },
      { label: 'label color', variable: '--radio-hover-label' },
      { label: 'surface color', variable: '--radio-hover-surface' },
      { label: 'radius', variable: '--radio-radius' },
    ],
    active: [
      { label: 'dot border color', variable: '--radio-active-dot-border' },
      { label: 'label color', variable: '--radio-active-label' },
      { label: 'surface color', variable: '--radio-active-surface' },
      { label: 'radius', variable: '--radio-radius' },
    ],
  };
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Radio Button Component"
    description="Styled radio buttons with icon and color support. Import from <code>components/RadioButton.svelte</code>"
  />

  <VariantGroup name="radio" title="Radio Button" states={radioStates} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const forceActive = activeState === 'active'}
    <div class="radio-demo-row">
      <RadioButton
        icon="fas fa-shield-alt"
        label="Defense"
        color="var(--text-info)"
        active={forceActive || selectedRadio === 'option-a'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-a')}
      />
      <RadioButton
        icon="fas fa-coins"
        label="Economy"
        color="var(--text-accent)"
        active={forceActive || selectedRadio === 'option-b'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-b')}
      />
      <RadioButton
        icon="fas fa-users"
        label="Loyalty"
        color="var(--text-success)"
        active={forceActive || selectedRadio === 'option-c'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-c')}
      />
    </div>
  </VariantGroup>
</div>

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
