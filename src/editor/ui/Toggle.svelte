<script lang="ts">
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    /** Put the label before the switch, for rows that align to a right edge. */
    labelFirst?: boolean;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    label = '',
    labelFirst = false,
    onchange,
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<label class="toggle" class:disabled class:label-first={labelFirst}>
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label || 'Toggle'}
    {disabled}
    class="toggle-track"
    class:on={checked}
    onclick={toggle}
  >
    <span class="toggle-thumb"></span>
  </button>
  {#if label}
    <span class="toggle-label">{label}</span>
  {/if}
</label>

<style lang="scss">
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    cursor: pointer;
    user-select: none;

    &.label-first {
      flex-direction: row-reverse;
    }

    &.disabled {
      cursor: not-allowed;

      .toggle-track {
        background: var(--ui-surface-lower);
        border-color: var(--ui-border-low);
      }

      .toggle-thumb {
        background: var(--ui-text-disabled);
      }

      .toggle-label {
        color: var(--ui-text-disabled);
      }
    }
  }

  .toggle-track {
    position: relative;
    width: 2.25rem;
    height: var(--ui-space-20);
    border-radius: var(--ui-radius-2xl);
    border: 1px solid var(--ui-border);
    background: var(--ui-surface-low);
    padding: 0;
    cursor: inherit;
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast);
    flex-shrink: 0;

    &.on {
      background: var(--ui-toggle);
      border-color: var(--ui-toggle);
    }

    &:hover:not(:disabled) {
      border-color: var(--ui-border-high);
    }

    &:focus-visible {
      outline: 2px solid var(--ui-text-primary);
      outline-offset: var(--ui-space-2);
    }
  }

  .toggle-thumb {
    position: absolute;
    top: var(--ui-space-2);
    left: var(--ui-space-2);
    width: 0.875rem;
    height: 0.875rem;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-secondary);
    transition: transform var(--ui-transition-fast), background var(--ui-transition-fast);

    .on & {
      transform: translateX(var(--ui-space-16));
      background: var(--ui-text-primary);
    }
  }

  .toggle-label {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    line-height: 1;
  }
</style>
