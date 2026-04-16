<script lang="ts">
  export let backHref: string = '/';
  export let backLabel: string = 'All Modules';
</script>

<nav class="detail-nav">
  <div class="nav-left">
    <a href={backHref} class="back-link">
      <i class="fa-solid fa-arrow-left"></i>
      <span>{backLabel}</span>
    </a>
  </div>

  {#if $$slots.default}
    <div class="nav-right">
      <slot />
    </div>
  {/if}
</nav>

<style lang="scss">
  .detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    position: sticky;
    top: 96px;
    z-index: 50;
    background: var(--empty);
    padding: 12px 0;
  }

  .nav-left {
    flex-shrink: 0;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-sans);
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    text-decoration: none;
    transition: color var(--transition-fast);
    letter-spacing: 0.02em;

    &:hover {
      color: var(--text-primary-color);
    }

    :global(i) {
      font-size: 11px;
      transition: transform var(--transition-fast);
    }

    &:hover :global(i) {
      transform: translateX(-3px);
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    .detail-nav {
      top: 48px;
    }
  }
</style>
