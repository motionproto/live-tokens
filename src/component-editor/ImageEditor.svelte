<script context="module" lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'image';

  // Single object: image frame.
  const states: Record<string, Token[]> = {
    image: [
      { label: 'border color', variable: '--image-default-border' },
      { label: 'border width', variable: '--image-default-border-width' },
      { label: 'corner radius', variable: '--image-default-radius' },
      { label: 'image shadow', variable: '--image-default-shadow' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import Image from '../components/Image.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import demoImageUrl from '../assets/offering.webp';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';

  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-image-surface';
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow. Import from <code>components/Image.svelte</code>" tokens={allTokens} tabbable>
  <svelte:fragment slot="config">
    <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} />
  </svelte:fragment>
  <VariantGroup name="image" title="Image" {states} {component}>
    <ShadowBackdrop mode={bgMode} colorVariable={bgVar}>
      <div class="image-demo-grid">
        <Image src={demoImageUrl} alt="Demo" variant="compact" />
        <Image src={demoImageUrl} alt="Demo" variant="medium" />
      </div>
    </ShadowBackdrop>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .image-demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-16);
  }
</style>
