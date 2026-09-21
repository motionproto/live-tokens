<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'slidepager';

  // Single variant: the default carries the frame, the bar, the counter and
  // the control's resting look. Hover and disabled layer on the control alone.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', element: 'frame', variable: '--slidepager-frame-surface' },
      { label: 'border color', element: 'frame', variable: '--slidepager-frame-border' },
      { label: 'border width', canBeLinked: true, element: 'frame', variable: '--slidepager-frame-border-width' },
      { label: 'corner radius', canBeLinked: true, element: 'frame', variable: '--slidepager-frame-radius' },
      { label: 'shadow', element: 'frame', variable: '--slidepager-frame-shadow' },
      { label: 'gap', canBeLinked: true, element: 'bar', variable: '--slidepager-bar-gap' },
      { label: 'padding', canBeLinked: true, element: 'bar', variable: '--slidepager-bar-padding' },
      { label: 'surface color', element: 'control', variable: '--slidepager-control-surface' },
      { label: 'border color', element: 'control', variable: '--slidepager-control-border' },
      { label: 'border width', canBeLinked: true, element: 'control', variable: '--slidepager-control-border-width' },
      { label: 'corner radius', canBeLinked: true, element: 'control', variable: '--slidepager-control-radius' },
      { label: 'size', canBeLinked: true, element: 'control', variable: '--slidepager-control-size' },
      { label: 'icon color', element: 'control', variable: '--slidepager-control-icon' },
      { label: 'icon size', canBeLinked: true, element: 'control', variable: '--slidepager-control-icon-size' },
      { label: 'text color', element: 'counter', variable: '--slidepager-counter-text' },
      { label: 'font family', element: 'counter', variable: '--slidepager-counter-font-family' },
      { label: 'font size', element: 'counter', variable: '--slidepager-counter-font-size' },
      { label: 'font weight', element: 'counter', variable: '--slidepager-counter-font-weight' },
      { label: 'line height', element: 'counter', variable: '--slidepager-counter-line-height' },
      { label: 'letter spacing', element: 'counter', variable: '--slidepager-counter-letter-spacing' },
      { label: 'scrim color', element: 'overlay', variable: '--slidepager-scrim-surface' },
      { label: 'padding', canBeLinked: true, element: 'overlay', variable: '--slidepager-overlay-padding' },
      { label: 'close button margin', canBeLinked: true, element: 'overlay', variable: '--slidepager-close-margin' },
      { label: 'fade duration', element: 'overlay', variable: '--slidepager-overlay-duration' },
      { label: 'fade easing', element: 'overlay', variable: '--slidepager-overlay-easing' }
    ],
    hover: [
      { label: 'surface color', element: 'control', variable: '--slidepager-control-hover-surface' },
      { label: 'border color', element: 'control', variable: '--slidepager-control-hover-border' },
      { label: 'icon color', element: 'control', variable: '--slidepager-control-hover-icon' }
    ],
    disabled: [
      { label: 'surface color', element: 'control', variable: '--slidepager-control-disabled-surface' },
      { label: 'border color', element: 'control', variable: '--slidepager-control-disabled-border' },
      { label: 'icon color', element: 'control', variable: '--slidepager-control-disabled-icon' }
    ]
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import SlidePager, { type SlidePage } from '../../system/components/SlidePager.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import page04 from '../../system/assets/slide-04.webp';
  import page05 from '../../system/assets/slide-05.webp';
  import page06 from '../../system/assets/slide-06.webp';

  const demoSlides: SlidePage[] = [
    { src: page04, alt: 'Types of disabilities: visual, auditory, motor, cognitive', width: 960, height: 540 },
    { src: page05, alt: 'Permanent, temporary, or situational', width: 960, height: 540 },
    { src: page06, alt: 'Non-apparent disabilities', width: 960, height: 540 }
  ];

  // The control's two states are forced on both chevrons at once, so the strip
  // shows each one without a pointer and without landing on an end slide.
  function forceClass(activeState: string) {
    if (activeState === 'hover') return 'force-hover';
    if (activeState === 'disabled') return 'force-disabled';
    return '';
  }
</script>

<ComponentEditorBase
  {component}
  title="Slide Pager"
  description="A deck of slides the reader flips through in place, one at a time. Clicking the frame opens a full-screen read that pages through every slide, with the same bar and a close button. The open preview shows it in place."
  tokens={allTokens}
>
  <VariantGroup
    name="slidepager"
    title="Slide Pager"
    {states}
    {component}
    elementOrder={['frame', 'bar', 'control', 'counter', 'overlay']}
  >
    {#snippet children({ activeState }: { activeState: string })}
      <div class="slidepager-demo">
        <div class="slidepager-demo-inline">
          <SlidePager slides={demoSlides} index={1} class={forceClass(activeState)} />
        </div>
        <div class="slidepager-demo-open">
          <SlidePager slides={demoSlides} index={1} inline class={forceClass(activeState)} />
        </div>
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .slidepager-demo {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--ui-space-32);
    width: 100%;
  }

  .slidepager-demo-inline {
    flex: 1 1 22rem;
    max-width: 32rem;
  }

  .slidepager-demo-open {
    flex: 1 1 16rem;
    max-width: 22rem;
  }
</style>
