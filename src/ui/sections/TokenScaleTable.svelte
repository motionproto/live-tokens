<script lang="ts">
  /**
   * Parameterised token-display table.
   *
   * Replaces the seven hand-listed scales (spacing, border-width, radius,
   * font-size, font-weight, line-height, icon-size) in VariablesTab with one
   * component. Each variant renders the same `(token-variable, token-value)`
   * pair plus a kind-specific preview swatch.
   *
   * Values are read live via getComputedStyle (passed in by the parent through
   * `tokens`), so tokens.css remains the single source of truth.
   */
  import { createEventDispatcher } from 'svelte';

  interface TokenItem {
    variable: string;
    value: string;
  }

  /** Visual layout variant. Each variant matches one of the seven scales the
   *  parent renders; the markup differs only in the preview swatch. */
  type ScaleKind =
    | 'spacing'      // horizontal bar sized by width: var(--xx)
    | 'border'       // horizontal bar sized by height: var(--xx)
    | 'radius'       // square box with border-radius: var(--xx)
    | 'font-size'    // "Ag" text sized by font-size: var(--xx)
    | 'font-weight'  // "Ag" text weighted by font-weight: var(--xx)
    | 'line-height'  // no preview, table-only rows
    | 'icon-size';   // star icon sized by font-size: var(--xx)

  export let kind: ScaleKind;
  export let tokens: TokenItem[] = [];
  /** When provided, the parent owns the copy-flash UI (pass copiedVar through). */
  export let copiedVar: string | null = null;

  const dispatch = createEventDispatcher<{ copy: string }>();
  function copy(v: string) { dispatch('copy', v); }
</script>

{#if kind === 'spacing'}
  <div class="spacing-grid">
    {#each tokens as token}
      <div class="spacing-item">
        <div class="spacing-bar" style="width: var({token.variable}); min-width: 2px;"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'border'}
  <div class="spacing-grid">
    {#each tokens as token}
      <div class="spacing-item">
        <div class="border-width-bar" style="height: var({token.variable});"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'radius'}
  <div class="radius-grid">
    {#each tokens as token}
      <div class="radius-item">
        <div class="radius-box" style="border-radius: var({token.variable});"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'font-size'}
  <div class="font-size-demos">
    {#each tokens as token}
      <div class="font-size-item">
        <span class="font-size-preview" style="font-size: var({token.variable});">Ag</span>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'font-weight'}
  <div class="font-weight-demos">
    {#each tokens as token}
      <div class="font-weight-item">
        <span class="font-weight-preview" style="font-weight: var({token.variable});">Ag</span>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'line-height'}
  <div class="token-table">
    {#each tokens as token}
      <div class="token-row">
        <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
        <span class="token-value">{token.value}</span>
      </div>
    {/each}
  </div>
{:else if kind === 'icon-size'}
  <div class="font-size-demos">
    {#each tokens as token}
      <div class="font-size-item">
        <span class="icon-size-preview" style="font-size: var({token.variable});">
          <i class="fas fa-star"></i>
        </span>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} on:click={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .token-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-variable {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .token-value {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
  }

  /* Spacing & Borders */
  .spacing-grid {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .spacing-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
  }

  .spacing-bar {
    height: 1.25rem;
    background: var(--ui-text-accent);
    border-radius: var(--ui-radius-sm);
    flex-shrink: 0;
  }

  .border-width-bar {
    width: 4rem;
    background: var(--ui-text-accent);
    flex-shrink: 0;
  }

  .spacing-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Border Radius */
  .radius-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: var(--ui-space-16);
  }

  .radius-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .radius-box {
    width: 3.5rem;
    height: 3.5rem;
    background: none;
    border: 2px solid var(--ui-border-medium);
  }

  /* Font sizes / icon sizes */
  .font-size-demos {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .font-size-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .font-size-preview {
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    line-height: 1;
    min-width: 3rem;
  }

  .icon-size-preview {
    color: var(--ui-text-primary);
    line-height: 1;
    min-width: 3rem;
    display: inline-flex;
    align-items: center;
  }

  .font-size-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Font weights */
  .font-weight-demos {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .font-weight-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .font-weight-preview {
    font-size: var(--ui-font-size-xl);
    font-family: var(--ui-font-sans);
    color: var(--ui-text-primary);
    line-height: 1;
    min-width: 2rem;
  }

  .font-weight-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Token Table (line heights, durations, z-indexes, opacity) */
  .token-table {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .token-row {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    padding: var(--ui-space-4) 0;
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .token-row:last-child {
    border-bottom: none;
  }
</style>
