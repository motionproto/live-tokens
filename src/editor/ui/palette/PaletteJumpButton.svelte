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

  /* fa-palette loses its bowl at the pill's default icon size; the compact
     pill's min-height carries the taller glyph without changing the pill's
     height, so it still lines up with the plain pills beside it. */
  .palette-jump :global(.ui-pill i) {
    font-size: var(--ui-font-size-md);
  }
</style>
