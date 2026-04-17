<script lang="ts">
  import PaletteSelector from './PaletteSelector.svelte';
  import RadiusSelector from './RadiusSelector.svelte';
  import FontFamilySelector from './FontFamilySelector.svelte';
  import FontWeightSelector from './FontWeightSelector.svelte';

  export let title: string = '';
  export let tokens: { label: string; variable: string }[];

  function isRadius(variable: string): boolean {
    return variable.startsWith('--radius-') || variable.endsWith('-radius');
  }

  function isFontFamily(variable: string): boolean {
    return variable.endsWith('-font-family');
  }

  function isFontWeight(variable: string): boolean {
    return variable.endsWith('-font-weight');
  }
</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div class="token-grid">
    {#each tokens as token}
      <div class="token-entry">
        {#if isRadius(token.variable)}
          <RadiusSelector variable={token.variable} label={token.label} on:change />
        {:else if isFontFamily(token.variable)}
          <FontFamilySelector variable={token.variable} label={token.label} on:change />
        {:else if isFontWeight(token.variable)}
          <FontWeightSelector variable={token.variable} label={token.label} on:change />
        {:else}
          <PaletteSelector variable={token.variable} label={token.label} on:change />
        {/if}
        <span class="token-label">{token.label}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .token-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .token-group-title {
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }

  .token-entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-label {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }
</style>
