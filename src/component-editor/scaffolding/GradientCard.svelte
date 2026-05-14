<script lang="ts">
  /**
   * Composite editor for a 3-stop linear gradient defined as flat per-variant
   * tokens (angle + 3× color + 3× position). Renders:
   *   - a live gradient ribbon with diamond handles below each stop's position
   *   - a UIPaletteSelector for the currently-selected stop's color
   *   - an AngleDial bound to the angle token
   *
   * The component writes literals (`Ndeg`, `N%`) back through `setComponentAlias`
   * when the user drags; the picker writes its own token/literal ref via
   * UIPaletteSelector. Reads resolve through `tokenRegistry$` so values
   * authored as `var(--gradient-angle-diagonal)` show their resolved degrees.
   */
  import { setComponentAlias } from '../../lib/editorStore';
  import { tokenRegistry$ } from '../../lib/tokenRegistry';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import AngleDial from './AngleDial.svelte';

  
  interface Props {
    component: string;
    /** Prefix shared by all 7 token names — e.g. `--sectiondivider-canvas`. */
    prefix: string;
  }

  let { component, prefix }: Props = $props();

  type StopIndex = 1 | 2 | 3;
  const STOPS: readonly StopIndex[] = [1, 2, 3] as const;

  let angleVar = $derived(`${prefix}-gradient-angle`);
  function stopColorVar(i: StopIndex): string {
    return `${prefix}-gradient-stop-${i}-color`;
  }
  function stopPositionVar(i: StopIndex): string {
    return `${prefix}-gradient-stop-${i}-position`;
  }

  type Registry = typeof $tokenRegistry$;

  /** Walk the alias chain and read the terminal declared value as a literal.
   *  The registry is passed in explicitly so the reactive expressions below
   *  can see `$tokenRegistry$` as a dependency (Svelte's static analysis can't
   *  peek into function bodies). */
  function resolveLiteralWith(reg: Registry, varName: string): string | null {
    const chain = reg.resolveAliasChain(varName);
    const terminal = chain[chain.length - 1];
    const decl = reg.getDeclaredValue(terminal);
    if (decl === null) return null;
    const m = decl.match(/^var\((--[a-z0-9-]+)\)$/i);
    return m ? reg.getDeclaredValue(m[1]) ?? null : decl.trim();
  }

  function parseNumberFromCss(raw: string | null, unit: 'deg' | '%'): number | null {
    if (!raw) return null;
    const m = raw.trim().match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)\\s*${unit}$`));
    return m ? parseFloat(m[1]) : null;
  }

  let angleDeg = $derived(parseNumberFromCss(resolveLiteralWith($tokenRegistry$, angleVar), 'deg') ?? 135);
  let positions = $derived([
    parseNumberFromCss(resolveLiteralWith($tokenRegistry$, stopPositionVar(1)), '%') ?? 0,
    parseNumberFromCss(resolveLiteralWith($tokenRegistry$, stopPositionVar(2)), '%') ?? 50,
    parseNumberFromCss(resolveLiteralWith($tokenRegistry$, stopPositionVar(3)), '%') ?? 100,
  ] as [number, number, number]);

  // Reference the per-stop CSS var directly so the cascade fills in the
  // component's CSS defaults when the user hasn't overridden a stop. Reading
  // `aliases[...]` alone would miss defaults (no override → `#888`) even
  // though the component is rendering the color via its own `:root` block.
  let stopColors = $derived(([1, 2, 3] as StopIndex[]).map((i) => `var(${stopColorVar(i)})`) as [string, string, string]);

  // Build the live gradient string from current positions + colors so the
  // ribbon reflects edits even mid-drag (before the component re-renders via
  // its own CSS var consumption).
  let ribbonBg = $derived(`linear-gradient(90deg, ${stopColors
    .map((c, i) => `${c} ${positions[i]}%`)
    .join(', ')})`);

  let selected: StopIndex = $state(1);

  function setAngle(deg: number) {
    setComponentAlias(component, angleVar, { kind: 'literal', value: `${Math.round(deg)}deg` });
  }

  function setPosition(i: StopIndex, pct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
    setComponentAlias(component, stopPositionVar(i), { kind: 'literal', value: `${clamped}%` });
  }

  // ── Position handle drag ────────────────────────────────────────────────
  let barEl: HTMLDivElement = $state();
  let dragIndex: StopIndex | null = $state(null);

  function pctFromEvent(e: PointerEvent): number {
    const rect = barEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return (x / rect.width) * 100;
  }

  function onHandleDown(e: PointerEvent, i: StopIndex) {
    selected = i;
    dragIndex = i;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPosition(i, pctFromEvent(e));
  }
  function onHandleMove(e: PointerEvent) {
    if (dragIndex === null) return;
    setPosition(dragIndex, pctFromEvent(e));
  }
  function onHandleUp(e: PointerEvent) {
    if (dragIndex === null) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragIndex = null;
  }

  function onPositionInput(i: StopIndex, e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) setPosition(i, v);
  }
