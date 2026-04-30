<script lang="ts">
  import Image from '../components/Image.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import type { Token } from './scaffolding/types';
  import demoImageUrl from '../assets/offering.webp';

  const component = 'image';

  // Single object: image frame.
  const states: Record<string, Token[]> = {
    image: [
      { label: 'border color', variable: '--image-default-border' },
      { label: 'border width', variable: '--image-default-border-width' },
      { label: 'radius', variable: '--image-default-radius' },
      { label: 'shadow', variable: '--image-default-shadow' },
    ],
  };

  const allTokens: Token[] = Object.values(states).flat();
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow. Import from <code>components/Image.svelte</code>" tokens={allTokens}>
  <VariantGroup name="image" title="Image" {states} {component}>
    <div class="image-demo-grid">
      <Image src={demoImageUrl} alt="Demo" variant="compact" />
      <Image src={demoImageUrl} alt="Demo" variant="medium" />
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .image-demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-16);
  }
</style>
