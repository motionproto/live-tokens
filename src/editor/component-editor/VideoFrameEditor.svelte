<script module lang="ts">
  import type { Token } from './scaffolding/types';
  import type { ContrastPair } from '../core/palettes/contrastPairs';

  export const component = 'videoframe';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', element: 'frame', variable: '--videoframe-frame-surface' },
      { label: 'clip surface color', element: 'frame', variable: '--videoframe-clip-surface' },
      { label: 'border color', element: 'frame', variable: '--videoframe-frame-border' },
      { label: 'border width', canBeLinked: true, element: 'frame', variable: '--videoframe-frame-border-width' },
      { label: 'corner radius', canBeLinked: true, element: 'frame', variable: '--videoframe-frame-radius' },
      { label: 'surface color', element: 'badge', variable: '--videoframe-badge-default-surface' },
      { label: 'border color', element: 'badge', variable: '--videoframe-badge-default-border' },
      { label: 'border width', canBeLinked: true, element: 'badge', variable: '--videoframe-badge-default-border-width' },
      { label: 'size', canBeLinked: true, element: 'badge', variable: '--videoframe-badge-default-size' },
      { label: 'icon color', element: 'badge', variable: '--videoframe-badge-default-icon' },
      { label: 'icon size', canBeLinked: true, element: 'badge', variable: '--videoframe-badge-default-icon-size' },
      { label: 'hover duration', element: 'badge', variable: '--videoframe-badge-duration' },
      { label: 'hover easing', element: 'badge', variable: '--videoframe-badge-easing' }
    ],
    hover: [
      { label: 'surface color', element: 'badge', variable: '--videoframe-badge-hover-surface' },
      { label: 'border color', element: 'badge', variable: '--videoframe-badge-hover-border' },
      { label: 'icon color', element: 'badge', variable: '--videoframe-badge-hover-icon' }
    ]
  };

  export const allTokens: Token[] = Object.values(states).flat();

  // The badge sits over the footage, which sits on the clip and the frame.
  const frameStack = ['--videoframe-clip-surface', '--videoframe-frame-surface'];
  export const contrastPairs: ContrastPair[] = [
    { foreground: '--videoframe-badge-default-icon', backdrop: ['--videoframe-badge-default-surface', ...frameStack], role: 'non-text' },
    { foreground: '--videoframe-badge-hover-icon', backdrop: ['--videoframe-badge-hover-surface', ...frameStack], role: 'non-text' },
  ];
</script>

<script lang="ts">
  import VideoFrame from '../../system/components/VideoFrame.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import clipUrl from '../../system/assets/watch-navigation.mp4';
  import posterUrl from '../../system/assets/watch-navigation-poster.webp';
</script>

<ComponentEditorBase
  {component}
  title="Video Frame"
  description="A poster frame that plays its clip in place when clicked."
  tokens={allTokens}
>
  <VariantGroup
    name="videoframe"
    title="Video Frame"
    {states}
    {component}
    elementOrder={['frame', 'badge']}
  >
    {#snippet children({ activeState }: { activeState: string })}
      <div class="videoframe-demo">
        <VideoFrame
          src={clipUrl}
          poster={posterUrl}
          alt="Navigation running on a smartwatch"
          width={480}
          height={552}
          class={activeState === 'hover' ? 'force-hover' : ''}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .videoframe-demo {
    width: 100%;
    max-width: 14rem;
  }
</style>
