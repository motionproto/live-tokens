<script lang="ts">
  import A11yIssueRow from './A11yIssueRow.svelte';
  import { elementsLabel, findingText, propertyLabel, type A11yFindingRow } from './a11yView';

  interface Props {
    component: string;
    row: A11yFindingRow;
    review?: boolean;
    /** Leads the text, as the component's name does in a list that spans components. */
    prefix?: string;
    /** Present on the component page, where each traced property links to its row. */
    onreveal?: (variable: string) => void;
  }

  let { component, row, review = false, prefix, onreveal }: Props = $props();

  let properties = $derived(row.variables.map((variable) => ({ variable, label: propertyLabel(component, variable) ?? variable })));
  let where = $derived([row.targets.length > 1 ? elementsLabel(row.targets.length) : '', row.views].filter(Boolean).join(', '));
</script>

{#snippet location()}
  {#if row.targets.length === 1}<code>{row.targets[0]}</code>{#if row.views}{`, ${row.views}`}{/if}{:else}{where}{/if}
{/snippet}

{#snippet propertyLinks()}
  {#each properties as { variable, label } (variable)}
    {#if onreveal}
      <button type="button" class="a11y-property" aria-label={`Go to ${label}`} title={variable} onclick={() => onreveal(variable)}>
        {label} <i class="fas fa-arrow-right" aria-hidden="true"></i>
      </button>
    {:else}
      <span class="a11y-property" title={variable}>{label}</span>
    {/if}
  {/each}
{/snippet}

<A11yIssueRow
  {review}
  href={row.finding.details?.helpUrl}
  detail={row.targets.length > 0 || row.views ? location : undefined}
  links={properties.length > 0 ? propertyLinks : undefined}
>
  {#if prefix}{prefix}: {/if}{findingText(row.finding)}
</A11yIssueRow>

<style>
  .a11y-property {
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    color: inherit;
  }

  button.a11y-property {
    cursor: pointer;
  }

  button.a11y-property:hover {
    color: var(--ui-text-primary);
  }

  .a11y-property i {
    margin-left: var(--ui-space-2);
  }
</style>
