<script lang="ts">
  import { onMount } from 'svelte';
  import VisualsTab from '../ui/VisualsTab.svelte';
  import UICopyPopover from '../ui/UICopyPopover.svelte';
  import { installEditorKeybindings } from '../lib/editorKeybindings';
  import { initializeEditorStore } from '../lib/editorStore';

  const inOverlay = typeof window !== 'undefined' && window.parent !== window;

  // Where "Back to site" sends the user. Prefer the previous non-editor entry
  // from session history; fall back to /demo and finally /.
  const backHref = pickBackHref();

  function pickBackHref(): string {
    try {
      const prev = sessionStorage.getItem('lt-prev-route');
      if (prev && prev !== '/editor') return prev;
    } catch {
      // ignore
    }
    return '/demo';
  }

  onMount(() => {
    initializeEditorStore();
    return installEditorKeybindings();
  });
</script>

<div class="editor-page">
  {#if !inOverlay}
    <div class="editor-bar">
      <div class="bar-left">
        <a href={backHref} class="back-link">
          <i class="fas fa-arrow-left"></i>
          <span>Back to site</span>
        </a>
        <span class="editor-label">Token Editor</span>
      </div>

      <div class="bar-right"></div>
    </div>
  {/if}

  <VisualsTab />
  <UICopyPopover />
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
    font-size: var(--ui-font-size-md);
    transition: color var(--ui-transition-fast);
  }

  .back-link:hover {
    color: var(--ui-text-primary);
  }

  .editor-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  @media (max-width: 1100px) {
    .editor-label {
      display: none;
    }
  }
</style>
