<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'image';

  // Single object: image frame.
  const states: Record<string, Token[]> = {
    image: [
      { label: 'border color', groupKey: 'border', variable: '--image-default-border' },
      { label: 'border width', groupKey: 'width', variable: '--image-default-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--image-default-radius' },
      { label: 'image shadow', groupKey: 'shadow', variable: '--image-default-shadow' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import Image from '../../system/components/Image.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import demoImageUrl from '../../system/assets/offering.webp';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import UIPaletteSelector from '../ui/UIPaletteSelector.svelte';
  import { setCssVar } from '../core/cssVarSync';

  const bgVar = '--backdrop-image-surface';

  onMount(() => {
    if (!document.documentElement.style.getPropertyValue(bgVar)) {
      setCssVar(bgVar, 'var(--surface-canvas)');
    }
  });
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow. Import from <code>components/Image.svelte</code>" tokens={allTokens}>
  {#snippet config()}
  
      <label class="backdrop-config">
        <span>Sample background</span>
        <div class="picker-slot">
          <UIPaletteSelector variable={bgVar} />
        </div>
      </label>
    
  {/snippet}
  <VariantGroup name="image" title="Image" {states} {component}>
    <ShadowBackdrop mode="color" colorVariable={bgVar}>
      <div class="image-demo-grid">
        <Image src={demoImageUrl} alt="Demo" variant="banner" />
      </div>
    </ShadowBackdrop>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .image-demo-grid {
    display: grid;
    place-items: center;
  }
  .backdrop-config {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
  }
  .picker-slot {
    min-width: 8rem;
  }
  .picker-slot :global(.ui-token-selector) {
    width: 100%;
  }
</style>
