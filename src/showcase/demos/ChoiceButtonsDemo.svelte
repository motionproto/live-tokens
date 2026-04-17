<script lang="ts">
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/showcase/demos/ChoiceButtonsDemo.svelte';

  let selectedChoice = 'option-2';

  type Token = { label: string; variable: string };

  const choiceStates: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--choice-default-bg' },
      { label: 'text color', variable: '--choice-default-text' },
      { label: 'icon color', variable: '--choice-default-icon' },
      { label: 'border color', variable: '--choice-default-border' },
      { label: 'radius', variable: '--choice-default-radius' },
    ],
    hover: [
      { label: 'surface color', variable: '--choice-hover-bg' },
      { label: 'text color', variable: '--choice-hover-text' },
      { label: 'icon color', variable: '--choice-hover-icon' },
      { label: 'border color', variable: '--choice-hover-border' },
      { label: 'radius', variable: '--choice-hover-radius' },
    ],
    selected: [
      { label: 'surface color', variable: '--choice-selected-bg' },
      { label: 'text color', variable: '--choice-selected-text' },
      { label: 'icon color', variable: '--choice-selected-icon' },
      { label: 'border color', variable: '--choice-selected-border' },
      { label: 'radius', variable: '--choice-selected-radius' },
    ],
    disabled: [
      { label: 'surface color', variable: '--choice-disabled-bg' },
      { label: 'text color', variable: '--choice-disabled-text' },
      { label: 'icon color', variable: '--choice-disabled-icon' },
      { label: 'border color', variable: '--choice-disabled-border' },
      { label: 'radius', variable: '--choice-disabled-radius' },
    ],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Button-Based Choice Sets</h2>
  <p class="demo-description">
    Interactive example showing all 4 visual states. Click buttons to see selection state.
  </p>

  <VariantGroup name="choice" title="Choice Button" states={choiceStates} {targetFile} let:activeState>
    {@const forceClass = activeState}
    <div class="choice-buttons-container">
      <button
        class="choice-button {forceClass === 'hover' ? 'force-hover' : ''}"
        class:selected={selectedChoice === 'option-1'}
        on:click={() => (selectedChoice = 'option-1')}
      >
        <i class="fas fa-star"></i>
        <span>Option 1</span>
      </button>

      <button
        class="choice-button {forceClass === 'hover' ? 'force-hover' : ''}"
        class:selected={selectedChoice === 'option-2' || forceClass === 'selected'}
        on:click={() => (selectedChoice = 'option-2')}
      >
        <i class="fas fa-check"></i>
        <span>Option 2</span>
      </button>

      <button
        class="choice-button {forceClass === 'hover' ? 'force-hover' : ''}"
        class:selected={selectedChoice === 'option-3'}
        on:click={() => (selectedChoice = 'option-3')}
      >
        <i class="fas fa-heart"></i>
        <span>Option 3</span>
      </button>

      <button class="choice-button" disabled={forceClass === 'disabled' || true}>
        <i class="fas fa-ban"></i>
        <span>Disabled</span>
      </button>
    </div>
  </VariantGroup>
</div>

<style>
  .choice-buttons-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
  }

  .choice-button {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10) var(--space-16);
    background: var(--choice-default-bg);
    border: 1px solid var(--choice-default-border);
    border-radius: var(--choice-default-radius);
    outline: 2px solid transparent;
    outline-offset: -1px;
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--choice-default-text);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .choice-button i {
    font-size: var(--font-lg);
    color: var(--choice-default-icon);
    transition: color 0.2s;
  }

  .choice-button:hover:not(:disabled):not(.selected),
  .choice-button.force-hover:not(:disabled):not(.selected) {
    background: var(--choice-hover-bg);
    border-color: var(--choice-hover-border);
    border-radius: var(--choice-hover-radius);
    color: var(--choice-hover-text);
    transform: translateY(-0.0625rem);
    box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.3);
  }

  .choice-button:hover:not(:disabled):not(.selected) i,
  .choice-button.force-hover:not(:disabled):not(.selected) i {
    color: var(--choice-hover-icon);
  }

  .choice-button.selected {
    background: var(--choice-selected-bg);
    border-color: var(--choice-selected-border);
    border-radius: var(--choice-selected-radius);
    outline-color: var(--choice-selected-border);
    color: var(--choice-selected-text);
  }

  .choice-button.selected i {
    color: var(--choice-selected-icon);
  }

  .choice-button:disabled {
    background: var(--choice-disabled-bg);
    border-color: var(--choice-disabled-border);
    border-radius: var(--choice-disabled-radius);
    color: var(--choice-disabled-text);
    opacity: 0.4;
    cursor: not-allowed;
  }

  .choice-button:disabled i {
    color: var(--choice-disabled-icon);
  }
</style>
