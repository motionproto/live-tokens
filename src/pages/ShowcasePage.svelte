<script lang="ts">
  import ComponentsTab from '../showcase/ComponentsTab.svelte';

  let selectedComponent = 'standardButtons';

  const componentNavItems = [
    { id: 'choiceButtons', label: 'Choice Sets', icon: 'fas fa-hand-pointer' },
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
  Site-level Components showcase page. Wrapped in .admin-page so the
  ComponentsTab demo chrome (labels, section wrappers) can resolve its
  --ui-* custom properties from editor.css. The actual components inside
  still read the user's design tokens, so live edits in the overlay
  editor flow straight through to this page.
-->
<div class="admin-page components-shell">
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
  @import '../showcase/editor.css';
  @import '../styles/variables.css';

  .components-shell {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    min-height: 100vh;
    width: 100%;
    background: black;
  }

  .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: black;
    border-right: 1px solid var(--ui-border-faint);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .sidebar-header {
    padding: var(--space-16) var(--space-16) var(--space-12);
    font-size: var(--font-lg);
    font-weight: var(--font-weight-bold);
    color: var(--ui-text-primary);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 var(--space-8) var(--space-16);
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    width: 100%;
    padding: var(--space-6) var(--space-12) var(--space-6) var(--space-16);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--ui-text-tertiary);
    font-size: var(--font-md);
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-fast);
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
    font-size: var(--font-md);
    opacity: 0.7;
  }

  .nav-divider-label {
    padding: var(--space-12) var(--space-12) var(--space-4);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .content {
    padding: var(--space-24) var(--space-32);
    overflow-y: auto;
    background: black;
    min-width: 0;
    max-width: 1280px;
  }
</style>
