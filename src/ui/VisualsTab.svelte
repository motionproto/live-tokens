<script lang="ts">
  import { tick } from 'svelte';
  import VariablesTab from './VariablesTab.svelte';
  import ThemeFileManager from './ThemeFileManager.svelte';
  import {
    saveTheme,
    loadTheme,
    setActiveFile,
    scrapeCssVariables,
    clearAllCssVarOverrides,
    applyCssVariables,
  } from '../lib/themeService';
  import { activeFileName } from '../lib/editorConfigStore';
  import { applyFontSources, applyFontStacks } from '../lib/fontLoader';
  import { migrateThemeFonts } from '../lib/fontMigration';
  import { scrollSectionIntoView } from '../lib/scrollSection';
  import {
    editorState,
    loadFromFile as loadEditorState,
    toTheme,
    markSaved,
    DOMAIN_VAR_NAMES,
  } from '../lib/editorStore';
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
    const el = document.getElementById(sectionId);
    if (el) scrollSectionIntoView(el);
  }

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  async function handleSave(e: CustomEvent<{ fileName: string; displayName: string }>) {
    const { fileName, displayName } = e.detail;
    saveStatus = 'saving';
    try {
      // Flush pending Svelte reactive updates so inline CSS vars are current
      await tick();
      const state = get(editorState);
      const theme = toTheme(state, { name: displayName });
      // PaletteEditor still writes its ramp/semantic vars directly to the DOM
      // (derivation has not yet moved into the store). Fold those in by
      // scraping inline overrides, dropping font vars (owned by fontStacks)
      // and any domain-owned keys (the store emitters win for those).
      const scraped = scrapeCssVariables();
      for (const k of ['--font-display', '--font-sans', '--font-serif', '--font-mono']) delete scraped[k];
      for (const k of DOMAIN_VAR_NAMES) delete scraped[k];
      theme.cssVariables = { ...scraped, ...theme.cssVariables };
      await saveTheme(fileName, theme);
      await setActiveFile(fileName);
      $activeFileName = fileName;
      markSaved();
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
    }
  }

  async function handleLoad(e: CustomEvent<{ fileName: string }>) {
    const { fileName } = e.detail;
    try {
      const theme = await loadTheme(fileName);
      migrateThemeFonts(theme);
      // Clear current inline CSS vars so stale values don't linger
      clearAllCssVarOverrides();
      // Seed the editor state first so its subscriber-driven derivation is
      // the authoritative writer for anything it already owns (columns +
      // catch-all cssVars). applyCssVariables then fills in the rest until
      // the remaining domains move into the store in later phases.
      loadEditorState(theme);
      if (theme.cssVariables && Object.keys(theme.cssVariables).length > 0) {
        applyCssVariables(theme.cssVariables);
      }
      // Font data is already populated into state.fonts by loadEditorState;
      // we still need to run the DOM-side-effect helpers so @font-face rules
      // and --font-* CSS vars land on :root.
      if (theme.fontSources && theme.fontSources.length > 0) {
        applyFontSources(theme.fontSources);
      }
      if (theme.fontStacks && theme.fontStacks.length > 0) {
        applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
      }
      // PaletteEditor instances observe `state.palettes` via their store-
      // watching reactive, so loadEditorState() above is enough — no direct
      // method call needed.
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
