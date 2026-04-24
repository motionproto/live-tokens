<script lang="ts">
  export let title: string;
  export let description: string | undefined = undefined;
  export let variant: 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special' = 'canvas';
</script>

<div class="section-divider variant-{variant}">
  <span class="divider-label">{title}</span>
  {#if description}
    <p class="divider-description">{description}</p>
  {/if}
</div>

<style>
  :global(:root) {
    /* Background */
    --sectiondivider-canvas-gradient-stop-1: var(--surface-canvas-highest);
    --sectiondivider-canvas-gradient-stop-2: var(--surface-canvas-higher);
    --sectiondivider-canvas-gradient-stop-3: var(--surface-canvas-high);
    --sectiondivider-canvas-gradient-stop-4: var(--surface-canvas);
    --sectiondivider-canvas-text-stroke: var(--surface-canvas-lowest);
    --sectiondivider-canvas-radius: var(--radius-lg);

    /* Neutral */
    --sectiondivider-neutral-gradient-stop-1: var(--surface-neutral-highest);
    --sectiondivider-neutral-gradient-stop-2: var(--surface-neutral-higher);
    --sectiondivider-neutral-gradient-stop-3: var(--surface-neutral-high);
    --sectiondivider-neutral-gradient-stop-4: var(--surface-neutral);
    --sectiondivider-neutral-text-stroke: var(--surface-neutral-lowest);
    --sectiondivider-neutral-radius: var(--radius-lg);

    /* Alternate */
    --sectiondivider-alternate-gradient-stop-1: var(--surface-alternate-highest);
    --sectiondivider-alternate-gradient-stop-2: var(--surface-alternate-higher);
    --sectiondivider-alternate-gradient-stop-3: var(--surface-alternate-high);
    --sectiondivider-alternate-gradient-stop-4: var(--surface-alternate);
    --sectiondivider-alternate-text-stroke: var(--surface-alternate-lowest);
    --sectiondivider-alternate-radius: var(--radius-lg);

    /* Primary */
    --sectiondivider-primary-gradient-stop-1: var(--surface-primary-highest);
    --sectiondivider-primary-gradient-stop-2: var(--surface-primary-higher);
    --sectiondivider-primary-gradient-stop-3: var(--surface-primary-high);
    --sectiondivider-primary-gradient-stop-4: var(--surface-primary);
    --sectiondivider-primary-text-stroke: var(--surface-primary-lowest);
    --sectiondivider-primary-radius: var(--radius-lg);

    /* Accent */
    --sectiondivider-accent-gradient-stop-1: var(--surface-accent-highest);
    --sectiondivider-accent-gradient-stop-2: var(--surface-accent-higher);
    --sectiondivider-accent-gradient-stop-3: var(--surface-accent-high);
    --sectiondivider-accent-gradient-stop-4: var(--surface-accent);
    --sectiondivider-accent-text-stroke: var(--surface-accent-lowest);
    --sectiondivider-accent-radius: var(--radius-lg);

    /* Special */
    --sectiondivider-special-gradient-stop-1: var(--surface-special-highest);
    --sectiondivider-special-gradient-stop-2: var(--surface-special-higher);
    --sectiondivider-special-gradient-stop-3: var(--surface-special-high);
    --sectiondivider-special-gradient-stop-4: var(--surface-special);
    --sectiondivider-special-text-stroke: var(--surface-special-lowest);
    --sectiondivider-special-radius: var(--radius-lg);
  }

  .section-divider {
    margin: var(--space-24) 0;
    padding: var(--space-16) var(--space-24);
    border-radius: var(--_divider-radius);
    background: linear-gradient(135deg,
      var(--_divider-1) 0%,
      var(--_divider-2) 30%,
      var(--_divider-3) 60%,
      var(--_divider-4) 100%
    );
  }

  /* Variant palette mappings */
  .variant-canvas {
    --_divider-1: var(--sectiondivider-canvas-gradient-stop-1);
    --_divider-2: var(--sectiondivider-canvas-gradient-stop-2);
    --_divider-3: var(--sectiondivider-canvas-gradient-stop-3);
    --_divider-4: var(--sectiondivider-canvas-gradient-stop-4);
    --_divider-stroke: var(--sectiondivider-canvas-text-stroke);
    --_divider-radius: var(--sectiondivider-canvas-radius);
  }

  .variant-neutral {
    --_divider-1: var(--sectiondivider-neutral-gradient-stop-1);
    --_divider-2: var(--sectiondivider-neutral-gradient-stop-2);
    --_divider-3: var(--sectiondivider-neutral-gradient-stop-3);
    --_divider-4: var(--sectiondivider-neutral-gradient-stop-4);
    --_divider-stroke: var(--sectiondivider-neutral-text-stroke);
    --_divider-radius: var(--sectiondivider-neutral-radius);
  }

  .variant-alternate {
    --_divider-1: var(--sectiondivider-alternate-gradient-stop-1);
    --_divider-2: var(--sectiondivider-alternate-gradient-stop-2);
    --_divider-3: var(--sectiondivider-alternate-gradient-stop-3);
    --_divider-4: var(--sectiondivider-alternate-gradient-stop-4);
    --_divider-stroke: var(--sectiondivider-alternate-text-stroke);
    --_divider-radius: var(--sectiondivider-alternate-radius);
  }

  .variant-primary {
    --_divider-1: var(--sectiondivider-primary-gradient-stop-1);
    --_divider-2: var(--sectiondivider-primary-gradient-stop-2);
    --_divider-3: var(--sectiondivider-primary-gradient-stop-3);
    --_divider-4: var(--sectiondivider-primary-gradient-stop-4);
    --_divider-stroke: var(--sectiondivider-primary-text-stroke);
    --_divider-radius: var(--sectiondivider-primary-radius);
  }

  .variant-accent {
    --_divider-1: var(--sectiondivider-accent-gradient-stop-1);
    --_divider-2: var(--sectiondivider-accent-gradient-stop-2);
    --_divider-3: var(--sectiondivider-accent-gradient-stop-3);
    --_divider-4: var(--sectiondivider-accent-gradient-stop-4);
    --_divider-stroke: var(--sectiondivider-accent-text-stroke);
    --_divider-radius: var(--sectiondivider-accent-radius);
  }

  .variant-special {
    --_divider-1: var(--sectiondivider-special-gradient-stop-1);
    --_divider-2: var(--sectiondivider-special-gradient-stop-2);
    --_divider-3: var(--sectiondivider-special-gradient-stop-3);
    --_divider-4: var(--sectiondivider-special-gradient-stop-4);
    --_divider-stroke: var(--sectiondivider-special-text-stroke);
    --_divider-radius: var(--sectiondivider-special-radius);
  }

  .divider-label {
    display: block;
    font-family: var(--font-display);
    font-size: var(--font-size-5xl);
    line-height: 1.05;
    color: #fff;
    overflow-wrap: break-word;
    word-wrap: break-word;
    hyphens: auto;
    text-shadow:
      -4px -4px 0 var(--_divider-stroke),
      4px -4px 0 var(--_divider-stroke),
      -4px 4px 0 var(--_divider-stroke),
      4px 4px 0 var(--_divider-stroke),
      0 -4px 0 var(--_divider-stroke),
      0 4px 0 var(--_divider-stroke),
      -4px 0 0 var(--_divider-stroke),
      4px 0 0 var(--_divider-stroke);
  }

  .divider-description {
    margin: var(--space-4) 0 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    color: rgba(255, 255, 255, 0.8);
    line-height: var(--line-height-normal);
  }

  @media (max-width: 600px) {
    .section-divider {
      padding: var(--space-12) var(--space-16);
    }

    .divider-label {
      text-shadow:
        -2px -2px 0 var(--_divider-stroke),
        2px -2px 0 var(--_divider-stroke),
        -2px 2px 0 var(--_divider-stroke),
        2px 2px 0 var(--_divider-stroke),
        0 -2px 0 var(--_divider-stroke),
        0 2px 0 var(--_divider-stroke),
        -2px 0 0 var(--_divider-stroke),
        2px 0 0 var(--_divider-stroke);
    }
  }
</style>
