<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
  import Panel from '../../system/components/Panel.svelte';
  import Section from '../Section.svelte';

  type Override = 'shape' | 'color';

  let shape = $state(false);
  let color = $state(false);
  // Tracks the most-recently-applied override so the SegmentedControl can
  // single-highlight it while the underlying applied set stays additive.
  let lastApplied = $state<Override | null>(null);

  const segments = [
    { value: 'default', label: 'Default', icon: 'fas fa-circle' },
    { value: 'shape',   label: 'Shape',   icon: 'fas fa-shapes' },
    { value: 'color',   label: 'Color',   icon: 'fas fa-droplet' },
  ];

  const variants = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;

  const shapeOverride: Record<string, string> = (() => {
    const out: Record<string, string> = {};
    for (const v of variants) {
      out[`--button-${v}-radius`] = 'var(--radius-sm)';
      out[`--button-${v}-border-width`] = 'var(--border-width-2)';
      out[`--button-${v}-text-font-family`] = 'var(--font-serif)';
      out[`--button-${v}-text-font-size`] = 'var(--font-size-2xl)';
      out[`--button-${v}-padding`] = 'var(--space-6)';
    }
    return out;
  })();

  const colorOverride: Record<string, string> = {
    '--button-primary-surface': 'var(--surface-special-high)',
    '--button-primary-border': 'var(--border-special)',
    '--button-primary-hover-surface': 'var(--surface-special-higher)',
    '--button-primary-hover-border': 'var(--border-special-strong)',

    '--button-outline-border': 'var(--border-special)',
    '--button-outline-text': 'var(--text-special)',
    '--button-outline-hover-border': 'var(--border-special-strong)',

    '--button-success-surface': 'var(--surface-accent-low)',
    '--button-success-border': 'var(--border-accent)',
    '--button-success-text': 'var(--text-accent)',
    '--button-success-hover-surface': 'var(--surface-accent-higher)',
    '--button-success-hover-border': 'var(--border-accent-strong)',

    '--button-warning-surface': 'var(--surface-info-low)',
    '--button-warning-border': 'var(--border-info)',
    '--button-warning-text': 'var(--text-info)',
    '--button-warning-hover-surface': 'var(--surface-info-high)',
    '--button-warning-hover-border': 'var(--border-info-medium)',

    '--button-danger-surface': 'var(--surface-brand-low)',
    '--button-danger-border': 'var(--border-brand)',
    '--button-danger-text': 'var(--text-brand)',
    '--button-danger-hover-surface': 'var(--surface-brand-high)',
    '--button-danger-hover-border': 'var(--border-brand-medium)',
  };

  let stageStyle = $derived.by(() => {
    const merged: Record<string, string> = {};
    if (shape) Object.assign(merged, shapeOverride);
    if (color) Object.assign(merged, colorOverride);
    return Object.entries(merged)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  });

  // The highlighted segment tracks the most-recently-applied override that
  // is still on. When the last-applied override gets toggled off, the
  // highlight falls back to whatever else is still on, or Default.
  let activeSegment = $derived.by(() => {
    if (lastApplied === 'shape' && shape) return 'shape';
    if (lastApplied === 'color' && color) return 'color';
    if (shape) return 'shape';
    if (color) return 'color';
    return 'default';
  });

  function handleSelect(v: string) {
    if (v === 'default') {
      shape = false;
      color = false;
      lastApplied = null;
      return;
    }
    if (v === 'shape') {
      shape = !shape;
      lastApplied = shape ? 'shape' : color ? 'color' : null;
      return;
    }
    if (v === 'color') {
      color = !color;
      lastApplied = color ? 'color' : shape ? 'shape' : null;
    }
  }
</script>

<Section
  title="The Kit"
  eyebrow="What's inside"
  description="A basic set of design system components connected to a token library."
  gap="var(--space-8)"
>
  <div class="kit-grid">
    <div class="kit-item kit-lead">
      <div class="kit-head">
        <i class="fas fa-pen-ruler kit-icon"></i>
        <span class="kit-title">Live editor</span>
      </div>
      <div class="kit-body">
        <p>
          Edit tokens and components on top of the page and watch every change cascade immediately.
        </p>
      </div>
    </div>

    <div class="kit-item">
      <div class="kit-head">
        <i class="fas fa-palette kit-icon"></i>
        <span class="kit-title">Design tokens</span>
      </div>
      <div class="kit-body"><p>A complete set of atomic CSS variables for styling.</p></div>
    </div>

    <div class="kit-item">
      <div class="kit-head">
        <i class="fas fa-puzzle-piece kit-icon"></i>
        <span class="kit-title">Component library</span>
      </div>
      <div class="kit-body"><p>A customizable set of components linked to the tokens.</p></div>
    </div>

    <div class="kit-item">
      <div class="kit-head">
        <i class="fas fa-cube kit-icon"></i>
        <span class="kit-title">Ships as CSS</span>
      </div>
      <div class="kit-body"><p>Standard output. The editor stays in development.</p></div>
    </div>
  </div>

  <div class="kit-preview">
    <div class="swap-block">
      <div class="swap-control">
        <SectionDivider title="Swap tokens with a click" variant="sm" />
        <SegmentedControl {segments} value={activeSegment} onchange={handleSelect} />
      </div>

      <Panel style={stageStyle}>
        <div class="stage">
          <span class="stage-eyebrow">Token demo</span>
          <div class="swap-row">
            <div class="stage-cell"><Button>Primary</Button></div>
            <div class="stage-cell"><Button variant="secondary">Secondary</Button></div>
            <div class="stage-cell"><Button variant="outline">Outline</Button></div>
            <div class="stage-cell"><Button variant="success" icon="fas fa-check">Success</Button></div>
            <div class="stage-cell"><Button variant="warning" icon="fas fa-bolt">Warning</Button></div>
            <div class="stage-cell"><Button variant="danger" icon="fas fa-xmark">Danger</Button></div>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</Section>

