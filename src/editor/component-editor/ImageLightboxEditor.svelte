<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'imagelightbox';

  // Three parts: tile (closed inline + animated modal surface), overlay (scrim),
  // chrome (shared toolbar + close-button look). Chrome carries a hover state
  // for the interactive controls. No second variant.
  const states: Record<string, Token[]> = {
    tile: [
      { label: 'corner radius', groupKey: 'radius', variable: '--imagelightbox-tile-radius' },
      { label: 'border color',  groupKey: 'border', variable: '--imagelightbox-tile-border' },
      { label: 'border width',  groupKey: 'width',  variable: '--imagelightbox-tile-border-width' },
      { label: 'tile shadow',                       variable: '--imagelightbox-tile-shadow' },
    ],
    overlay: [
      { label: 'backdrop color', groupKey: 'surface', variable: '--imagelightbox-overlay-surface' },
    ],
    chrome: [
      { label: 'surface color',       groupKey: 'surface', variable: '--imagelightbox-chrome-surface' },
      { label: 'border color',        groupKey: 'border',  variable: '--imagelightbox-chrome-border' },
      { label: 'border width',        groupKey: 'width',   variable: '--imagelightbox-chrome-border-width' },
      { label: 'corner radius',       groupKey: 'radius',  variable: '--imagelightbox-chrome-radius' },
      { label: 'icon color',          groupKey: 'icon',    variable: '--imagelightbox-chrome-icon' },
      { label: 'hover surface color', groupKey: 'surface', variable: '--imagelightbox-chrome-hover-surface' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import ImageLightbox from '../../system/components/ImageLightbox.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import demoImageUrl from '../../system/assets/offering.webp';
</script>

<ComponentEditorBase
  {component}
  title="Image Lightbox"
  description="Click an inline image to expand it into a centered modal with a backdrop. Extended mode adds zoom controls and drag panning."
  tokens={allTokens}
>
  <VariantGroup name="imagelightbox" title="Image Lightbox" {states} {component}>
    <div class="preview-frame">
      <ImageLightbox src={demoImageUrl} alt="Demo image" width={1024} height={640} extended />
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .preview-frame {
    width: 100%;
    max-width: 28rem;
    margin: 0 auto;
  }
</style>
