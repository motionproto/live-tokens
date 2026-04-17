<script lang="ts">
  export let icon: string;
  export let selected: boolean = false;
  export let disabled: boolean = false;
  export let forceHover: boolean = false;
</script>

<button
  class="choice-button"
  class:force-hover={forceHover}
  class:selected
  {disabled}
  on:click
>
  <i class={icon}></i>
  <span><slot /></span>
</button>

<style>
  :global(:root) {
    /* Default */
    --choice-default-bg: var(--surface-neutral-high);
    --choice-default-text: var(--text-primary);
    --choice-default-icon: var(--text-secondary);
    --choice-default-border: var(--border-neutral-default);
    --choice-default-radius: var(--radius-lg);

    /* Hover */
    --choice-hover-bg: var(--surface-neutral-higher);
    --choice-hover-text: var(--text-primary);
    --choice-hover-icon: var(--text-secondary);
    --choice-hover-border: var(--border-neutral-strong);
    --choice-hover-radius: var(--radius-lg);

    /* Selected */
    --choice-selected-bg: var(--surface-success-high);
    --choice-selected-text: var(--text-primary);
    --choice-selected-icon: var(--text-secondary);
    --choice-selected-border: var(--border-success);
    --choice-selected-radius: var(--radius-lg);

    /* Disabled */
    --choice-disabled-bg: var(--surface-neutral-high);
    --choice-disabled-text: var(--text-tertiary);
    --choice-disabled-icon: var(--text-tertiary);
    --choice-disabled-border: var(--border-neutral-faint);
    --choice-disabled-radius: var(--radius-lg);
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
