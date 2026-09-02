<!--
  Slider.svelte — a number chosen by position on a track. `single` moves one
  thumb to a value; `range` moves two thumbs to a low and a high bound. Both
  variants share the track, fill, and thumb tokens, linked in the editor so an
  edit to one moves the other unless deliberately unlinked.
-->
<script module lang="ts">
  export const sliderVariants = ['single', 'range'] as const;
  export type SliderVariant = typeof sliderVariants[number];
</script>

<script lang="ts">
  interface Props {
    variant?: SliderVariant;
    /** The `single` thumb. */
    value?: number;
    /** The `range` thumbs. */
    low?: number;
    high?: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    disabled?: boolean;
    /** Editor preview hook — adds `.force-hover` so hover tokens paint without a real pointer. */
    class?: string;
    onchange?: (value: number) => void;
    onrangechange?: (low: number, high: number) => void;
  }

  let {
    variant = 'single',
    value = 50,
    low = 25,
    high = 75,
    min = 0,
    max = 100,
    step = 1,
    label = '',
    disabled = false,
    class: className = '',
    onchange,
    onrangechange,
  }: Props = $props();

  const span = $derived(Math.max(max - min, Number.EPSILON));
  const percent = (n: number) => Math.min(100, Math.max(0, ((n - min) / span) * 100));

  const fillStart = $derived(variant === 'range' ? percent(low) : 0);
  const fillEnd = $derived(variant === 'range' ? percent(high) : percent(value));
  const readout = $derived(variant === 'range' ? `${low} – ${high}` : `${value}`);

  function onSingleInput(event: Event) {
    onchange?.(Number((event.currentTarget as HTMLInputElement).value));
  }
  // Each thumb is its own input, so a thumb dragged past its partner is held at
  // the partner's value rather than crossing it.
  function onLowInput(event: Event) {
    const next = Math.min(Number((event.currentTarget as HTMLInputElement).value), high);
    onrangechange?.(next, high);
  }
  function onHighInput(event: Event) {
    const next = Math.max(Number((event.currentTarget as HTMLInputElement).value), low);
    onrangechange?.(low, next);
  }
</script>

