<script lang="ts">
  import { onMount } from 'svelte';
  import UIRadioGroup from '../../ui/UIRadioGroup.svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import { setCssVar } from '../../lib/cssVarSync';

  type Mode = 'image' | 'color';
  
  interface Props {
    mode?: Mode;
    /** Editor-scoped CSS var the picker writes to (must end with `-surface` to allow gradients). */
    colorVariable: string;
  }

  let { mode = $bindable('image'), colorVariable }: Props = $props();

  const options: ReadonlyArray<{ value: Mode; label: string }> = [
    { value: 'image', label: 'Image' },
    { value: 'color', label: 'Color' },
  ];

  // Editor-only backdrop vars aren't persisted to disk; seed surface-canvas as
  // the default selection on first mount so the picker reads as surface-canvas
  // and the color-mode preview matches.
  onMount(() => {
    if (!document.documentElement.style.getPropertyValue(colorVariable)) {
      setCssVar(colorVariable, 'var(--surface-canvas)');
    }
  });
</script>

<label class="backdrop-config">
  <span>Sample background</span>
  <div class="backdrop-row">
    <UIRadioGroup
      bind:value={mode}
      name="shadow-backdrop-mode-{Math.random().toString(36).slice(2, 8)}"
      {options}
    />
    <div class="picker-slot">
      <UIPaletteSelector variable={colorVariable} disabled={mode !== 'color'} />
    </div>
  </div>
</label>

<style>
  .backdrop-row {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-16);
    padding: var(--ui-space-4) var(--ui-space-8);
    border: 1px solid var(--ui-border-lower);
    border-radius: var(--ui-radius-sm);
  }
  .picker-slot {
    min-width: 8rem;
  }
  .picker-slot :global(.ui-token-selector) {
    width: 100%;
  }
</style>
