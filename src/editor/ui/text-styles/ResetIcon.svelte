<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    /** Names the value in the button's accessible label. */
    label: string;
    visible: boolean;
    onreset: () => void;
  }

  let { label, visible, onreset }: Props = $props();

  // The icon leaves the DOM once its value resets, so focus moves to the
  // control it restored.
  async function reset(e: MouseEvent) {
    const scope = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-reset-scope]');
    onreset();
    await tick();
    scope?.querySelector<HTMLElement>('input, select, button:not(.reset)')?.focus();
  }
</script>

{#if visible}
  <button
    type="button"
    class="reset"
    aria-label="Reset {label} to default"
    title="Reset to default"
    onclick={reset}
  >
    <i class="fas fa-rotate-left" aria-hidden="true"></i>
  </button>
{/if}

<style>
  .reset {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-size: 0.6875rem;
    cursor: pointer;
  }

  .reset:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-higher);
  }

  .reset:focus-visible {
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 1px;
  }
</style>
