<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CSS_VAR_CHANGE_EVENT } from '../lib/cssVarSync';
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;

  const options = [
    { key: 'xs', label: 'XS' },
    { key: 'sm', label: 'SM' },
    { key: 'md', label: 'MD' },
    { key: 'lg', label: 'LG' },
    { key: 'xl', label: 'XL' },
    { key: '2xl', label: '2XL' },
    { key: '3xl', label: '3XL' },
    { key: '4xl', label: '4XL' },
    { key: '5xl', label: '5XL' },
    { key: '6xl', label: '6XL' },
  ] as const;

  let pxByKey: Record<string, string> = {};

  function readPxValues() {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const next: Record<string, string> = {};
    for (const opt of options) {
      probe.style.fontSize = `var(--font-size-${opt.key})`;
      const px = parseFloat(getComputedStyle(probe).fontSize);
      next[opt.key] = Number.isFinite(px) ? `${Math.round(px * 10) / 10}px` : '';
    }
    document.body.removeChild(probe);
    pxByKey = next;
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name?.startsWith('--font-size-')) readPxValues();
  }

  onMount(() => {
    readPxValues();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeShared}
  {disabled}
  varPrefix="--font-size-"
  {options}
  on:change
>
  <svelte:fragment slot="option" let:opt let:active let:select>
    <UIOptionItem {active} on:click={select}>
      <span slot="preview" class="size-sample-wrap">
        <span class="size-sample-option" style="font-size: var(--font-size-{opt.key});">A</span>
      </span>
      <svelte:fragment slot="label">
        <span class="size-row">
          <span class="size-name">{opt.label}</span>
          <span class="size-px">{pxByKey[opt.key] ?? ''}</span>
        </span>
      </svelte:fragment>
      <svelte:fragment slot="meta">var(--font-size-{opt.key})</svelte:fragment>
    </UIOptionItem>
  </svelte:fragment>
</UIVariantSelector>

<style>
  .size-sample-wrap {
    display: inline-block;
    width: 1.5rem;
    overflow: hidden;
    text-align: center;
    line-height: 1;
    flex-shrink: 0;
  }

  .size-sample-option {
    display: inline-block;
    color: var(--ui-text-primary);
    line-height: 1;
  }

  .size-row {
    display: inline-flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .size-name {
    display: inline-block;
    width: 2.5rem;
    color: var(--ui-text-primary);
  }

  .size-px {
    display: inline-block;
    width: 3rem;
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    text-align: right;
  }
</style>
