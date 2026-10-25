<script lang="ts">
  import { a11yFinishedReport, a11yIssues, a11yReport, startA11yRun } from '../../core/a11y/a11yReport';
  import { contrastFailures } from '../../core/a11y/contrastFailures';
  import { allContrastPairs } from '../../core/components/contrastPairRegistry';
  import { createDomResolver } from '../../core/palettes/resolveColor';
  import { unsavedEdits } from '../../core/store/unsavedEdits';
  import { listThemes } from '../../core/themes/themeService';
  import UIPillButton from '../UIPillButton.svelte';
  import A11yComponentIssues from './A11yComponentIssues.svelte';
  import A11yFindingRow from './A11yFindingRow.svelte';
  import A11yOverview from './A11yOverview.svelte';
  import {
    A11Y_REVIEW_SECTION,
    A11Y_RUN_SECTION,
    a11ySectionId,
    codeSpans,
    componentsInReport,
    fixedLabel,
    formatElapsed,
    formatRunTime,
    getA11yViewLink,
    issuesLabel,
    openComponentAt,
    reviewLabel,
    reviewResults,
  } from './a11yView';

  const openView = getA11yViewLink();

  let rows = $derived(componentsInReport($a11yIssues));
  let review = $derived(reviewResults($a11yIssues));
  let reviewTotal = $derived(rows.reduce((sum, row) => sum + row.issues.review.length, 0));
  let running = $derived($a11yReport?.state === 'running' ? $a11yReport : null);
  let failed = $derived($a11yReport?.state === 'failed' ? $a11yReport : null);
  let finished = $derived($a11yFinishedReport);
  let runProblems = $derived(finished?.findings.filter((f) => f.rule.startsWith('tests-')) ?? []);
  let notInstalled = $derived(runProblems.some((f) => f.rule === 'tests-not-installed'));

  /** Set by a press while edits were pending; the alert shows only while they still are. */
  let blockedByEdits = $state(false);
  let startError: string | null = $state(null);
  let starting = $state(false);

  let now = $state(Date.now());
  $effect(() => {
    if (!running) return;
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });

  let themeNames: Record<string, string> = $state({});
  let themeName = $derived(finished?.theme ? (themeNames[finished.theme] ?? finished.theme) : null);
  $effect(() => {
    if (!finished?.theme) return;
    listThemes()
      .then((themes) => (themeNames = Object.fromEntries(themes.map((t) => [t.fileName, t.name]))))
      .catch(() => {});
  });

  async function runTest() {
    startError = null;
    if ($unsavedEdits) {
      blockedByEdits = true;
      return;
    }
    blockedByEdits = false;
    starting = true;
    try {
      await startA11yRun(contrastFailures(allContrastPairs(), createDomResolver()));
    } catch (err) {
      const { code, message } = err as Error & { code?: string };
      startError = code === 'A11Y_RUN_IN_PROGRESS' ? 'A test is already running.' : message;
    } finally {
      starting = false;
    }
  }
</script>

