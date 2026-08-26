<script lang="ts">
  interface Props {
    label: string;
    low: number;
    high: number;
    min: number;
    max: number;
    step: number;
    /** Closest the two handles may sit, in the same units as the values. */
    gap: number;
    readout: string;
    hint: string;
    onchange: (low: number, high: number) => void;
  }

  let { label, low, high, min, max, step, gap, readout, hint, onchange }: Props = $props();

  /** Handles never cross and never meet: whichever one moved keeps its value and
      pushes the other along, so a drag to the far end walks the pair rather than
      stopping dead. */
  function setLow(v: number) {
    const next = Math.min(Math.max(v, min), max - gap);
    onchange(next, Math.max(high, next + gap));
  }

  function setHigh(v: number) {
    const next = Math.max(Math.min(v, max), min + gap);
    onchange(Math.min(low, next - gap), next);
  }

  /** The thumb's centre travels between half a thumb in from each end, so the
      band has to be inset the same way or it drifts out from under the handles
      towards the middle of the track. */
  const at = (v: number) =>
    `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${(v - min) / (max - min)})`;
</script>

<div
  class="dial"
  data-hint={hint}
  style:--low={at(low)}
  style:--high={at(high)}
  style:--mid={at((low + high) / 2)}
>
  <span class="dial-label">{label}</span>
  <span class="dial-value">{readout}</span>
  <div class="track">
    <input
      class="lo" type="range" {min} {max} {step} value={low}
      aria-label="{label} minimum"
      oninput={(e) => setLow(+e.currentTarget.value)}
    />
    <input
      class="hi" type="range" {min} {max} {step} value={high}
      aria-label="{label} maximum"
      oninput={(e) => setHigh(+e.currentTarget.value)}
    />
  </div>
</div>

<style>
  .dial {
    /* Declared here, not on the track: the three positions below are set on
       this element and each one measures itself against the thumb, and a custom
       property resolves the ones it names against the element declaring it, not
       against the element it lands on. Left on the track, every position
       computed invalid and the whole control collapsed to its defaults. */
    --thumb: var(--ui-space-16);
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

  /* The track is painted here rather than by either input: two of them stacked
     would each draw their own, and the one on top would cover the band. */
  .track {
    position: relative;
    grid-column: 1 / -1;
    height: var(--thumb);
    margin-top: var(--ui-space-2);
    background:
      linear-gradient(
        to right,
        var(--ui-border-high) var(--low),
        var(--ui-text-primary) var(--low),
        var(--ui-text-primary) var(--high),
        var(--ui-border-high) var(--high)
      )
      center / 100% 4px no-repeat;
  }

  input[type='range'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    -webkit-appearance: none;
    appearance: none;
    background: none;
    cursor: ew-resize;
  }

  /* Each input owns the side of the track its handle is on, so a press anywhere
     lands on the one whose handle is nearer and the browser does the rest:
     jump to the press, then drag. Stacking them whole instead would give every
     press to whichever sat on top, and the handle underneath could only ever be
     moved by keyboard.

     The split runs half a thumb past the midpoint on each side rather than
     through it, so neither handle is ever cut in half at the boundary. Where
     the two overlap the press goes to the upper one, which is why the handles
     are held a gap apart. */
  .lo {
    clip-path: inset(0 calc(100% - var(--mid) - var(--thumb) / 2) 0 0);
  }

  .hi {
    clip-path: inset(0 0 0 calc(var(--mid) - var(--thumb) / 2));
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    box-shadow: var(--ui-shadow-sm);
  }

  input[type='range']::-moz-range-thumb {
    width: var(--thumb);
    height: var(--thumb);
    border: none;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    box-shadow: var(--ui-shadow-sm);
  }

  /* On the handle, not the input: the input is clipped to its own half, which
     would cut a ring drawn round its box, and with two of them the ring has to
     say which one has the keyboard. */
  input[type='range']:focus-visible {
    outline: none;
  }

  input[type='range']:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 2px var(--ui-highlight);
  }

  input[type='range']:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 2px var(--ui-highlight);
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
