<script lang="ts">
  import { a11yPropertyFindings } from '../../core/a11y/a11yReport';
  import UIInfoPopover from '../UIInfoPopover.svelte';
  import A11yFindingRow from './A11yFindingRow.svelte';
  import { accessibilityIssuesLabel, findingRows, reviewLabel } from './a11yView';

  interface Props {
    variables: string[];
    /** `gutter` hangs the mark left of its nearest positioned ancestor, in the gap between a row's label and its control. */
    placement?: 'inline' | 'gutter';
  }

  let { variables, placement = 'inline' }: Props = $props();

  let findings = $derived([...new Set(variables.flatMap((variable) => $a11yPropertyFindings.get(variable) ?? []))]);
  let reviewCount = $derived(findings.filter((finding) => finding.rule === 'a11y-review').length);
  let review = $derived(reviewCount === findings.length);
  let label = $derived([
    review ? '' : accessibilityIssuesLabel(findings.length - reviewCount),
    reviewCount > 0 ? reviewLabel(reviewCount) : '',
  ].filter(Boolean).join(', '));
  let rows = $derived(findingRows([
    ...findings.filter((finding) => finding.rule !== 'a11y-review'),
    ...findings.filter((finding) => finding.rule === 'a11y-review'),
  ]));
</script>

{#if findings.length > 0}
  <span class="a11y-property-mark" class:gutter={placement === 'gutter'}>
    <UIInfoPopover title={label} ariaLabel={label}>
      {#snippet trigger()}
        {#if review}
          <i class="fa-solid fa-eye a11y-property-mark-glyph review" aria-hidden="true"></i>
        {:else}
          <i class="fa-solid fa-triangle-exclamation a11y-property-mark-glyph" aria-hidden="true"></i>
        {/if}
      {/snippet}
      <ul class="a11y-property-findings">
        {#each rows as row, i (i)}
          <A11yFindingRow component={row.finding.component ?? ''} {row} review={row.finding.rule === 'a11y-review'} />
        {/each}
      </ul>
    </UIInfoPopover>
  </span>
{/if}

<style>
  .a11y-property-mark {
    display: inline-flex;
    align-items: center;
    margin-left: var(--ui-space-4);
    line-height: 1;
  }

  /* No transform: it would make this span the containing block of the
     popover, which positions itself against the viewport. */
  .a11y-property-mark.gutter {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 100%;
    margin: 0 var(--ui-space-2) 0 0;
  }

  .a11y-property-mark-glyph {
    color: var(--ui-highlight);
    font-size: var(--ui-font-size-xs);
  }

  .a11y-property-mark-glyph.review {
    color: var(--ui-text-tertiary);
  }

  .a11y-property-findings {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* The popover spaces its own paragraphs, which would double the row's gaps. */
  .a11y-property-findings :global(.a11y-issue p) {
    margin: 0;
  }
</style>
