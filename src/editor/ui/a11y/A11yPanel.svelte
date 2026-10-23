<script lang="ts">
  import { tick } from 'svelte';
  import { a11yFinishedReport, a11yIssues } from '../../core/a11y/a11yReport';
  import { FLASH_DURATION_MS } from '../../core/flashStatus';
  import { getEditorContext, type RevealRequest } from '../../component-editor/scaffolding/editorContext';
  import A11yComponentIssues from './A11yComponentIssues.svelte';
  import { accessibilityIssuesLabel, formatRunTime, issueCount } from './a11yView';

  let { component }: { component: string } = $props();
  const titleId = $props.id();

  const editorCtx = getEditorContext();

  let panel: HTMLElement | undefined = $state();
  let issues = $derived($a11yIssues[component]);
  let count = $derived(issues ? issueCount(issues) : 0);

  /** Rendered rows for `variable`. The linked block can repeat a variant's row, so the variant's own row comes first. */
  function renderedRows(variable: string): HTMLElement[] {
    const scope = panel?.closest('.demo-block') ?? document;
    const selector = `[data-token-variable="${variable}"], [data-token-variables~="${variable}"]`;
    const rows = [...scope.querySelectorAll<HTMLElement>(selector)]
      .filter((row) => row.getClientRects().length > 0);
    return [...rows.filter((row) => row.closest('.variant-group')), ...rows.filter((row) => !row.closest('.variant-group'))];
  }

  async function reveal(variable: string) {
    let rows = renderedRows(variable);
    if (!rows[0]?.closest('.variant-group') && editorCtx) {
      const request: RevealRequest = { variable, searches: [] };
      editorCtx.revealVariable.set(request);
      await tick();
      await Promise.all(request.searches);
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
    <A11yComponentIssues {component} {issues} withReview onreveal={reveal} />
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
</style>