<div class="slider {variant} {className}" class:disabled class:has-label={!!label}>
  {#if label}
    <div class="slider-label">
      <span>{label}</span>
      <span class="slider-value">{readout}</span>
    </div>
  {/if}
  <div class="slider-track">
    <div class="slider-fill" style:--_from={fillStart / 100} style:--_to={fillEnd / 100}></div>
    {#if variant === 'range'}
      <input
        type="range"
        class="thumb low"
        {min}
        {max}
        {step}
        value={low}
        {disabled}
        aria-label={label ? `${label} minimum` : 'Minimum'}
        oninput={onLowInput}
      />
      <span class="cap" style:--_at={fillStart / 100} aria-hidden="true"></span>
      <input
        type="range"
        class="thumb high"
        {min}
        {max}
        {step}
        value={high}
        {disabled}
        aria-label={label ? `${label} maximum` : 'Maximum'}
        oninput={onHighInput}
      />
      <span class="cap" style:--_at={fillEnd / 100} aria-hidden="true"></span>
    {:else}
      <input
        type="range"
        class="thumb"
        {min}
        {max}
        {step}
        {value}
        {disabled}
        aria-label={label || 'Value'}
        oninput={onSingleInput}
      />
      <span class="cap" style:--_at={fillEnd / 100} aria-hidden="true"></span>
    {/if}
  </div>
</div>

<style>
  :global(:root) {
    /* Single: one thumb. */
    --slider-single-track-surface: var(--surface-neutral-lowest);
    --slider-single-track-border: var(--border-neutral-subtle);
    --slider-single-track-border-width: var(--border-width-1);
    --slider-single-track-height: var(--space-8);
    --slider-single-track-radius: var(--radius-full);
    --slider-single-fill: var(--surface-brand-high);
    --slider-single-thumb-surface: var(--surface-neutral-highest);
    --slider-single-thumb-border: var(--border-brand);
    --slider-single-thumb-border-width: var(--border-width-2);
    --slider-single-thumb-size: var(--font-size-lg);
    --slider-single-thumb-radius: var(--radius-full);
    --slider-single-thumb-shadow: var(--shadow-sm);
    --slider-single-hover-thumb-surface: var(--surface-brand-high);
    --slider-single-hover-thumb-border: var(--border-brand-strong);
    --slider-single-disabled-track-surface: var(--surface-neutral-lower);
    --slider-single-disabled-fill: var(--surface-neutral);
    --slider-single-disabled-thumb-surface: var(--surface-neutral-lower);
    --slider-single-disabled-thumb-border: var(--border-neutral);

    /* Range: two thumbs bounding a fill. */
    --slider-range-track-surface: var(--surface-neutral-lowest);
    --slider-range-track-border: var(--border-neutral-subtle);
    --slider-range-track-border-width: var(--border-width-1);
    --slider-range-track-height: var(--space-8);
    --slider-range-track-radius: var(--radius-full);
    --slider-range-fill: var(--surface-brand-high);
    --slider-range-thumb-surface: var(--surface-neutral-highest);
    --slider-range-thumb-border: var(--border-brand);
    --slider-range-thumb-border-width: var(--border-width-2);
    --slider-range-thumb-size: var(--font-size-lg);
    --slider-range-thumb-radius: var(--radius-full);
    --slider-range-thumb-shadow: var(--shadow-sm);
    --slider-range-hover-thumb-surface: var(--surface-brand-high);
    --slider-range-hover-thumb-border: var(--border-brand-strong);
    --slider-range-disabled-track-surface: var(--surface-neutral-lower);
    --slider-range-disabled-fill: var(--surface-neutral);
    --slider-range-disabled-thumb-surface: var(--surface-neutral-lower);
    --slider-range-disabled-thumb-border: var(--border-neutral);

    /* Label and value readout, shared by both variants. */
    --slider-label-gap: var(--space-6);
    --slider-label: var(--text-secondary);
    --slider-label-font-family: var(--font-sans);
    --slider-label-font-size: var(--font-size-md);
    --slider-label-font-weight: var(--font-weight-normal);
    --slider-label-line-height: var(--line-height-normal);
    --slider-value: var(--text-tertiary);
    --slider-value-font-family: var(--font-mono);
    --slider-value-font-size: var(--font-size-md);
    --slider-value-font-weight: var(--font-weight-normal);
    --slider-value-line-height: var(--line-height-normal);
  }

  .slider {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--slider-label-gap);
    width: 100%;
  }

  .slider-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .slider-label > span {
    color: var(--slider-label);
    font-family: var(--slider-label-font-family);
    font-size: var(--slider-label-font-size);
    font-weight: var(--slider-label-font-weight);
    line-height: var(--slider-label-line-height);
  }

  .slider-label > .slider-value {
    color: var(--slider-value);
    font-family: var(--slider-value-font-family);
    font-size: var(--slider-value-font-size);
    font-weight: var(--slider-value-font-weight);
    line-height: var(--slider-value-line-height);
  }

  /* The inputs sit on top of the track and are invisible apart from their
     native thumb, which is kept for the pointer and the keyboard but drawn
     transparent; the visible thumb is the `.cap` beside each input, placed on
     the same travel the native thumb has (it stays inside the input's box, so
     its centre runs from half a thumb in to half a thumb from the end). */
  .slider-track {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    margin-block: calc((var(--_thumb-size) - var(--_track-height)) / 2);
    border-style: solid;
    transition: background var(--duration-150), border-color var(--duration-150);
    --_origin: calc(var(--_thumb-size) / 2 - var(--_track-border-width));
    --_travel: calc(100% + var(--_track-border-width) * 2 - var(--_thumb-size));
  }

  .slider.single .slider-track {
    --_track-height: var(--slider-single-track-height);
    --_track-border-width: var(--slider-single-track-border-width);
    --_thumb-size: var(--slider-single-thumb-size);
    --_thumb-surface: var(--slider-single-thumb-surface);
    --_thumb-border: var(--slider-single-thumb-border);
    --_thumb-border-width: var(--slider-single-thumb-border-width);
    --_thumb-radius: var(--slider-single-thumb-radius);
    --_thumb-shadow: var(--slider-single-thumb-shadow);
    height: var(--slider-single-track-height);
    background: var(--slider-single-track-surface);
    border-color: var(--slider-single-track-border);
    border-width: var(--slider-single-track-border-width);
    border-radius: var(--slider-single-track-radius);
  }
  .slider.range .slider-track {
    --_track-height: var(--slider-range-track-height);
    --_track-border-width: var(--slider-range-track-border-width);
    --_thumb-size: var(--slider-range-thumb-size);
    --_thumb-surface: var(--slider-range-thumb-surface);
    --_thumb-border: var(--slider-range-thumb-border);
    --_thumb-border-width: var(--slider-range-thumb-border-width);
    --_thumb-radius: var(--slider-range-thumb-radius);
    --_thumb-shadow: var(--slider-range-thumb-shadow);
    height: var(--slider-range-track-height);
    background: var(--slider-range-track-surface);
    border-color: var(--slider-range-track-border);
    border-width: var(--slider-range-track-border-width);
    border-radius: var(--slider-range-track-radius);
  }
  .slider.single.disabled .slider-track { background: var(--slider-single-disabled-track-surface); }
  .slider.range.disabled .slider-track { background: var(--slider-range-disabled-track-surface); }

  .slider-fill {
    position: absolute;
    top: calc(-1 * var(--_track-border-width));
    bottom: calc(-1 * var(--_track-border-width));
    left: calc(var(--_origin) + var(--_travel) * var(--_from));
    width: calc(var(--_travel) * (var(--_to) - var(--_from)));
    transition: background var(--duration-150);
  }
  .slider.single .slider-fill {
    left: calc(-1 * var(--_track-border-width));
    width: calc(var(--_origin) + var(--_track-border-width) + var(--_travel) * var(--_to));
    background: var(--slider-single-fill);
    border-radius: var(--slider-single-track-radius);
  }
  .slider.range .slider-fill {
    background: var(--slider-range-fill);
    border-radius: var(--slider-range-track-radius);
  }
  .slider.single.disabled .slider-fill { background: var(--slider-single-disabled-fill); }
  .slider.range.disabled .slider-fill { background: var(--slider-range-disabled-fill); }

  .thumb {
    position: absolute;
    top: 50%;
    left: calc(-1 * var(--_track-border-width));
    width: calc(100% + var(--_track-border-width) * 2);
    height: var(--_thumb-size);
    margin: 0;
    padding: 0;
    transform: translateY(-50%);
    appearance: none;
    background: transparent;
    pointer-events: none;
    cursor: pointer;
  }
  .thumb:disabled { cursor: not-allowed; }
  .thumb::-webkit-slider-thumb {
    appearance: none;
    width: var(--_thumb-size);
    height: var(--_thumb-size);
    opacity: 0;
    pointer-events: auto;
  }
  .thumb::-moz-range-thumb {
    width: var(--_thumb-size);
    height: var(--_thumb-size);
    border: 0;
    opacity: 0;
    pointer-events: auto;
  }
  .thumb::-webkit-slider-runnable-track,
  .thumb::-moz-range-track {
    background: transparent;
    border: 0;
  }
  .thumb:focus-visible { outline: none; }

  .cap {
    position: absolute;
    top: 50%;
    left: calc(var(--_origin) + var(--_travel) * var(--_at));
    width: var(--_thumb-size);
    height: var(--_thumb-size);
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    background: var(--_thumb-surface);
    border: var(--_thumb-border-width) solid var(--_thumb-border);
    border-radius: var(--_thumb-radius);
    box-shadow: var(--_thumb-shadow);
    pointer-events: none;
    transition: background var(--duration-150), border-color var(--duration-150);
  }
  .thumb:focus-visible + .cap {
    outline: var(--_thumb-border-width) solid var(--_thumb-border);
    outline-offset: var(--_thumb-border-width);
  }

  .slider.single .thumb:hover + .cap,
  .slider.single.force-hover .cap {
    --_thumb-surface: var(--slider-single-hover-thumb-surface);
    --_thumb-border: var(--slider-single-hover-thumb-border);
  }
  .slider.range .thumb:hover + .cap,
  .slider.range.force-hover .cap {
    --_thumb-surface: var(--slider-range-hover-thumb-surface);
    --_thumb-border: var(--slider-range-hover-thumb-border);
  }
  .slider.single .thumb:disabled + .cap {
    --_thumb-surface: var(--slider-single-disabled-thumb-surface);
    --_thumb-border: var(--slider-single-disabled-thumb-border);
  }
  .slider.range .thumb:disabled + .cap {
    --_thumb-surface: var(--slider-range-disabled-thumb-surface);
    --_thumb-border: var(--slider-range-disabled-thumb-border);
  }
</style>
