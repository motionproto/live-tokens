<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'videolightbox';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', element: 'tile', variable: '--videolightbox-tile-surface' },
      { label: 'border color', element: 'tile', variable: '--videolightbox-tile-border' },
      { label: 'border width', canBeLinked: true, element: 'tile', variable: '--videolightbox-tile-border-width' },
      { label: 'corner radius', canBeLinked: true, element: 'tile', variable: '--videolightbox-tile-radius' },
      { label: 'shadow', element: 'tile', variable: '--videolightbox-tile-shadow' },
      { label: 'scrim color', element: 'overlay', variable: '--videolightbox-scrim-surface' },
      { label: 'padding', canBeLinked: true, element: 'overlay', variable: '--videolightbox-overlay-padding' },
      { label: 'fade duration', element: 'overlay', variable: '--videolightbox-overlay-duration' },
      { label: 'fade easing', element: 'overlay', variable: '--videolightbox-overlay-easing' },
      { label: 'surface color', element: 'close', variable: '--videolightbox-chrome-surface' },
      { label: 'border color', element: 'close', variable: '--videolightbox-chrome-border' },
      { label: 'border width', canBeLinked: true, element: 'close', variable: '--videolightbox-chrome-border-width' },
      { label: 'corner radius', canBeLinked: true, element: 'close', variable: '--videolightbox-chrome-radius' },
      { label: 'icon color', element: 'close', variable: '--videolightbox-chrome-icon' },
    ],
    hover: [
      { label: 'surface color', element: 'close', variable: '--videolightbox-chrome-hover-surface' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import VideoLightbox from '../../system/components/VideoLightbox.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import clipUrl from '../../system/assets/watch-navigation.mp4';
  import posterUrl from '../../system/assets/watch-navigation-poster.webp';
</script>

<ComponentEditorBase
  {component}
  title="Video Lightbox"
  description="A small still that fades the page away and plays its clip in the middle of the screen. Click anywhere, the close button, or Escape to close it. The open preview beside the tile shows the overlay and close button in place."
  tokens={allTokens}
>
  <VariantGroup
    name="videolightbox"
    title="Video Lightbox"
    {states}
    {component}
    elementOrder={['tile', 'overlay', 'close']}
  >
    {#snippet children({ activeState })}
    <div class="videolightbox-demo">
      <div class="videolightbox-demo-tile">
        <VideoLightbox
          src={clipUrl}
          poster={posterUrl}
          alt="Navigation running on a smartwatch"
          width={480}
          height={552}
        />
      </div>
      <div class="videolightbox-demo-open">
        <VideoLightbox
          src={clipUrl}
          poster={posterUrl}
          width={480}
          height={552}
          inline
          class={activeState === 'hover' ? 'force-hover' : ''}
        />
      </div>
    </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .videolightbox-demo {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-32);
    width: 100%;
  }

  .videolightbox-demo-tile {
    width: 8rem;
  }

  .videolightbox-demo-open {
    flex: 1 1 18rem;
    max-width: 28rem;
  }
</style>
