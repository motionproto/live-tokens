<script lang="ts">
  /**
   * Scrim + tint stops. A scrim dims what sits behind it; a tint shades the
   * surface it sits on. Each stop binds an existing color token through
   * `UIPaletteSelector`; the picker handles family/step selection and opacity,
   * and writes route through `onwrite` into the washes slice
   * (see editorStore.makeDefaultWashesState). The slice fans the resulting
   * color-mix expressions out to :root.
   */
  import { editorState, mutate } from '../../core/store/editorStore';
  import type { WashToken } from '../../core/store/editorTypes';
  import {
    makeDefaultScrimTokens,
    makeDefaultTintTokens,
    parseWashCss,
  } from '../../core/themes/slices/washes';
  import UIPaletteSelector from '../UIPaletteSelector.svelte';

  interface Props {
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let { copiedVar = null, oncopy }: Props = $props();

  type Channel = 'scrim' | 'tint';

  function copy(v: string) { oncopy?.(v); }

  /** Translate a UITokenSelector write payload into a slice mutation.
   *  - `null` → restore this stop's default alias + opacity (reset).
   *  - bare `--name` → 100% opacity on that alias.
   *  - `color-mix(in srgb, var(--name) N%, transparent)` → alias + N%.
   *  - other (incl. `transparent`) → ignored; the picker's "None" option
   *    doesn't apply to a wash. */
  function handleWrite(channel: Channel, idx: number, value: string | null) {
    mutate(`${channel} ${idx} edit`, (s) => {
      const arr = channel === 'scrim' ? s.washes.scrims : s.washes.tints;
      const t = arr[idx];
      if (!t) return;
      if (value === null) {
        const defaults = channel === 'scrim' ? makeDefaultScrimTokens() : makeDefaultTintTokens();
        const d = defaults[idx];
        if (d) { t.alias = d.alias; t.opacity = d.opacity; }
        return;
      }
      if (value.startsWith('--')) { t.alias = value; t.opacity = 1; return; }
      const parsed = parseWashCss(value);
      if (parsed) { t.alias = parsed.alias; t.opacity = parsed.opacity; }
    });
  }

  function copyCss(t: WashToken): string {
    const pct = Math.round(t.opacity * 100);
    return pct >= 100 ? `var(${t.alias})` : `color-mix(in srgb, var(${t.alias}) ${pct}%, transparent)`;
  }
</script>

<section class="section" id="washes">
  <h2 class="section-title">Washes</h2>

  <h3 class="group-title">Scrims</h3>
  <div class="washes-grid">
    {#each $editorState.washes.scrims as token, i (token.variable)}
      <div class="wash-row">
        <div class="wash-swatch-wrap">
          <div class="wash-swatch" style="background: var({token.variable});"></div>
        </div>
        <div class="wash-meta">
          <button
            class="token-variable copyable"
            class:copied={copiedVar === token.variable}
            onclick={() => copy(token.variable)}
          >{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.label} — {Math.round(token.opacity * 100)}%</span>
        </div>
        <div class="wash-picker">
          <UIPaletteSelector
            variable={token.variable}
            showNone={false}
            onwrite={(v) => handleWrite('scrim', i, v)}
          />
        </div>
        <button
          class="copy-css-btn"
          title="Copy resolved CSS"
          onclick={() => copy(copyCss(token))}
        >
          {copiedVar === copyCss(token) ? 'copied!' : 'copy css'}
        </button>
      </div>
    {/each}
  </div>

  <h3 class="group-title">Tints</h3>
  <div class="washes-grid">
    {#each $editorState.washes.tints as token, i (token.variable)}
      <div class="wash-row">
        <div class="wash-swatch-wrap wash-swatch-wrap--dark">
          <div class="wash-swatch" style="background: var({token.variable});"></div>
        </div>
        <div class="wash-meta">
          <button
            class="token-variable copyable"
            class:copied={copiedVar === token.variable}
            onclick={() => copy(token.variable)}
          >{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.label} — {Math.round(token.opacity * 100)}%</span>
        </div>
        <div class="wash-picker">
          <UIPaletteSelector
            variable={token.variable}
            showNone={false}
            onwrite={(v) => handleWrite('tint', i, v)}
          />
        </div>
        <button
          class="copy-css-btn"
          title="Copy resolved CSS"
          onclick={() => copy(copyCss(token))}
        >
          {copiedVar === copyCss(token) ? 'copied!' : 'copy css'}
        </button>
      </div>
    {/each}
  </div>
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
    grid-template-columns: 3.5rem minmax(10rem, 1fr) minmax(14rem, 1.5fr) auto;
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

  .wash-picker { min-width: 0; }

  .copy-css-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-6);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .copy-css-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }
</style>
