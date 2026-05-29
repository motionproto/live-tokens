<!--
  Toggle.svelte — Cloudscape-style on/off switch. The default state is "off",
  whose tokens carry the baseline appearance plus all geometry and label
  typography. "On" is a state that recolors track + thumb when the toggle is
  checked; hover and disabled layer over the active component state.
-->
<script lang="ts">
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    ariaLabel?: string | undefined;
    /** Editor preview hook — adds `.force-hover` so hover tokens paint without a real pointer. */
    class?: string;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = false,
    disabled = false,
    label = '',
    ariaLabel = undefined,
    class: className = '',
    onchange,
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    onchange?.(!checked);
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel ?? label}
  class="toggle {className}"
  class:on={checked}
  {disabled}
  onclick={toggle}
>
  <span class="track">
    <span class="thumb"></span>
  </span>
  {#if label}
    <span class="label">{label}</span>
  {/if}
</button>

<style>
  :global(:root) {
    /* Default (off resting) — also carries all geometry + label typography. */
    --toggle-track-surface: var(--surface-neutral);
    --toggle-track-border: var(--border-neutral);
    --toggle-track-border-width: var(--border-width-1);
    --toggle-track-radius: var(--radius-full);
    --toggle-track-padding: var(--space-2);
    --toggle-thumb-surface: var(--surface-neutral-highest);
    --toggle-thumb-border: var(--border-neutral-strong);
    --toggle-thumb-size: var(--font-size-md);
    --toggle-label-text: var(--text-primary);
    --toggle-label-font-family: var(--font-sans);
    --toggle-label-font-size: var(--font-size-sm);
    --toggle-label-font-weight: var(--font-weight-normal);
    --toggle-gap: var(--space-8);

    /* Hover (default + hover interaction). */
    --toggle-hover-track-surface: var(--surface-neutral-high);
    --toggle-hover-thumb-surface: var(--text-primary);

    /* On (selected — toggle is checked). */
    --toggle-on-track-surface: var(--surface-brand-high);
    --toggle-on-track-border: var(--border-brand);
    --toggle-on-thumb-surface: var(--text-primary);
    --toggle-on-thumb-border: var(--border-brand-strong);

    /* On + hover. */
    --toggle-on-hover-track-surface: var(--surface-brand-higher);
    --toggle-on-hover-thumb-surface: var(--text-primary);

    /* Disabled (terminal — applies regardless of on/off). */
    --toggle-disabled-track-surface: var(--surface-neutral-lower);
    --toggle-disabled-thumb-surface: var(--surface-neutral);
    --toggle-disabled-label-text: var(--text-disabled);
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--toggle-gap);
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .toggle:disabled { cursor: not-allowed; }

  /* Track geometry derives from the thumb. Width fits two thumb-widths plus
     padding on each side; height fits one thumb plus the same padding. The
     thumb's "on" travel is then exactly one thumb-width, regardless of
     thumb-size or padding. Border sits outside (content-box default). */
  .track {
    position: relative;
    flex: none;
    display: inline-block;
    width: calc(var(--toggle-thumb-size) * 2 + var(--toggle-track-padding) * 2);
    height: calc(var(--toggle-thumb-size) + var(--toggle-track-padding) * 2);
    background: var(--toggle-track-surface);
    border: var(--toggle-track-border-width) solid var(--toggle-track-border);
    border-radius: var(--toggle-track-radius);
    transition: background var(--duration-150, 150ms), border-color var(--duration-150, 150ms);
  }

  .thumb {
    position: absolute;
    top: 50%;
    left: var(--toggle-track-padding);
    width: var(--toggle-thumb-size);
    height: var(--toggle-thumb-size);
    transform: translateY(-50%);
    background: var(--toggle-thumb-surface);
    border: var(--toggle-track-border-width) solid var(--toggle-thumb-border);
    border-radius: var(--radius-full);
    transition: left var(--duration-200, 200ms) ease, background var(--duration-150, 150ms), border-color var(--duration-150, 150ms);
  }

  .label {
    color: var(--toggle-label-text);
    font-family: var(--toggle-label-font-family);
    font-size: var(--toggle-label-font-size);
    font-weight: var(--toggle-label-font-weight);
  }

  /* Hover (default state). */
  .toggle:hover:not(:disabled) .track,
  .toggle.force-hover:not(:disabled) .track {
    background: var(--toggle-hover-track-surface);
  }
  .toggle:hover:not(:disabled) .thumb,
  .toggle.force-hover:not(:disabled) .thumb {
    background: var(--toggle-hover-thumb-surface);
  }

  /* On state — slide thumb, recolor track + thumb. */
  .toggle.on .track {
    background: var(--toggle-on-track-surface);
    border-color: var(--toggle-on-track-border);
  }
  .toggle.on .thumb {
    /* Mirror of the off-position calc: travel is exactly one thumb-width. */
    left: calc(var(--toggle-thumb-size) + var(--toggle-track-padding));
    background: var(--toggle-on-thumb-surface);
    border-color: var(--toggle-on-thumb-border);
  }

  /* On + hover. */
  .toggle.on:hover:not(:disabled) .track,
  .toggle.on.force-hover:not(:disabled) .track {
    background: var(--toggle-on-hover-track-surface);
  }
  .toggle.on:hover:not(:disabled) .thumb,
  .toggle.on.force-hover:not(:disabled) .thumb {
    background: var(--toggle-on-hover-thumb-surface);
  }

  /* Disabled — terminal, beats both default and on. */
  .toggle:disabled .track {
    background: var(--toggle-disabled-track-surface);
    border-color: var(--toggle-disabled-track-surface);
  }
  .toggle:disabled .thumb {
    background: var(--toggle-disabled-thumb-surface);
    border-color: var(--toggle-disabled-thumb-surface);
  }
  .toggle:disabled .label {
    color: var(--toggle-disabled-label-text);
  }
</style>
