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
    --section-divider-canvas-gradient-stop-1: var(--surface-canvas-highest);
    --section-divider-canvas-gradient-stop-2: var(--surface-canvas-higher);
    --section-divider-canvas-gradient-stop-3: var(--surface-canvas-high);
    --section-divider-canvas-gradient-stop-4: var(--surface-canvas);
    --section-divider-canvas-text-stroke: var(--surface-canvas-lowest);
    --section-divider-canvas-radius: var(--radius-lg);

    /* Neutral */
    --section-divider-neutral-gradient-stop-1: var(--surface-neutral-highest);
    --section-divider-neutral-gradient-stop-2: var(--surface-neutral-higher);
    --section-divider-neutral-gradient-stop-3: var(--surface-neutral-high);
    --section-divider-neutral-gradient-stop-4: var(--surface-neutral);
    --section-divider-neutral-text-stroke: var(--surface-neutral-lowest);
    --section-divider-neutral-radius: var(--radius-lg);

    /* Alternate */
    --section-divider-alternate-gradient-stop-1: var(--surface-alternate-highest);
    --section-divider-alternate-gradient-stop-2: var(--surface-alternate-higher);
    --section-divider-alternate-gradient-stop-3: var(--surface-alternate-high);
    --section-divider-alternate-gradient-stop-4: var(--surface-alternate);
    --section-divider-alternate-text-stroke: var(--surface-alternate-lowest);
    --section-divider-alternate-radius: var(--radius-lg);

    /* Primary */
    --section-divider-primary-gradient-stop-1: var(--surface-primary-highest);
    --section-divider-primary-gradient-stop-2: var(--surface-primary-higher);
    --section-divider-primary-gradient-stop-3: var(--surface-primary-high);
    --section-divider-primary-gradient-stop-4: var(--surface-primary);
    --section-divider-primary-text-stroke: var(--surface-primary-lowest);
    --section-divider-primary-radius: var(--radius-lg);

    /* Accent */
    --section-divider-accent-gradient-stop-1: var(--surface-accent-highest);
    --section-divider-accent-gradient-stop-2: var(--surface-accent-higher);
    --section-divider-accent-gradient-stop-3: var(--surface-accent-high);
    --section-divider-accent-gradient-stop-4: var(--surface-accent);
    --section-divider-accent-text-stroke: var(--surface-accent-lowest);
    --section-divider-accent-radius: var(--radius-lg);

    /* Special */
    --section-divider-special-gradient-stop-1: var(--surface-special-highest);
    --section-divider-special-gradient-stop-2: var(--surface-special-higher);
    --section-divider-special-gradient-stop-3: var(--surface-special-high);
    --section-divider-special-gradient-stop-4: var(--surface-special);
    --section-divider-special-text-stroke: var(--surface-special-lowest);
    --section-divider-special-radius: var(--radius-lg);
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
    --_divider-1: var(--section-divider-canvas-gradient-stop-1);
    --_divider-2: var(--section-divider-canvas-gradient-stop-2);
    --_divider-3: var(--section-divider-canvas-gradient-stop-3);
    --_divider-4: var(--section-divider-canvas-gradient-stop-4);
    --_divider-stroke: var(--section-divider-canvas-text-stroke);
    --_divider-radius: var(--section-divider-canvas-radius);
  }

  .variant-neutral {
    --_divider-1: var(--section-divider-neutral-gradient-stop-1);
    --_divider-2: var(--section-divider-neutral-gradient-stop-2);
    --_divider-3: var(--section-divider-neutral-gradient-stop-3);
    --_divider-4: var(--section-divider-neutral-gradient-stop-4);
    --_divider-stroke: var(--section-divider-neutral-text-stroke);
    --_divider-radius: var(--section-divider-neutral-radius);
  }

  .variant-alternate {
    --_divider-1: var(--section-divider-alternate-gradient-stop-1);
    --_divider-2: var(--section-divider-alternate-gradient-stop-2);
    --_divider-3: var(--section-divider-alternate-gradient-stop-3);
    --_divider-4: var(--section-divider-alternate-gradient-stop-4);
    --_divider-stroke: var(--section-divider-alternate-text-stroke);
    --_divider-radius: var(--section-divider-alternate-radius);
  }

  .variant-primary {
    --_divider-1: var(--section-divider-primary-gradient-stop-1);
    --_divider-2: var(--section-divider-primary-gradient-stop-2);
    --_divider-3: var(--section-divider-primary-gradient-stop-3);
    --_divider-4: var(--section-divider-primary-gradient-stop-4);
    --_divider-stroke: var(--section-divider-primary-text-stroke);
    --_divider-radius: var(--section-divider-primary-radius);
  }

  .variant-accent {
    --_divider-1: var(--section-divider-accent-gradient-stop-1);
    --_divider-2: var(--section-divider-accent-gradient-stop-2);
    --_divider-3: var(--section-divider-accent-gradient-stop-3);
    --_divider-4: var(--section-divider-accent-gradient-stop-4);
    --_divider-stroke: var(--section-divider-accent-text-stroke);
    --_divider-radius: var(--section-divider-accent-radius);
  }

  .variant-special {
    --_divider-1: var(--section-divider-special-gradient-stop-1);
    --_divider-2: var(--section-divider-special-gradient-stop-2);
    --_divider-3: var(--section-divider-special-gradient-stop-3);
    --_divider-4: var(--section-divider-special-gradient-stop-4);
    --_divider-stroke: var(--section-divider-special-text-stroke);
    --_divider-radius: var(--section-divider-special-radius);
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
