<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { editorState } from '../core/store/editorStore';
  import { CSS_VARS_CHANGE_EVENT, type CssVarsChangeDetail } from '../core/cssVarSync';
  import {
    fontWeightAvailability,
    inferFontFamilyVariable,
  } from '../core/fonts/fontWeightAvailability';
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    onchange,
  }: Props = $props();

  const options = [
    { key: 'thin', label: 'Thin', value: '100' },
    { key: 'extralight', label: 'Extra Light', value: '200' },
    { key: 'light', label: 'Light', value: '300' },
    { key: 'normal', label: 'Normal', value: '400' },
    { key: 'medium', label: 'Medium', value: '500' },
    { key: 'semibold', label: 'Semibold', value: '600' },
    { key: 'bold', label: 'Bold', value: '700' },
    { key: 'extrabold', label: 'Extra Bold', value: '800' },
    { key: 'black', label: 'Black', value: '900' },
  ] as const;

  let availability = $state<ReturnType<typeof fontWeightAvailability>>(null);
  let familyVariable = $derived(inferFontFamilyVariable(variable));

  function refreshAvailability() {
    if (!familyVariable) {
      availability = null;
      return;
    }
    const familyValue = getComputedStyle(document.documentElement)
      .getPropertyValue(familyVariable)
      .trim();
    availability = fontWeightAvailability(
      familyValue,
      $editorState.fonts.sources,
      $editorState.fonts.stacks,
    );
  }

  function handleVarChange(event: Event) {
    const names = (event as CustomEvent<CssVarsChangeDetail>).detail?.names ?? [];
    if (
      (familyVariable && names.includes(familyVariable))
      || names.some((name) => /^--font-(?:display|sans|serif|mono)$/.test(name))
    ) {
      refreshAvailability();
    }
  }

  $effect(() => {
    variable;
    $editorState.fonts.sources;
    $editorState.fonts.stacks;
    refreshAvailability();
  });

  onMount(() => document.addEventListener(CSS_VARS_CHANGE_EVENT, handleVarChange));
  onDestroy(() => document.removeEventListener(CSS_VARS_CHANGE_EVENT, handleVarChange));
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--font-weight-"
  {options}
  {onchange}
>
  {#snippet option({ opt, active, select })}
      {@const unsupported = availability !== null && !availability.weights.has(Number(opt.value))}
      <UIOptionItem
        {active}
        disabled={unsupported}
        title={unsupported ? `${opt.label} is not available for ${availability?.familyName}` : ''}
        onclick={select}
      >
        {#snippet preview()}
            <span  class="weight-sample" style="font-weight: var(--font-weight-{opt.key});">A</span>
          {/snippet}
        {#snippet label()}
            {opt.label}
          {/snippet}
        {#snippet meta()}
            {opt.value}
          {/snippet}
      </UIOptionItem>
    
  {/snippet}
</UIVariantSelector>

<style>
  .weight-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    line-height: 1;
  }
</style>
