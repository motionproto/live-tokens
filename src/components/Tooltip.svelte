<script lang="ts">
  export let text: string = '';
  export let position: 'top' | 'bottom' = 'top';
</script>

<div class="tooltip-wrapper">
  <slot />
  {#if text}
    <div class="tooltip" class:bottom={position === 'bottom'}>
      {text}
    </div>
  {/if}
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-block;
  }

  .tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface-neutral-highest);
    color: var(--text-primary);
    padding: var(--space-6) var(--space-12);
    border-radius: var(--radius-md);
    font-size: var(--font-sm);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: var(--z-tooltip);
    box-shadow: var(--shadow-md);
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--surface-neutral-highest);
  }

  .tooltip.bottom {
    bottom: auto;
    top: calc(100% + 8px);
  }

  .tooltip.bottom::after {
    top: auto;
    bottom: 100%;
    border-top-color: transparent;
    border-bottom-color: var(--surface-neutral-highest);
  }

  .tooltip-wrapper:hover .tooltip {
    opacity: 1;
  }
</style>
