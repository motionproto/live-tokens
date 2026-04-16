<script lang="ts">
  export let variant: 'info' | 'accent' | 'trait' | 'hero' = 'info';
  export let size: 'default' | 'small' = 'default';
  export let icon: string | undefined = undefined;
</script>

<span class="badge badge-{variant}" class:badge-small={size === 'small'}>
  {#if icon}
    <span class="icon"><i class={icon}></i></span>
  {:else}
    <span class="icon"><slot name="icon" /></span>
  {/if}
  <slot />
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    font-size: var(--font-sm);
    line-height: 1;
    padding: var(--space-6) var(--space-12);
    border-radius: var(--radius-full);
    font-family: var(--font-sans);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    font-size: 1em;
  }

  .icon:empty {
    display: none;
  }

  .badge-small {
    font-size: var(--font-xs);
    padding: var(--space-6) var(--space-12);
    gap: var(--space-4);
  }

  /* Info (default) */
  .badge-info {
    color: var(--text-primary);
    background: var(--surface-neutral-higher);
    border: 1px solid var(--border-neutral-default);
    box-shadow: var(--shadow-sm);
  }


  /* Accent */
  .badge-accent {
    color: var(--color-accent-300);
    background: var(--surface-neutral-higher);
    border: 1px solid var(--border-accent);
    box-shadow: var(--shadow-sm);
    text-transform: capitalize;
  }


  /* Hero */
  .badge-hero {
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.02em;
  }

  /* Trait */
  .badge-trait {
    color: var(--text-primary);
    background: var(--surface-primary-high);
    border: 1px solid var(--border-primary-strong);
    text-transform: capitalize;
  }
</style>