</script>

<div class="gradient-card">
  <div class="ribbon-wrap">
    <div class="ribbon" bind:this={barEl} style="background: {ribbonBg};"></div>
    <div class="handles">
      {#each STOPS as i}
        <button
          type="button"
          class="handle"
          class:selected={selected === i}
          class:dragging={dragIndex === i}
          style="left: {positions[i - 1]}%; --stop-color: {stopColors[i - 1]};"
          onpointerdown={(e) => onHandleDown(e, i)}
          onpointermove={onHandleMove}
          onpointerup={onHandleUp}
          onpointercancel={onHandleUp}
          title="Stop {i} ({positions[i - 1]}%)"
          aria-label="Gradient stop {i}"
        >
          <span class="handle-diamond"></span>
        </button>
      {/each}
    </div>
  </div>

  <div class="stop-edit-row">
    <span class="row-label">Stop {selected}</span>
    <label class="pos-input">
      <input
        type="number"
        min="0"
        max="100"
        step="0.1"
        value={positions[selected - 1]}
        onchange={(e) => onPositionInput(selected, e)}
      />
      <span class="suffix">%</span>
    </label>
    <div class="picker-slot">
      <UIPaletteSelector variable={stopColorVar(selected)} {component} />
    </div>
    <div class="angle-slot">
      <AngleDial value={angleDeg} on:change={(e) => setAngle(e.detail.value)} />
    </div>
  </div>
</div>

<style>
  .gradient-card {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
  }

  .ribbon-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .ribbon {
    position: relative;
    height: 2.25rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-default);
  }

  .handles {
    position: relative;
    height: 1.25rem;
  }

  /* The button is a generous (1.25rem) transparent hit target so the diamond
     can stay visually small while remaining easy to grab/drag. The visible
     marker lives in `.handle-diamond` inside. */
  .handle {
    position: absolute;
    top: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-left: -0.625rem;
    padding: 0;
    background: transparent;
    border: none;
    cursor: ew-resize;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .handle-diamond {
    width: 0.7rem;
    height: 0.7rem;
    background: var(--stop-color, var(--ui-surface-high));
    border: 1px solid var(--ui-border-default);
    transform: rotate(45deg);
    border-radius: 1px;
    transition: border-color var(--ui-transition-fast), box-shadow var(--ui-transition-fast);
  }

  .handle:hover .handle-diamond {
    border-color: var(--ui-text-secondary);
  }

  .handle.selected .handle-diamond {
    border-color: var(--ui-text-primary);
    box-shadow: 0 0 0 1px var(--ui-text-primary);
  }

  .handle.dragging {
    z-index: 2;
  }
  .handle.dragging .handle-diamond {
    border-color: var(--ui-text-primary);
    box-shadow: 0 0 0 2px var(--ui-text-primary);
  }

  /* Selected-stop row: label, position readout, color picker, then angle dial
     inline on the right. The selector width matches TokenLayout's
     `--token-selector-w` so this row aligns with the property grid below. */
  .stop-edit-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-12);
  }

  .row-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    white-space: nowrap;
  }

  .picker-slot {
    width: 8rem;
    min-width: 0;
  }

  .pos-input {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
  }

  .pos-input input {
    width: 4rem;
    padding: var(--ui-space-2) var(--ui-space-6);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    text-align: right;
  }

  .pos-input input::-webkit-outer-spin-button,
  .pos-input input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .suffix {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  .angle-slot {
    margin-left: auto;
  }
</style>
