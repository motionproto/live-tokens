<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Forwarded to the stage so callers can inject token overrides. */
    style?: string;
    /** Fixes the stage height so it never reflows when its content resizes. */
    minHeight?: string;
    children: Snippet;
  }

  let { style = '', minHeight, children }: Props = $props();
</script>

<div class="panel" {style} style:min-height={minHeight}>
  {@render children()}
</div>

<style>
  :global(:root) {
    --panel-frame-border: var(--border-neutral);
    --panel-frame-border-width: var(--border-width-1);
    --panel-frame-radius: var(--radius-2xl);

    --panel-stage-surface: linear-gradient(0deg, color-mix(in srgb, var(--surface-neutral-low) 40%, transparent) 0.5%, color-mix(in srgb, var(--surface-neutral-lowest) 75%, transparent) 100%);
    --panel-stage-padding: var(--space-16);
    --panel-stage-inline-padding: var(--space-32);
    --panel-stage-gap: var(--space-16);
  }

  .panel {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--panel-stage-gap);
    width: 100%;
    border: var(--panel-frame-border-width) solid var(--panel-frame-border);
    border-radius: var(--panel-frame-radius);
    background: var(--panel-stage-surface);
    padding: var(--panel-stage-padding) var(--panel-stage-inline-padding);
    overflow: hidden;
  }
</style>
