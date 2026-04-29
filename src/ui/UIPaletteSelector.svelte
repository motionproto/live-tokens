<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { resolveAliasChain } from '../lib/tokenRegistry';
  import { editorState } from '../lib/editorStore';
  import UITokenSelector from './UITokenSelector.svelte';

  /** Slot kinds where a gradient is a renderable assignment. */
  function acceptsGradient(name: string): boolean {
    return name.endsWith('-surface') || name.endsWith('-fill');
  }

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;
  export let selectionsLocked: boolean = false;

  type Category = 'palette' | 'surface' | 'border' | 'text';

  const families = [
    { name: 'neutral', label: 'Neutral' },
    { name: 'alternate', label: 'Alternate' },
    { name: 'canvas', label: 'Canvas' },
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

  const familiesWithText = ['neutral', 'canvas', 'primary', 'accent', 'special', 'success', 'warning', 'info', 'danger'];

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
  let chosenNone: boolean = false;
  let chosenGradient: string | null = null;
  let opacity: number = 100;
  let selfDefaultHex: string = '';

  $: gradientsAllowed = acceptsGradient(variable);
  $: gradientTokens = $editorState.gradients.tokens;

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
        return stepKey ? `--border-${family}-${stepKey}` : `--border-${family}`;
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
      const step = borderM[2] || '';
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

  function parseOpacity(raw: string): { inner: string; opacity: number } | null {
    const m = raw.match(/^color-mix\(in srgb,\s*(var\(--[a-z0-9-]+\))\s+(\d+)%,\s*transparent\)$/);
    if (!m) return null;
    return { inner: m[1], opacity: parseInt(m[2]) };
  }

  function buildValue(varName: string): string | null {
    if (varName === variable && opacity >= 100) return null;
    if (opacity >= 100) return varName;
    return `color-mix(in srgb, var(${varName}) ${opacity}%, transparent)`;
  }

  function applyOpacity() {
    opacity = Math.max(0, Math.min(100, Math.round(opacity)));
    if (chosenCategory === null || chosenFamily === null || chosenStep === null) return;
    const varName = getVarName(chosenCategory, chosenFamily, chosenStep);
    selector.writeOverride(buildValue(varName));
    dispatch('change');
  }

  function isGradientToken(name: string): boolean {
    return gradientTokens.some((g) => g.variable === name);
  }

  function initFromCurrent() {
    const raw = document.documentElement.style.getPropertyValue(variable).trim();

    if (raw === 'transparent') {
      chosenNone = true;
      chosenCategory = null;
      chosenFamily = null;
      chosenStep = null;
      chosenGradient = null;
      opacity = 100;
      return;
    }

    chosenNone = false;

    if (gradientsAllowed) {
      const gradMatch = raw.match(/^var\((--[a-z0-9-]+)\)$/);
      if (gradMatch && isGradientToken(gradMatch[1])) {
        chosenGradient = gradMatch[1];
        chosenCategory = null;
        chosenFamily = null;
        chosenStep = null;
        opacity = 100;
        return;
      }
    }
    chosenGradient = null;

    const opacityParsed = parseOpacity(raw);
    if (opacityParsed) {
      const parsed = parseRef(opacityParsed.inner);
      if (parsed) {
        chosenCategory = parsed.category;
        chosenFamily = parsed.family;
        chosenStep = parsed.step;
        opacity = opacityParsed.opacity;
        return;
      }
    }

    const parsed = raw ? parseRef(raw) : null;
    if (parsed) {
      chosenCategory = parsed.category;
      chosenFamily = parsed.family;
      chosenStep = parsed.step;
      opacity = 100;
      return;
    }
    for (const alias of resolveAliasChain(variable)) {
      const aliasParsed = parseRef(`var(${alias})`);
      if (aliasParsed) {
        chosenCategory = aliasParsed.category;
        chosenFamily = aliasParsed.family;
        chosenStep = aliasParsed.step;
        opacity = 100;
        return;
      }
    }
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
    opacity = 100;
  }

  function handleReset() {
    opacity = 100;
    chosenNone = false;
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

  function selectNone(close: () => void) {
    chosenNone = true;
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
    chosenGradient = null;
    opacity = 100;
    selector.writeOverride('transparent');
    selectedFamily = null;
    close();
    dispatch('change');
  }

  function selectSwatch(category: Category, step: string, close: () => void) {
    const varName = getVarName(category, selectedFamily!, step);
    chosenNone = false;
    chosenGradient = null;
    chosenCategory = category;
    chosenFamily = selectedFamily;
    chosenStep = step;
    selector.writeOverride(buildValue(varName));
    selectedFamily = null;
    close();
    dispatch('change');
  }

  function selectGradient(gradientVar: string, close: () => void) {
    chosenNone = false;
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
    chosenGradient = gradientVar;
    opacity = 100;
    selector.writeOverride(gradientVar);
    selectedFamily = null;
    close();
    dispatch('change');
  }

  onMount(() => {
    initFromCurrent();
    captureSelfDefault();
  });

  $: triggerMeta = chosenNone
    ? 'none'
    : chosenGradient
      ? chosenGradient.replace(/^--/, '')
      : (chosenCategory && chosenFamily && chosenStep !== null
        ? getVarName(chosenCategory, chosenFamily, chosenStep).replace(/^--/, '') + (opacity < 100 ? ` (${opacity}%)` : '')
        : '');

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
  {disabled}
  {selectionsLocked}
  dropdownMinWidth="14rem"
  dropdownMaxWidth="calc(100vw - 2rem)"
  hideDefaultHeader={!!selectedFamily}
  on:reset={handleReset}
  on:close={handleClose}
  on:var-change={initFromCurrent}
>
  <div slot="trigger-preview" class="swatch-wrap">
    <div class="swatch" style="background: var({variable});"></div>
  </div>
  <div slot="subheader" class="opacity-control" class:hidden={chosenGradient !== null}>
    <span class="opacity-label">opacity</span>
    <input type="range" min="0" max="100" bind:value={opacity} class="opacity-slider" on:input={applyOpacity} />
    <input type="number" min="0" max="100" bind:value={opacity} class="opacity-input" on:change={applyOpacity} />
    <span class="opacity-unit">%</span>
  </div>
  <svelte:fragment slot="trigger-meta">{triggerMeta}</svelte:fragment>

  <svelte:fragment let:close>
    {#if selectedFamily === null}
      <div class="family-list">
        <button class="family-item" class:active={chosenNone} on:click={() => selectNone(close)}>
          <div class="family-swatches">
            <div class="none-swatch"></div>
          </div>
          <span class="family-label">None</span>
        </button>
        {#each families as fam}
          <button class="family-item" class:active={!chosenNone && chosenFamily === fam.name} on:click={() => selectFamily(fam.name)}>
            <div class="family-swatches">
              <div class="mini-swatch" style="background: var(--color-{fam.name}-300);"></div>
              <div class="mini-swatch" style="background: var(--color-{fam.name}-500);"></div>
              <div class="mini-swatch" style="background: var(--color-{fam.name}-700);"></div>
            </div>
            <span class="family-label">{fam.label}</span>
            <i class="fas fa-chevron-right family-arrow"></i>
          </button>
        {/each}
        {#if gradientsAllowed && gradientTokens.length > 0}
          <div class="family-divider">Gradients</div>
          {#each gradientTokens as g}
            <button class="family-item" class:active={chosenGradient === g.variable} on:click={() => selectGradient(g.variable, close)}>
              <div class="family-swatches">
                <div class="gradient-swatch" style="background: var({g.variable});"></div>
              </div>
              <span class="family-label">Gradient {g.variable.replace(/^--gradient-/, '')}</span>
            </button>
          {/each}
        {/if}
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
  .swatch-wrap {
    align-self: stretch;
    flex: 1;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-faint);
    background-image: linear-gradient(45deg, var(--ui-border-subtle) 25%, transparent 25%),
      linear-gradient(-45deg, var(--ui-border-subtle) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--ui-border-subtle) 75%),
      linear-gradient(-45deg, transparent 75%, var(--ui-border-subtle) 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0;
    overflow: hidden;
  }

  .swatch {
    width: 100%;
    height: 100%;
  }

  .opacity-control {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .opacity-control.hidden {
    display: none;
  }

  .opacity-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    flex-shrink: 0;
  }

  .opacity-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--ui-border-default);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--ui-text-primary);
    cursor: pointer;
  }

  .opacity-input {
    width: 3rem;
    padding: var(--ui-space-2) var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    text-align: right;
    -moz-appearance: textfield;
  }

  .opacity-input::-webkit-inner-spin-button,
  .opacity-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .opacity-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
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
    font-size: var(--ui-font-size-sm);
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
    font-size: var(--ui-font-size-xs);
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

  .none-swatch {
    width: 2.5rem;
    height: 0.75rem;
    border-radius: 2px;
    border: 1px solid var(--ui-border-subtle);
    position: relative;
    overflow: hidden;
  }

  .gradient-swatch {
    width: 2.5rem;
    height: 0.75rem;
    border-radius: 2px;
    border: 1px solid var(--ui-border-subtle);
  }

  .family-divider {
    margin-top: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-8);
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-top: 1px solid var(--ui-border-faint);
  }

  .none-swatch::after {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      var(--ui-border-subtle) 3px,
      var(--ui-border-subtle) 4px
    );
  }

  .family-label {
    flex: 1;
    font-size: var(--ui-font-size-sm);
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
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }
</style>
