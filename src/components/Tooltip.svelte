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
  :global(:root) {
    --tooltip-surface: var(--surface-neutral-highest);
    --tooltip-text: var(--text-primary);
    --tooltip-text-font-family: var(--font-sans);
    --tooltip-text-font-size: var(--font-size-sm);
    --tooltip-text-font-weight: var(--font-weight-normal);
    --tooltip-text-line-height: var(--line-height-normal);
    --tooltip-border: var(--border-neutral);
    --tooltip-border-width: var(--border-width-none);
    --tooltip-radius: var(--radius-md);
    --tooltip-padding: var(--space-6);
    --tooltip-shadow: var(--shadow-md);
  }

  .tooltip-wrapper {
    position: relative;
    display: inline-block;
  }

  .tooltip {
    position: absolute;
    bottom: calc(100% + var(--space-8));
    left: 50%;
    transform: translateX(-50%);
    background: var(--tooltip-surface);
    color: var(--tooltip-text);
    padding: var(--tooltip-padding) calc(var(--tooltip-padding) * 2);
    border: var(--tooltip-border-width) solid var(--tooltip-border);
    border-radius: var(--tooltip-radius);
    font-family: var(--tooltip-text-font-family);
    font-size: var(--tooltip-text-font-size);
    font-weight: var(--tooltip-text-font-weight);
    line-height: var(--tooltip-text-line-height);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: var(--z-tooltip);
    box-shadow: var(--tooltip-shadow);
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 5px;
    background: var(--tooltip-surface);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .tooltip.bottom {
    bottom: auto;
    top: calc(100% + var(--space-8));
  }

  .tooltip.bottom::after {
    top: auto;
    bottom: 100%;
    clip-path: polygon(50% 0, 0 100%, 100% 100%);
  }

  .tooltip-wrapper:hover .tooltip {
    opacity: 1;
  }
</style>
