<script lang="ts">
  import TokenLayout from './TokenLayout.svelte';
  import { editorState } from '../../lib/editorStore';
  import type { SharedBlockResult, SharedGroup, SharedToken } from './sharedBlock';

  export let component: string;
  export let shared: SharedBlockResult;

  type Bucket = { contexts: string[]; groups: SharedGroup[] };
  type TypeColumn = { kind: 'type'; legend: string; tokens: (SharedToken & { disabled?: boolean })[] };
  type GeneralColumn = { kind: 'general'; tokens: (SharedToken & { disabled?: boolean })[] };
  type Column = TypeColumn | GeneralColumn;

  function extractTypeGroup(v: string): string | null {
    const m = v.match(/-([a-z][a-z0-9-]*?)-(?:font-(?:family|size|weight)|line-height)$/);
    return m ? m[1] : null;
  }

  /** Collapse same-label same-value tokens into a single row whose `mergeVariables` lists the
      other groupKey leads. Disabled (unlinked) rows are kept as-is so divergence stays visible. */
  function collapseGeneral(
    list: (SharedToken & { disabled?: boolean })[],
    aliases: Record<string, string>,
  ): (SharedToken & { disabled?: boolean })[] {
    const out: (SharedToken & { disabled?: boolean })[] = [];
    const leadIdx = new Map<string, number>();
    for (const tok of list) {
      if (tok.disabled) {
        out.push(tok);
        continue;
      }
      const alias = aliases[tok.variable] ?? '';
      const key = `${tok.label}|${alias}`;
      const idx = leadIdx.get(key);
      if (idx === undefined) {
        leadIdx.set(key, out.length);
        out.push(tok);
      } else {
        const lead = out[idx];
        out[idx] = {
          ...lead,
          mergeVariables: [...(lead.mergeVariables ?? []), tok.variable],
        };
      }
    }
    return out;
  }

  function partitionBucket(groups: SharedGroup[], aliases: Record<string, string>): Column[] {
    const typeGroups = new Map<string, (SharedToken & { disabled?: boolean })[]>();
    const general: (SharedToken & { disabled?: boolean })[] = [];
    for (const g of groups) {
      const tok = { ...g.token, disabled: !g.shared };
      const tg = extractTypeGroup(tok.variable);
      if (tg) {
        const arr = typeGroups.get(tg) ?? [];
        arr.push(tok);
        typeGroups.set(tg, arr);
      } else {
        general.push(tok);
      }
    }
    const collapsed = collapseGeneral(general, aliases);
    const cols: Column[] = [];
    for (const [legend, tokens] of typeGroups) cols.push({ kind: 'type', legend, tokens });
    if (collapsed.length > 0) cols.push({ kind: 'general', tokens: collapsed });
    return cols;
  }

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

  $: aliases = $editorState.components[component]?.aliases ?? {};
  $: bucketCols = buckets.map((b) => {
    const columns = partitionBucket(b.groups, aliases);
    return {
      contexts: b.contexts,
      columns,
      hasLegend: columns.some((c) => c.kind === 'type'),
    };
  });
</script>

{#if buckets.length > 0}
  <section class="shared-block">
    <div class="shared-grid">
      {#each bucketCols as bucket (bucket.contexts.join('|'))}
        <article class="shared-subgroup">
          <header class="shared-header">
            <span class="shared-eyebrow">linked across</span>
            <ul class="shared-context-strip">
              {#each bucket.contexts as ctx}
                <li class="shared-context-chip">{ctx}</li>
              {/each}
            </ul>
          </header>
          <div class="shared-columns">
            {#each bucket.columns as col}
              <div class="shared-column">
                {#if bucket.hasLegend}
                  <span class="shared-column-legend" aria-hidden={col.kind !== 'type'}>
                    {col.kind === 'type' ? col.legend : ' '}
                  </span>
                {/if}
                <TokenLayout
                  tokens={col.tokens}
                  {component}
                  sharedOrder={shared.sharedOrder}
                  isSharedBlock
                  on:change
                />
              </div>
            {/each}
          </div>
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
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
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

  .shared-columns {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  .shared-column {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  .shared-column-legend {
    font-size: var(--ui-font-size-xs);
    line-height: 1;
    min-height: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    padding: 0 var(--ui-space-12);
    text-transform: lowercase;
    letter-spacing: 0.04em;
  }
</style>
