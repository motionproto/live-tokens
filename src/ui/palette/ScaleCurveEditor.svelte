<script lang="ts">
  import BezierCurveEditor from '../BezierCurveEditor.svelte';
  import type { CurveAnchor, CurveConfig } from '../curveEngine';

  /**
   * Single-channel curve editor — one Bezier curve for one channel
   * (lightness or saturation) of one scale (palette / gray-palette /
   * Surfaces / Borders / Text). Instantiated 6+ times across PaletteEditor:
   * the parent's chromatic-palette + gray-palette curves and the four
   * derived-scale curve groups inside OverridesPanel.
   *
   * Pure presentational wrapper: it forwards props to BezierCurveEditor
   * and adapts the offset key into a single `onOffsetChange(value)` so the
   * parent only needs to know how to wire `(key, value)` once (via a
   * closure passed in).
   */

  export let curveKey: string;
  export let anchors: CurveAnchor[];
  export let cfg: CurveConfig;
  export let stepCount: number;
  export let defaults: CurveAnchor[];
  export let offset: number = 0;
  export let lockedAnchorIndex: number | null = null;
  export let onAnchorsChange: (anchors: CurveAnchor[]) => void;
  export let onOffsetChange: (key: string, value: number) => void;
</script>

<BezierCurveEditor
  {anchors}
  {cfg}
  {stepCount}
  defaultAnchors={defaults}
  {offset}
  {lockedAnchorIndex}
  {onAnchorsChange}
  onOffsetChange={(v) => onOffsetChange(curveKey, v)}
/>
