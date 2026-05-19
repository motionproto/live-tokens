<script lang="ts">
  import './demo.css';
  import Badge from '../system/components/Badge.svelte';
  import Button from '../system/components/Button.svelte';
  import Callout from '../system/components/Callout.svelte';
  import Card from '../system/components/Card.svelte';
  import CollapsibleSection from '../system/components/CollapsibleSection.svelte';
  import FloatingTokenTags from '../system/components/FloatingTokenTags.svelte';
  import Notification from '../system/components/Notification.svelte';
  import SectionDivider from '../system/components/SectionDivider.svelte';
  import SegmentedControl from '../system/components/SegmentedControl.svelte';
  import Table from '../system/components/Table.svelte';
  import { navigate } from '../editor/core/routing/router';

  const isDev = import.meta.env.DEV;

  // Interactive playground — switches one preview slot between two real
  // compositions so the same token table can be observed driving fills and
  // shapes side-by-side.
  let previewMode = $state('tone');
  const previewSegments = [
    { value: 'tone',  label: 'Tone',  icon: 'fas fa-droplet' },
    { value: 'shape', label: 'Shape', icon: 'fas fa-shapes' },
  ];

  const tones = ['primary', 'accent', 'success', 'warning', 'danger', 'info', 'special', 'neutral'] as const;

  let openStep = $state('01');
  function toggleStep(id: string) {
    openStep = openStep === id ? '' : id;
  }
</script>

