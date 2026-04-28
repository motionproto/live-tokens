<script lang="ts">
  /**
   * Color/opacity picker for a single gradient stop. Reuses UIPaletteSelector's
   * dropdown UI by mounting it against a per-stop "scratch" CSS variable; writes
   * to that scratch var get parsed back out and forwarded as a structured update
   * to gradient state, so we don't have to refactor UIPaletteSelector itself.
   */
  import { onDestroy, createEventDispatcher } from 'svelte';
  import UIPaletteSelector from './UIPaletteSelector.svelte';
  import { setCssVar, removeCssVar } from '../lib/cssVarSync';

  export let stopId: string;        // unique key (e.g. gradient-var + stop index)
  export let color: string;          // token name like '--color-primary-500'
  export let opacity: number = 100;  // 0–100

  const dispatch = createEventDispatcher<{ change: { color: string; opacity: number } }>();

  /** Scratch var the embedded picker reads/writes; isolated per stop. */
  const scratchVar = `--__grad-stop-${stopId}`;

  function buildScratchValue(c: string, o: number): string {
    const base = c.startsWith('--') ? `var(${c})` : c;
    if (o >= 100) return base;
    return `color-mix(in srgb, ${base} ${Math.round(o)}%, transparent)`;
  }

  /** Parse a scratch var write back into structured stop fields. */
  function parseScratch(raw: string): { color: string; opacity: number } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const mixMatch = trimmed.match(/^color-mix\(in srgb,\s*var\((--[a-z0-9-]+)\)\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/i);
    if (mixMatch) {
      return { color: mixMatch[1], opacity: parseFloat(mixMatch[2]) };
    }
    const varMatch = trimmed.match(/^var\((--[a-z0-9-]+)\)$/);
    if (varMatch) {
      return { color: varMatch[1], opacity: 100 };
    }
    return null;
  }

  // Seed the scratch var synchronously during script init so UIPaletteSelector
  // (which mounts before its parent's onMount) reads the current stop value.
  if (typeof document !== 'undefined') {
    setCssVar(scratchVar, buildScratchValue(color, opacity));
  }

  function handleChange() {
    const raw = document.documentElement.style.getPropertyValue(scratchVar);
    const parsed = parseScratch(raw);
    if (!parsed) return;
    if (parsed.color === color && parsed.opacity === opacity) return;
    dispatch('change', parsed);
  }

  onDestroy(() => {
    removeCssVar(scratchVar);
  });

  // When external state updates the stop (undo/redo, sibling-stop edits),
  // refresh the scratch so the picker reflects current values.
  let lastSynced = `${color}|${opacity}`;
  $: {
    const sig = `${color}|${opacity}`;
    if (sig !== lastSynced) {
      lastSynced = sig;
      if (typeof document !== 'undefined') {
        setCssVar(scratchVar, buildScratchValue(color, opacity));
      }
    }
  }
</script>

<UIPaletteSelector variable={scratchVar} on:change={handleChange} />
