<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import TokenLayout from './TokenLayout.svelte';
  import { removeCssVar } from '../../lib/cssVarSync';
  import { editorState, mutate } from '../../lib/editorStore';
  import { loadComponentConfig } from '../../lib/componentConfigService';

  type Token = { label: string; variable: string };

  export let name: string;
  export let title: string;
  export let tokens: Token[] = [];
  export let states: Record<string, Token[]> | null = null;
  export let targetFile: string;
  export let showPrompt: boolean = true;
  /** When set, overrides are read from and cleared through the editor store. */
  export let component: string | undefined = undefined;
  /** Word used after the {name} in the prompt copy ("variant" for Button, "component" for monolithic editors). */
  export let variantNoun: string = 'variant';
  /** Variables to flash when a sibling-shared token is hovered elsewhere. */
  export let highlightedVars: Set<string> | undefined = undefined;
  /** Per-variable rank used by TokenLayout to align shared tokens with the shared block above. */
  export let sharedOrder: Map<string, number> | undefined = undefined;

  let resetKey = 0;
  let prompt = '';
  let dirty = false;

  $: stateNames = states ? Object.keys(states) : [];

  $: allTokens = states
    ? stateNames.flatMap((s) => states![s].map((t) => ({ ...t, _state: s })))
    : tokens.map((t) => ({ ...t, _state: '' as string }));

  function hasOverrides(): boolean {
    if (component) {
      const aliases = get(editorState).components[component]?.aliases ?? {};
      for (const t of allTokens) if (t.variable in aliases) return true;
      return false;
    }
    for (const t of allTokens) {
      if (document.documentElement.style.getPropertyValue(t.variable).trim()) return true;
    }
    return false;
  }

  function updateDirty() {
    dirty = hasOverrides();
  }

  async function reset() {
    if (component) {
      const defaultCfg = await loadComponentConfig(component, 'default');
      mutate(`reset ${component}/${name}`, (s) => {
        const slice = s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {} });
        for (const t of allTokens) {
          const defaultVal = defaultCfg.aliases[t.variable];
          if (defaultVal !== undefined) {
            slice.aliases[t.variable] = defaultVal;
          } else {
            delete slice.aliases[t.variable];
          }
        }
      });
    } else {
      for (const t of allTokens) removeCssVar(t.variable);
    }
    resetKey += 1;
    updateDirty();
  }

  $: if (component) {
    // Re-derive dirty when the store's component slice changes.
    ($editorState as unknown) && updateDirty();
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
      const text = `In \`${targetFile}\`, update the **${name}** ${variantNoun}:\n${changes.join('\n')}`;
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
    const text = `In \`${targetFile}\`, update the **${name}** ${variantNoun}:\n\n${sections.join('\n\n')}`;
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

  {#if states}
    {#each stateNames as stateName}
      <div class="state-section">
        <span class="state-label">{stateName}</span>
        <div class="state-preview">
          <slot activeState={stateName} />
        </div>
        {#key `${resetKey}:${stateName}`}
          <TokenLayout
            title=""
            tokens={states[stateName]}
            {component}
            highlightedVars={highlightedVars ?? new Set()}
            {sharedOrder}
            on:tokenhover
            on:change={updateDirty}
          />
        {/key}
      </div>
    {/each}
  {:else}
    <slot activeState="" />
    {#key resetKey}
      <TokenLayout
        title={name}
        tokens={tokens}
        {component}
        highlightedVars={highlightedVars ?? new Set()}
        {sharedOrder}
        on:tokenhover
        on:change={updateDirty}
      />
    {/key}
  {/if}

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
    font-size: var(--ui-font-size-sm);
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

  .state-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
  }

  .state-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .state-preview {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
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
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }
</style>