<div class="kit">

  <!-- ============================ HERO ============================ -->
  <header class="hero">
    <!-- Kite animation spans the full hero. Tags fan across the entire row,
         the central component sits dead-centre. Text below overlaps freely. -->
    <div class="hero-kite">
      <FloatingTokenTags />
    </div>

    <div class="hero-text">
      <div class="hero-eyebrow">
        <Badge variant="neutral" size="small" >v0.6.2 </Badge>
      </div>

      <h1 class="hero-title">
        Live Tokens<br />
        <span class="hero-italic">The design system with an editor.</span>
      </h1>

      <p class="hero-tagline">
        A Svelte starter kit for token-driven UI. Edit design tokens and UI components in realtime. Ship the result as plain CSS.
      </p>


      <div class="hero-actions">
        {#if isDev}
          <Button onclick={() => navigate('/editor')} icon="fas fa-sliders" iconPosition="left">
            Open Token Editor
          </Button>
          <Button variant="secondary" onclick={() => navigate('/components')} icon="fas fa-puzzle-piece" iconPosition="left">
            Browse Components
          </Button>
        {:else}
          <Button variant="outline" disabled>Editor &nbsp;·&nbsp; dev only</Button>
        {/if}
      </div>
    </div>

  </header>

  <!-- ====================== CHAPTER 1 — The Kit ====================== -->
  <SectionDivider
    title="The Kit"
    description="Tokens, components, and a live editor. One Svelte starter, all in the box."
    variant="accent"
  />

  <section class="kit-grid">
    <Card icon="fas fa-palette" title="Design tokens">
      <p>Over four hundred CSS variables for colour, type, spacing, radii, shadows, and motion. All editable in the browser.</p>
    </Card>
    <Card icon="fas fa-puzzle-piece" title="Component library">
      <p>Seventeen primitives: buttons, cards, callouts, dialogs, tabs, badges, tooltips, tables. Every surface resolves to tokens.</p>
    </Card>
    <Card icon="fas fa-pen-ruler" title="Live editor">
      <p>A side-panel overlay with tabs for every category. Each edit writes a CSS variable and the page reflows instantly.</p>
    </Card>
    <Card icon="fas fa-cube" title="Ships as CSS">
      <p>Promote a theme to production. The editor flushes its values into <code>tokens.css</code>, and the build is pure CSS.</p>
    </Card>
  </section>

  <!-- ====================== CHAPTER 2 — See it live ====================== -->
  <SectionDivider
    title="See it live."
    description="Every component on this page resolves to the same token table. Open the editor; watch them change together."
    variant="accent"
  />

  <section class="playground">
    <div class="playground-control">
      <SegmentedControl segments={previewSegments} bind:value={previewMode} />
    </div>

    <div class="playground-stage">
      {#if previewMode === 'tone'}
        <div class="stage-row">
          {#each tones as v (v)}
            <Badge variant={v} icon="fas fa-circle">{v}</Badge>
          {/each}
        </div>
        <p class="stage-caption">
          Eight tones, one palette. <strong>{'--color-{tone}-500'}</strong> drives every fill above.
        </p>
      {:else}
        <div class="stage-row stage-shape">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="success" icon="fas fa-check">Success</Button>
          <Button variant="warning" icon="fas fa-bolt">Warning</Button>
          <Button variant="danger" icon="fas fa-xmark">Danger</Button>
        </div>
        <p class="stage-caption">
          Six variants. <strong>{'--button-{variant}-radius'}</strong> and
          <strong>{'--button-{variant}-padding'}</strong> shape every state.
        </p>
      {/if}
    </div>
  </section>

  <section class="tones-grid">
    <Callout variant="info" label="In dev.">
      The editor overlay runs in development only. Run <code>npm run dev</code> and look top-right.
    </Callout>
    <Callout variant="info" label="In prod.">
      Production builds are pure CSS. Zero runtime weight from the editor reaches the bundle.
    </Callout>
    <Callout variant="info" label="One canvas.">
      All routes share one <code>:root</code>. Variable writes cascade everywhere instantly.
    </Callout>
    <Callout variant="info" label="No magic.">
      Token names describe values, not components. <code>--color-brand-500</code>, never <code>--button-bg</code>.
    </Callout>
  </section>

  <!-- ====================== CHAPTER 3 — Two layers ====================== -->
  <SectionDivider
    title="Two layers, no surprises."
    description="A base of raw tokens. An upper layer of components that consume them through semantic names."
    variant="accent"

  />

  <section class="arch">
    <Card class="arch-card arch-base" icon="fas fa-layer-group" title="Base layer · tokens.css">
      <p>
        Raw CSS variables for every primitive. Colour, type, spacing, radii,
        shadows, motion. Names describe values, not the components that use them.
      </p>
      <pre class="code-block"><code>{`--color-brand-500: #eb0ad4;
--space-16:        1rem;
--radius-md:       0.25rem;
--duration-150:    150ms;`}</code></pre>
    </Card>

    <Card class="arch-card arch-component" icon="fas fa-shapes" title="Upper layer · components">
      <p>
        Each component declares its own semantic tokens and binds them to base
        tokens. Edit a base token, and every consumer updates instantly.
      </p>

      <pre class="code-block"><code>{`--button-primary-surface:
  var(--surface-brand-high);

--surface-brand-high:
  var(--color-brand-700);`}</code></pre>
    </Card>

    <div class="arch-table">
      <header class="arch-table-header">
        <span class="arch-eyebrow">A real resolution chain</span>
        <h3>One base edit. Four touchpoints.</h3>
      </header>
      <Table>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Resolves to</th>
              <th>Layer</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--button-primary-surface</code></td>
              <td><code>var(--surface-brand-high)</code></td>
              <td><Badge variant="neutral" size="small">Component</Badge></td>
              <td>Button</td>
            </tr>
            <tr>
              <td><code>--surface-brand-high</code></td>
              <td><code>var(--color-brand-700)</code></td>
              <td><Badge variant="accent" size="small">Semantic</Badge></td>
              <td>Badge, Button, Card</td>
            </tr>
            <tr>
              <td><code>--color-brand-700</code></td>
              <td><code>#ac009b</code></td>
              <td><Badge variant="primary" size="small">Base</Badge></td>
              <td>10 components</td>
            </tr>
            <tr>
              <td><code>--color-brand-500</code></td>
              <td><code>#eb0ad4</code></td>
              <td><Badge variant="primary" size="small">Base</Badge></td>
              <td>11 components</td>
            </tr>
          </tbody>
        </table>
      </Table>
    </div>
  </section>

  <!-- ====================== CHAPTER 4 — Workflow ====================== -->
  <SectionDivider
    title="From edit to ship."
    description="Three steps the editor takes, start to finish."
    variant="accent"
  />

  <section class="how">
    <CollapsibleSection
      variant="container"
      label="01 · Edit in the overlay"
      expanded={openStep === '01'}
      ontoggle={() => toggleStep('01')}
    >
      <p>
        Click the floating overlay (top-right in dev) to open <code>/editor</code>
        in a side panel or floating window. Tabs cover every category in the base
        layer: palette, spacing, columns, radii, type, shadows, overlays,
        gradients, and utilities. Each edit writes a CSS variable on
        <code>:root</code>, and the page reflows instantly. No reload, no rebuild.
      </p>
    </CollapsibleSection>

    <CollapsibleSection
      variant="container"
      label="02 · Save themes as JSON"
      expanded={openStep === '02'}
      ontoggle={() => toggleStep('02')}
    >
      <p>
        Save persists the active theme to <code>themes/active.json</code>. Each
        theme is a flat key/value map, diff-friendly in git, easy to round-trip.
        Switch themes from the overlay; per-session backups are kept automatically.
      </p>
    </CollapsibleSection>

    <CollapsibleSection
      variant="container"
      label="03 · Promote to production CSS"
      expanded={openStep === '03'}
      ontoggle={() => toggleStep('03')}
    >
      <p>
        Promote a theme to production and the editor flushes its values into
        <code>tokens.css</code>. The production build then ships as pure CSS.
        No editor code reaches the bundle, no runtime cost, no theme provider.
      </p>
    </CollapsibleSection>
  </section>

  <!-- ====================== CTA ====================== -->
  <section class="cta">
    <Notification
      title="Ready when you are."
      description="Run npm run dev to start the editor. The overlay appears in the top-right corner."
      variant="info"
      emphasis
      icon="fas fa-rocket"
      actions={isDev ? {
        right: { label: 'Open Editor', icon: 'fas fa-arrow-right', onClick: () => navigate('/editor') },
        left:  { label: 'Browse Components', variant: 'secondary', onClick: () => navigate('/components') },
      } : {}}
    />
  </section>
</div>

<style>
  .kit {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-48);
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
    min-height: 100vh;
  }

  /* ============================ HERO ============================ */
  .hero {
    grid-column: 1 / -1;
    position: relative;
    padding: var(--space-48) 0 var(--space-16);
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    isolation: isolate;
  }

  .hero-text {
    grid-column: 2 / span 4;
    grid-row: 1;
    align-self: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    position: relative;
  }

  .hero-kite {
    grid-column: 5 / span 8;
    grid-row: 1;
    height: 32rem;
    position: relative;
    /* No z-index: must NOT form a stacking context, or the ::before glow
       below gets trapped inside the kite layer and paints over .hero-text.
       Without a stacking context the glow's z-index:-1 escapes back to
       .hero (isolation:isolate) and sits behind everything in the hero. */
  }

  .hero-kite::before {
    content: '';
    position: absolute;
    inset: -100% -100%;
    background: radial-gradient(
      ellipse 38% 48% at 50% 50%,
      color-mix(in srgb, var(--color-brand-500) 26%, transparent) 0%,
      transparent 100%
    );
    pointer-events: none;
    z-index: -1;
  }

  .hero-eyebrow {
    margin-bottom: var(--space-4);
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: var(--font-size-6xl);
    font-weight: var(--font-weight-semibold);
    font-variation-settings: 'opsz' 144, 'SOFT' 30;
    color: var(--text-primary);
    line-height: 1.15;
    margin: 0;
  }

  .hero-italic {
    font-family: var(--font-serif);
    font-weight: var(--font-weight-normal);
    color: var(--text-brand);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
    white-space: nowrap;
  }

  .hero-tagline {
    font-family: var(--font-serif);
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    line-height: 1.5;
    max-width: 36rem;
    margin: var(--space-8) 0 0;
  }

  .hero-actions {
    display: flex;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-top: var(--space-12);
  }

  /* === SECTION DIVIDERS span the content column === */
  .kit > :global(.section-divider) {
    grid-column: 2 / span 10;
  }

  /* ============================ KIT GRID ============================ */
  .kit-grid {
    grid-column: 2 / span 10;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-24);
  }

  /* ============================ PLAYGROUND ============================ */
  .playground {
    grid-column: 2 / span 10;
    display: grid;
    grid-template-columns: 1fr;
    row-gap: var(--space-32);
    background:
      radial-gradient(120% 80% at 50% 0%, var(--surface-canvas) 0%, var(--surface-canvas-low) 70%),
      var(--surface-canvas-low);
    border: var(--border-width-1) solid var(--border-canvas-subtle);
    border-radius: var(--radius-2xl);
    padding: var(--space-48) var(--space-32);
    box-shadow: var(--shadow-md);
  }

  .playground-control {
    justify-self: center;
  }

  .playground-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-20);
    min-height: 11rem;
    justify-content: center;
  }

  .stage-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    justify-content: center;
    align-items: center;
  }

  /* Shape demo: square corners and white text on every variant so the row reads
     as a shape study, not a tone study. The colored variants (success/warning/
     danger) get a saturated fill so white text has contrast. */
  .stage-shape :global(.button) {
    border-radius: var(--radius-sm);
    color: var(--text-primary);
  }
  .stage-shape :global(.button.success) {
    background: var(--color-success-600);
    border-color: var(--color-success-700);
  }
  .stage-shape :global(.button.warning) {
    background: var(--color-warning-600);
    border-color: var(--color-warning-700);
  }
  .stage-shape :global(.button.danger) {
    background: var(--color-danger-600);
    border-color: var(--color-danger-700);
  }

  .stage-stack {
    width: 100%;
    max-width: 32rem;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .stage-caption {
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--text-canvas-secondary);
    font-size: var(--font-size-md);
    text-align: center;
    margin: 0;
    max-width: 32rem;
  }

  .stage-caption :global(strong) {
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 0.92em;
    color: var(--text-primary);
    font-weight: var(--font-weight-normal);
    background: var(--overlay-low);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
  }

  /* ============================ TONES (callouts) ============================ */
  .tones-grid {
    grid-column: 2 / span 10;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-16);
  }

  /* ============================ ARCHITECTURE ============================ */
  .arch {
    grid-column: 2 / span 10;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .arch :global(.arch-card) {
    height: 100%;
  }

  .arch-table {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .arch-table-header {
    padding: 0 var(--space-4);
  }

  .arch-eyebrow {
    display: block;
    font-family: var(--font-sans);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    color: var(--text-accent);
    margin-bottom: var(--space-4);
  }

  .arch-table-header h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    line-height: 1.1;
  }

  .arch-table :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text-primary);
    background: var(--overlay-low);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  /* === Code blocks inside arch cards === */
  .arch :global(.code-block) {
    margin: var(--space-16) 0 0;
    padding: var(--space-12) var(--space-16);
    background: var(--surface-neutral-lowest);
    border: var(--border-width-1) solid var(--border-neutral-faint);
    border-radius: var(--radius-md);
    overflow-x: auto;
  }

  .arch :global(.code-block code) {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-accent);
    background: none;
    padding: 0;
    line-height: 1.7;
    white-space: pre;
  }

  /* ============================ HOW ============================ */
  .how {
    grid-column: 2 / span 10;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  /* ============================ CTA ============================ */
  .cta {
    grid-column: 2 / span 10;
  }

  /* Inline code, default — scoped to the kit so we don't leak into components */
  .kit :global(p > code),
  .kit :global(.callout code) {
    background: var(--overlay-low);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--text-primary);
  }

  /* ============================ RESPONSIVE ============================ */
  @media (max-width: 960px) {
    .hero-text {
      grid-column: 1 / -1;
    }
    .hero-kite {
      height: 28rem;
    }
    .kit > :global(.section-divider),
    .kit-grid,
    .playground,
    .tones-grid,
    .arch,
    .how,
    .cta {
      grid-column: 1 / -1;
    }
    .kit-grid,
    .tones-grid,
    .arch {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .kit {
      padding: var(--space-32) var(--space-16);
      row-gap: var(--space-32);
    }
    .hero-title {
      font-size: var(--font-size-5xl);
    }
    .playground {
      padding: var(--space-24) var(--space-16);
    }
  }
</style>
