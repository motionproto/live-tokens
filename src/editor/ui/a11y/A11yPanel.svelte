<script lang="ts">
  import { tick } from 'svelte';
  import { a11yFinishedReport, a11yIssues } from '../../core/a11y/a11yReport';
  import { FLASH_DURATION_MS } from '../../core/flashStatus';
  import { getEditorContext } from '../../component-editor/scaffolding/editorContext';
  import A11yComponentIssues from './A11yComponentIssues.svelte';
  import {
    A11Y_REVIEW_SECTION,
    accessibilityIssuesLabel,
    formatRunTime,
    getA11yViewLink,
    issueCount,
    reviewLabel,
  } from './a11yView';

  let { component }: { component: string } = $props();
  const titleId = $props.id();

  const editorCtx = getEditorContext();
  const openView = getA11yViewLink();

  let panel: HTMLElement | undefined = $state();
  let issues = $derived($a11yIssues[component]);
  let count = $derived(issues ? issueCount(issues) : 0);
  let reviewCount = $derived(issues?.review.length ?? 0);

  /** Rendered rows for `variable`. The linked block can repeat a variant's row, so the variant's own row comes first. */
  function renderedRows(variable: string): HTMLElement[] {
    const scope = panel?.closest('.demo-block') ?? document;
    const rows = [...scope.querySelectorAll<HTMLElement>(`[data-token-variable="${variable}"]`)]
      .filter((row) => row.getClientRects().length > 0);
    return [...rows.filter((row) => row.closest('.variant-group')), ...rows.filter((row) => !row.closest('.variant-group'))];
  }

  async function reveal(variable: string) {
    let rows = renderedRows(variable);
    if (!rows[0]?.closest('.variant-group') && editorCtx) {
      editorCtx.revealVariable.set({ variable });
      await tick();
      rows = renderedRows(variable);
    }
    const row = rows[0];
    if (!row) return;
    const target = row.closest<HTMLElement>('.token-entry') ?? row;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
    const highlight = getComputedStyle(target).getPropertyValue('--ui-highlight').trim();
    target.animate(
      [{ boxShadow: `0 0 0 2px ${highlight}` }, { boxShadow: '0 0 0 2px transparent' }],
      { duration: FLASH_DURATION_MS, easing: 'ease-in' },
    );
  }
</script>

{#if issues && count > 0 && $a11yFinishedReport}
  <section class="editor-section-card a11y-panel" aria-labelledby={titleId} bind:this={panel}>
    <header class="a11y-panel-head">
      <span class="a11y-panel-mark" aria-hidden="true">!</span>
      <h3 id={titleId} class="a11y-panel-title">{accessibilityIssuesLabel(count)}</h3>
      <span class="a11y-panel-run">Last run {formatRunTime($a11yFinishedReport.finishedAt)}</span>
    </header>
    <A11yComponentIssues {component} {issues} onreveal={reveal} />
    {#if reviewCount > 0}
      {#if openView}
        <button type="button" class="a11y-panel-review a11y-panel-review-link" onclick={() => openView(A11Y_REVIEW_SECTION)}>
          {reviewLabel(reviewCount)}
        </button>
      {:else}
        <p class="a11y-panel-review">{reviewLabel(reviewCount)}</p>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .a11y-panel {
    gap: var(--ui-space-12);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
  }

  .a11y-panel-head {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
  }

  .a11y-panel-mark {
    color: var(--ui-highlight);
    font-weight: var(--ui-font-weight-bold);
  }

  .a11y-panel-title {
    margin: 0;
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .a11y-panel-run {
    margin-left: auto;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .a11y-panel-review {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .a11y-panel-review-link {
    align-self: flex-start;
    padding: 0;
    background: none;
    border: none;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .a11y-panel-review-link:hover {
    color: var(--ui-text-primary);
  }
</style>
