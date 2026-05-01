<script lang="ts">
  import UIRadioGroup from '../../ui/UIRadioGroup.svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';

  type Mode = 'image' | 'color';
  export let mode: Mode = 'image';
  /** Editor-scoped CSS var the picker writes to (must end with `-surface` to allow gradients). */
  export let colorVariable: string;

  const options: ReadonlyArray<{ value: Mode; label: string }> = [
    { value: 'image', label: 'Image' },
    { value: 'color', label: 'Color' },
  ];
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
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
  }
  .picker-slot {
    min-width: 8rem;
  }
  .picker-slot :global(.ui-token-selector) {
    width: 100%;
  }
</style>
