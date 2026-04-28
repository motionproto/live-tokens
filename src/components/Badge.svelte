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
  :global(:root) {
    /* Info */
    --badge-info-surface: var(--surface-neutral-higher);
    --badge-info-text: var(--text-primary);
    --badge-info-border: var(--border-neutral-default);
    --badge-info-radius: var(--radius-full);

    /* Accent */
    --badge-accent-surface: var(--surface-neutral-higher);
    --badge-accent-text: var(--color-accent-300);
    --badge-accent-border: var(--border-accent);
    --badge-accent-radius: var(--radius-full);

    /* Trait */
    --badge-trait-surface: var(--surface-primary-high);
    --badge-trait-text: var(--text-primary);
    --badge-trait-border: var(--border-primary-strong);
    --badge-trait-radius: var(--radius-full);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    font-size: var(--font-size-sm);
    line-height: 1;
    padding: var(--space-6) var(--space-12);
    border-radius: var(--radius-full);
    font-family: var(--font-sans);
    font-weight: var(--font-weight-light);
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
    font-size: var(--font-size-xs);
    padding: var(--space-6) var(--space-12);
    gap: var(--space-4);
  }

  /* Info (default) */
  .badge-info {
    color: var(--badge-info-text);
    background: var(--badge-info-surface);
    border: var(--border-width-thin) solid var(--badge-info-border);
    border-radius: var(--badge-info-radius);
    box-shadow: var(--shadow-sm);
  }


  /* Accent */
  .badge-accent {
    color: var(--badge-accent-text);
    background: var(--badge-accent-surface);
    border: var(--border-width-thin) solid var(--badge-accent-border);
    border-radius: var(--badge-accent-radius);
    box-shadow: var(--shadow-sm);
    text-transform: capitalize;
  }


  /* Hero */
  .badge-hero {
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    border: var(--border-width-thin) solid rgba(255, 255, 255, 0.12);
    font-weight: var(--font-weight-normal);
    letter-spacing: 0.02em;
  }

  /* Trait */
  .badge-trait {
    color: var(--badge-trait-text);
    background: var(--badge-trait-surface);
    border: var(--border-width-thin) solid var(--badge-trait-border);
    border-radius: var(--badge-trait-radius);
    text-transform: capitalize;
  }
</style>
