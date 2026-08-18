<script lang="ts">
  import BezierCurveEditor from '../BezierCurveEditor.svelte';
  import type { CurveAnchor, CurveConfig } from '../curveEngine';

  /**
   * Single-channel curve editor — one Bezier curve for one channel
   * (lightness, saturation, or hue) of one scale (palette / gray-palette /
   * Surfaces / Borders / Text). Instantiated 6+ times across PaletteEditor:
   * the parent's chromatic-palette + gray-palette curves and the four
   * derived-scale curve groups inside OverridesPanel.
   *
   * Pure presentational wrapper: it forwards props to BezierCurveEditor and
   * adapts the offset key into a single `onOffsetChange(value)` so the
   * parent only needs to know how to wire `(key, value)` once (via a
   * closure passed in). It also owns the collapsible disclosure chrome
   * around that editor; the open/closed flag itself is parent state
   * (session-scoped, never written to theme JSON).
   */
  interface Props {
    curveKey: string;
    anchors: CurveAnchor[];
    cfg: CurveConfig;
    stepCount: number;
    defaults: CurveAnchor[];
    offset?: number;
    lockedAnchorIndex?: number | null;
    open: boolean;
    onToggleOpen: () => void;
    onAnchorsChange: (anchors: CurveAnchor[]) => void;
    onOffsetChange: (key: string, value: number) => void;
    onLockedAnchorUnlock?: (() => void) | null;
  }

  let {
    curveKey,
    anchors,
    cfg,
    stepCount,
    defaults,
    offset = 0,
    lockedAnchorIndex = null,
    open,
    onToggleOpen,
    onAnchorsChange,
    onOffsetChange,
    onLockedAnchorUnlock = null
  }: Props = $props();

  // Range, not first-to-last: a peak's endpoints can match the defaults'
  // while the middle diverges, and first-to-last would call that "default".
  let summary = $derived.by(() => {
    if (offset === 0 && JSON.stringify(anchors) === JSON.stringify(defaults)) return 'default';
    const ys = anchors.map((a) => a.y);
    const unit = cfg.unit ?? '';
    const range = `${Math.min(...ys)} to ${Math.max(...ys)}${unit}`;
    const offsetPart = offset !== 0 ? ` offset ${offset > 0 ? '+' : ''}${offset}${unit}` : '';
    return `${range}${offsetPart}`;
  });
</script>

<div class="curve-section">
  <button
    class="curve-section-toggle"
    type="button"
    aria-expanded={open}
    onclick={onToggleOpen}
  >
    <i class="fas" class:fa-chevron-right={!open} class:fa-chevron-down={open} aria-hidden="true"></i>
    <span class="curve-section-label">{cfg.label}</span>
    <span class="curve-section-summary">
      {#if summary !== 'default'}<span class="curve-section-dot" aria-hidden="true"></span>{/if}
      {summary}
    </span>
  </button>
  {#if open}
    <BezierCurveEditor
      {anchors}
      {cfg}
      {stepCount}
      defaultAnchors={defaults}
      {offset}
      {lockedAnchorIndex}
      {onLockedAnchorUnlock}
      {onAnchorsChange}
      onOffsetChange={(v) => onOffsetChange(curveKey, v)}
    />
  {/if}
</div>

<style>
  .curve-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .curve-section-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-4) var(--ui-space-2);
    background: none;
    border: none;
    color: var(--ui-text-tertiary);
    cursor: pointer;
    text-align: left;
    transition: color var(--ui-transition-fast);
  }

  .curve-section-toggle:hover {
    color: var(--ui-text-primary);
  }

  .curve-section-toggle i {
    font-size: var(--ui-font-size-xs);
    width: 0.75rem;
    text-align: center;
  }

  .curve-section-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
  }

  .curve-section-summary {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    margin-left: auto;
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-normal);
    color: var(--ui-text-muted);
  }

  .curve-section-dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    flex-shrink: 0;
  }
</style>
