<script lang="ts">
  import UIPillButton from '../UIPillButton.svelte';
  import { openPaletteInTokens, openPaletteInWheel } from '../../core/store/paletteFocus';

  interface Props {
    family: string;
    displayLabel?: string | null;
    /** Which view the button hands this family over to. */
    target: 'wheel' | 'tokens';
  }

  let { family, displayLabel = null, target }: Props = $props();

  let name = $derived(displayLabel ?? family);
  let icon = $derived(target === 'wheel' ? 'fa-palette' : 'fa-sliders');
  let label = $derived(target === 'wheel' ? 'Wheel' : 'Edit');
  let title = $derived(
    target === 'wheel'
      ? `Open ${name} on the color wheel`
      : `Edit the ${name} palette in Tokens`
  );

  function jump() {
    if (target === 'wheel') openPaletteInWheel(family);
    else openPaletteInTokens(family);
  }
</script>

<span class="palette-jump">
  <UIPillButton size="compact" variant="outline" {icon} {title} onclick={jump}>{label}</UIPillButton>
</span>

<style>
  .palette-jump {
    display: inline-flex;
  }

  /* fa-palette loses its bowl at the pill's default icon size. The compact
     pill's line box is shorter than the glyph draws, so the padding grows with
     it rather than letting it cross the border. */
  .palette-jump :global(.ui-pill) {
    padding-block: var(--ui-space-6);
  }

  .palette-jump :global(.ui-pill i) {
    font-size: var(--ui-font-size-md);
    line-height: 1.2;
  }
</style>
