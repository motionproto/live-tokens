<script lang="ts">
  import { tick } from 'svelte';
  import VariablesTab from './VariablesTab.svelte';
  import TokenFileManager from './TokenFileManager.svelte';
  import type { TokenFile } from '../lib/tokenTypes';
  import {
    saveTokenFile,
    loadTokenFile,
    setActiveFile,
    scrapeCssVariables,
    clearAllCssVarOverrides,
    applyCssVariables,
  } from '../lib/tokenService';
  import { editorConfigs, activeFileName, configsLoadedFromFile } from '../lib/editorConfigStore';
  import { get } from 'svelte/store';

  const tokenNavItems = [
    { id: 'palette-editor', label: 'Palette Editor' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'columns', label: 'Columns' },
    { id: 'border-radius', label: 'Border Radius' },
    { id: 'typography', label: 'Typography' },
    { id: 'shadows', label: 'Shadows' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'gradients', label: 'Gradients' },
    { id: 'utility-tokens', label: 'Utility Tokens' }
  ];

  let selectedTokenSection: string | null = null;

  function scrollToSection(sectionId: string) {
    selectedTokenSection = sectionId;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  let saveSignal = 0;
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  async function handleSave(e: CustomEvent<{ fileName: string; displayName: string }>) {
    const { fileName, displayName } = e.detail;
    if (!get(configsLoadedFromFile)) {
      saveStatus = 'error';
      console.warn('Save blocked: editor configs were not loaded from a token file.');
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
      return;
    }
    saveStatus = 'saving';
    try {
      // Flush pending Svelte reactive updates so inline CSS vars are current
      await tick();
      const cssVariables = scrapeCssVariables();
      const configs = get(editorConfigs);
      const now = new Date().toISOString();
      const tokenFile: TokenFile = {
        name: displayName,
        createdAt: now,
        updatedAt: now,
        editorConfigs: configs,
        cssVariables,
      };
      await saveTokenFile(fileName, tokenFile);
      await setActiveFile(fileName);
      $activeFileName = fileName;
      // Also trigger localStorage save in all PaletteEditors
      saveSignal++;
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
    }
  }

  let variablesTab: VariablesTab;

  async function handleLoad(e: CustomEvent<{ fileName: string }>) {
    const { fileName } = e.detail;
    try {
      const tokenFile = await loadTokenFile(fileName);
      // Clear current inline CSS vars so stale values don't linger
      clearAllCssVarOverrides();
      // Immediately apply the file's pre-computed CSS variables so the site
      // updates in one shot (shadows, overlays, and all palette vars).
      if (tokenFile.cssVariables && Object.keys(tokenFile.cssVariables).length > 0) {
        applyCssVariables(tokenFile.cssVariables);
      }
      // Directly push configs to each PaletteEditor via method call
      if (tokenFile.editorConfigs && Object.keys(tokenFile.editorConfigs).length > 0) {
        variablesTab.loadAllConfigs(tokenFile.editorConfigs);
        configsLoadedFromFile.set(true);
      }
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
      <TokenFileManager {saveStatus} on:save={handleSave} on:load={handleLoad} />
    </div>
  </nav>

  <main class="content">
    <VariablesTab bind:this={variablesTab} {saveSignal} />
  </main>
</div>

<style>
  @import '../styles/variables.css';

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
    padding: var(--space-16) var(--space-16) var(--space-12);
    font-size: var(--font-lg);
    font-weight: var(--font-weight-bold);
    color: var(--ui-text-primary);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 var(--space-8);
    flex-shrink: 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    width: 100%;
    padding: var(--space-6) var(--space-12) var(--space-6) var(--space-24);
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

  .content {
    padding: var(--space-24) var(--space-32);
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
      padding: var(--space-20) var(--space-20);
    }
    .nav-item {
      padding: var(--space-6) var(--space-8) var(--space-6) var(--space-16);
    }
    .sidebar-header {
      padding: var(--space-12) var(--space-12) var(--space-8);
    }
  }

  /* Tight desktop: very narrow, ~1024px and below */
  @media (max-width: 1024px) {
    .layout {
      grid-template-columns: 180px minmax(0, 1fr);
    }
    .content {
      padding: var(--space-16) var(--space-12);
    }
    .nav-item span {
      font-size: var(--font-sm);
    }
  }

  .sidebar-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding: var(--space-12) var(--space-8) var(--space-16);
    border-top: 1px solid var(--ui-border-faint);
  }
</style>
