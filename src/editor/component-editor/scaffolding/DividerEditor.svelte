<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CSS_VAR_CHANGE_EVENT } from '../../lib/cssVarSync';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIVariantSelector from '../../ui/UIVariantSelector.svelte';
  import { BORDER_WIDTH, DIVIDER_HEIGHT } from '../../ui/variantScales';
  import FieldsetWrapper from './FieldsetWrapper.svelte';

  
  interface Props {
    colorVariable?: string | undefined;
    colorLabel?: string | undefined;
    widthVariable?: string | undefined;
    widthLabel?: string | undefined;
    heightVariable?: string | undefined;
    heightLabel?: string | undefined;
    /** When set, writes persist through the editor store under this component. */
    component?: string | undefined;
  }

  let {
    colorVariable = undefined,
    colorLabel = undefined,
    widthVariable = undefined,
    widthLabel = undefined,
    heightVariable = undefined,
    heightLabel = undefined,
    component = undefined
  }: Props = $props();

  let heightResolved = $state('');

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

  let heightIsZero = $derived(/^0+(?:\.0+)?(px|rem|em|%)?$/.test(heightResolved));
  let siblingDisabled = $derived(heightIsZero);
</script>

<FieldsetWrapper legend="divider">
  {#if colorVariable}
    <div class="entry">
      <UIPaletteSelector variable={colorVariable} {component} disabled={siblingDisabled} onchange={readHeight} />
      <span class="label">{colorLabel ?? ''}</span>
    </div>
  {/if}
  {#if widthVariable}
    <div class="entry">
      <UIVariantSelector variable={widthVariable} {component} disabled={siblingDisabled} {...BORDER_WIDTH} onchange={readHeight} />
      <span class="label">{widthLabel ?? ''}</span>
    </div>
  {/if}
  {#if heightVariable}
    <div class="entry">
      <UIVariantSelector variable={heightVariable} {component} {...DIVIDER_HEIGHT} onchange={readHeight} />
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
