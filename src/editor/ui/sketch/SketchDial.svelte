<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    readout: string;
    hint: string;
    /** Captions under the two ends of the track, for a dial with no natural unit. */
    ends?: [string, string];
    onchange: (value: number) => void;
  }

  let { label, value, min, max, step, readout, hint, ends, onchange }: Props = $props();

  let filled = $derived(`${((value - min) / (max - min)) * 100}%`);
</script>

<label class="dial" data-hint={hint} style:--filled={filled}>
  <span class="dial-label">{label}</span>
  <span class="dial-value">{readout}</span>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    oninput={(e) => onchange(+e.currentTarget.value)}
  />
  {#if ends}
    <span class="ends"><span>{ends[0]}</span><span>{ends[1]}</span></span>
  {/if}
</label>

<style>
  .dial {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0 var(--ui-space-12);
    align-items: baseline;
  }

  .dial-label {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
  }

  .dial-value {
    font-size: var(--ui-font-size-md);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-primary);
  }

  /* Painted rather than left to accent-color: the browser's own range chrome
     renders the track and thumb too dark to read against --ui-surface-low. */
  input[type='range'] {
    grid-column: 1 / -1;
    width: 100%;
    margin-top: var(--ui-space-2);
    height: var(--ui-space-16);
    -webkit-appearance: none;
    appearance: none;
    background:
      linear-gradient(
        to right,
        var(--ui-text-primary) var(--filled),
        var(--ui-border-high) var(--filled)
      )
      center / 100% 4px no-repeat;
    cursor: ew-resize;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: var(--ui-space-16);
    height: var(--ui-space-16);
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    box-shadow: var(--ui-shadow-sm);
  }

  input[type='range']::-moz-range-thumb {
    width: var(--ui-space-16);
    height: var(--ui-space-16);
    border: none;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    box-shadow: var(--ui-shadow-sm);
  }

  .ends {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  input[type='range']:focus-visible {
    outline: 2px solid var(--ui-highlight);
    outline-offset: 4px;
  }

  /* Absolutely positioned so a hint never reflows the stack of dials under it. */
  .dial:hover::after {
    content: attr(data-hint);
    position: absolute;
    top: calc(100% + var(--ui-space-2));
    left: 0;
    right: 0;
    z-index: 2;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: var(--ui-line-height-relaxed);
    pointer-events: none;
  }
</style>
