<script lang="ts">
  import { onMount } from 'svelte';
  import ColorsTab from '../ui/colors/ColorsTab.svelte';
  import UICopyPopover from '../ui/UICopyPopover.svelte';
  import { installEditorKeybindings } from '../core/store/editorKeybindings';
  import { initializeEditorStore } from '../core/store/editorStore';
  import { storageKey } from '../core/store/editorConfig';
  import { DEFAULT_COLORS_PATH } from '../core/routing/ownedRoutes';
  // Editor chrome + form controls + icon font must be JS imports (not @import
  // inside the style block) so Vite resolves them via the module graph
  // regardless of how the consumer compiles Svelte CSS (external ?lang.css vs
  // injected); otherwise the @import URLs leak to the browser and 404 against
  // the consumer's root.
  import '../styles/ui-editor.css';
  import '../styles/ui-form-controls.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';

  // Where "Back to site" sends the user. Prefer the previous non-colors entry
  // from session history; fall back to home.
  const backHref = pickBackHref();

  function pickBackHref(): string {
    try {
      const prev = sessionStorage.getItem(storageKey('prev-route'));
      if (prev && prev !== DEFAULT_COLORS_PATH) return prev;
    } catch {
      // ignore
    }
    return '/';
  }

  onMount(() => {
    initializeEditorStore();
    return installEditorKeybindings();
  });
</script>

<!-- .editor-page scopes the --ui-* token definitions from ui-editor.css. -->
<div class="editor-page colors-page">
  <div class="page-bar">
    <div class="bar-left">
      <a href={backHref} class="back-link">
        <i class="fas fa-arrow-left"></i>
        <span>Back to site</span>
      </a>
      <span class="page-label">Colors</span>
    </div>
  </div>

  <main class="content">
    <ColorsTab />
  </main>
  <UICopyPopover />
</div>

<style>
  .colors-page {
    min-height: 100vh;
    background: black;
  }

  .page-bar {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    padding: var(--ui-space-10) var(--ui-space-16);
    background: black;
    border-bottom: 1px solid var(--ui-border-low);
    min-height: 52px;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    min-width: 0;
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

  .page-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .content {
    max-width: 1680px;
    margin: 0 auto;
    padding: var(--ui-space-24) var(--ui-space-32);
    isolation: isolate;
  }

  @media (max-width: 1280px) {
    .content {
      padding: var(--ui-space-20) var(--ui-space-20);
    }
  }

  @media (max-width: 1024px) {
    .content {
      padding: var(--ui-space-16) var(--ui-space-12);
    }
  }
</style>
