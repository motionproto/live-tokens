<script lang="ts">
  import A11yIssueRow from './A11yIssueRow.svelte';
  import {
    componentLabel,
    elementsLabel,
    findingText,
    guidanceLabel,
    propertyLabel,
    type A11yFindingRow,
  } from './a11yView';

  interface Props {
    component: string;
    row: A11yFindingRow;
    review?: boolean;
    /** Leads the text, as the component's name does in a list that spans components. */
    prefix?: string;
    onreveal?: (variable: string) => void;
    /** Opens the component, for a row that traced no property. Absent on the component's own page. */
    onopen?: () => void;
  }

  let { component, row, review = false, prefix, onreveal, onopen }: Props = $props();

  let properties = $derived(row.variables.map((variable) => ({ variable, label: propertyLabel(component, variable) ?? variable })));
  let where = $derived([row.targets.length > 1 ? elementsLabel(row.targets.length) : '', row.views].filter(Boolean).join(', '));
  let helpUrl = $derived(row.finding.details?.helpUrl);
  let hasLinks = $derived((properties.length > 0 && onreveal !== undefined) || (properties.length === 0 && onopen !== undefined));
</script>

{#snippet location()}
  {#if row.targets.length === 1}<code>{row.targets[0]}</code>{#if row.views}{`, ${row.views}`}{/if}{:else}{where}{/if}
{/snippet}

{#snippet links()}
  {#if properties.length > 0 && onreveal}
    {#each properties as { variable, label } (variable)}
      <button type="button" class="a11y-link" aria-label={`Go to ${label}`} title={variable} onclick={() => onreveal(variable)}>
        {label} <i class="fas fa-arrow-right" aria-hidden="true"></i>
      </button>
    {/each}
  {:else if onopen}
    <button type="button" class="a11y-link" onclick={onopen}>
      Open {componentLabel(component)} <i class="fas fa-arrow-right" aria-hidden="true"></i>
    </button>
  {/if}
{/snippet}

<A11yIssueRow
  {review}
  href={helpUrl}
  linkLabel={helpUrl ? guidanceLabel(helpUrl) : undefined}
  detail={row.targets.length > 0 || row.views ? location : undefined}
  links={hasLinks ? links : undefined}
>
  {#if prefix}{prefix}: {/if}{findingText(row.finding)}
</A11yIssueRow>
