<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import Callout from '../../system/components/Callout.svelte';
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
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

  let stageCaption = $derived.by(() => {
    if (!shape && !color) return 'Default config.';
    if (shape && !color) return 'Larger serif. Square corners. Tighter padding.';
    if (!shape && color) return 'Each variant takes a new tone.';
    return 'Shape and color stacked.';
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
  variant="sm"
  title="See it live."
  description="One button component. Two overrides. Toggle Shape and Color independently. The tokens cascade through every variant instantly."
  gap="var(--space-8)"
>
  <div class="stage-wrap">
    <div class="playground-control">
      <SegmentedControl
        {segments}
        value={activeSegment}
        onchange={handleSelect}
      />
    </div>

    <div class="playground" style={stageStyle}>
      <div class="stage-row">
        <div class="stage-cell"><Button>Primary</Button></div>
        <div class="stage-cell"><Button variant="secondary">Secondary</Button></div>
        <div class="stage-cell"><Button variant="outline">Outline</Button></div>
        <div class="stage-cell"><Button variant="success" icon="fas fa-check">Success</Button></div>
        <div class="stage-cell"><Button variant="warning" icon="fas fa-bolt">Warning</Button></div>
        <div class="stage-cell"><Button variant="danger" icon="fas fa-xmark">Danger</Button></div>
      </div>
      <p class="stage-caption">{stageCaption}</p>
    </div>
  </div>

  <div class="tones-grid">
    <Callout variant="info" label="Development">
      Edit tokens and components directly in the browser. No rebuild step, no context switch.
    </Callout>
    <Callout variant="info" label="Production">
      Ship pure CSS to your users. The editor stays on the development side.
    </Callout>
    <Callout variant="info" label="Foundational Tokens">
      One vocabulary for colors, spacing, and type. Update a value and the whole system follows.
    </Callout>
    <Callout variant="info" label="Semantic Properties">
      Restyle any part of a component without touching the rest.
    </Callout>
  </div>
</Section>

<style>
  .stage-wrap {
    --picker-overlap: 1.8rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .playground-control {
    display: flex;
    justify-content: center;
    position: relative;
    z-index: 2;
    margin-bottom: calc(-1 * var(--picker-overlap));
  }

  .playground {
    --notch-width: 22.5rem;
    --notch-height: calc(var(--picker-overlap));
    --stage-gap: var(--space-32);
    --stage-row-height: 4rem;

    display: grid;
    grid-template-rows: var(--stage-row-height) auto;
    row-gap: var(--stage-gap);
    justify-items: center;
    box-sizing: border-box;
    width: 100%;
    background: var(--surface-neutral-lowest);
    border: var(--border-width-4) solid var(--border-neutral);
    border-radius: var(--radius-2xl);
    padding: calc(var(--stage-gap) + var(--picker-overlap)) var(--space-32) var(--stage-gap);
    box-shadow:
      inset 0 var(--space-4) var(--space-20) hsla(237, 18%, 2%, 0.7),
      inset 0 -1px 0 hsla(0, 0%, 100%, 0.03);

    -webkit-mask:
      linear-gradient(#000, #000) 0 0 / 100% 100% no-repeat,
      linear-gradient(#000, #000) center top / var(--notch-width) var(--notch-height) no-repeat;
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#000, #000) 0 0 / 100% 100% no-repeat,
      linear-gradient(#000, #000) center top / var(--notch-width) var(--notch-height) no-repeat;
    mask-composite: exclude;
  }

  .stage-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    justify-content: center;
    align-items: center;
  }

  .stage-cell {
    width: 8.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stage-caption {
    font-family: var(--font-serif);
    color: var(--text-primary);
    font-size: var(--font-size-3xl);
    line-height: var(--line-height-sm);
    text-align: center;
    margin: 0;
    max-width: none;
    align-self: stretch;
  }

  .tones-grid {
    margin-top: var(--space-16);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-24);
  }

  .tones-grid :global(.callout) {
    margin: 0;
  }

  @media (max-width: 960px) {
    .tones-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .playground {
      padding: var(--space-24) var(--space-16);
    }
  }
</style>
