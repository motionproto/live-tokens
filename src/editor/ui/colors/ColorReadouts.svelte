<script lang="ts">
  import { oklchToHexClamped, type Oklch } from '../../core/palettes/oklch';
  import { showCopyPopover } from '../copyPopover';

  interface Props {
    color: Oklch;
  }

  let { color }: Props = $props();

  // The basis is numeric OKLCH; hex/RGB/HSL are clamped sRGB projections off it.
  let hex = $derived(oklchToHexClamped(color.l, color.c, color.h));

  function toRgb(h: string): [number, number, number] {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  function toHsl(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  let rows = $derived.by(() => {
    const [r, g, b] = toRgb(hex);
    const [hh, ss, ll] = toHsl(r, g, b);
    return [
      { label: 'HEX', value: hex },
      { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
      { label: 'HSL', value: `hsl(${hh}, ${ss}%, ${ll}%)` },
      { label: 'OKLCH', value: `oklch(${Math.round(color.l * 100)}% ${color.c.toFixed(3)} ${Math.round(color.h)})` },
    ];
  });

  let copied: string | null = $state(null);
  function copy(label: string, value: string, e: MouseEvent) {
    navigator.clipboard?.writeText(value);
    copied = label;
    showCopyPopover(value, e.currentTarget);
    setTimeout(() => { if (copied === label) copied = null; }, 1500);
  }
</script>

<div class="readouts">
  {#each rows as row (row.label)}
    <button class="row" type="button" class:copied={copied === row.label} onclick={(e) => copy(row.label, row.value, e)} title="Copy {row.label}">
      <span class="row-label">{row.label}</span>
      <span class="row-value">{copied === row.label ? 'copied!' : row.value}</span>
      <i class="fas fa-copy" aria-hidden="true"></i>
    </button>
  {/each}
</div>

<style>
  .readouts {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .row {
    display: grid;
    grid-template-columns: 3.5rem 1fr auto;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-4) var(--ui-space-8);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    text-align: left;
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .row:hover {
    background: var(--ui-surface-low);
    border-color: var(--ui-border);
  }

  .row-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .row-value {
    font-size: var(--ui-font-size-sm);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row i {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    opacity: 0;
    transition: opacity var(--ui-transition-fast);
  }

  .row:hover i {
    opacity: 1;
  }

  .row.copied .row-value {
    color: var(--ui-text-accent);
  }
</style>
