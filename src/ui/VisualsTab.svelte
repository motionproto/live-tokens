<script lang="ts">
  import VariablesTab from './VariablesTab.svelte';
  import ThemeFileManager from './ThemeFileManager.svelte';
  import { persistTheme, hydrateTheme } from '../lib/themeService';
  import { scrollSectionIntoView } from '../lib/scrollSection';
  import { editorState } from '../lib/editorStore';
  import { get } from 'svelte/store';

  const tokenNavItems = [
    { id: 'palette-editor', label: 'Palette Editor' },
    { id: 'spacing', label: 'Spacing & Borders' },
    { id: 'columns', label: 'Columns' },
    { id: 'border-radius', label: 'Border Radius' },
    { id: 'typography', label: 'Typography' },
    { id: 'icon-sizes', label: 'Icon Sizes' },
    { id: 'shadows', label: 'Shadows' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'gradients', label: 'Gradients' },
    { id: 'utility-tokens', label: 'Utility Tokens' }
  ];

  let selectedTokenSection: string | null = null;

  function scrollToSection(sectionId: string) {
    selectedTokenSection = sectionId;
    const el = document.getElementById(sectionId);
    if (el) scrollSectionIntoView(el);
  }

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  async function handleSave(e: CustomEvent<{ fileName: string; displayName: string }>) {
    const { fileName, displayName } = e.detail;
    saveStatus = 'saving';
    try {
      await persistTheme(get(editorState), fileName, displayName);
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
    }
  }

  async function handleLoad(e: CustomEvent<{ fileName: string }>) {
    try {
      await hydrateTheme(e.detail.fileName);
    } catch {
      // silent — the UI still shows current state
    }
  }
</script>

<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-header">Variables &amp; Tokens</div>

    <div class="nav-items">
      {#each tokenNavItems as item}
        <button
          class="nav-item"
          class:active={selectedTokenSection === item.id}
          on:click={() => scrollToSection(item.id)}
        >
          <span>{item.label}</span>
        </button>
      {/each}
    </div>

    <div class="sidebar-footer">
      <ThemeFileManager {saveStatus} on:save={handleSave} on:load={handleLoad} />
    </div>
  </nav>

  <main class="content">
    <VariablesTab />
  </main>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    min-height: 100vh;
    width: 100%;
    max-width: 1920px;
    box-sizing: border-box;
  }

  .sidebar {
    position: sticky;
    top: 0;
    height: calc(100vh - 52px);
    overflow: hidden;
    background: black;
    border-right: 1px solid var(--ui-border-faint);
    display: flex;
    z-index: 1;
    flex-direction: column;
    min-width: 0;
  }

  .sidebar-header {
    padding: var(--ui-space-16) var(--ui-space-16) var(--ui-space-12);
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: 0 var(--ui-space-8);
    flex-shrink: 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-12) var(--ui-space-6) var(--ui-space-24);
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

  .content {
    padding: var(--ui-space-24) var(--ui-space-32);
    overflow-y: auto;
    background: black;
    min-width: 0;
    isolation: isolate;
  }

  /* Narrow desktop: side-by-side windows, ~1280px and below */
  @media (max-width: 1280px) {
    .layout {
      grid-template-columns: 200px minmax(0, 1fr);
    }
    .content {
      padding: var(--ui-space-20) var(--ui-space-20);
    }
    .nav-item {
      padding: var(--ui-space-6) var(--ui-space-8) var(--ui-space-6) var(--ui-space-16);
    }
    .sidebar-header {
      padding: var(--ui-space-12) var(--ui-space-12) var(--ui-space-8);
    }
  }

  /* Tight desktop: very narrow, ~1024px and below */
  @media (max-width: 1024px) {
    .layout {
      grid-template-columns: 180px minmax(0, 1fr);
    }
    .content {
      padding: var(--ui-space-16) var(--ui-space-12);
    }
    .nav-item span {
      font-size: var(--ui-font-size-sm);
    }
  }

  .sidebar-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding: var(--ui-space-12) var(--ui-space-8) var(--ui-space-16);
    border-top: 1px solid var(--ui-border-faint);
  }
</style>