{#snippet message(text: string)}
  {#each codeSpans(text) as part, i (i)}{#if part.code}<code>{part.text}</code>{:else}{part.text}{/if}{/each}
{/snippet}

<div class="a11y-tab">
  <section id={A11Y_RUN_SECTION} class="a11y-run">
    <header class="a11y-head">
      <h2 class="a11y-title">Accessibility</h2>
      <UIPillButton
        variant="primary"
        icon="fa-play"
        disabled={notInstalled || running !== null || starting}
        onclick={runTest}
      >Run test</UIPillButton>
    </header>

    {#if blockedByEdits && $unsavedEdits}
      <p class="a11y-alert" role="alert">Save the changes you want to have checked.</p>
    {/if}
    {#if startError}
      <p class="a11y-alert" role="alert">{startError}</p>
    {/if}

    {#if running}
      <p class="a11y-status" role="status">Test running, {formatElapsed(now - Date.parse(running.startedAt))}</p>
    {/if}
    {#if failed}
      <div class="a11y-failed">
        <p class="a11y-status">The run of {formatRunTime(failed.startedAt)} failed.</p>
        <details class="a11y-disclosure">
          <summary>Error</summary>
          <pre class="a11y-error">{failed.error}</pre>
        </details>
      </div>
    {/if}

    {#if finished}
      <p class="a11y-status">
        Last run {formatRunTime(finished.finishedAt)}{#if themeName}, theme {themeName}{/if}
      </p>
      {#if runProblems.length > 0}
        <ul class="a11y-problems">
          {#each runProblems as problem, i (i)}
            <li>{@render message(problem.message)}</li>
          {/each}
        </ul>
        {#if notInstalled}
          <div class="a11y-recheck">
            <UIPillButton size="compact" variant="outline" icon="fa-rotate-right" onclick={runTest}>Check again</UIPillButton>
          </div>
        {/if}
      {/if}
      {#if !notInstalled && rows.length === 0}
        <p class="a11y-summary">Every component passes the automated checks.</p>
      {/if}
    {:else if !running && !failed}
      <div class="a11y-empty">
        <p>
          Run test checks every component in the open theme as saved. It scans each one with axe and Alfa,
          presses the keys each one answers, and measures the contrast of every color pair.
        </p>
        <p>A run takes about three minutes. The report stays here until the next run.</p>
      </div>
    {/if}
  </section>

  {#if rows.length > 0}
    <A11yOverview {rows} onjump={(component) => openView?.(a11ySectionId(component))} />
  {/if}

  {#each rows as row (row.component)}
    <section id={a11ySectionId(row.component)} class="editor-section-card a11y-component">
      <header class="a11y-component-head">
        <i class={row.icon} aria-hidden="true"></i>
        <h3 class="editor-subsection-title">{row.label}</h3>
        <span class="a11y-count">{[
          row.count > 0 ? issuesLabel(row.count) : '',
          row.issues.fixed.length > 0 ? fixedLabel(row.issues.fixed.length) : '',
        ].filter(Boolean).join(', ')}</span>
        <UIPillButton
          size="compact"
          variant="outline"
          icon="fa-arrow-right"
          title={`Open ${row.label} in the Components view`}
          onclick={() => openComponentAt(row.component)}
        >Open component</UIPillButton>
      </header>
      <A11yComponentIssues
        component={row.component}
        issues={row.issues}
        onreveal={(variable) => openComponentAt(row.component, variable)}
        onopen={() => openComponentAt(row.component)}
      />
      {#if row.issues.review.length > 0}
        <button type="button" class="a11y-review-link" onclick={() => openView?.(A11Y_REVIEW_SECTION)}>
          {reviewLabel(row.issues.review.length)}
        </button>
      {/if}
    </section>
  {/each}

  {#if review.length > 0}
    <section id={A11Y_REVIEW_SECTION} class="a11y-review">
      <details class="a11y-disclosure">
        <summary>{reviewLabel(reviewTotal)}</summary>
        <ul class="a11y-review-list">
          {#each review as { component, label, row }, i (i)}
            <A11yFindingRow
              {component}
              {row}
              review
              prefix={label}
              onreveal={(variable) => openComponentAt(component, variable)}
              onopen={() => openComponentAt(component)}
            />
          {/each}
        </ul>
      </details>
    </section>
  {/if}
</div>

<style>
  .a11y-tab {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
  }

  .a11y-run {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .a11y-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-12);
    /* Clears an overlay scrollbar and lines the button up with the cards' own buttons. */
    padding-right: var(--ui-space-20);
  }

  .a11y-title {
    margin: 0;
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .a11y-alert,
  .a11y-status,
  .a11y-summary,
  .a11y-empty p {
    margin: 0;
  }

  .a11y-alert {
    color: var(--ui-highlight);
  }

  .a11y-summary {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .a11y-empty {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .a11y-problems {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    margin: 0;
    padding-left: var(--ui-space-20);
    color: var(--ui-text-primary);
  }

  .a11y-recheck {
    display: flex;
  }

  .a11y-failed {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .a11y-disclosure summary {
    cursor: pointer;
    color: var(--ui-text-primary);
  }

  .a11y-error {
    margin: var(--ui-space-8) 0 0;
    padding: var(--ui-space-12);
    overflow-x: auto;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    white-space: pre-wrap;
  }

  .a11y-component {
    gap: var(--ui-space-12);
  }

  .a11y-component-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-8) var(--ui-space-12);
    color: var(--ui-text-primary);
  }

  .a11y-count {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .a11y-component-head :global(.ui-pill) {
    margin-left: auto;
  }

  .a11y-review-link {
    align-self: flex-start;
    padding: 0;
    background: none;
    border: none;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .a11y-review-link:hover {
    color: var(--ui-text-primary);
  }

  .a11y-review-list {
    margin: var(--ui-space-8) 0 0;
    padding: 0;
    list-style: none;
  }

  .a11y-tab code {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
  }
</style>
