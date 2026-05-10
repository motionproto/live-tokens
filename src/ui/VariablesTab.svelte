<script lang="ts">
  import { onMount } from 'svelte';
  import PaletteEditor from './PaletteEditor.svelte';
  import FontStackEditor from './FontStackEditor.svelte';
  import ProjectFontsSection from './ProjectFontsSection.svelte';
  import ColumnsSection from './sections/ColumnsSection.svelte';
  import TokenScaleTable from './sections/TokenScaleTable.svelte';
  import OverlaysSection from './sections/OverlaysSection.svelte';
  import GradientsSection from './sections/GradientsSection.svelte';
  import ShadowsSection from './sections/ShadowsSection.svelte';

  /** Visual flash for the copy-to-clipboard chip, kept short enough to
   *  feel like immediate confirmation but long enough to register. */
  const COPIED_FLASH_MS = 1000;

  interface TokenItem {
    variable: string;
    value: string;
  }

  // Variable names for each scale rendered below. TokenScaleTable resolves the
  // values live via getComputedStyle so tokens.css stays the single source of
  // truth — no hand-maintained list of values to drift out of sync.
  const SPACING_VARS = [
    '--space-2', '--space-4', '--space-6', '--space-8', '--space-10',
    '--space-12', '--space-16', '--space-20', '--space-24', '--space-32',
    '--space-48',
  ];
  const BORDER_WIDTH_VARS = [
    '--border-width-0', '--border-width-1', '--border-width-2', '--border-width-3',
    '--border-width-4', '--border-width-5', '--border-width-6', '--border-width-8',
    '--border-width-10', '--border-width-12', '--border-width-16', '--border-width-20',
    '--border-width-24',
  ];
  const RADIUS_VARS = [
    '--radius-none', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
    '--radius-2xl', '--radius-3xl', '--radius-4xl', '--radius-full',
  ];
  const FONT_SIZE_VARS = [
    '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-lg',
    '--font-size-xl', '--font-size-2xl', '--font-size-3xl', '--font-size-4xl',
    '--font-size-5xl', '--font-size-6xl',
  ];
  const ICON_SIZE_VARS = [
    '--icon-size-xs', '--icon-size-sm', '--icon-size-md', '--icon-size-lg',
    '--icon-size-xl', '--icon-size-2xl', '--icon-size-3xl', '--icon-size-4xl',
    '--icon-size-5xl', '--icon-size-6xl',
  ];
  const FONT_WEIGHT_VARS = [
    '--font-weight-thin', '--font-weight-extralight', '--font-weight-light',
    '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold',
    '--font-weight-bold', '--font-weight-extrabold', '--font-weight-black',
  ];
  const LINE_HEIGHT_VARS = [
    '--line-height-tight', '--line-height-snug', '--line-height-normal',
    '--line-height-relaxed', '--line-height-loose',
  ];

  // Bumped on breakpoint flips; passed to TokenScaleTable so it re-resolves.
  // tokens.css declares responsive overrides at 768px and 480px.
  let liveVersion = 0;
  const BREAKPOINTS = ['(max-width: 768px)', '(max-width: 480px)'] as const;

  onMount(() => {
    liveVersion++; // initial read once the DOM has tokens.css applied
    if (typeof window === 'undefined') return;
    const mqls = BREAKPOINTS.map((q) => window.matchMedia(q));
    const bump = () => { liveVersion++; };
    for (const m of mqls) m.addEventListener('change', bump);
    return () => {
      for (const m of mqls) m.removeEventListener('change', bump);
    };
  });

  const durationTokens: TokenItem[] = [
    { variable: '--duration-75', value: '75ms' },
    { variable: '--duration-150', value: '150ms' },
    { variable: '--duration-200', value: '200ms' },
    { variable: '--duration-300', value: '300ms' },
    { variable: '--duration-500', value: '500ms' },
    { variable: '--duration-750', value: '750ms' },
    { variable: '--duration-1000', value: '1000ms' }
  ];

  const zIndexTokens: TokenItem[] = [
    { variable: '--z-base', value: '0' },
    { variable: '--z-dropdown', value: '100' },
    { variable: '--z-sticky', value: '200' },
    { variable: '--z-overlay', value: '1000' },
    { variable: '--z-modal', value: '1100' },
    { variable: '--z-popover', value: '1200' },
    { variable: '--z-tooltip', value: '1300' }
  ];

  const opacityTokens: TokenItem[] = [
    { variable: '--opacity-disabled', value: '0.6' },
    { variable: '--opacity-hover', value: '0.8' },
    { variable: '--opacity-muted', value: '0.5' }
  ];

  let copiedVar: string | null = null;
  function copyVariable(v: string) {
    navigator.clipboard.writeText(v);
    copiedVar = v;
    setTimeout(() => { copiedVar = null; }, COPIED_FLASH_MS);
  }


