<script lang="ts">
  /** Section that gathers render-time toggles a component accepts as props
      (e.g. dismissible, action buttons, hover shimmer, show icons). */
</script>

<section class="config-block">
  <header class="config-header">
    <h3 class="config-title">Configuration</h3>
    <p class="config-description">Component accepts multiple properties that can change its layout. Use these to preview.</p>
  </header>
  <div class="config-controls">
    <slot />
  </div>
</section>

<style>
  .config-block {
    margin-top: var(--ui-space-12);
    padding: var(--ui-space-12);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-low);
  }

  .config-header {
    margin-bottom: var(--ui-space-12);
  }

  .config-title {
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  .config-description {
    margin: var(--ui-space-2) 0 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .config-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: center;
  }

  .config-controls :global(label) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
