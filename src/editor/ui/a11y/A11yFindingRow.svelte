<script lang="ts">
  import { confirmReview } from '../../core/a11y/a11yReport';
  import UIPillButton from '../UIPillButton.svelte';
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
    /** A result to check by eye that someone marked as looking right. */
    confirmed?: boolean;
    /** Leads the text, as the component's name does in a list that spans components. */
    prefix?: string;
    onreveal?: (variable: string) => void;
    /** Opens the component, for a row that traced no property. Absent on the component's own page. */
    onopen?: () => void;
    /** Runs once a press of Looks right has saved, with the row's new state. */
    onconfirmchange?: (confirmed: boolean) => void;
  }

  let { component, row, review = false, confirmed = false, prefix, onreveal, onopen, onconfirmchange }: Props = $props();

  let properties = $derived(row.variables.map((variable) => ({ variable, label: propertyLabel(component, variable) ?? variable })));
  let where = $derived([row.targets.length > 1 ? elementsLabel(row.targets.length) : '', row.views].filter(Boolean).join(', '));
  let helpUrl = $derived(row.finding.details?.helpUrl);
  let hasNavigation = $derived((properties.length > 0 && onreveal !== undefined) || (properties.length === 0 && onopen !== undefined));

  let saving = $state(false);
  let saveError: string | null = $state(null);

  async function toggleConfirmed() {
    saving = true;
    saveError = null;
    // Read before the save: the save moves the row to the other list, which unmounts this one.
    const next = !confirmed;
    const done = onconfirmchange;
    try {
      await confirmReview(row.findings, next);
      done?.(next);
    } catch (err) {
      saveError = (err as Error).message;
    } finally {
      saving = false;
    }
  }
</script>

{#snippet location()}
  {#if row.targets.length === 1}<code>{row.targets[0]}</code>{#if row.views}{`, ${row.views}`}{/if}{:else}{where}{/if}
  {#if saveError}<span class="a11y-confirm-error" role="alert">{saveError}</span>{/if}
{/snippet}

{#snippet confirmToggle()}
  <span class="a11y-confirm">
    <UIPillButton
      size="compact"
      variant="outline"
      icon={confirmed ? 'fa-circle-check' : 'fa-check'}
      ariaPressed={confirmed}
      disabled={saving}
      title={confirmed ? 'Marked as looking right. Press to clear the mark.' : 'Mark this result as looking right'}
      onclick={toggleConfirmed}
    >Looks right</UIPillButton>
  </span>
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
  {confirmed}
  href={helpUrl}
  linkLabel={helpUrl ? guidanceLabel(helpUrl) : undefined}
  detail={row.targets.length > 0 || row.views || saveError ? location : undefined}
  links={hasNavigation ? links : undefined}
  action={review ? confirmToggle : undefined}
>
  {#if review}<i class="fa-solid {confirmed ? 'fa-check' : 'fa-eye'} a11y-review-mark" aria-hidden="true"></i>{/if}
  {#if prefix}{prefix}: {/if}{findingText(row.finding)}
</A11yIssueRow>

<style>
  .a11y-review-mark {
    margin-right: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .a11y-confirm-error {
    margin-left: var(--ui-space-8);
    color: var(--ui-highlight);
  }

  /* One width for both states, so a column of toggles lines up. */
  .a11y-confirm :global(.ui-pill) {
    min-width: 8.5rem;
    justify-content: center;
  }
</style>
