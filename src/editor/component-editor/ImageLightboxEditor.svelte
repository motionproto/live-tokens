<script module lang="ts">
  import type { Token, IntrinsicSpec } from './scaffolding/types';
  import type { ContrastPair } from '../core/palettes/contrastPairs';

  export const component = 'imagelightbox';

  // Three parts: tile (closed inline + animated modal surface), overlay (scrim),
  // chrome (shared toolbar + close-button styling). Chrome carries a hover state
  // for the interactive controls. No second variant.
  const states: Record<string, Token[]> = {
    tile: [
      { label: 'fill color',    groupKey: 'surface', variable: '--imagelightbox-tile-surface' },
      { label: 'corner radius', groupKey: 'radius', variable: '--imagelightbox-tile-radius' },
      { label: 'border color',  groupKey: 'border', variable: '--imagelightbox-tile-border' },
      { label: 'border width',  groupKey: 'width',  variable: '--imagelightbox-tile-border-width' },
      { label: 'tile shadow',                       variable: '--imagelightbox-tile-shadow' },
    ],
    overlay: [
      { label: 'scrim color', groupKey: 'surface', variable: '--imagelightbox-scrim-surface' },
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

  // How a tile crops inside its frame: a structural choice, not a themeable value.
  export const intrinsics: IntrinsicSpec[] = [
    {
      key: 'tile-fit',
      variants: ['default'],
      variable: () => '--imagelightbox-tile-object-fit',
      values: ['contain', 'cover'],
      default: { default: 'contain' },
    },
  ];

  // One color paints the chrome's icons and its extra-small counter text. The
  // chrome floats on the scrim.
  const scrim = '--imagelightbox-scrim-surface';
  export const contrastPairs: ContrastPair[] = [
    { foreground: '--imagelightbox-chrome-icon', backdrop: ['--imagelightbox-chrome-surface', scrim], role: 'non-text', context: 'icons' },
    { foreground: '--imagelightbox-chrome-icon', backdrop: ['--imagelightbox-chrome-hover-surface', scrim], role: 'non-text', context: 'hovered icons' },
    { foreground: '--imagelightbox-chrome-icon', backdrop: ['--imagelightbox-chrome-surface', scrim], role: 'text', fontSize: '--font-size-xs', context: 'counter' },
  ];
</script>

<script lang="ts">
  import ImageLightbox from '../../system/components/ImageLightbox.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import UISegmentedControl from '../ui/UISegmentedControl.svelte';
  import A11yPropertyMark from '../ui/a11y/A11yPropertyMark.svelte';
  import newspaperUrl from '../../system/assets/newspaper.webp';
  import { editorState, setComponentAlias } from '../core/store/editorStore';
  import type { CssVarRef } from '../core/store/editorTypes';

  const demoImages = [
    // The first entry carries explicit dimensions (the no-reflow path); the second
    // omits them to exercise self-measure from the loaded image.
    { src: newspaperUrl, alt: 'Newspaper', width: 2048, height: 1152 },
    { src: newspaperUrl, alt: 'Newspaper' },
  ];

  let multiple = $state(true);
  let shadow = $state<'box' | 'content' | 'none'>('box');

  type TileFit = 'contain' | 'cover';
  const TILE_FIT = intrinsics[0].variable('default');
  const fitOptions: { value: TileFit; label: string; title: string }[] = [
    { value: 'contain', label: 'Contain', title: 'Show the whole image inside the tile' },
    { value: 'cover', label: 'Cover', title: 'Crop the image to fill the tile' },
  ];
  let tileFit = $derived.by((): TileFit => {
    const ref = ($editorState.components[component]?.aliases as Record<string, CssVarRef> | undefined)?.[TILE_FIT];
    const value = ref?.kind === 'literal' ? ref.value : intrinsics[0].default.default;
    return value === 'cover' ? 'cover' : 'contain';
  });
</script>

<ComponentEditorBase
  {component}
  title="Image Lightbox"
  description="Click an inline image to expand it into a centered modal with a backdrop. Pass multiple images for a gallery (chevrons + counter). Extended mode adds zoom controls and drag panning. `shadow` picks where the one tile-shadow token falls: `box` casts it from the tile rectangle, `content` from the image's own alpha, or `none`. The tile fill sits behind the image in both states: none by default, so cut-out art floats on the page, and any fill you set frames it instead."
  tokens={allTokens}
>
  <VariantGroup name="imagelightbox" title="Image Lightbox" {states} {component}>
    {#snippet stateActions()}
      <label class="preview-toggle">
        <input type="checkbox" checked={multiple} onchange={(e) => (multiple = e.currentTarget.checked)} />
        <span>Multiple images</span>
      </label>
      <label class="preview-toggle">
        <span>Shadow</span>
        <select value={shadow} onchange={(e) => (shadow = e.currentTarget.value as typeof shadow)}>
          <option value="box">Box</option>
          <option value="content">Content</option>
          <option value="none">None</option>
        </select>
      </label>
    {/snippet}
    {#snippet extraPropertyRowsTop(stateName)}
      {#if stateName === 'tile'}
        <div class="property-row" data-token-variables={TILE_FIT}>
          <span class="property-label">tile fit<A11yPropertyMark variables={[TILE_FIT]} /></span>
          <div class="tile-fit-control">
            <UISegmentedControl
              value={tileFit}
              options={fitOptions}
              ariaLabel="Tile fit"
              onchange={(value) => setComponentAlias(component, TILE_FIT, { kind: 'literal', value })}
            />
          </div>
        </div>
      {/if}
    {/snippet}
    <div class="preview-frame">
      <ImageLightbox images={multiple ? demoImages : [demoImages[0]]} {shadow} extended />
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .preview-frame {
    width: 100%;
    max-width: 28rem;
    margin: 0 auto;
  }
  .tile-fit-control {
    display: flex;
  }
  .preview-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
