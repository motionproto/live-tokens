<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    readout: string;
    hint: string;
    onchange: (value: number) => void;
  }

  let { label, value, min, max, step, readout, hint, onchange }: Props = $props();
</script>

<label class="dial" data-hint={hint}>
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
    color: var(--ui-text-tertiary);
  }

  .dial-value {
    font-size: var(--ui-font-size-md);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-primary);
  }

  input[type='range'] {
    grid-column: 1 / -1;
    width: 100%;
    margin-top: var(--ui-space-4);
    height: 4px;
    accent-color: var(--ui-text-accent);
    cursor: ew-resize;
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
