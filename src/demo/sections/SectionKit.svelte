<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import Panel from '../../system/components/Panel.svelte';
  import Section from '../Section.svelte';

  let { prose = true }: { prose?: boolean } = $props();

  // Matches the demo's phone breakpoint in Demo.svelte.
  const phone = new MediaQuery('max-width: 600px');

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

  const FAMILIES = ['brand', 'accent', 'special', 'info', 'success', 'warning', 'danger'] as const;
  type Family = (typeof FAMILIES)[number];
  // The family each swapped variant paints from. Outline follows primary.
  const SOURCES = { primary: 'brand', success: 'success', warning: 'warning', danger: 'danger' } as const;
  type Swapped = keyof typeof SOURCES;
  // Themes can give two families near-identical hues (Autumn's warning and
  // accent share one), so a fixed swap can land on the colour it replaces.
  const MIN_HUE_SHIFT = 60;
  const SAME_HUE = 15;

  let colorMap = $state<Record<Swapped, Family> | null>(null);
  let colorStep = 0;

  function familyHues(): Record<Family, number> {
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const hues = {} as Record<Family, number>;
    for (const family of FAMILIES) {
      probe.style.color = `var(--color-${family}-500)`;
      hues[family] = Number(/oklch\(\S+ \S+ ([\d.]+)/.exec(getComputedStyle(probe).color)?.[1] ?? 0);
    }
    probe.remove();
    return hues;
  }

  function hueGap(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  }

  /** Each variant takes a family far enough round the wheel from its own,
   *  on a hue no other variant has where the theme has enough, rotated by
   *  `step`. Hue, not family: two families can share one. */
  function pickColorMap(step: number): Record<Swapped, Family> {
    const hues = familyHues();
    const used: number[] = [];
    const map = {} as Record<Swapped, Family>;
    for (const [variant, source] of Object.entries(SOURCES) as [Swapped, Family][]) {
      const byGap = FAMILIES.filter((f) => f !== source).sort((a, b) => hueGap(hues[b], hues[source]) - hueGap(hues[a], hues[source]));
      const far = byGap.filter((f) => hueGap(hues[f], hues[source]) >= MIN_HUE_SHIFT);
      const pool = far.length > 0 ? far : byGap.slice(0, 1);
      const rotated = pool.map((_, i) => pool[(i + step) % pool.length]);
      map[variant] = rotated.find((f) => used.every((h) => hueGap(h, hues[f]) >= SAME_HUE)) ?? rotated[0];
      used.push(hues[map[variant]]);
    }
    return map;
  }

  function nextColorMap(): Record<Swapped, Family> {
    const current = JSON.stringify(colorMap);
    for (let tries = 0; tries < FAMILIES.length; tries++) {
      const map = pickColorMap(++colorStep);
      if (JSON.stringify(map) !== current) return map;
    }
    return pickColorMap(colorStep);
  }

  function colorOverride({ primary: p, success: s, warning: w, danger: d }: Record<Swapped, Family>): Record<string, string> {
    return {
      '--button-primary-surface': `var(--surface-${p}-high)`,
      '--button-primary-border': `var(--border-${p})`,
      '--button-primary-hover-surface': `var(--surface-${p}-higher)`,
      '--button-primary-hover-border': `var(--border-${p}-strong)`,

      '--button-outline-border': `var(--border-${p})`,
      '--button-outline-text': `var(--text-${p})`,
      '--button-outline-hover-border': `var(--border-${p}-strong)`,

      '--button-success-surface': `var(--surface-${s}-low)`,
      '--button-success-border': `var(--border-${s})`,
      '--button-success-text': `var(--text-${s})`,
      '--button-success-hover-surface': `var(--surface-${s}-higher)`,
      '--button-success-hover-border': `var(--border-${s}-strong)`,

      '--button-warning-surface': `var(--surface-${w}-low)`,
      '--button-warning-border': `var(--border-${w})`,
      '--button-warning-text': `var(--text-${w})`,
      '--button-warning-hover-surface': `var(--surface-${w}-high)`,
      '--button-warning-hover-border': `var(--border-${w}-medium)`,

      '--button-danger-surface': `var(--surface-${d}-low)`,
      '--button-danger-border': `var(--border-${d})`,
      '--button-danger-text': `var(--text-${d})`,
      '--button-danger-hover-surface': `var(--surface-${d}-high)`,
      '--button-danger-hover-border': `var(--border-${d}-medium)`,
    };
  }

  let stageStyle = $derived.by(() => {
    const merged: Record<string, string> = {};
    if (shape) Object.assign(merged, shapeOverride);
    if (color && colorMap) Object.assign(merged, colorOverride(colorMap));
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
    // Every press of Color is a new swap, so it never toggles back off.
    if (v === 'color') {
      colorMap = nextColorMap();
      color = true;
      lastApplied = 'color';
    }
  }
</script>

<Section
  class="kit-section"
  title="The Kit"
  eyebrow="What's inside"
  description="A basic set of design system components connected to a token library."
  gap="var(--space-8)"
>
  <div class="kit-grid">
    <div class="kit-item kit-lead sketch-container">
      <div class="kit-head sketch-surface">
        <i class="fas fa-pen-ruler kit-icon"></i>
        <span class="kit-title">Live editor</span>
      </div>
      <span class="kit-rule sketch-rule" aria-hidden="true"></span>
      <div class="kit-body" class:prose>
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
      <span class="kit-rule sketch-rule" aria-hidden="true"></span>
      <div class="kit-body" class:prose><p>A complete set of atomic CSS variables for styling.</p></div>
    </div>

    <div class="kit-item">
      <div class="kit-head">
        <i class="fas fa-puzzle-piece kit-icon"></i>
        <span class="kit-title">Component library</span>
      </div>
      <span class="kit-rule sketch-rule" aria-hidden="true"></span>
      <div class="kit-body" class:prose><p>A customizable set of components linked to the tokens.</p></div>
    </div>

    <div class="kit-item">
      <div class="kit-head">
        <i class="fas fa-cube kit-icon"></i>
        <span class="kit-title">Ships as CSS</span>
      </div>
      <span class="kit-rule sketch-rule" aria-hidden="true"></span>
      <div class="kit-body" class:prose><p>Standard output. The editor stays in development.</p></div>
    </div>
  </div>

  <div class="kit-preview">
    <div class="swap-block">
      <div class="swap-control">
        <SectionDivider title="Swap tokens with a click" variant="sm" />
        <SegmentedControl {segments} value={activeSegment} onchange={handleSelect} size={phone.current ? 'small' : 'default'} />
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

<style lang="scss">
  @use '../../system/styles/slot-prose' as *;

  /* The section spans page columns 2–11, so its tracks are the page grid
     minus one column on each side; each item then lands on exactly three page
     columns and the row stops at column 9, leaving column 10 open on the right. */
  .kit-grid {
    display: grid;
    grid-template-columns: repeat(calc(var(--columns-count) - 2), minmax(0, 1fr));
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

  /* Title and body match the Card in the Layers section at desktop sizes, and
     take the text styles' phone sizes below it. */
  .kit-icon {
    font-size: var(--icon-size-2xl);
    color: var(--text-primary);
  }

  .kit-title {
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: var(--heading-md-font-size);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
  }

  .kit-body {
    padding: var(--space-12) 0 0;
    font-family: var(--font-sans);
    font-size: var(--body-xl-font-size);
    line-height: var(--line-height-normal);
    font-weight: var(--font-weight-normal);
    color: var(--text-secondary);

    @include slot-prose;
  }

  /* The pink hairline is the section's whole structural device: a horizontal
     rule under each item's title, and a vertical rule splitting the lead.
     It is an element rather than a border on .kit-head so that Sketch mode can
     redraw it — the effect displaces boxes, and a border is not one. */
  .kit-rule {
    height: var(--border-width-2);
    background: var(--border-brand);
    --sketch-fill: var(--border-brand);
  }

  .kit-lead .kit-rule {
    display: none;
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
       sit inside the fade. Declared once and handed to the sketch layer too:
       the effect blanks the real background, so a wash named only here would
       vanish when Sketch mode is on. */
    --kit-lead-wash: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-brand-500) 21%, transparent),
      transparent
    );
    background: var(--kit-lead-wash);
    --sketch-fill: var(--kit-lead-wash);
    --sketch-stroke: transparent;
    /* The block draws no outline, and hatching takes its ink from the outline
       unless a part names its own. */
    --sketch-hatch-color: var(--color-brand-500);
  }

  /* The head only carries a surface of its own when stacked (see the 1200
     breakpoint). Here it has none, and --sketch-fill inherits, so without this
     the layer would draw the lead's wash a second time behind the head. */
  .kit-lead .kit-head {
    grid-column: 1 / span 3;
    justify-content: center;
    gap: var(--space-16);
    padding: var(--space-32) 0;
    --sketch-fill: transparent;
    --sketch-stroke: transparent;
    --sketch-radius: 0px;
  }

  .kit-lead .kit-icon {
    font-size: var(--icon-size-4xl, 3rem);
  }

  .kit-lead .kit-title {
    font-size: var(--heading-xl-font-size);
    font-weight: var(--font-weight-bold);
  }

  .kit-lead .kit-body {
    grid-column: 4 / span 6;
    padding: var(--space-32) 0;
    font-size: var(--body-2xl-font-size);
    color: var(--text-primary);
  }

  /* Controls sit above; the panel below is just the demo surface. */
  /* Same 10-track grid as the cards so the block lands on real columns. */
  .kit-preview {
    margin-top: var(--space-32);
    display: grid;
    grid-template-columns: repeat(calc(var(--columns-count) - 2), minmax(0, 1fr));
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

  /* Two cells of one width, shrink-wrapped to the left. `width: max-content`
     leaves the fr tracks an indefinite parent to resolve against, so both take
     the wider select's size instead of splitting the block. */
  .stage {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-12);
  }

  .stage-eyebrow {
    align-self: center;
    font-family: var(--font-sans);
    font-size: var(--body-md-font-size);
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

  @media (max-width: 1200px) {
    .kit-grid,
    .kit-preview {
      grid-template-columns: minmax(0, 1fr);
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
      --sketch-fill: none;
    }
    /* Stacked: the head gets its own tinted bar instead of the fade. It draws
       no outline, so the hatching takes the lead block's ink. */
    .kit-lead .kit-head {
      justify-content: flex-start;
      gap: var(--space-12);
      padding: var(--space-16) var(--space-20);
      --kit-head-tint: color-mix(in srgb, var(--color-brand-500) 12%, transparent);
      background: var(--kit-head-tint);
      --sketch-fill: var(--kit-head-tint);
      --sketch-hatch-color: var(--color-brand-500);
    }
    .kit-lead .kit-body {
      padding: var(--space-16) var(--space-20);
      font-size: var(--body-xl-font-size);
    }
  }

  /* Phone: the lead's text lines up with the page margin, and the head's tint
     bleeds out to the screen edges. The tint is a border-image outset, which
     paints past the box without widening the section. The swap control spans
     the column, its segments sharing the width. */
  @media (max-width: 600px) {
    .swap-control {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-8);
    }
    .swap-control :global(.segmented-control) {
      display: flex;
    }
    .swap-control :global(.segment) {
      flex: 1 1 0;
      min-width: 0;
      justify-content: center;
    }
    .kit-lead .kit-head {
      padding-inline: 0;
      background: none;
      border-image: conic-gradient(var(--kit-head-tint) 0 0) fill 0 / 0 / 0 var(--space-16);
    }
    .kit-lead .kit-body {
      padding-inline: 0;
    }
  }
</style>
