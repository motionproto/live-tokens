<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ComponentsTab from '../component-editor/scaffolding/ComponentsTab.svelte';
  import { navigate } from '../lib/router';
  import { componentRegistryEntries, validateRegistryAgainstServerScan } from '../component-editor/registry';
  import { listComponents } from '../lib/componentConfigService';

  let selectedComponent = 'button';
  let drawerOpen = false;

  // Demo page is statically imported from `./Demo.svelte` in App.svelte; the
  // glob resolves to an empty object if the file has been deleted, in which
  // case we hide the demo option from the page-switcher.
  const demoExists = Object.keys(import.meta.glob('./Demo.svelte')).length > 0;

  let pageMenuOpen = false;
  let pageMenuRoot: HTMLElement;

  const HINT_DELAY_MS = 80;
  let hintLabel: string | null = null;
  let hintTop = 0;
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  function showHint(label: string, target: HTMLElement) {
    if (drawerOpen) return;
    if (hintTimer) clearTimeout(hintTimer);
    const top = target.getBoundingClientRect().top + target.offsetHeight / 2;
    hintTimer = setTimeout(() => {
      hintLabel = label;
      hintTop = top;
    }, HINT_DELAY_MS);
  }

  function hideHint() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    hintLabel = null;
  }

  $: if (drawerOpen) hideHint();

  function selectComponent(id: string) {
    selectedComponent = id;
    hideHint();
  }

  function selectPage(path: string) {
    pageMenuOpen = false;
    navigate(path);
  }

  function handleDocClick(e: MouseEvent) {
    if (!pageMenuOpen) return;
    if (pageMenuRoot && !pageMenuRoot.contains(e.target as Node)) {
      pageMenuOpen = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (pageMenuOpen) pageMenuOpen = false;
      else if (drawerOpen) drawerOpen = false;
    }
  }

  onMount(async () => {
    document.addEventListener('click', handleDocClick, true);
    window.addEventListener('keydown', handleKeydown);
    try {
      const summaries = await listComponents();
      validateRegistryAgainstServerScan(summaries.map((s) => s.name));
    } catch {
      // Server unreachable — registry's eager schema registration still works
      // for the editor; validation just gets skipped this boot.
    }
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
    window.removeEventListener('keydown', handleKeydown);
  });

  const componentNavItems = componentRegistryEntries.map(({ id, label, icon }) => ({ id, label, icon }));
</script>

<!--
  Site-level component editor page. Wrapped in .editor-page so the
  ComponentsTab scaffolding (labels, section wrappers) can resolve its
  --ui-* custom properties from ui/editor.css. The actual components inside
  still read the user's design tokens, so live edits in the overlay
  editor flow straight through to this page.
