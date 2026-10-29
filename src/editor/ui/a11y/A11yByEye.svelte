<script lang="ts">
  import { tick } from 'svelte';
  import { a11yIssues, confirmReview } from '../../core/a11y/a11yReport';
  import UIPillButton from '../UIPillButton.svelte';
  import A11yFindingRow from './A11yFindingRow.svelte';
  import { A11Y_REVIEW_SECTION, openComponentAt, reviewResults, type A11yReviewResult } from './a11yView';

  const titleId = $props.id();

  let results = $derived(reviewResults($a11yIssues));
  let open = $derived(results.filter((r) => !r.confirmed));
  let confirmed = $derived(results.filter((r) => r.confirmed));
  let tally = $derived(
    [open.length > 0 ? `${open.length} to check` : '', confirmed.length > 0 ? `${confirmed.length} look right` : '']
      .filter(Boolean)
      .join(', '),
  );
  let done = $derived(results.length > 0 ? confirmed.length / results.length : 0);

  let openList: HTMLUListElement | undefined = $state();
  let confirmedList: HTMLUListElement | undefined = $state();
  let heading: HTMLElement | undefined = $state();
  let markingAll = $state(false);
  let markAllError: string | null = $state(null);

  const keyOf = (r: A11yReviewResult) => `${r.component}\n${r.row.findings.map((f) => f.message).join('\n')}`;

  /** Moves focus to the toggle that took the pressed row's place, so Enter or Space walks the list. */
  async function focusAt(list: HTMLUListElement | undefined, index: number) {
    await tick();
    const toggles = [...(list?.querySelectorAll<HTMLButtonElement>('.a11y-confirm button') ?? [])];
    (toggles[index] ?? toggles[index - 1] ?? heading)?.focus();
  }

  async function markAll() {
    markingAll = true;
    markAllError = null;
    try {
      await confirmReview(open.flatMap((r) => r.row.findings), true);
      await focusAt(undefined, 0);
    } catch (err) {
      markAllError = (err as Error).message;
    } finally {
      markingAll = false;
    }
  }
</script>

<section id={A11Y_REVIEW_SECTION} class="editor-section-card a11y-byeye" aria-labelledby={titleId}>
  <header class="a11y-byeye-head">
    <i class="fa-solid fa-eye a11y-byeye-mark" aria-hidden="true"></i>
    <h3 id={titleId} class="editor-subsection-title" tabindex="-1" bind:this={heading}>Check by eye</h3>
    <span class="a11y-byeye-tally">{tally}</span>
    {#if open.length > 0}
      <UIPillButton size="compact" variant="outline" icon="fa-check-double" disabled={markingAll} onclick={markAll}>
        Mark all as looking right
      </UIPillButton>
    {/if}
  </header>

  <div
    class="a11y-byeye-meter"
    role="progressbar"
    aria-label="Results marked as looking right"
    aria-valuemin={0}
    aria-valuemax={results.length}
    aria-valuenow={confirmed.length}
  >
    <span class="a11y-byeye-meter-fill" style:transform={`scaleX(${done})`}></span>
  </div>

  {#if markAllError}
    <p class="a11y-byeye-error" role="alert">{markAllError}</p>
  {/if}

  {#if open.length > 0}
    <p class="a11y-byeye-lead">
      The tools could not decide these. Judge each element against its help, then press <strong>Looks right</strong>.
      The next result moves up under the same button.
    </p>
    <ul class="a11y-byeye-list" bind:this={openList}>
      {#each open as result, i (keyOf(result))}
        <A11yFindingRow
          component={result.component}
          row={result.row}
          review
          prefix={result.label}
          onreveal={(variable) => openComponentAt(result.component, variable)}
          onopen={() => openComponentAt(result.component)}
          onconfirmchange={() => focusAt(openList, i)}
        />
      {/each}
    </ul>
  {:else}
    <p class="a11y-byeye-clear">
      <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
      Every result looks right. Open <strong>Looks right</strong> below to check one again.
    </p>
  {/if}

  {#if confirmed.length > 0}
    <details class="a11y-byeye-done">
      <summary class="a11y-byeye-group">
        <i class="fa-solid fa-chevron-right a11y-byeye-chevron" aria-hidden="true"></i>
        Looks right
        <span class="a11y-byeye-group-count">{confirmed.length}</span>
      </summary>
      <ul class="a11y-byeye-list" bind:this={confirmedList}>
        {#each confirmed as result, i (keyOf(result))}
          <A11yFindingRow
            component={result.component}
            row={result.row}
            review
            confirmed
            prefix={result.label}
            onreveal={(variable) => openComponentAt(result.component, variable)}
            onopen={() => openComponentAt(result.component)}
            onconfirmchange={() => focusAt(confirmedList, i)}
          />
        {/each}
      </ul>
    </details>
  {/if}
</section>

<style>
  .a11y-byeye {
    gap: var(--ui-space-12);
  }

  .a11y-byeye-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-8) var(--ui-space-12);
    color: var(--ui-text-primary);
  }

  .a11y-byeye-head :global(.ui-pill) {
    margin-left: auto;
  }

  .a11y-byeye-head h3:focus {
    outline: none;
  }

  .a11y-byeye-mark {
    color: var(--ui-text-tertiary);
  }

  .a11y-byeye-tally {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .a11y-byeye-meter {
    height: 2px;
    overflow: hidden;
    background: var(--ui-border-low);
    border-radius: var(--ui-radius-full);
  }

  .a11y-byeye-meter-fill {
    display: block;
    height: 100%;
    background: var(--ui-text-primary);
    transform-origin: left;
    transition: transform 240ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .a11y-byeye-meter-fill {
      transition: none;
    }
  }

  .a11y-byeye-lead,
  .a11y-byeye-clear,
  .a11y-byeye-error {
    margin: 0;
    font-size: var(--ui-font-size-sm);
  }

  .a11y-byeye-lead {
    color: var(--ui-text-tertiary);
  }

  .a11y-byeye-lead strong,
  .a11y-byeye-clear strong {
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .a11y-byeye-clear {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12) 0;
    color: var(--ui-text-secondary);
  }

  .a11y-byeye-error {
    color: var(--ui-highlight);
  }

  .a11y-byeye-done {
    margin-top: var(--ui-space-12);
    border-top: 1px solid var(--ui-border);
  }

  .a11y-byeye-group {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding-top: var(--ui-space-12);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    list-style: none;
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .a11y-byeye-group::-webkit-details-marker {
    display: none;
  }

  .a11y-byeye-group:hover {
    color: var(--ui-text-primary);
  }

  .a11y-byeye-chevron {
    font-size: var(--ui-font-size-xs);
    transition: transform var(--ui-transition-fast);
  }

  .a11y-byeye-done[open] .a11y-byeye-chevron {
    transform: rotate(90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .a11y-byeye-chevron {
      transition: none;
    }
  }

  .a11y-byeye-group-count {
    font-weight: var(--ui-font-weight-normal);
    color: var(--ui-text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .a11y-byeye-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .a11y-byeye-list :global(code) {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
  }
</style>
