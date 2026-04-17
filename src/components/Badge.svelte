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
    color: var(--badge-info-text);
    background: var(--badge-info-surface);
    border: 1px solid var(--badge-info-border);
    border-radius: var(--badge-info-radius);
    box-shadow: var(--shadow-sm);
  }


  /* Accent */
  .badge-accent {
    color: var(--badge-accent-text);
    background: var(--badge-accent-surface);
    border: 1px solid var(--badge-accent-border);
    border-radius: var(--badge-accent-radius);
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
    color: var(--badge-trait-text);
    background: var(--badge-trait-surface);
    border: 1px solid var(--badge-trait-border);
    border-radius: var(--badge-trait-radius);
    text-transform: capitalize;
  }
</style>
