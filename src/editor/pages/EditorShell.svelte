<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import VariablesTab from '../ui/VariablesTab.svelte';
  import ColorsTab from '../ui/colors/ColorsTab.svelte';
  import EditorViewSwitcher from '../ui/EditorViewSwitcher.svelte';
  import ComponentsTab from '../component-editor/scaffolding/ComponentsTab.svelte';
  import SketchTab from '../ui/sketch/SketchTab.svelte';
  import AccessibilityTab from '../ui/a11y/AccessibilityTab.svelte';
  import A11yRailMark from '../ui/a11y/A11yRailMark.svelte';
  import {
    A11Y_REVIEW_SECTION,
    A11Y_RUN_SECTION,
    a11ySectionId,
    componentsInReport,
    componentsWithIssues,
    issuesLabel,
    setA11yViewLink,
  } from '../ui/a11y/a11yView';
  import ThemePanel from '../ui/ThemePanel.svelte';
  import { scrollSectionIntoView } from '../ui/scrollSection';
  import { editorView, sidebarCondensed, selectedComponent, type EditorView } from '../core/store/editorViewStore';
  import { a11yIssues, componentDirty } from '../core/store/editorStore';
  import { getComponentRegistryEntries, validateRegistryAgainstServerScan } from '../component-editor/registry';
  import { listComponents } from '../core/components/componentConfigService';

  const tokenNavItems = [
    { id: 'palette-editor', label: 'Palette Editor', icon: 'fas fa-palette' },
    { id: 'spacing', label: 'Spacing & Borders', icon: 'fas fa-ruler-combined' },
    { id: 'columns', label: 'Columns', icon: 'fas fa-columns' },
    { id: 'border-radius', label: 'Border Radius', icon: 'fas fa-border-style' },
    { id: 'typography', label: 'Typography', icon: 'fas fa-font' },
    { id: 'icon-sizes', label: 'Icon Sizes', icon: 'fas fa-expand' },
    { id: 'shadows', label: 'Shadows', icon: 'fas fa-cloud' },
    { id: 'washes', label: 'Washes', icon: 'fas fa-layer-group' },
    { id: 'custom-colors', label: 'Custom Colours', icon: 'fas fa-eye-dropper' },
    { id: 'gradients', label: 'Gradients', icon: 'fas fa-droplet' },
    { id: 'utility-tokens', label: 'Utility Tokens', icon: 'fas fa-sliders' }
  ];

  const colorsNavItems = [
    { id: 'colors-wheel', label: 'Wheel', icon: 'fas fa-palette' },
    { id: 'colors-story', label: 'Story', icon: 'fas fa-layer-group' }
  ];

  const sketchNavItems = [
    { id: 'sketch-border', label: 'Border', icon: 'fas fa-pen-nib' },
    { id: 'sketch-fill', label: 'Fill', icon: 'fas fa-fill-drip' },
    { id: 'sketch-shape', label: 'Shape', icon: 'fas fa-draw-polygon' },
    { id: 'sketch-icons', label: 'Icons', icon: 'fas fa-shapes' },
    { id: 'sketch-noise', label: 'Noise', icon: 'fas fa-wave-square' },
    { id: 'sketch-preview', label: 'Preview', icon: 'fas fa-eye' }
  ];

  type NavItem = { id: string; label: string; icon: string; count?: number };

  let { onclose }: { onclose?: () => void } = $props();

  const allComponentNavItems = getComponentRegistryEntries().map(({ id, label, icon, origin }) => ({ id, label, icon, origin }));
  const systemNavItems = allComponentNavItems.filter((i) => i.origin === 'system');
  const customNavItems = allComponentNavItems.filter((i) => i.origin === 'custom');

  let selectedTokenSection: string | null = $state(null);
  /** Rebuilt per click so a panel can react to the same target twice. */
  let sectionJump: { id: string } | null = $state(null);

  // 'auto' = open by default. Auto-condensing on shellWidth caused a bounce
  // as the overlay panel grew past the threshold mid-animation.
  let condensed = $derived($sidebarCondensed === 'auto' ? false : $sidebarCondensed);

  const HINT_DELAY_MS = 80;
  let hintLabel: string | null = $state(null);
  let hintTop = $state(0);
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  function showHint(label: string, target: HTMLElement) {
    if (!condensed) return;
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

  run(() => {
    if (!condensed) hideHint();
  });

  function scrollToSection(sectionId: string) {
    selectedTokenSection = sectionId;
    sectionJump = { id: sectionId };
    const el = document.getElementById(sectionId);
    if (el) scrollSectionIntoView(el);
  }

  /** The Sketch panel is an accordion, so it opens the target and scrolls once
      the reveal has settled. Scrolling from here would read offsetTop before
      the other sections have collapsed. */
  function jumpToSketchSection(sectionId: string) {
    selectedTokenSection = sectionId;
    sectionJump = { id: sectionId };
  }

  setA11yViewLink(async (sectionId) => {
    editorView.set('accessibility');
    await tick();
    document.querySelector<HTMLDetailsElement>(`#${sectionId} details`)?.setAttribute('open', '');
    scrollToSection(sectionId);
  });

  function selectComponent(id: string) {
    selectedComponent.set(id);
    hideHint();
  }

  function toggleCondensed() {
    sidebarCondensed.update((v) => !(v === true));
  }

  // A narrow editor shows one section at a time, picked from a select, because
  // the rail would leave the section itself no room.
  const singleSection = new MediaQuery('max-width: 600px');
  let themeScreen = $state(false);
  let menuOpen = $state(false);
  let screenBarHeight = $state(0);

  let a11yComponentNavItems: NavItem[] = $derived(
    componentsInReport($a11yIssues).map(({ component, label, icon, count }) => ({
      id: a11ySectionId(component), label, icon, count,
    })),
  );
  let a11yMarked = $derived(new Set(componentsWithIssues($a11yIssues).map((row) => row.component)));
  let a11yHasReview = $derived(Object.values($a11yIssues).some((issues) => issues.review.length > 0));

  // The narrow layout shows one section at a time, so the run section and the
  // check-by-eye line join the component sections the rail lists.
  let sectionNav: Partial<Record<EditorView, NavItem[]>> = $derived({
    tokens: tokenNavItems,
    sketch: sketchNavItems,
    colors: colorsNavItems,
    accessibility: [
      { id: A11Y_RUN_SECTION, label: 'Test run', icon: 'fas fa-universal-access' },
      ...a11yComponentNavItems,
      ...(a11yHasReview ? [{ id: A11Y_REVIEW_SECTION, label: 'Check by eye', icon: 'fas fa-eye' }] : []),
    ],
  });

  function shownSection(view: EditorView): string | null {
    const items = sectionNav[view];
    if (!items) return null;
    return items.some((i) => i.id === selectedTokenSection) ? selectedTokenSection : items[0].id;
  }

  let menuItems: NavItem[] = $derived(
    $editorView === 'components' ? allComponentNavItems : sectionNav[$editorView]!,
  );
  let activeItemId = $derived(
    themeScreen ? null : $editorView === 'components' ? $selectedComponent : shownSection($editorView),
  );
  let activeItemLabel = $derived(menuItems.find((i) => i.id === activeItemId)?.label ?? '');

  function pickSection(id: string) {
    themeScreen = false;
    if ($editorView === 'components') {
      selectComponent(id);
    } else {
      selectedTokenSection = id;
      sectionJump = { id };
    }
    menuOpen = false;
    window.scrollTo(0, 0);
  }

  function pickTheme() {
    themeScreen = true;
    menuOpen = false;
    window.scrollTo(0, 0);
  }

  // The panes render every section; a narrow editor marks all but the picked
  // one so they drop out of the flow.
  $effect(() => {
    const items = sectionNav[$editorView];
    if (!items) return;
    const only = singleSection.current ? shownSection($editorView) : null;
    for (const { id } of items) {
      document.getElementById(id)?.toggleAttribute('data-off-screen', only !== null && id !== only);
    }
  });

  onMount(async () => {
    try {
      const summaries = await listComponents();
      validateRegistryAgainstServerScan(summaries.map((s) => s.name));
    } catch {
      // server unreachable — skip validation
    }
  });
</script>

<svelte:window onkeydown={(e) => { if (menuOpen && e.key === 'Escape') menuOpen = false; }} />

<!-- Panes that pin a preview offset it by --editor-sticky-top to clear the
     pinned select bar. -->
<div
  class="layout"
  class:condensed
  class:single-section={singleSection.current}
  style:--editor-sticky-top="{singleSection.current ? screenBarHeight : 0}px"
>
  {#if singleSection.current}
    <header class="screen-bar" bind:clientHeight={screenBarHeight}>
      <button
        type="button"
        class="screen-picker"
        aria-expanded={menuOpen}
        aria-controls="screen-menu"
        onclick={() => (menuOpen = !menuOpen)}
      >
        {#if themeScreen}
          <span class="screen-picker-section">Theme</span>
        {:else}
          <span class="screen-picker-section">{activeItemLabel}</span>
        {/if}
        <i class="fas {menuOpen ? 'fa-chevron-up' : 'fa-chevron-down'}" aria-hidden="true"></i>
      </button>
      {#if onclose}
        <button type="button" class="screen-close" aria-label="Close the editor" onclick={onclose}>
          <i class="fas fa-xmark"></i>
        </button>
      {/if}
    </header>
    {#if menuOpen}
      <nav id="screen-menu" class="screen-menu" aria-label="Editor sections">
        <EditorViewSwitcher />
        <div class="nav-items">
          {#each menuItems as item (item.id)}
            <button
              type="button"
              class="nav-item"
              class:counted={item.count !== undefined}
              class:active={activeItemId === item.id}
              aria-label={item.count !== undefined ? `${item.label}, ${issuesLabel(item.count)}` : undefined}
              class:dirty={$editorView === 'components' && $componentDirty[item.id]}
              onclick={() => pickSection(item.id)}
            >
              <i class={item.icon}></i>
              <span class="nav-label">{#if $editorView === 'components' && a11yMarked.has(item.id)}<A11yRailMark />{/if}{item.label}</span>
              {#if item.count !== undefined}
                <span class="nav-count">{item.count}</span>
              {/if}
              {#if $editorView === 'components' && $componentDirty[item.id]}
                <span class="dirty-dot" aria-label="Unsaved changes" title="Unsaved changes"></span>
              {/if}
            </button>
          {/each}
        </div>
        <div class="nav-divider"></div>
        <button type="button" class="nav-item" class:active={themeScreen} onclick={pickTheme}>
          <i class="fas fa-swatchbook"></i>
          <span class="nav-label">Theme</span>
        </button>
      </nav>
    {/if}
  {:else}
    <nav class="sidebar" class:condensed>
      <div class="rail-toggle-row">
        <button
          type="button"
          class="rail-toggle"
          aria-label={condensed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!condensed}
          onclick={toggleCondensed}
        >
          <i class="fas {condensed ? 'fa-arrow-right' : 'fa-arrow-left'}"></i>
        </button>
      </div>

      <EditorViewSwitcher {condensed} />

      {#if $editorView === 'tokens'}
        <div class="nav-items">
          {#each tokenNavItems as item (item.id)}
            <button
              class="nav-item"
              class:active={selectedTokenSection === item.id}
              onmouseenter={(e) => showHint(item.label, e.currentTarget)}
              onmouseleave={hideHint}
              onclick={() => scrollToSection(item.id)}
            >
              <i class={item.icon}></i>
              <span class="nav-label">{item.label}</span>
            </button>
          {/each}
        </div>
        {#if !condensed}
          <div class="sidebar-footer">
            <ThemePanel />
          </div>
        {/if}
      {:else if $editorView === 'sketch'}
        <div class="nav-items">
          {#each sketchNavItems as item (item.id)}
            <button
              class="nav-item"
              class:active={selectedTokenSection === item.id}
              onmouseenter={(e) => showHint(item.label, e.currentTarget)}
              onmouseleave={hideHint}
              onclick={() => jumpToSketchSection(item.id)}
            >
              <i class={item.icon}></i>
              <span class="nav-label">{item.label}</span>
            </button>
          {/each}
        </div>
        {#if !condensed}
          <div class="sidebar-footer">
            <ThemePanel />
          </div>
        {/if}
      {:else if $editorView === 'colors'}
        <div class="nav-items">
          {#each colorsNavItems as item (item.id)}
            <button
              class="nav-item"
              class:active={selectedTokenSection === item.id}
              onmouseenter={(e) => showHint(item.label, e.currentTarget)}
              onmouseleave={hideHint}
              onclick={() => scrollToSection(item.id)}
            >
              <i class={item.icon}></i>
              <span class="nav-label">{item.label}</span>
            </button>
          {/each}
        </div>
        {#if !condensed}
          <div class="sidebar-footer">
            <ThemePanel />
          </div>
        {/if}
      {:else if $editorView === 'accessibility'}
        <div class="nav-items">
          {#each a11yComponentNavItems as item (item.id)}
            <button
              class="nav-item counted"
              class:active={selectedTokenSection === item.id}
              aria-label={`${item.label}, ${issuesLabel(item.count ?? 0)}`}
              onmouseenter={(e) => showHint(item.label, e.currentTarget)}
              onmouseleave={hideHint}
              onclick={() => scrollToSection(item.id)}
            >
              <i class={item.icon}></i>
              <span class="nav-label">{item.label}</span>
              <span class="nav-count">{item.count}</span>
            </button>
          {/each}
        </div>
        {#if !condensed}
          <div class="sidebar-footer">
            <ThemePanel />
          </div>
        {/if}
      {:else}
        <div class="nav-items">
          {#each systemNavItems as item (item.id)}
            <button
              class="nav-item"
              class:active={$selectedComponent === item.id}
              class:dirty={$componentDirty[item.id]}
              onmouseenter={(e) => showHint(item.label, e.currentTarget)}
              onmouseleave={hideHint}
              onclick={() => selectComponent(item.id)}
            >
              <i class={item.icon}></i>
              <span class="nav-label">{#if a11yMarked.has(item.id)}<A11yRailMark />{/if}{item.label}</span>
              {#if $componentDirty[item.id]}
                <span class="dirty-dot" aria-label="Unsaved changes" title="Unsaved changes"></span>
              {/if}
              {#if condensed && a11yMarked.has(item.id)}
                <A11yRailMark placement="corner" />
              {/if}
            </button>
          {/each}
          {#if customNavItems.length > 0}
            <div class="nav-divider">
              <span class="nav-divider-label">Custom</span>
            </div>
            {#each customNavItems as item (item.id)}
              <button
                class="nav-item"
                class:active={$selectedComponent === item.id}
                class:dirty={$componentDirty[item.id]}
                onmouseenter={(e) => showHint(item.label, e.currentTarget)}
                onmouseleave={hideHint}
                onclick={() => selectComponent(item.id)}
              >
                <i class={item.icon}></i>
                <span class="nav-label">{#if a11yMarked.has(item.id)}<A11yRailMark />{/if}{item.label}</span>
                {#if $componentDirty[item.id]}
                  <span class="dirty-dot" aria-label="Unsaved changes" title="Unsaved changes"></span>
                {/if}
                {#if condensed && a11yMarked.has(item.id)}
                  <A11yRailMark placement="corner" />
                {/if}
              </button>
            {/each}
          {/if}
        </div>
        {#if !condensed}
          <div class="sidebar-footer">
            <ThemePanel />
          </div>
        {/if}
      {/if}
    </nav>
  {/if}

  <main class="content">
    {#if singleSection.current && themeScreen}
      <ThemePanel />
    {:else if $editorView === 'tokens'}
      <VariablesTab />
    {:else if $editorView === 'colors'}
      <ColorsTab />
    {:else if $editorView === 'sketch'}
      <SketchTab {sectionJump} />
    {:else if $editorView === 'accessibility'}
      <AccessibilityTab />
    {:else}
      <ComponentsTab selectedComponent={$selectedComponent} />
    {/if}
  </main>

  {#if hintLabel !== null && condensed}
    <div class="rail-hint" style="top: {hintTop}px">{hintLabel}</div>
  {/if}
</div>

<style>
  .layout {
    --sidebar-w: 240px;
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    min-height: 100vh;
    width: 100%;
    max-width: 1920px;
    box-sizing: border-box;
    transition: grid-template-columns 220ms ease;
  }

  .layout.condensed {
    --sidebar-w: 48px;
  }

  .layout.single-section {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
  }

  .screen-bar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-12);
    background: black;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .screen-picker {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-12);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    text-align: left;
    cursor: pointer;
  }

  .screen-picker-section {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .screen-picker i {
    margin-left: auto;
    align-self: center;
    color: var(--ui-text-tertiary);
  }

  /* Fills the editor under the bar; picking a row closes it. */
  .screen-menu {
    position: fixed;
    top: var(--editor-sticky-top);
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    overflow-y: auto;
    padding: var(--ui-space-12) var(--ui-space-8) var(--ui-space-24);
    background: black;
  }

  .screen-menu .nav-item {
    height: 44px;
    font-size: var(--ui-font-size-lg);
  }

  .screen-menu .dirty-dot {
    top: 12px;
  }

  .screen-close {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-lg);
    cursor: pointer;
  }

  .screen-close:hover {
    background: var(--ui-hover);
  }

  /* Beats each pane's own display rule for its sections. */
  .content :global([data-off-screen]) {
    display: none !important;
  }

  .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: black;
    border-right: 1px solid var(--ui-border-low);
    display: flex;
    z-index: 1;
    flex-direction: column;
    min-width: 0;
  }

  /* A classic scrollbar would cover a third of the 48px rail. It still scrolls by wheel, trackpad and keyboard. */
  .sidebar.condensed {
    scrollbar-width: none;
  }

  .rail-toggle-row {
    display: flex;
    justify-content: flex-end;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .rail-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 36px;
    background: none;
    border: none;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .rail-toggle:hover {
    background: var(--ui-hover);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: var(--ui-space-4) 0 var(--ui-space-16);
    flex-shrink: 0;
  }

  /* Divider between the System and Custom groups. The horizontal line uses the
     dimmer border token (sub-element separator), with an eyebrow label that
     fades out when the rail is condensed so the line still reads. */
  .nav-divider {
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    height: 28px;
    margin-top: var(--ui-space-8);
    border-top: 1px solid var(--ui-border-low);
  }

  .nav-divider-label {
    grid-column: 2;
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    opacity: 1;
    transition: opacity 180ms ease;
  }

  .layout.condensed .nav-divider-label {
    opacity: 0;
  }

  .nav-item {
    position: relative;
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    width: 100%;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition: color 60ms ease, background 60ms ease;
  }

  .nav-item i {
    justify-self: center;
    width: 1.25rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    opacity: 0.85;
  }

  /* Amber dot indicating unsaved changes. Anchored to the top-right of the
     icon column so it stays visible whether the sidebar is condensed
     (icon-only) or expanded (icon + label). */
  .dirty-dot {
    position: absolute;
    top: 8px;
    left: 30px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ui-highlight);
    box-shadow: 0 0 0 2px black;
    pointer-events: none;
  }

  .nav-item.dirty {
    color: var(--ui-text-secondary);
  }

  .nav-label {
    white-space: nowrap;
    overflow: hidden;
    opacity: 1;
    transition: opacity 180ms ease;
  }

  .layout.condensed .nav-label,
  .layout.condensed .nav-count {
    opacity: 0;
  }

  .nav-item.counted {
    grid-template-columns: 48px 1fr auto;
  }

  .nav-count {
    padding-right: var(--ui-space-12);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    transition: opacity 180ms ease;
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

  .sidebar-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding: var(--ui-space-12) var(--ui-space-8) var(--ui-space-16);
    border-top: 1px solid var(--ui-border-low);
  }

  .rail-hint {
    position: fixed;
    left: calc(var(--sidebar-w) + var(--ui-space-6));
    transform: translateY(-50%);
    z-index: 50;
    padding: var(--ui-space-4) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
</style>
