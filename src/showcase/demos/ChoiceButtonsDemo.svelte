<script lang="ts">
  let selectedChoice = 'option-2';
  function handleChoiceClick(choice: string) {
    selectedChoice = choice;
  }
</script>

<div class="demo-block">
  <h2 class="component-title">Button-Based Choice Sets</h2>
  <p class="demo-description">
    Interactive example showing all 4 visual states. Click buttons to see selection state.
  </p>

  <div class="demo-section">
    <h3 class="demo-subtitle">Interactive Example</h3>
    <div class="choice-buttons-container">
      <button
        class="choice-button"
        class:selected={selectedChoice === 'option-1'}
        on:click={() => handleChoiceClick('option-1')}
      >
        <i class="fas fa-star"></i>
        <span>Default/Hover</span>
      </button>

      <button
        class="choice-button"
        class:selected={selectedChoice === 'option-2'}
        on:click={() => handleChoiceClick('option-2')}
      >
        <i class="fas fa-check"></i>
        <span>Selected</span>
      </button>

      <button
        class="choice-button"
        class:selected={selectedChoice === 'option-3'}
        on:click={() => handleChoiceClick('option-3')}
      >
        <i class="fas fa-heart"></i>
        <span>Clickable</span>
      </button>

      <button
        class="choice-button"
        disabled
      >
        <i class="fas fa-ban"></i>
        <span>Disabled</span>
      </button>
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">State Reference</h3>
    <div class="state-reference">
      <div class="state-item">
        <div class="state-label">Default</div>
        <div class="state-details">
          <code>background: --surface-neutral-high</code>
          <code>border: 1px --border-neutral-default</code>
        </div>
      </div>

      <div class="state-item">
        <div class="state-label">Hover</div>
        <div class="state-details">
          <code>background: --surface-neutral-higher</code>
          <code>border-color: --border-neutral-strong</code>
        </div>
      </div>

      <div class="state-item">
        <div class="state-label">Selected</div>
        <div class="state-details">
          <code>background: --surface-success-high</code>
          <code>outline: 2px --border-success</code>
        </div>
      </div>

      <div class="state-item">
        <div class="state-label">Disabled</div>
        <div class="state-details">
          <code>opacity: 0.4</code>
          <code>cursor: not-allowed</code>
        </div>
      </div>
    </div>
  </div>
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
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--radius-lg);
    outline: 2px solid transparent;
    outline-offset: -1px;
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .choice-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--ui-hover), transparent);
    transition: left 0.5s ease;
  }

  .choice-button:hover::before {
    left: 100%;
  }

  .choice-button i {
    font-size: var(--font-lg);
    color: var(--ui-text-secondary);
    transition: color 0.2s;
  }

  .choice-button:hover:not(:disabled):not(.selected) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
    transform: translateY(-0.0625rem);
    box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.3);
  }

  .choice-button.selected {
    background: var(--ui-surface-highest);
    outline-color: var(--ui-border-strong);
  }

  .choice-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .state-reference {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-12);
  }

  .state-item {
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-12);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .state-label {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .state-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .state-details code {
    font-size: var(--font-xs);
    color: var(--ui-text-tertiary);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: var(--ui-font-mono);
  }
</style>
