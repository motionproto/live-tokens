<script lang="ts">
  import type { ComponentA11yIssues } from '../../core/a11y/a11yReport';
  import { CONTRAST_RULES } from '../../core/palettes/contrast';
  import { formatFloor, formatRatio } from '../contrastReadout';
  import A11yFindingRow from './A11yFindingRow.svelte';
  import A11yIssueRow from './A11yIssueRow.svelte';
  import { findingRows, propertyLabel } from './a11yView';

  interface Props {
    component: string;
    issues: ComponentA11yIssues;
    /** Lists the results to check by eye as a third group. The Accessibility view lists them apart. */
    withReview?: boolean;
    onreveal?: (variable: string) => void;
    /** Opens the component, for a row that traced no property. Absent on the component's own page. */
    onopen?: () => void;
  }

  let { component, issues, withReview = false, onreveal, onopen }: Props = $props();

  let propertyRows = $derived(findingRows(issues.property));
  let codeRows = $derived(findingRows(issues.code));
  let reviewRows = $derived(withReview ? findingRows(issues.review) : []);
</script>

{#if issues.contrast.length > 0 || propertyRows.length > 0}
  <div class="a11y-group">
    <h4 class="a11y-group-title">Fix with a property</h4>
    <ul class="a11y-issues">
      {#each issues.contrast as failure, i (i)}
        {@const label = propertyLabel(component, failure.variable) ?? failure.variable}
        {@const rule = CONTRAST_RULES[failure.role]}
        <A11yIssueRow href={rule.url} linkLabel={`Success criterion ${rule.criterion}`}>
          {label} {formatRatio(failure.ratio)}, needs {formatFloor(failure.floor)}
          {#snippet detail()}
            <code>{failure.variable}</code>{#if failure.context}, {failure.context}{/if}
          {/snippet}
          {#snippet links()}
            {#if onreveal}
              <button type="button" class="a11y-link" aria-label={`Go to ${label}`} title={failure.variable} onclick={() => onreveal(failure.variable)}>
                {label} <i class="fas fa-arrow-right" aria-hidden="true"></i>
              </button>
            {/if}
          {/snippet}
        </A11yIssueRow>
      {/each}
      {#each propertyRows as row, i (i)}
        <A11yFindingRow {component} {row} {onreveal} {onopen} />
      {/each}
    </ul>
  </div>
{/if}

{#if codeRows.length > 0}
  <div class="a11y-group">
    <h4 class="a11y-group-title">Fix in the component's code</h4>
    <ul class="a11y-issues">
      {#each codeRows as row, i (i)}
        <A11yFindingRow {component} {row} {onreveal} {onopen} />
      {/each}
    </ul>
  </div>
{/if}

{#if reviewRows.length > 0}
  <div class="a11y-group">
    <h4 class="a11y-group-title">Check by eye</h4>
    <ul class="a11y-issues">
      {#each reviewRows as row, i (i)}
        <A11yFindingRow {component} {row} review {onreveal} {onopen} />
      {/each}
    </ul>
  </div>
{/if}

<style>
  .a11y-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .a11y-group + .a11y-group {
    margin-top: var(--ui-space-12);
  }

  .a11y-group-title {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .a11y-group code {
    font-family: var(--ui-font-mono);
  }

  .a11y-issues {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
