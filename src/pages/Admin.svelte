<script lang="ts">
  import VisualsTab from '../showcase/VisualsTab.svelte';

  const inOverlay = typeof window !== 'undefined' && window.parent !== window;

  function closeOverlay() {
    try {
      window.parent.postMessage({ type: 'rg-overlay-close' }, window.location.origin);
    } catch {
      // cross-origin parent — shouldn't happen, but fall back to a noop
    }
  }
</script>

<div class="admin-page">
  <div class="admin-bar">
    <div class="bar-left">
      {#if inOverlay}
        <button class="back-link as-button" on:click={closeOverlay}>
          <i class="fas fa-times"></i>
          <span>Close</span>
        </button>
      {:else}
        <a href="/" class="back-link">
          <i class="fas fa-arrow-left"></i>
          <span>Back to site</span>
        </a>
      {/if}
      <span class="admin-label">Design System</span>
    </div>

    <div class="bar-right"></div>
  </div>

  <VisualsTab />
</div>

<style>
  @import '../showcase/editor.css';

  .admin-page {
    min-height: 100vh;
    background: black;
  }

  .admin-bar {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    padding: var(--space-10) var(--space-16);
    background: black;
    border-bottom: 1px solid var(--ui-border-faint);
    min-height: 52px;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    min-width: 0;
  }

  .bar-right {
    /* Reserved for future right-aligned controls; keeps grid balanced. */
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    color: var(--ui-text-tertiary);
    text-decoration: none;
    font-size: var(--font-md);
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--ui-text-primary);
  }

  .back-link.as-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
  }

  .admin-label {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  @media (max-width: 1100px) {
    .admin-label {
      display: none;
    }
  }
</style>
