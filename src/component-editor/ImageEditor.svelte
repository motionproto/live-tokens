<script lang="ts">
  import Image from '../components/Image.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import demoImageUrl from '../assets/offering.webp';

  const component = 'image';

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const tokens: Token[] = [
    { label: 'border color', variable: '--image-default-border' },
    { label: 'radius', canBeShared: true, variable: '--image-default-radius' },
    { label: 'shadow', variable: '--image-default-shadow' },
  ];
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow. Import from <code>components/Image.svelte</code>" let:targetFile>
  <VariantGroup name="default" title="Default" {tokens} {targetFile} {component}>
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
