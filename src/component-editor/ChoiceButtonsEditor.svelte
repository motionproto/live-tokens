<script lang="ts">
  import ChoiceButton from '../components/ChoiceButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import DemoHeader from './scaffolding/DemoHeader.svelte';

  const targetFile = 'src/components/ChoiceButton.svelte';
  const component = 'choicebutton';

  let selectedChoice = 'option-2';

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const choiceStates: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--choice-default-bg' },
      { label: 'text color', variable: '--choice-default-text' },
      { label: 'icon color', variable: '--choice-default-icon' },
      { label: 'border color', variable: '--choice-default-border' },
      { label: 'radius', canBeShared: true, variable: '--choice-default-radius' },
    ],
    hover: [
      { label: 'surface color', variable: '--choice-hover-bg' },
      { label: 'text color', variable: '--choice-hover-text' },
      { label: 'icon color', variable: '--choice-hover-icon' },
      { label: 'border color', variable: '--choice-hover-border' },
      { label: 'radius', canBeShared: true, variable: '--choice-hover-radius' },
    ],
    selected: [
      { label: 'surface color', variable: '--choice-selected-bg' },
      { label: 'text color', variable: '--choice-selected-text' },
      { label: 'icon color', variable: '--choice-selected-icon' },
      { label: 'border color', variable: '--choice-selected-border' },
      { label: 'radius', canBeShared: true, variable: '--choice-selected-radius' },
    ],
    disabled: [
      { label: 'surface color', variable: '--choice-disabled-bg' },
      { label: 'text color', variable: '--choice-disabled-text' },
      { label: 'icon color', variable: '--choice-disabled-icon' },
      { label: 'border color', variable: '--choice-disabled-border' },
      { label: 'radius', canBeShared: true, variable: '--choice-disabled-radius' },
    ],
  };
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Button-Based Choice Sets"
    description="Interactive example showing all 4 visual states. Click buttons to see selection state."
  />

  <VariantGroup name="choice" title="Choice Button" states={choiceStates} {targetFile} {component} let:activeState>
    {@const forceClass = activeState}
    <div class="choice-buttons-container">
      <ChoiceButton
        icon="fas fa-star"
        selected={selectedChoice === 'option-1'}
        forceHover={forceClass === 'hover'}
        on:click={() => (selectedChoice = 'option-1')}
      >
        Option 1
      </ChoiceButton>

      <ChoiceButton
        icon="fas fa-check"
        selected={selectedChoice === 'option-2' || forceClass === 'selected'}
        forceHover={forceClass === 'hover'}
        on:click={() => (selectedChoice = 'option-2')}
      >
        Option 2
      </ChoiceButton>

      <ChoiceButton
        icon="fas fa-heart"
        selected={selectedChoice === 'option-3'}
        forceHover={forceClass === 'hover'}
        on:click={() => (selectedChoice = 'option-3')}
      >
        Option 3
      </ChoiceButton>

      <ChoiceButton icon="fas fa-ban" disabled>
        Disabled
      </ChoiceButton>
    </div>
  </VariantGroup>
</div>

<style>
  .choice-buttons-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
  }
</style>
