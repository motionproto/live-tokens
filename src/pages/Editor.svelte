<script lang="ts">
  import { onMount } from 'svelte';
  import VisualsTab from '../ui/VisualsTab.svelte';
  import { installEditorKeybindings } from '../lib/editorKeybindings';
  import { initializeEditorStore } from '../lib/editorStore';

  const inOverlay = typeof window !== 'undefined' && window.parent !== window;

  // Where "Back to site" sends the user. Prefer the previous non-editor entry
  // from session history; fall back to /kit (the starter demo) and finally /.
  const backHref = pickBackHref();

  function pickBackHref(): string {
    try {
      const prev = sessionStorage.getItem('lt-prev-route');
      if (prev && prev !== '/editor') return prev;
    } catch {
      // ignore
    }
    return '/kit';
  }

  onMount(() => {
    initializeEditorStore();
    return installEditorKeybindings();
  });

  function closeOverlay() {
    try {
      window.parent.postMessage({ type: 'lt-overlay-close' }, window.location.origin);
    } catch {
      // cross-origin parent — shouldn't happen, but fall back to a noop
    }
  }
</script>

<div class="editor-page">
  <div class="editor-bar">
    <div class="bar-left">
      {#if inOverlay}
        <button class="back-link as-button" on:click={closeOverlay}>
          <i class="fas fa-times"></i>
          <span>Close</span>
        </button>
      {:else}
        <a href={backHref} class="back-link">
          <i class="fas fa-arrow-left"></i>
          <span>Back to site</span>
        </a>
      {/if}
      <span class="editor-label">Design System</span>
    </div>

    <div class="bar-right"></div>
  </div>

  <VisualsTab />
</div>

<style>
  @import '../ui/editor.css';

  .editor-page {
    min-height: 100vh;
    background: black;
  }

  .editor-bar {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    padding: var(--ui-space-10) var(--ui-space-16);
    background: black;
    border-bottom: 1px solid var(--ui-border-faint);
    min-height: 52px;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    min-width: 0;
  }

  .bar-right {
    /* Reserved for future right-aligned controls; keeps grid balanced. */
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    color: var(--ui-text-tertiary);
    text-decoration: none;
    font-size: var(--ui-font-md);
    transition: color var(--ui-transition-fast);
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

  .editor-label {
    font-size: var(--ui-font-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  @media (max-width: 1100px) {
    .editor-label {
      display: none;
    }
  }
</style>
