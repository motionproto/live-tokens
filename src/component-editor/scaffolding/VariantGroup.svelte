<script lang="ts">
  import TokenLayout from './TokenLayout.svelte';
  import TypeEditor from './TypeEditor.svelte';
  import { removeCssVar } from '../../lib/cssVarSync';
  import { editorState, mutate } from '../../lib/editorStore';
  import { loadComponentConfig } from '../../lib/componentConfigService';

  type Token = { label: string; variable: string };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    familyLabel?: string;
    sizeVariable?: string;
    sizeLabel?: string;
    weightVariable?: string;
    weightLabel?: string;
    lineHeightVariable?: string;
    lineHeightLabel?: string;
  };

  export let name: string;
  export let title: string;
  export let tokens: Token[] = [];
  export let states: Record<string, Token[]> | null = null;
  /** Per-state type groups; rendered as TypeEditor blocks alongside the state's TokenLayout. */
  export let typeGroups: Record<string, TypeGroupConfig[]> = {};
  /** When set, overrides are read from and cleared through the editor store. */
  export let component: string | undefined = undefined;
  /** Variables to flash when a sibling-shared token is hovered elsewhere. */
  export let highlightedVars: Set<string> | undefined = undefined;
  /** Per-variable rank used by TokenLayout to align shared tokens with the shared block above. */
  export let sharedOrder: Map<string, number> | undefined = undefined;

  function typeGroupVariables(g: TypeGroupConfig): { variable: string; label: string }[] {
    const out: { variable: string; label: string }[] = [
      { variable: g.colorVariable, label: g.colorLabel ?? 'text color' },
    ];
    if (g.familyVariable) out.push({ variable: g.familyVariable, label: g.familyLabel ?? 'font family' });
    if (g.sizeVariable) out.push({ variable: g.sizeVariable, label: g.sizeLabel ?? 'font size' });
    if (g.weightVariable) out.push({ variable: g.weightVariable, label: g.weightLabel ?? 'font weight' });
    if (g.lineHeightVariable) out.push({ variable: g.lineHeightVariable, label: g.lineHeightLabel ?? 'line height' });
    return out;
  }

  let resetKey = 0;

  $: stateNames = states ? Object.keys(states) : [];

  $: allTokens = (() => {
    const baseTokens = states
      ? stateNames.flatMap((s) => states![s].map((t) => ({ ...t, _state: s })))
      : tokens.map((t) => ({ ...t, _state: '' as string }));
    const tgTokens = Object.entries(typeGroups).flatMap(([stateName, groups]) =>
      groups.flatMap((g) => typeGroupVariables(g).map((t) => ({ ...t, _state: stateName }))),
    );
    return [...baseTokens, ...tgTokens];
  })();

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
  }
</script>

<div class="demo-section variant-group">
  <div class="variant-header">
    <h3 class="demo-subtitle">{title}</h3>
    <div class="variant-actions">
      <button class="variant-action-btn" on:click={reset} title="Reset to defaults">
        <i class="fas fa-undo"></i> Reset
      </button>
    </div>
  </div>

  {#if states}
    {#each stateNames as stateName}
      {@const hasTypeGroups = !!typeGroups[stateName]?.length}
      <div class="state-section">
        <span class="state-label">{stateName}</span>
        <div class="state-preview">
          <slot activeState={stateName} />
        </div>
        <div class="state-controls" class:two-col={hasTypeGroups}>
          {#if hasTypeGroups}
            <div class="state-type-groups">
              {#key `${resetKey}:${stateName}:type`}
                {#each typeGroups[stateName] as tg}
                  <TypeEditor
                    legend={tg.legend ?? 'type'}
                    colorVariable={tg.colorVariable}
                    colorLabel={tg.colorLabel ?? 'text color'}
                    familyVariable={tg.familyVariable}
                    familyLabel={tg.familyLabel ?? 'font family'}
                    sizeVariable={tg.sizeVariable}
                    sizeLabel={tg.sizeLabel ?? 'font size'}
                    weightVariable={tg.weightVariable}
                    weightLabel={tg.weightLabel ?? 'font weight'}
                    lineHeightVariable={tg.lineHeightVariable}
                    lineHeightLabel={tg.lineHeightLabel ?? 'line height'}
                    {component}
                    on:change
                  />
                {/each}
              {/key}
            </div>
          {/if}
          {#key `${resetKey}:${stateName}`}
            <TokenLayout
              title=""
              tokens={states[stateName]}
              {component}
              highlightedVars={highlightedVars ?? new Set()}
              {sharedOrder}
              on:tokenhover
              on:change
            />
          {/key}
        </div>
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
        on:change
      />
    {/key}
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
    container-type: inline-size;
    min-width: 0;
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

  .state-controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--ui-space-12);
    align-items: start;
  }

  .state-controls.two-col {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16) var(--ui-space-32);
    align-items: flex-start;
    justify-content: flex-start;
  }

  @container (min-width: 720px) {
    .state-controls.two-col {
      gap: var(--ui-space-16) 6rem;
    }
  }

  .state-type-groups {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

</style>
