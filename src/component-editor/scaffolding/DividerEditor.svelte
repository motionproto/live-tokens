<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CSS_VAR_CHANGE_EVENT } from '../../lib/cssVarSync';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIDividerHeightSelector from '../../ui/UIDividerHeightSelector.svelte';
  import FieldsetWrapper from './FieldsetWrapper.svelte';

  export let colorVariable: string | undefined = undefined;
  export let colorLabel: string | undefined = undefined;
  export let widthVariable: string | undefined = undefined;
  export let widthLabel: string | undefined = undefined;
  export let heightVariable: string | undefined = undefined;
  export let heightLabel: string | undefined = undefined;
  /** When set, writes persist through the editor store under this component. */
  export let component: string | undefined = undefined;

  let heightResolved = '';

  function readHeight() {
    if (!heightVariable) {
      heightResolved = '';
      return;
    }
    heightResolved = getComputedStyle(document.documentElement)
      .getPropertyValue(heightVariable)
      .trim();
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name === heightVariable) readHeight();
  }

  onMount(() => {
    readHeight();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  $: heightIsZero = /^0+(?:\.0+)?(px|rem|em|%)?$/.test(heightResolved);
  $: siblingDisabled = heightIsZero;
</script>

<FieldsetWrapper legend="divider">
  {#if colorVariable}
    <div class="entry">
      <UIPaletteSelector variable={colorVariable} {component} disabled={siblingDisabled} on:change={readHeight} />
      <span class="label">{colorLabel ?? ''}</span>
    </div>
  {/if}
  {#if widthVariable}
    <div class="entry">
      <UIBorderWeightSelector variable={widthVariable} {component} disabled={siblingDisabled} on:change={readHeight} />
      <span class="label">{widthLabel ?? ''}</span>
    </div>
  {/if}
  {#if heightVariable}
    <div class="entry">
      <UIDividerHeightSelector variable={heightVariable} {component} on:change={readHeight} />
      <span class="label">{heightLabel ?? ''}</span>
    </div>
  {/if}
</FieldsetWrapper>

<style>
  .entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }
</style>
