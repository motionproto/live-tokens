<script lang="ts">
  import PaletteSelector from './PaletteSelector.svelte';

  export let title: string = '';
  export let tokens: { label: string; variable: string }[];
</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div class="token-grid">
    {#each tokens as token}
      <div class="token-entry">
        <PaletteSelector variable={token.variable} label={token.label} on:change />
        <code class="token-var">{token.variable}</code>
      </div>
    {/each}
  </div>
</div>

<style>
  .token-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .token-group-title {
    font-size: var(--font-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }

  .token-entry {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .token-var {
    font-size: 0.5625rem;
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    padding-left: var(--space-2);
  }
</style>