</script>

<div class="variables-container">
  <!-- Palette Editor -->
  <section class="section" id="palette-editor">
    <h2 class="section-title">Palette Editor</h2>
    <p class="editor-intro">Derived palettes via <code>color-mix(in oklch)</code>. Change a base color to update all derived steps. Click any derived swatch to add a manual override.</p>
    <div class="palette-editors">
      <PaletteEditor mode="gray" label="Neutral" cssNamespace="neutral"/>
      <PaletteEditor mode="gray" label="Alternate" cssNamespace="alternate" />
      <PaletteEditor label="Background" initialColor="#1a1a2e" cssNamespace="canvas" emptySelector />
      <PaletteEditor label="Primary" initialColor="#c93636" cssNamespace="primary" />
      <PaletteEditor label="Accent" initialColor="#f49e0b" cssNamespace="accent" />
      <PaletteEditor label="Special" initialColor="#8b5cf6" cssNamespace="special" />
      <PaletteEditor label="Success" initialColor="#21c45d" cssNamespace="success" />
      <PaletteEditor label="Warning" initialColor="#e66e1a" cssNamespace="warning" />
      <PaletteEditor label="Info" initialColor="#3077e8" cssNamespace="info" />
      <PaletteEditor label="Danger" initialColor="#e8304f" cssNamespace="danger" />
    </div>
  </section>

  <!-- Spacing & Borders -->
  <section class="section" id="spacing">
    <h2 class="section-title">Spacing &amp; Borders</h2>
    <h3 class="subsection-title">Spacing</h3>
    <TokenScaleTable kind="spacing" vars={SPACING_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
    <h3 class="subsection-title">Borders</h3>
    <TokenScaleTable kind="border" vars={BORDER_WIDTH_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
  </section>

  <!-- Columns -->
  <ColumnsSection />

  <!-- Border Radius -->
  <section class="section" id="border-radius">
    <h2 class="section-title">Border Radius</h2>
    <TokenScaleTable kind="radius" vars={RADIUS_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
  </section>

  <!-- Typography -->
  <section class="section" id="typography">
    <h2 class="section-title">Typography</h2>

    <div class="typography-columns">
      <div class="typography-group font-families-group">
        <ProjectFontsSection />
        <h3 class="group-title">Font Families</h3>
        <FontStackEditor />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Sizes</h3>
        <TokenScaleTable kind="font-size" vars={FONT_SIZE_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Weights</h3>
        <TokenScaleTable kind="font-weight" vars={FONT_WEIGHT_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Line Heights</h3>
        <TokenScaleTable kind="line-height" vars={LINE_HEIGHT_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>
    </div>
  </section>

  <!-- Icon Sizes -->
  <section class="section" id="icon-sizes">
    <h2 class="section-title">Icon Sizes</h2>
    <TokenScaleTable kind="icon-size" vars={ICON_SIZE_VARS} {liveVersion} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
  </section>


  <!-- Shadows -->
  <ShadowsSection {copiedVar} on:copy={(e) => copyVariable(e.detail)} />


  <!-- Overlays -->
  <OverlaysSection {copiedVar} on:copy={(e) => copyVariable(e.detail)} />

  <!-- Gradients -->
  <GradientsSection {copiedVar} on:copy={(e) => copyVariable(e.detail)} />

  <!-- Utility Tokens -->
  <section class="section" id="utility-tokens">
    <h2 class="section-title">Utility Tokens</h2>
    <div class="utility-columns">
      <div class="utility-group">
        <h3 class="group-title">Durations</h3>
        <TokenScaleTable kind="line-height" tokens={durationTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="utility-group">
        <h3 class="group-title">Z-Index Layers</h3>
        <TokenScaleTable kind="line-height" tokens={zIndexTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>

      <div class="utility-group">
        <h3 class="group-title">Opacity</h3>
        <TokenScaleTable kind="line-height" tokens={opacityTokens} {copiedVar} on:copy={(e) => copyVariable(e.detail)} />
      </div>
    </div>
  </section>
</div>

<style>
  .variables-container {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-32);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .section-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .group-title {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  /* Subsection title (used by Spacing & Borders) */
  .subsection-title {
    margin: var(--ui-space-16) 0 var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .subsection-title:first-child,
  .section-title + .subsection-title {
    margin-top: 0;
  }

  /* Typography */
  .typography-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(22rem, 100%), 1fr));
    gap: var(--ui-space-24);
    align-items: start;
  }

  .typography-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .font-families-group {
    grid-column: 1 / -1;
  }

  /* Utility Tokens */
  .utility-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--ui-space-24);
    align-items: start;
  }

  .utility-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  /* Palette Editor */
  .editor-intro {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .editor-intro code {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--ui-space-2) var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
  }

  .palette-editors {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  /* Utility fill tightens at narrow widths */
  .utility-columns {
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
  }
</style>
