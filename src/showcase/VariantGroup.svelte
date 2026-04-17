<script lang="ts">
  import { onMount } from 'svelte';
  import TokenMap from './TokenMap.svelte';
  import { removeCssVar } from '../lib/cssVarSync';

  type Token = { label: string; variable: string };

  export let name: string;
  export let title: string;
  export let tokens: Token[] = [];
  export let states: Record<string, Token[]> | null = null;
  export let targetFile: string;
  export let showPrompt: boolean = true;

  let resetKey = 0;
  let prompt = '';
  let dirty = false;

  let activeState: string = '';

  $: stateNames = states ? Object.keys(states) : [];

  $: if (stateNames.length > 0 && !stateNames.includes(activeState)) {
    activeState = stateNames[0];
  }

  $: allTokens = states
    ? stateNames.flatMap((s) => states![s].map((t) => ({ ...t, _state: s })))
    : tokens.map((t) => ({ ...t, _state: '' as string }));

  $: visibleTokens = states ? states[activeState] ?? [] : tokens;

  function hasOverrides(): boolean {
    for (const t of allTokens) {
      if (document.documentElement.style.getPropertyValue(t.variable).trim()) return true;
    }
    return false;
  }

  function updateDirty() {
    dirty = hasOverrides();
  }

  function reset() {
    for (const t of allTokens) removeCssVar(t.variable);
    resetKey += 1;
    updateDirty();
  }

  function copyPrompt() {
    if (!states) {
      const changes: string[] = [];
      for (const t of tokens) {
        const override = document.documentElement.style.getPropertyValue(t.variable).trim();
        if (override) {
          changes.push(`- Change ${t.label.toLowerCase()} from \`var(${t.variable})\` to \`${override}\``);
        }
      }
      if (changes.length === 0) {
        prompt = '';
        return;
      }
      const text = `In \`${targetFile}\`, update the **${name}** variant:\n${changes.join('\n')}`;
      navigator.clipboard.writeText(text);
      prompt = text;
      return;
    }

    const sections: string[] = [];
    for (const stateName of stateNames) {
      const changes: string[] = [];
      for (const t of states[stateName]) {
        const override = document.documentElement.style.getPropertyValue(t.variable).trim();
        if (override) {
          changes.push(`- Change ${t.label.toLowerCase()} from \`var(${t.variable})\` to \`${override}\``);
        }
      }
      if (changes.length > 0) {
        sections.push(`**${stateName}** state:\n${changes.join('\n')}`);
      }
    }
    if (sections.length === 0) {
      prompt = '';
      return;
    }
    const text = `In \`${targetFile}\`, update the **${name}** variant:\n\n${sections.join('\n\n')}`;
    navigator.clipboard.writeText(text);
    prompt = text;
  }

  onMount(updateDirty);
</script>

<div class="demo-section variant-group">
  <div class="variant-header">
    <h3 class="demo-subtitle">{title}</h3>
    <div class="variant-actions">
      <button class="variant-action-btn" on:click={reset} title="Reset to defaults">
        <i class="fas fa-undo"></i> Reset
      </button>
      {#if showPrompt}
        <button
          class="variant-action-btn"
          on:click={copyPrompt}
          title="Copy an agent prompt describing your edits"
          disabled={!dirty}
        >
          <i class="fas fa-copy"></i> Get prompt
        </button>
      {/if}
    </div>
  </div>

  <slot {activeState} />

  {#if states}
    <label class="state-selector">
      <span class="state-label">State</span>
      <select class="state-select" bind:value={activeState}>
        {#each stateNames as stateName}
          <option value={stateName}>{stateName}</option>
        {/each}
      </select>
    </label>
  {/if}

  {#key `${resetKey}:${activeState}`}
    <TokenMap title={states ? activeState : name} tokens={visibleTokens} on:change={updateDirty} />
  {/key}

  {#if prompt}
    <div class="prompt-preview-wrapper">
      <button class="prompt-close" on:click={() => (prompt = '')}>
        <i class="fas fa-times"></i>
      </button>
      <pre class="prompt-preview">{prompt}</pre>
    </div>
  {/if}
</div>

<style>
  .variant-group {
    padding: var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    gap: var(--ui-space-12);
  }

  .variant-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .variant-header .demo-subtitle {
    margin: 0;
  }

  .variant-actions {
    display: flex;
    gap: var(--ui-space-4);
  }

  .variant-action-btn {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .variant-action-btn:hover:not(:disabled) {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .variant-action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .state-selector {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    align-self: flex-start;
  }

  .state-label {
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-secondary);
  }

  .state-select {
    padding: var(--ui-space-4) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-xs);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .state-select:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border-default);
  }

  .state-select:focus {
    outline: none;
    border-color: var(--ui-text-accent);
  }

  .prompt-preview-wrapper {
    position: relative;
  }

  .prompt-close {
    position: absolute;
    top: var(--ui-space-4);
    right: var(--ui-space-4);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: 0.625rem;
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .prompt-close:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .prompt-preview {
    margin: 0;
    padding: var(--ui-space-8) var(--ui-space-10);
    padding-right: var(--ui-space-24);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-xs);
    font-family: var(--ui-font-mono);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }
</style>
