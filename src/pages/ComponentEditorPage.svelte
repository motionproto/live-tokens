<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ComponentsTab from '../component-editor/scaffolding/ComponentsTab.svelte';
  import { navigate } from '../lib/router';

  let selectedComponent = 'standardButtons';

  // Demo page is statically imported from `./Demo.svelte` in App.svelte; the
  // glob resolves to an empty object if the file has been deleted, in which
  // case we hide the demo option from the page-switcher.
  const demoExists = Object.keys(import.meta.glob('./Demo.svelte')).length > 0;

  let pageMenuOpen = false;
  let pageMenuRoot: HTMLElement;

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
    if (e.key === 'Escape' && pageMenuOpen) {
      pageMenuOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleDocClick, true);
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
    window.removeEventListener('keydown', handleKeydown);
  });

  const componentNavItems = [
    { id: 'segmentedControl', label: 'Segmented Control', icon: 'fas fa-hand-pointer' },
    { id: 'standardButtons', label: 'Button', icon: 'fas fa-square' },
    { id: 'notifications', label: 'Notification', icon: 'fas fa-bell' },
    { id: 'dialog', label: 'Dialog', icon: 'fas fa-window-restore' },
    { id: 'radioButtons', label: 'Radio Button', icon: 'fas fa-dot-circle' },
    { id: 'cards', label: 'Card', icon: 'fas fa-id-card' },
    { id: 'traitBadges', label: 'Trait Badge', icon: 'fas fa-tag' },
    { id: 'image', label: 'Image', icon: 'fas fa-image' },
    { id: 'inlineEdit', label: 'Inline Edit Actions', icon: 'fas fa-pen' },
    { id: 'sectionDivider', label: 'Section Divider', icon: 'fas fa-minus' },
    { id: 'collapsible', label: 'Collapsible Section', icon: 'fas fa-chevron-down' },
    { id: 'tabBar', label: 'Tab Bar', icon: 'fas fa-columns' },
    { id: 'tooltip', label: 'Tooltip', icon: 'fas fa-comment-dots' },
    { id: 'progressBar', label: 'Progress Bar', icon: 'fas fa-tasks' }
  ];
</script>

<!--
  Site-level component editor page. Wrapped in .editor-page so the
  ComponentsTab scaffolding (labels, section wrappers) can resolve its
  --ui-* custom properties from ui/editor.css. The actual components inside
  still read the user's design tokens, so live edits in the overlay
  editor flow straight through to this page.
-->
<div class="editor-page components-shell">
  <nav class="sidebar">
    <div class="sidebar-header" bind:this={pageMenuRoot}>
      <button
        type="button"
        class="sidebar-header-btn"
        class:open={pageMenuOpen}
        aria-haspopup="menu"
        aria-expanded={pageMenuOpen}
        on:click={() => (pageMenuOpen = !pageMenuOpen)}
      >
        <span>Components</span>
        <i class="fas fa-chevron-down sidebar-header-chevron" class:open={pageMenuOpen}></i>
      </button>
      {#if pageMenuOpen}
        <div class="sidebar-header-menu" role="menu">
          <button
            class="sidebar-header-menu-item"
            role="menuitem"
            on:click={() => selectPage('/')}
          >
            <i class="fas fa-home"></i>
            <span>Main site</span>
          </button>
          {#if demoExists}
            <button
              class="sidebar-header-menu-item"
              role="menuitem"
              on:click={() => selectPage('/demo')}
            >
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
            on:click={() => selectedComponent = item.id}
          >
            <i class={item.icon}></i>
            <span>{item.label}</span>
          </button>
        {/if}
      {/each}
    </div>
  </nav>

  <main class="content">
    <ComponentsTab {selectedComponent} />
  </main>
</div>

<style>
  @import '../ui/editor.css';
  .components-shell {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    height: 100vh;
    width: 100%;
    background: black;
    overflow: hidden;
  }

  .sidebar {
    position: sticky;
    top: 0;
    max-height: 100vh;
    overflow-y: auto;
    background: black;
    border-right: 1px solid var(--ui-border-faint);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .sidebar-header {
    position: relative;
    padding: var(--ui-space-16) var(--ui-space-8) var(--ui-space-12);
    background: black;
  }

  .sidebar-header-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    text-align: left;
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .sidebar-header-btn:hover {
    background: var(--ui-hover);
  }

  .sidebar-header-btn.open {
    background: var(--ui-hover);
  }

  .sidebar-header-chevron {
    font-size: 0.7em;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
  }

  .sidebar-header-chevron.open {
    transform: rotate(180deg);
  }

  .sidebar-header-menu {
    position: absolute;
    top: calc(100% - var(--ui-space-4));
    left: var(--ui-space-8);
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

  .sidebar-header-menu-item {
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

  .sidebar-header-menu-item i {
    width: 1rem;
    text-align: center;
    opacity: 0.7;
  }

  .sidebar-header-menu-item:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: 0 var(--ui-space-8) var(--ui-space-16);
    background: black;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-12) var(--ui-space-6) var(--ui-space-16);
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    transition: all var(--ui-transition-fast);
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
    width: 1.25rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    opacity: 0.7;
  }

  .nav-divider-label {
    padding: var(--ui-space-12) var(--ui-space-12) var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .content {
    padding: 0 var(--ui-space-32);
    background: black;
    min-width: 0;
    max-height: 100vh;
    overflow-y: auto;
  }
</style>
