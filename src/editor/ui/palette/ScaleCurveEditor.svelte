<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import BezierCurveEditor from '../BezierCurveEditor.svelte';
  import { isAutoSmoothCurve, type CurveAnchor, type CurveConfig } from '../curveEngine';
  import { curveSummary } from './curveSummary';

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
    /** Undefined for a curve saved before the flag existed, or one never toggled;
     *  its shape answers for it. Only an explicit switch-off needs recording, since
     *  switching on is self-evident from the shape it produces. */
    autoSmooth?: boolean;
    lockedAnchorIndex?: number | null;
    open: boolean;
    onToggleOpen: () => void;
    onAnchorsChange: (anchors: CurveAnchor[]) => void;
    onOffsetChange: (key: string, value: number) => void;
    onAutoSmoothChange: (key: string, value: boolean) => void;
    onLockedAnchorUnlock?: (() => void) | null;
  }

  let {
    curveKey,
    anchors,
    cfg,
    stepCount,
    defaults,
    offset = 0,
    autoSmooth = undefined,
    lockedAnchorIndex = null,
    open,
    onToggleOpen,
    onAnchorsChange,
    onOffsetChange,
    onAutoSmoothChange,
    onLockedAnchorUnlock = null
  }: Props = $props();

  let summary = $derived(curveSummary(anchors, defaults, offset, cfg.unit ?? ''));
  let autoSmoothResolved = $derived(autoSmooth ?? isAutoSmoothCurve(anchors));

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const t = (ms: number) => (reduceMotion ? 0 : ms);

  /** Pane and graph run in lockstep, same duration and easing, no lead either
   *  way: the graph comes forward as the window opens, not after it. */
  const REVEAL_MS = 260;

  function zoom(_node: Element, { duration = REVEAL_MS }) {
    return {
      duration,
      easing: cubicOut,
      css: (u: number) => `opacity: ${u}; transform: scale(${0.95 + u * 0.05})`
    };
  }
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
    <div
      transition:slide|local={{ duration: t(REVEAL_MS), easing: cubicOut }}
    >
      <div transition:zoom|local={{ duration: t(REVEAL_MS) }}>
        <BezierCurveEditor
          {anchors}
          {cfg}
          {stepCount}
          defaultAnchors={defaults}
          {offset}
          autoSmooth={autoSmoothResolved}
          {lockedAnchorIndex}
          {onLockedAnchorUnlock}
          {onAnchorsChange}
          onOffsetChange={(v) => onOffsetChange(curveKey, v)}
          onAutoSmoothChange={(v) => onAutoSmoothChange(curveKey, v)}
        />
      </div>
    </div>
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
