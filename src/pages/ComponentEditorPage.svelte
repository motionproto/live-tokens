<script lang="ts">
  import ComponentsTab from '../component-editor/scaffolding/ComponentsTab.svelte';

  let selectedComponent = 'standardButtons';

  const componentNavItems = [
    { id: 'segmentedControl', label: 'Segmented Control', icon: 'fas fa-hand-pointer' },
    { id: 'standardButtons', label: 'Button', icon: 'fas fa-square' },
    { id: 'notifications', label: 'Notification', icon: 'fas fa-bell' },
    { id: 'dialog', label: 'Dialog', icon: 'fas fa-window-restore' },
    { id: 'radioButtons', label: 'Radio Button', icon: 'fas fa-dot-circle' },
    { id: 'cards', label: 'Card', icon: 'fas fa-id-card' },
    { id: 'traitBadges', label: 'Trait Badge', icon: 'fas fa-tag' },
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
    <div class="sidebar-header">Components</div>
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
    padding: var(--ui-space-16) var(--ui-space-16) var(--ui-space-12);
    font-size: var(--ui-font-lg);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
    background: black;
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
    font-size: var(--ui-font-md);
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
    font-size: var(--ui-font-md);
    opacity: 0.7;
  }

  .nav-divider-label {
    padding: var(--ui-space-12) var(--ui-space-12) var(--ui-space-4);
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .content {
    padding: var(--ui-space-24) var(--ui-space-32);
    background: black;
    min-width: 0;
    max-width: 1280px;
    max-height: 100vh;
    overflow-y: auto;
  }
</style>
