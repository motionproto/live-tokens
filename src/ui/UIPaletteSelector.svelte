<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { resolveAliasChain } from '../lib/tokenRegistry';
  import UITokenSelector from './UITokenSelector.svelte';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;

  type Category = 'palette' | 'surface' | 'border' | 'text';

  const families = [
    { name: 'neutral', label: 'Neutral' },
    { name: 'alternate', label: 'Alternate' },
    { name: 'bg', label: 'Background' },
    { name: 'primary', label: 'Primary' },
    { name: 'accent', label: 'Accent' },
    { name: 'special', label: 'Special' },
    { name: 'success', label: 'Success' },
    { name: 'warning', label: 'Warning' },
    { name: 'info', label: 'Info' },
    { name: 'danger', label: 'Danger' },
  ];

  const familyNames = families.map(f => f.name);

  const paletteSteps = ['100', '200', '300', '400', '500', '600', '700', '800', '850', '900', '950'];

  const surfaceSteps = [
    { key: 'lowest', label: 'Lowest' },
    { key: 'lower', label: 'Lower' },
    { key: 'low', label: 'Low' },
    { key: '', label: 'Default' },
    { key: 'high', label: 'High' },
    { key: 'higher', label: 'Higher' },
    { key: 'highest', label: 'Highest' },
  ];

  const borderSteps = [
    { key: 'faint', label: 'Faint' },
    { key: 'subtle', label: 'Subtle' },
    { key: '', label: 'Default' },
    { key: 'medium', label: 'Medium' },
    { key: 'strong', label: 'Strong' },
  ];

  const textSteps = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'tertiary', label: 'Tertiary' },
    { key: 'muted', label: 'Muted' },
    { key: 'disabled', label: 'Disabled' },
  ];

  const surfaceStepKeys = surfaceSteps.map(s => s.key);
  const borderStepKeys = borderSteps.map(s => s.key);
  const textStepKeys = textSteps.map(s => s.key);

  const familiesWithText = ['neutral', 'bg', 'primary', 'accent', 'special', 'success', 'warning', 'info', 'danger'];

  const allCategories: { id: Category; label: string }[] = [
    { id: 'palette', label: 'Palette' },
    { id: 'surface', label: 'Surface' },
    { id: 'border', label: 'Border' },
    { id: 'text', label: 'Text' },
  ];

  let selector: UITokenSelector;
  let selectedFamily: string | null = null;
  let selectedTab: Category = 'palette';

  let chosenCategory: Category | null = null;
  let chosenFamily: string | null = null;
  let chosenStep: string | null = null;
  let selfDefaultHex: string = '';

  function captureSelfDefault() {
    const root = document.documentElement;
    const inline = root.style.getPropertyValue(variable);
    if (inline) root.style.removeProperty(variable);
    selfDefaultHex = rgbToHex(getComputedStyle(root).getPropertyValue(variable).trim());
    if (inline) root.style.setProperty(variable, inline);
  }

  function previewBg(category: Category, family: string, step: string): string {
    const varName = getVarName(category, family, step);
    if (varName === variable) return selfDefaultHex || `var(${varName})`;
    return `var(${varName})`;
  }

  function rgbToHex(value: string): string {
    const m = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return value;
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(parseInt(m[1]))}${toHex(parseInt(m[2]))}${toHex(parseInt(m[3]))}`;
  }

  function getVarName(category: Category, family: string, stepKey: string): string {
    switch (category) {
      case 'palette':
        return `--color-${family}-${stepKey}`;
      case 'surface':
        return stepKey ? `--surface-${family}-${stepKey}` : `--surface-${family}`;
      case 'border':
        if (!stepKey) {
          return family === 'neutral' ? `--border-${family}-default` : `--border-${family}`;
        }
        return `--border-${family}-${stepKey}`;
      case 'text':
        if (family === 'neutral') return `--text-${stepKey}`;
        if (family === 'primary' && stepKey === 'primary') return '--text-primary-color';
        if (stepKey === 'primary') return `--text-${family}`;
        return `--text-${family}-${stepKey}`;
    }
  }

  function parseTextVarName(varName: string): { family: string; step: string } | null {
    if (varName === '--text-primary') return { family: 'neutral', step: 'primary' };
    if (varName === '--text-secondary') return { family: 'neutral', step: 'secondary' };
    if (varName === '--text-tertiary') return { family: 'neutral', step: 'tertiary' };
    if (varName === '--text-muted') return { family: 'neutral', step: 'muted' };
    if (varName === '--text-disabled') return { family: 'neutral', step: 'disabled' };
    if (varName === '--text-primary-color') return { family: 'primary', step: 'primary' };
    const m = varName.match(/^--text-([a-z]+)(?:-([a-z]+))?$/);
    if (m) {
      const fam = m[1];
      const hier = m[2] || 'primary';
      if (familiesWithText.includes(fam) && fam !== 'neutral' && textStepKeys.includes(hier)) {
        return { family: fam, step: hier };
      }
    }
    return null;
  }

  function parseRef(value: string): { category: Category; family: string; step: string } | null {
    const varMatch = value.match(/var\((--[a-z0-9-]+)\)/);
    if (!varMatch) return null;
    const varName = varMatch[1];

    const paletteM = varName.match(/^--color-([a-z]+)-(\d{3})$/);
    if (paletteM && familyNames.includes(paletteM[1]) && paletteSteps.includes(paletteM[2])) {
      return { category: 'palette', family: paletteM[1], step: paletteM[2] };
    }

    const surfaceM = varName.match(/^--surface-([a-z]+)(?:-([a-z]+))?$/);
    if (surfaceM && familyNames.includes(surfaceM[1])) {
      const step = surfaceM[2] || '';
      if (surfaceStepKeys.includes(step)) {
        return { category: 'surface', family: surfaceM[1], step };
      }
    }

    const borderM = varName.match(/^--border-([a-z]+)(?:-([a-z]+))?$/);
    if (borderM && familyNames.includes(borderM[1])) {
      let step = borderM[2] || '';
      if (step === 'default') step = '';
      if (borderStepKeys.includes(step)) {
        return { category: 'border', family: borderM[1], step };
      }
    }

    const textResult = parseTextVarName(varName);
    if (textResult) {
      return { category: 'text', ...textResult };
    }

    return null;
  }

  function initFromCurrent() {
    // Real user overrides are always var(...) references (written by selectSwatch).
    // Inline hex values come from themeInit's bulk-apply of the active theme
    // and represent the semantic default, not a custom override — so we treat
    // them the same as "no inline override" and derive semantics from the
    // variable's own name, or from the alias chain declared in tokens.css.
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    const parsed = raw ? parseRef(raw) : null;
    if (parsed) {
      chosenCategory = parsed.category;
      chosenFamily = parsed.family;
      chosenStep = parsed.step;
      return;
    }
    for (const alias of resolveAliasChain(variable)) {
      const aliasParsed = parseRef(`var(${alias})`);
      if (aliasParsed) {
        chosenCategory = aliasParsed.category;
        chosenFamily = aliasParsed.family;
        chosenStep = aliasParsed.step;
        return;
      }
    }
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
  }

  function handleReset() {
    initFromCurrent();
    selectedFamily = null;
    dispatch('change');
  }

  function handleClose() {
    selectedFamily = null;
  }

  function selectFamily(name: string) {
    selectedFamily = name;
    if (name === chosenFamily && chosenCategory) {
      selectedTab = chosenCategory;
    }
  }

  function backToFamilies() {
    selectedFamily = null;
  }

  function selectSwatch(category: Category, step: string, close: () => void) {
    const varName = getVarName(category, selectedFamily!, step);
    selector.writeOverride(varName === variable ? null : varName);
    chosenCategory = category;
    chosenFamily = selectedFamily;
    chosenStep = step;
    selectedFamily = null;
    close();
    dispatch('change');
  }

  onMount(() => {
    initFromCurrent();
    captureSelfDefault();
  });

  $: displayCategory = chosenCategory && chosenFamily
    ? `${chosenFamily} ${chosenCategory}`
    : '';

  $: displaySubtype = chosenCategory && chosenFamily
    ? (chosenStep || 'default')
    : '';

  $: availableTabs = selectedFamily
    ? allCategories.filter(c => c.id !== 'text' || familiesWithText.includes(selectedFamily!))
    : allCategories;

  $: if (selectedFamily && !availableTabs.find(t => t.id === selectedTab)) {
    selectedTab = 'palette';
  }
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeShared}
  dropdownMinWidth="14rem"
  dropdownMaxWidth="calc(100vw - 2rem)"
  hideDefaultHeader={!!selectedFamily}
  on:reset={handleReset}
  on:close={handleClose}
  on:var-change={initFromCurrent}
>
  <div slot="trigger-preview" class="swatch" style="background: var({variable});"></div>
  <svelte:fragment slot="trigger-title">{displayCategory}</svelte:fragment>
  <svelte:fragment slot="trigger-meta">{displaySubtype}</svelte:fragment>

  <svelte:fragment let:close>
    {#if selectedFamily === null}
      <div class="family-list">
        {#each families as fam}
          <button class="family-item" class:active={chosenFamily === fam.name} on:click={() => selectFamily(fam.name)}>
            <div class="family-swatches">
              <div class="mini-swatch" style="background: var(--color-{fam.name}-300);"></div>
              <div class="mini-swatch" style="background: var(--color-{fam.name}-500);"></div>
              <div class="mini-swatch" style="background: var(--color-{fam.name}-700);"></div>
            </div>
            <span class="family-label">{fam.label}</span>
            <i class="fas fa-chevron-right family-arrow"></i>
          </button>
        {/each}
      </div>
    {:else}
      <button class="dropdown-back" on:click={backToFamilies}>
        <i class="fas fa-chevron-left"></i>
        <span>{families.find(f => f.name === selectedFamily)?.label}</span>
      </button>

      <div class="tab-bar">
        {#each availableTabs as tab}
          <button
            class="tab-btn"
            class:selected={selectedTab === tab.id}
            class:assigned={chosenCategory === tab.id && chosenFamily === selectedFamily}
            on:click={() => selectedTab = tab.id}
          >{tab.label}</button>
        {/each}
      </div>

      {#if selectedTab === 'palette'}
        <div class="step-grid">
          {#each paletteSteps as step}
            <button
              class="step-item"
              class:active={chosenCategory === 'palette' && chosenFamily === selectedFamily && chosenStep === step}
              on:click={() => selectSwatch('palette', step, close)}
            >
              <div class="step-swatch" style="background: var(--color-{selectedFamily}-{step});"></div>
              <span class="step-label">{step}</span>
            </button>
          {/each}
        </div>
      {:else if selectedTab === 'surface'}
        <div class="step-grid">
          {#each surfaceSteps as step}
            <button
              class="step-item"
              class:active={chosenCategory === 'surface' && chosenFamily === selectedFamily && chosenStep === step.key}
              on:click={() => selectSwatch('surface', step.key, close)}
            >
              <div class="step-swatch" style="background: {previewBg('surface', selectedFamily, step.key)};"></div>
              <span class="step-label">{step.label}</span>
            </button>
          {/each}
        </div>
      {:else if selectedTab === 'border'}
        <div class="step-grid">
          {#each borderSteps as step}
            <button
              class="step-item"
              class:active={chosenCategory === 'border' && chosenFamily === selectedFamily && chosenStep === step.key}
              on:click={() => selectSwatch('border', step.key, close)}
            >
              <div class="step-swatch" style="background: {previewBg('border', selectedFamily, step.key)};"></div>
              <span class="step-label">{step.label}</span>
            </button>
          {/each}
        </div>
      {:else if selectedTab === 'text'}
        <div class="step-grid">
          {#each textSteps as step}
            <button
              class="step-item"
              class:active={chosenCategory === 'text' && chosenFamily === selectedFamily && chosenStep === step.key}
              on:click={() => selectSwatch('text', step.key, close)}
            >
              <div class="step-swatch" style="background: {previewBg('text', selectedFamily, step.key)};"></div>
              <span class="step-label">{step.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    {/if}
  </svelte:fragment>
</UITokenSelector>

<style>
  .swatch {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-faint);
  }

  .dropdown-back {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    width: 100%;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: none;
    border: none;
    border-bottom: 1px solid var(--ui-border-faint);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-sm);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .dropdown-back:hover {
    background: var(--ui-hover);
  }

  .dropdown-back i {
    font-size: 0.5rem;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .tab-btn {
    flex: 1;
    padding: var(--ui-space-4) var(--ui-space-4);
    background: none;
    border: 1px solid transparent;
    border-radius: 0;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    text-align: center;
  }

  .tab-btn:hover {
    color: var(--ui-text-secondary);
    background: var(--ui-hover);
  }

  .tab-btn.assigned {
    border-color: var(--ui-border-default);
  }

  .tab-btn.selected {
    color: var(--ui-text-primary);
    box-shadow: inset 0 -2px 0 var(--ui-text-accent);
    background: var(--ui-hover);
  }

  .family-list {
    display: flex;
    flex-direction: column;
    max-height: 20rem;
    overflow-y: auto;
  }

  .family-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .family-item:hover {
    background: var(--ui-hover);
  }

  .family-item.active {
    background: var(--ui-hover-high);
    box-shadow: inset 3px 0 0 var(--ui-text-accent);
  }

  .family-item.active .family-label {
    color: var(--ui-text-accent);
  }

  .family-swatches {
    display: flex;
    gap: 2px;
  }

  .mini-swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 2px;
  }

  .family-label {
    flex: 1;
    font-size: var(--ui-font-sm);
    color: var(--ui-text-primary);
    text-align: left;
  }

  .family-arrow {
    font-size: 0.5rem;
    color: var(--ui-text-muted);
  }

  .step-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--ui-space-4);
    padding: var(--ui-space-8);
  }

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-2);
    padding: var(--ui-space-4);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .step-item:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border-default);
  }

  .step-item.active {
    border-color: var(--ui-text-accent);
    border-width: 2px;
    background: var(--ui-hover-high);
    padding: 3px;
  }

  .step-item.active .step-label {
    color: var(--ui-text-accent);
    font-weight: var(--ui-font-weight-semibold);
  }

  .step-swatch {
    width: 2rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-faint);
  }

  .step-label {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }
</style>