-->
<div class="editor-page components-shell" class:rail-expanded={drawerOpen}>
  <nav class="sidebar rail" class:expanded={drawerOpen}>
    <div class="rail-header" bind:this={pageMenuRoot}>
      <button
        type="button"
        class="rail-toggle"
        aria-label={drawerOpen ? 'Collapse components menu' : 'Expand components menu'}
        aria-expanded={drawerOpen}
        on:click={() => (drawerOpen = !drawerOpen)}
      >
        <i class="fas {drawerOpen ? 'fa-arrow-left' : 'fa-arrow-right'}"></i>
      </button>
      <button
        type="button"
        class="page-menu-trigger"
        class:open={pageMenuOpen}
        aria-haspopup="menu"
        aria-expanded={pageMenuOpen}
        tabindex={drawerOpen ? 0 : -1}
        on:click={() => drawerOpen && (pageMenuOpen = !pageMenuOpen)}
      >
        <span class="rail-label">Components</span>
        <i class="fas fa-chevron-down rail-chevron" class:open={pageMenuOpen}></i>
      </button>
      {#if pageMenuOpen && drawerOpen}
        <div class="page-menu" role="menu">
          <button class="page-menu-item" role="menuitem" on:click={() => selectPage('/')}>
            <i class="fas fa-home"></i>
            <span>Main site</span>
          </button>
          {#if demoExists}
            <button class="page-menu-item" role="menuitem" on:click={() => selectPage('/demo')}>
              <i class="fas fa-box-open"></i>
              <span>Demo page</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
    <div class="nav-items">
      {#each componentNavItems as item}
        {#if item.id.startsWith('divider-')}
          <div class="nav-divider-label"><span>{item.label}</span></div>
        {:else}
          <button
            class="nav-item"
            class:active={selectedComponent === item.id}
            on:mouseenter={(e) => showHint(item.label, e.currentTarget)}
            on:mouseleave={hideHint}
            on:click={() => selectComponent(item.id)}
          >
            <i class={item.icon}></i>
            <span class="rail-label">{item.label}</span>
          </button>
        {/if}
      {/each}
    </div>
  </nav>

  <main class="content">
    <ComponentsTab {selectedComponent} />
  </main>

  {#if hintLabel !== null && !drawerOpen}
    <div class="rail-hint" style="top: {hintTop}px">{hintLabel}</div>
  {/if}
</div>

<style>
  @import '../ui/editor.css';
  .components-shell {
    --rail-w: 48px;
    display: grid;
    grid-template-columns: var(--rail-w) minmax(0, 1fr);
    height: 100vh;
    width: 100%;
    background: black;
    overflow: hidden;
    transition: grid-template-columns 220ms ease;
  }

  .components-shell.rail-expanded {
    --rail-w: 240px;
  }

  .sidebar.rail {
    position: relative;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: black;
    border-right: 1px solid var(--ui-border-faint);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rail-header {
    position: relative;
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    padding: var(--ui-space-12) 0 var(--ui-space-12) 0;
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .rail-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .rail-toggle:hover {
    background: var(--ui-hover);
  }

  .page-menu-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    height: 36px;
    padding: 0 var(--ui-space-10) 0 0;
    background: none;
    border: none;
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    text-align: left;
    cursor: pointer;
    transition: opacity 180ms ease;
    opacity: 0;
    pointer-events: none;
  }

  .components-shell.rail-expanded .page-menu-trigger {
    opacity: 1;
    pointer-events: auto;
  }

  .rail-chevron {
    font-size: 0.7em;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
  }

  .rail-chevron.open {
    transform: rotate(180deg);
  }

  .rail-label {
    white-space: nowrap;
    overflow: hidden;
    opacity: 0;
    transition: opacity 180ms ease;
  }

  .components-shell.rail-expanded .rail-label {
    opacity: 1;
  }

  .page-menu {
    position: absolute;
    top: calc(100% - var(--ui-space-2));
    left: 48px;
    right: var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 10;
  }

  .page-menu-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    text-align: left;
    cursor: pointer;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .page-menu-item i {
    width: 1rem;
    text-align: center;
    opacity: 0.7;
  }

  .page-menu-item:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: 0 0 var(--ui-space-16);
    background: black;
  }

  .nav-item {
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    width: 100%;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 0;
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition: color 60ms ease, background 60ms ease;
  }

  .nav-item:hover {
    color: var(--ui-text-secondary);
    background: var(--ui-hover);
  }

  .nav-item.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
  }

  .nav-item i {
    justify-self: center;
    width: 1.25rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    opacity: 0.85;
  }

  .nav-divider-label {
    padding: var(--ui-space-12) var(--ui-space-12) var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    opacity: 0;
    transition: opacity 180ms ease;
  }

  .components-shell.rail-expanded .nav-divider-label {
    opacity: 1;
  }

  .content {
    padding: 0 var(--ui-space-32);
    background: black;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .rail-hint {
    position: fixed;
    left: calc(var(--rail-w) + var(--ui-space-6));
    transform: translateY(-50%);
    z-index: 50;
    padding: var(--ui-space-4) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
</style>
