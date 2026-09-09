<!--
  Beacon.svelte. The consumer acceptance gate's own custom component: an
  on/off status light with a label, built the same way live-tokens-create-component
  asks a consumer to build one. Mirrors Toggle.svelte's shape (parts, states,
  interaction) so the gate exercises a real, richly-stated component without
  inventing a new pattern for check-component --tests to prove.
-->
<script lang="ts">
  interface Props {
    on?: boolean;
    disabled?: boolean;
    label?: string;
    class?: string;
    onchange?: (on: boolean) => void;
  }

  let { on = false, disabled = false, label = '', class: className = '', onchange }: Props = $props();

  function flip() {
    if (disabled) return;
    onchange?.(!on);
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={on}
  aria-label={label}
  class="beacon {className}"
  class:on
  {disabled}
  onclick={flip}
>
  <span class="beacon-track">
    <span class="beacon-thumb"></span>
  </span>
  {#if label}
    <span class="beacon-label">{label}</span>
  {/if}
</button>

<style>
  :global(:root) {
    --beacon-track-surface: var(--surface-neutral);
    --beacon-track-border: var(--border-neutral);
    --beacon-track-border-width: var(--border-width-1);
    --beacon-track-radius: var(--radius-full);
    --beacon-track-padding: var(--space-2);
    --beacon-thumb-surface: var(--surface-neutral-highest);
    --beacon-thumb-border: var(--border-neutral-strong);
    --beacon-thumb-size: var(--font-size-md);
    --beacon-label-text: var(--text-primary);
    --beacon-label-font-family: var(--font-sans);
    --beacon-label-font-size: var(--font-size-sm);
    --beacon-label-font-weight: var(--font-weight-normal);
    --beacon-gap: var(--space-8);

    --beacon-hover-track-surface: var(--surface-neutral-high);
    --beacon-hover-thumb-surface: var(--text-primary);

    --beacon-on-track-surface: var(--surface-brand-high);
    --beacon-on-track-border: var(--border-brand);
    --beacon-on-thumb-surface: var(--text-primary);
    --beacon-on-thumb-border: var(--border-brand-strong);

    --beacon-on-hover-track-surface: var(--surface-brand-higher);
    --beacon-on-hover-thumb-surface: var(--text-primary);

    --beacon-disabled-track-surface: var(--surface-neutral-lower);
    --beacon-disabled-thumb-surface: var(--surface-neutral);
    --beacon-disabled-label-text: var(--text-disabled);
  }

  .beacon {
    display: inline-flex;
    align-items: center;
    gap: var(--beacon-gap);
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .beacon:disabled { cursor: not-allowed; }

  .beacon-track {
    position: relative;
    flex: none;
    display: inline-block;
    width: calc(var(--beacon-thumb-size) * 2 + var(--beacon-track-padding) * 2);
    height: calc(var(--beacon-thumb-size) + var(--beacon-track-padding) * 2);
    background: var(--beacon-track-surface);
    border: var(--beacon-track-border-width) solid var(--beacon-track-border);
    border-radius: var(--beacon-track-radius);
  }

  .beacon-thumb {
    position: absolute;
    top: 50%;
    left: var(--beacon-track-padding);
    width: var(--beacon-thumb-size);
    height: var(--beacon-thumb-size);
    transform: translateY(-50%);
    background: var(--beacon-thumb-surface);
    border: var(--beacon-track-border-width) solid var(--beacon-thumb-border);
    border-radius: var(--radius-full);
    transition: left 200ms ease;
  }

  .beacon-label {
    color: var(--beacon-label-text);
    font-family: var(--beacon-label-font-family);
    font-size: var(--beacon-label-font-size);
    font-weight: var(--beacon-label-font-weight);
  }

  .beacon:hover:not(:disabled) .beacon-track,
  .beacon.force-hover:not(:disabled) .beacon-track {
    background: var(--beacon-hover-track-surface);
  }
  .beacon:hover:not(:disabled) .beacon-thumb,
  .beacon.force-hover:not(:disabled) .beacon-thumb {
    background: var(--beacon-hover-thumb-surface);
  }

  .beacon.on .beacon-track {
    background: var(--beacon-on-track-surface);
    border-color: var(--beacon-on-track-border);
  }
  .beacon.on .beacon-thumb {
    left: calc(var(--beacon-thumb-size) + var(--beacon-track-padding));
    background: var(--beacon-on-thumb-surface);
    border-color: var(--beacon-on-thumb-border);
  }

  .beacon.on:hover:not(:disabled) .beacon-track,
  .beacon.on.force-hover:not(:disabled) .beacon-track {
    background: var(--beacon-on-hover-track-surface);
  }
  .beacon.on:hover:not(:disabled) .beacon-thumb,
  .beacon.on.force-hover:not(:disabled) .beacon-thumb {
    background: var(--beacon-on-hover-thumb-surface);
  }

  .beacon:disabled .beacon-track {
    background: var(--beacon-disabled-track-surface);
    border-color: var(--beacon-disabled-track-surface);
  }
  .beacon:disabled .beacon-thumb {
    background: var(--beacon-disabled-thumb-surface);
    border-color: var(--beacon-disabled-thumb-surface);
  }
  .beacon:disabled .beacon-label {
    color: var(--beacon-disabled-label-text);
  }
</style>
