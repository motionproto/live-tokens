<script lang="ts">
  /**
   * Scrim and tint scales. Each family has one colour, bound to an existing
   * color token through `UIPaletteSelector`, and three opacity stops. The
   * slice emits the colour and the stops; tokens.css composes the `--scrim-*`
   * and `--tint-*` fills that the swatches show.
   */
  import { editorState, mutate, beginSliderGesture } from '../../core/store/editorStore';
  import {
    makeDefaultWashScale,
    washColorVar,
    type WashFamily,
  } from '../../core/themes/slices/washes';
  import UIPaletteSelector from '../UIPaletteSelector.svelte';

  interface Props {
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let { copiedVar = null, oncopy }: Props = $props();

  const FAMILIES: { family: WashFamily; title: string }[] = [
    { family: 'scrim', title: 'Scrims' },
    { family: 'tint', title: 'Tints' },
  ];

  function copy(v: string) { oncopy?.(v); }

  /** The fill a stop composes: `--scrim-opacity-low` → `--scrim-low`. */
  const fillVar = (opacityVar: string) => opacityVar.replace('-opacity', '');

  /** `null` restores the default colour; the picker's full-strength writes are
   *  bare `--name`s. */
  function writeColor(family: WashFamily, value: string | null) {
    mutate(`${family} color edit`, (s) => {
      if (value === null) s.washes[family].color = makeDefaultWashScale(family).color;
      else if (value.startsWith('--')) s.washes[family].color = value;
    });
  }

  function writeOpacity(family: WashFamily, idx: number, pct: number) {
    if (!Number.isFinite(pct)) return;
    mutate(`${family} opacity edit`, (s) => {
      const stop = s.washes[family].stops[idx];
      if (stop) stop.opacity = Math.max(0, Math.min(100, Math.round(pct))) / 100;
    });
  }
</script>

<section class="section" id="washes">
  <h2 class="section-title">Washes</h2>

  {#each FAMILIES as { family, title } (family)}
    {@const scale = $editorState.washes[family]}
    {@const colorVar = washColorVar(family)}
    <h3 class="group-title">{title}</h3>
    <div class="washes-grid">
      <div class="wash-row">
        <div class="wash-swatch-wrap" class:wash-swatch-wrap--dark={family === 'tint'}>
          <div class="wash-swatch" style="background: var({colorVar});"></div>
        </div>
        <div class="wash-meta">
          <button
            class="token-variable copyable"
            class:copied={copiedVar === colorVar}
            onclick={() => copy(colorVar)}
          >{copiedVar === colorVar ? 'copied!' : colorVar}</button>
          <span class="token-value">Colour</span>
        </div>
        <div class="wash-control">
          <UIPaletteSelector
            variable={colorVar}
            showNone={false}
            showOpacity={false}
            onwrite={(v) => writeColor(family, v)}
          />
        </div>
      </div>
      {#each scale.stops as stop, i (stop.variable)}
        {@const pct = Math.round(stop.opacity * 100)}
        {@const fill = fillVar(stop.variable)}
        <div class="wash-row">
          <div class="wash-swatch-wrap" class:wash-swatch-wrap--dark={family === 'tint'}>
            <div class="wash-swatch" style="background: var({fill});"></div>
          </div>
          <div class="wash-meta">
            <button
              class="token-variable copyable"
              class:copied={copiedVar === fill}
              onclick={() => copy(fill)}
            >{copiedVar === fill ? 'copied!' : fill}</button>
            <span class="token-value">{stop.label}, {stop.variable}</span>
          </div>
          <div class="wash-control wash-opacity">
            <input type="range" min="0" max="100" value={pct}
              aria-label="{fill} opacity"
              onpointerdown={() => beginSliderGesture(`edit ${family} opacity`)}
              oninput={(e) => writeOpacity(family, i, +e.currentTarget.value)} />
            <input class="wash-opacity-input" type="number" min="0" max="100" value={pct}
              aria-label="{fill} opacity, percent"
              onchange={(e) => writeOpacity(family, i, +e.currentTarget.value)} />
            <span class="wash-opacity-unit">%</span>
          </div>
        </div>
      {/each}
    </div>
  {/each}
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .group-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .washes-grid {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .wash-row {
    display: grid;
    grid-template-columns: 3.5rem minmax(10rem, 1fr) minmax(14rem, 1.5fr);
    gap: var(--ui-space-12);
    align-items: center;
    padding: var(--ui-space-8) var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .wash-swatch-wrap {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: var(--ui-radius-sm);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ui-border-low);
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
    background-color: #fff;
  }

  .wash-swatch-wrap--dark {
    background-color: #222;
    background-image:
      linear-gradient(45deg, #333 25%, transparent 25%),
      linear-gradient(-45deg, #333 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #333 75%),
      linear-gradient(-45deg, transparent 75%, #333 75%);
  }

  .wash-swatch {
    position: absolute;
    inset: 0;
  }

  .wash-meta {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    min-width: 0;
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover { color: var(--ui-text-accent); }
  .token-variable.copyable.copied { color: var(--ui-text-success); }

  .token-value {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
  }

  .wash-control { min-width: 0; }

  .wash-opacity {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .wash-opacity input[type="range"] {
    flex: 1;
    min-width: 4rem;
    accent-color: var(--ui-text-accent);
    cursor: pointer;
  }

  .wash-opacity-input {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .wash-opacity-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    flex-shrink: 0;
  }
</style>