<style>
  /* 10 tracks reproduce the section's slice of the page grid (it spans page
     columns 2–11), so each item lands on exactly three of those columns and the
     row stops at column 9, leaving column 10 open on the right. */
  .kit-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .kit-item {
    grid-column: span 3;
    display: flex;
    flex-direction: column;
  }

  .kit-head {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    padding: 0 0 var(--space-12);
  }

  /* Title, body and icon mirror the Card typography used in the Layers section. */
  .kit-icon {
    font-size: var(--icon-size-2xl);
    color: var(--text-primary);
  }

  .kit-title {
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-md);
  }

  .kit-body {
    padding: var(--space-12) 0 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    line-height: var(--line-height-md);
    font-weight: var(--font-weight-normal);
    color: var(--text-secondary);
  }

  /* site.css sets `p { font-family: serif }` at element level, which beats the
     font-family inherited from .kit-body. Force the paragraph to inherit. */
  .kit-body :global(p) {
    margin: 0;
    font: inherit;
    color: inherit;
  }

  /* The pink hairline is the section's whole structural device: a horizontal
     rule under each item's title, and a vertical rule splitting the lead. */
  .kit-item:not(.kit-lead) .kit-head {
    border-bottom: var(--border-width-2) solid var(--border-brand);
  }

  /* Lead spans the full row; icon + title sit in the first column track, copy
     fills the rest, mirroring the three columns below. */
  /* Subgrid inherits the parent's 10 tracks so the head and copy align to real
     columns: head centered on tracks 1–3 (page cols 2–4), copy on tracks 4–9
     (page cols 5–10), with the last track left open like the items below. */
  .kit-lead {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    align-items: center;
    border-radius: var(--radius-lg);
    /* Light brand wash strongest behind the "Live editor" head, dissolving
       across the full block to nothing at the right edge — head and copy both
       sit inside the fade. */
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-brand-500) 21%, transparent),
      transparent
    );
  }

  .kit-lead .kit-head {
    grid-column: 1 / span 3;
    justify-content: center;
    gap: var(--space-16);
    padding: var(--space-32) 0;
  }

  .kit-lead .kit-icon {
    font-size: var(--icon-size-4xl, 3rem);
  }

  .kit-lead .kit-title {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
  }

  .kit-lead .kit-body {
    grid-column: 4 / span 6;
    padding: var(--space-32) 0;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
  }

  /* Controls sit above; the panel below is just the demo surface. */
  /* Same 10-track grid as the cards so the block lands on real columns. */
  .kit-preview {
    margin-top: var(--space-32);
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    column-gap: var(--columns-gutter);
  }

  /* Tracks 1–9 (page cols 2–10), leaving the last column open like the items
     above. Label pins to the left column, control to the right. */
  .swap-block {
    grid-column: 1 / 10;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-12);
  }

  .swap-control {
    margin-top: var(--space-32);
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-24);
  }

  /* Use the sm divider purely as a styled label beside the control: drop its
     built-in margin, and hide its hairline (gated by --_divider-hairline, which
     no longer matches any @container query when set to none). */
  .swap-control :global(.section-divider) {
    margin: 0;
    --_divider-hairline: none;
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-12);
  }

  .stage-eyebrow {
    align-self: center;
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-wide);
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .swap-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    justify-content: center;
    align-items: center;
    /* Reserved so toggling Shape (taller buttons) doesn't reflow the panel. */
    min-height: 4rem;
  }

  .stage-cell {
    width: 8.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 960px) {
    .kit-grid {
      grid-template-columns: 1fr;
    }
    .kit-item {
      grid-column: auto;
    }
    .swap-block {
      grid-column: 1 / -1;
    }

    .kit-lead {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      background: none;
    }
    /* Stacked: the head gets its own tinted bar instead of the fade. */
    .kit-lead .kit-head {
      justify-content: flex-start;
      gap: var(--space-12);
      padding: var(--space-16) var(--space-20);
      background: color-mix(in srgb, var(--color-brand-500) 12%, transparent);
    }
    .kit-lead .kit-body {
      padding: var(--space-16) var(--space-20);
      font-size: var(--font-size-xl);
    }
  }
</style>
