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
    --badge-info-text-font-family: var(--font-sans);
    --badge-info-text-font-size: var(--font-size-sm);
    --badge-info-text-font-weight: var(--font-weight-light);
    --badge-info-text-line-height: var(--line-height-tight);
    --badge-info-border: var(--border-neutral-default);
    --badge-info-border-width: var(--border-width-thin);
    --badge-info-radius: var(--radius-full);
    --badge-info-padding: var(--space-6);
    --badge-info-shadow: var(--shadow-sm);

    /* Accent */
    --badge-accent-surface: var(--surface-neutral-higher);
    --badge-accent-text: var(--color-accent-300);
    --badge-accent-text-font-family: var(--font-sans);
    --badge-accent-text-font-size: var(--font-size-sm);
    --badge-accent-text-font-weight: var(--font-weight-light);
    --badge-accent-text-line-height: var(--line-height-tight);
    --badge-accent-border: var(--border-accent);
    --badge-accent-border-width: var(--border-width-thin);
    --badge-accent-radius: var(--radius-full);
    --badge-accent-padding: var(--space-6);
    --badge-accent-shadow: var(--shadow-sm);

    /* Trait */
    --badge-trait-surface: var(--surface-primary-high);
    --badge-trait-text: var(--text-primary);
    --badge-trait-text-font-family: var(--font-sans);
    --badge-trait-text-font-size: var(--font-size-sm);
    --badge-trait-text-font-weight: var(--font-weight-light);
    --badge-trait-text-line-height: var(--line-height-tight);
    --badge-trait-border: var(--border-primary-strong);
    --badge-trait-border-width: var(--border-width-thin);
    --badge-trait-radius: var(--radius-full);
    --badge-trait-padding: var(--space-6);
    --badge-trait-shadow: var(--shadow-sm);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    line-height: var(--line-height-tight);
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
    gap: var(--space-4);
  }

  /* Info (default) */
  .badge-info {
    color: var(--badge-info-text);
    background: var(--badge-info-surface);
    border: var(--badge-info-border-width) solid var(--badge-info-border);
    border-radius: var(--badge-info-radius);
    padding: var(--badge-info-padding) calc(var(--badge-info-padding) * 2);
    font-family: var(--badge-info-text-font-family);
    font-size: var(--badge-info-text-font-size);
    font-weight: var(--badge-info-text-font-weight);
    line-height: var(--badge-info-text-line-height);
    box-shadow: var(--badge-info-shadow);
  }


  /* Accent */
  .badge-accent {
    color: var(--badge-accent-text);
    background: var(--badge-accent-surface);
    border: var(--badge-accent-border-width) solid var(--badge-accent-border);
    border-radius: var(--badge-accent-radius);
    padding: var(--badge-accent-padding) calc(var(--badge-accent-padding) * 2);
    font-family: var(--badge-accent-text-font-family);
    font-size: var(--badge-accent-text-font-size);
    font-weight: var(--badge-accent-text-font-weight);
    line-height: var(--badge-accent-text-line-height);
    box-shadow: var(--badge-accent-shadow);
    text-transform: capitalize;
  }


  /* Hero */
  .badge-hero {
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    border: var(--border-width-thin) solid rgba(255, 255, 255, 0.12);
    padding: var(--space-6) var(--space-12);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-normal);
    letter-spacing: 0.02em;
  }

  /* Trait */
  .badge-trait {
    color: var(--badge-trait-text);
    background: var(--badge-trait-surface);
    border: var(--badge-trait-border-width) solid var(--badge-trait-border);
    border-radius: var(--badge-trait-radius);
    padding: var(--badge-trait-padding) calc(var(--badge-trait-padding) * 2);
    font-family: var(--badge-trait-text-font-family);
    font-size: var(--badge-trait-text-font-size);
    font-weight: var(--badge-trait-text-font-weight);
    line-height: var(--badge-trait-text-line-height);
    box-shadow: var(--badge-trait-shadow);
    text-transform: capitalize;
  }
</style>
