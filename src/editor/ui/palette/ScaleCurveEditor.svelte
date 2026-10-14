<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import BezierCurveEditor from '../BezierCurveEditor.svelte';
  import UIReveal from '../UIReveal.svelte';
  import { portal } from '../../../system/internal/portal';
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
    /** The scale the curve shapes, named in the full-screen header. */
    subject?: string;
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
    subject = undefined,
    open,
    onToggleOpen,
    onAnchorsChange,
    onOffsetChange,
    onAutoSmoothChange,
    onLockedAnchorUnlock = null
  }: Props = $props();

  let summary = $derived(curveSummary(anchors, defaults, offset, cfg.unit ?? ''));
  let autoSmoothResolved = $derived(autoSmooth ?? isAutoSmoothCurve(anchors));

  // A phone-width editor has no room to drag handles inline, so a curve opens
  // over the whole screen. The layer opens only on a tap: the parent's open
  // flag is the desktop disclosure, and Lightness starts open there.
  const fullScreen = new MediaQuery('max-width: 600px');
  let layerOpen = $state(false);

  function focusOnMount(node: HTMLElement) {
    node.focus();
  }
</script>

<svelte:window onkeydown={(e) => { if (layerOpen && e.key === 'Escape') layerOpen = false; }} />

{#snippet editor()}
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
{/snippet}

<div class="curve-section">
  <button
    class="curve-section-toggle"
    type="button"
    aria-expanded={fullScreen.current ? layerOpen : open}
    onclick={() => (fullScreen.current ? (layerOpen = true) : onToggleOpen())}
  >
    {#if fullScreen.current}
      <i class="fas fa-up-right-and-down-left-from-center" aria-hidden="true"></i>
    {:else}
      <i class="fas" class:fa-chevron-right={!open} class:fa-chevron-down={open} aria-hidden="true"></i>
    {/if}
    <span class="curve-section-label">{cfg.label}</span>
    <span class="curve-section-summary">
      {#if summary !== 'default'}<span class="curve-section-dot" aria-hidden="true"></span>{/if}
      {summary}
    </span>
  </button>
  {#if fullScreen.current}
    {#if layerOpen}
      <!-- editor-page carries the --ui-* tokens to the layer's new place in body. -->
      <div class="curve-full-screen editor-page" role="dialog" aria-modal="true" aria-label="{subject ? `${subject} ` : ''}{cfg.label} curve" use:portal>
        <header class="curve-full-screen-bar">
          <span class="curve-full-screen-title">
            {#if subject}<span class="curve-full-screen-subject">{subject}</span>{/if}
            <span class="curve-section-label">{cfg.label}</span>
          </span>
          <span class="curve-section-summary">{summary}</span>
          <button type="button" class="curve-full-screen-close" aria-label="Close the {cfg.label} curve" onclick={() => (layerOpen = false)} use:focusOnMount>
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="curve-full-screen-body">
          {@render editor()}
        </div>
      </div>
    {/if}
  {:else}
    <UIReveal {open}>
      {@render editor()}
    </UIReveal>
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

  .curve-full-screen {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    background: black;
    color: var(--ui-text-primary);
  }

  .curve-full-screen-bar {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-12);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .curve-full-screen-title {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .curve-full-screen-subject {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
  }

  .curve-full-screen-close {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-lg);
    cursor: pointer;
  }

  .curve-full-screen-close:hover {
    background: var(--ui-hover);
  }

  .curve-full-screen-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--ui-space-12);
    container-type: inline-size;
  }

  /* The handles scale with the plot's height, so a plot stretched to a tall
     screen balloons them. Square, up to 60% of the screen. */
  .curve-full-screen-body :global(.curve-container) {
    height: min(100cqw, 60vh);
  }

  .curve-section-dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    flex-shrink: 0;
  }
</style>
