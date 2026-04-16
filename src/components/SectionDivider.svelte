<script lang="ts">
  export let title: string;
  export let description: string | undefined = undefined;
  export let variant: 'bg' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special' = 'bg';
</script>

<div class="section-divider variant-{variant}">
  <span class="divider-label">{title}</span>
  {#if description}
    <p class="divider-description">{description}</p>
  {/if}
</div>

<style>
  .section-divider {
    margin: var(--space-24) 0;
    padding: var(--space-16) var(--space-24);
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg,
      var(--_divider-1) 0%,
      var(--_divider-2) 30%,
      var(--_divider-3) 60%,
      var(--_divider-4) 100%
    );
  }

  /* Variant palette mappings */
  .variant-bg {
    --_divider-1: var(--surface-bg-highest);
    --_divider-2: var(--surface-bg-higher);
    --_divider-3: var(--surface-bg-high);
    --_divider-4: var(--surface-bg);
    --_divider-stroke: var(--surface-bg-lowest);
  }

  .variant-neutral {
    --_divider-1: var(--surface-neutral-highest);
    --_divider-2: var(--surface-neutral-higher);
    --_divider-3: var(--surface-neutral-high);
    --_divider-4: var(--surface-neutral);
    --_divider-stroke: var(--surface-neutral-lowest);
  }

  .variant-alternate {
    --_divider-1: var(--surface-alternate-highest);
    --_divider-2: var(--surface-alternate-higher);
    --_divider-3: var(--surface-alternate-high);
    --_divider-4: var(--surface-alternate);
    --_divider-stroke: var(--surface-alternate-lowest);
  }

  .variant-primary {
    --_divider-1: var(--surface-primary-highest);
    --_divider-2: var(--surface-primary-higher);
    --_divider-3: var(--surface-primary-high);
    --_divider-4: var(--surface-primary);
    --_divider-stroke: var(--surface-primary-lowest);
  }

  .variant-accent {
    --_divider-1: var(--surface-accent-highest);
    --_divider-2: var(--surface-accent-higher);
    --_divider-3: var(--surface-accent-high);
    --_divider-4: var(--surface-accent);
    --_divider-stroke: var(--surface-accent-lowest);
  }

  .variant-special {
    --_divider-1: var(--surface-special-highest);
    --_divider-2: var(--surface-special-higher);
    --_divider-3: var(--surface-special-high);
    --_divider-4: var(--surface-special);
    --_divider-stroke: var(--surface-special-lowest);
  }

  .divider-label {
    display: block;
    font-family: var(--font-display);
    font-size: var(--font-5xl);
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
    font-size: var(--font-md);
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
