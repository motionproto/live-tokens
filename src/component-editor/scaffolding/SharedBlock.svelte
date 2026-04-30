<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import TokenLayout from './TokenLayout.svelte';
  import type { SharedBlockResult, SharedGroup } from './sharedBlock';

  export let component: string;
  export let shared: SharedBlockResult;
  export let highlightedVars: Set<string> = new Set();

  const dispatch = createEventDispatcher<{ tokenhover: { variable: string | null } }>();

  type Bucket = { contexts: string[]; groups: SharedGroup[] };

  $: buckets = (() => {
    const map = new Map<string, Bucket>();
    for (const g of shared.groups) {
      const key = [...g.contexts].sort().join('|');
      const bucket = map.get(key);
      if (bucket) bucket.groups.push(g);
      else map.set(key, { contexts: g.contexts, groups: [g] });
    }
    return [...map.values()].sort((a, b) => b.contexts.length - a.contexts.length);
  })();

  function forwardHover(e: CustomEvent<{ variable: string | null }>) {
    dispatch('tokenhover', e.detail);
  }
</script>

{#if buckets.length > 0}
  <section class="shared-block">
    <div class="shared-grid">
      {#each buckets as bucket (bucket.contexts.join('|'))}
        <article class="shared-subgroup">
          <header class="shared-header">
            <span class="shared-eyebrow">linked across</span>
            <ul class="shared-context-strip">
              {#each bucket.contexts as ctx}
                <li class="shared-context-chip">{ctx}</li>
              {/each}
            </ul>
          </header>
          <TokenLayout
            tokens={bucket.groups.map((g) => ({ ...g.token, disabled: !g.shared }))}
            {component}
            {highlightedVars}
            sharedOrder={shared.sharedOrder}
            isSharedBlock
            on:tokenhover={forwardHover}
            on:change
          />
        </article>
      {/each}
    </div>
  </section>
{/if}

<style>
  .shared-block {
    margin-top: var(--ui-space-16);
    padding-top: var(--ui-space-12);
    border-top: 1px dashed var(--ui-border-faint);
  }

  .shared-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 30rem));
    gap: var(--ui-space-12);
    align-items: start;
  }

  .shared-subgroup {
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-lg);
    padding: var(--ui-space-8) var(--ui-space-4) var(--ui-space-8) 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
    container-type: inline-size;
  }

  .shared-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: 0 var(--ui-space-12);
    flex-wrap: wrap;
  }

  .shared-eyebrow {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-transform: lowercase;
    letter-spacing: 0.04em;
  }

  .shared-context-strip {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-4);
  }

  .shared-context-chip {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    padding: 1px var(--ui-space-6);
    border: 1px solid var(--ui-border-faint);
    border-radius: 999px;
    white-space: nowrap;
  }
</style>
