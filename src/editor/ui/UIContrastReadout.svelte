<script module lang="ts">
  import { createSubscriber } from 'svelte/reactivity';
  import { on } from 'svelte/events';
  import { THEME_APPLIED_EVENT } from '../core/themes/themeDocumentSync';

  const themeApplied = createSubscriber((update) => on(document, THEME_APPLIED_EVENT, update));
</script>

<script lang="ts">
  import { editorState } from '../core/store/editorStore';
  import { getContrastPairs } from '../core/components/contrastPairRegistry';
  import { CONTRAST_RULES } from '../core/palettes/contrast';
  import { measurePair, type PairMeasure } from '../core/palettes/contrastPairs';
  import { createDomResolver } from '../core/palettes/resolveColor';
  import { formatRatio, measureState, readoutState, ruleSentence } from './contrastReadout';
  import UIInfoPopover from './UIInfoPopover.svelte';

  interface Props {
    component: string;
    variable: string;
  }

  let { component, variable }: Props = $props();

  let pairs = $derived(getContrastPairs(component, variable));
  let measures = $state<PairMeasure[]>([]);
  let readout = $derived(measures.length > 0 ? readoutState(measures) : null);

  // Measuring reads the DOM, so it waits a frame. The store renderer writes
  // CSS variables synchronously, so by then the probe reads what the store holds.
  $effect(() => {
    void $editorState;
    themeApplied();
    const current = pairs;
    const frame = requestAnimationFrame(() => {
      const resolver = createDomResolver();
      measures = current.map((pair) => measurePair(pair, resolver));
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

{#if readout}
  <span
    class="contrast-readout"
    data-contrast-state={readout.state}
    data-contrast-ratio={readout.measure.ratio}
  >
    <UIInfoPopover title="Contrast" ariaLabel={readout.ariaLabel}>
      {#snippet trigger()}
        <span class="contrast-value {readout.state}">
          {#if readout.state === 'fail'}
            <span class="contrast-mark" aria-hidden="true">!</span>
          {/if}
          {readout.label}
        </span>
      {/snippet}
      <ul class="contrast-pairs">
        {#each measures as m (m.pair)}
          {@const rule = CONTRAST_RULES[m.pair.role]}
          {@const pairState = measureState(m)}
          <li class="contrast-pair">
            {#if m.pair.context}
              <p class="contrast-context">{m.pair.context}</p>
            {/if}
            <p>{ruleSentence(m)}</p>
            <p class="contrast-measured">
              Measured
              <span class="contrast-value {pairState}">
                {#if pairState === 'fail'}
                  <span class="contrast-mark" aria-hidden="true">!</span>
                {/if}
                {formatRatio(m.ratio)}
              </span>
            </p>
            <ol class="contrast-stack" aria-label="Layers behind the color, top first">
              {#each m.pair.backdrop as layer, i (i)}
                <li><code>{layer}</code></li>
              {/each}
              <li>page background</li>
            </ol>
            <a class="contrast-link" href={rule.url} target="_blank" rel="noopener">
              Success criterion {rule.criterion}
            </a>
          </li>
        {/each}
      </ul>
    </UIInfoPopover>
  </span>
{/if}

<style>
  .contrast-readout {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
  }

  .contrast-value {
    display: inline-flex;
    align-items: baseline;
    gap: var(--ui-space-2);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    white-space: nowrap;
  }

  .contrast-value.pass {
    color: var(--ui-text-secondary);
  }

  .contrast-value.fail {
    color: var(--ui-highlight);
  }

  .contrast-value.inactive {
    color: var(--ui-text-tertiary);
  }

  .contrast-mark {
    font-weight: var(--ui-font-weight-bold);
  }

  .contrast-pairs {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .contrast-pair {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .contrast-pair + .contrast-pair {
    padding-top: var(--ui-space-12);
    border-top: 1px solid var(--ui-border-low);
  }

  /* The popover's paragraph margin would double the flex gap. */
  .contrast-pair p {
    margin: 0;
  }

  .contrast-context {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .contrast-measured {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-6);
  }

  .contrast-measured .contrast-value {
    font-size: inherit;
  }

  .contrast-stack {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  .contrast-stack code {
    overflow-wrap: anywhere;
  }

  .contrast-link {
    align-self: flex-start;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    text-decoration: underline;
  }
</style>
