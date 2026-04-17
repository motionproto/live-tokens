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
    border-radius: var(--_divider-radius);
    background: linear-gradient(135deg,
      var(--_divider-1) 0%,
      var(--_divider-2) 30%,
      var(--_divider-3) 60%,
      var(--_divider-4) 100%
    );
  }

  /* Variant palette mappings */
  .variant-bg {
    --_divider-1: var(--section-divider-bg-gradient-high);
    --_divider-2: var(--section-divider-bg-gradient-mid);
    --_divider-3: var(--section-divider-bg-gradient-low);
    --_divider-4: var(--section-divider-bg-gradient-base);
    --_divider-stroke: var(--section-divider-bg-text-stroke);
    --_divider-radius: var(--section-divider-bg-radius);
  }

  .variant-neutral {
    --_divider-1: var(--section-divider-neutral-gradient-high);
    --_divider-2: var(--section-divider-neutral-gradient-mid);
    --_divider-3: var(--section-divider-neutral-gradient-low);
    --_divider-4: var(--section-divider-neutral-gradient-base);
    --_divider-stroke: var(--section-divider-neutral-text-stroke);
    --_divider-radius: var(--section-divider-neutral-radius);
  }

  .variant-alternate {
    --_divider-1: var(--section-divider-alternate-gradient-high);
    --_divider-2: var(--section-divider-alternate-gradient-mid);
    --_divider-3: var(--section-divider-alternate-gradient-low);
    --_divider-4: var(--section-divider-alternate-gradient-base);
    --_divider-stroke: var(--section-divider-alternate-text-stroke);
    --_divider-radius: var(--section-divider-alternate-radius);
  }

  .variant-primary {
    --_divider-1: var(--section-divider-primary-gradient-high);
    --_divider-2: var(--section-divider-primary-gradient-mid);
    --_divider-3: var(--section-divider-primary-gradient-low);
    --_divider-4: var(--section-divider-primary-gradient-base);
    --_divider-stroke: var(--section-divider-primary-text-stroke);
    --_divider-radius: var(--section-divider-primary-radius);
  }

  .variant-accent {
    --_divider-1: var(--section-divider-accent-gradient-high);
    --_divider-2: var(--section-divider-accent-gradient-mid);
    --_divider-3: var(--section-divider-accent-gradient-low);
    --_divider-4: var(--section-divider-accent-gradient-base);
    --_divider-stroke: var(--section-divider-accent-text-stroke);
    --_divider-radius: var(--section-divider-accent-radius);
  }

  .variant-special {
    --_divider-1: var(--section-divider-special-gradient-high);
    --_divider-2: var(--section-divider-special-gradient-mid);
    --_divider-3: var(--section-divider-special-gradient-low);
    --_divider-4: var(--section-divider-special-gradient-base);
    --_divider-stroke: var(--section-divider-special-text-stroke);
    --_divider-radius: var(--section-divider-special-radius);
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
