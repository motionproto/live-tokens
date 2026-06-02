<script module lang="ts">
  import type { Token, IntrinsicSpec } from './scaffolding/types';

  export const component = 'image';

  // Single object: image frame.
  const states: Record<string, Token[]> = {
    image: [
      { label: 'border color', groupKey: 'border', variable: '--image-default-border' },
      { label: 'border width', groupKey: 'width', variable: '--image-default-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--image-default-radius' },
      { label: 'image shadow', groupKey: 'shadow', variable: '--image-default-shadow' },
      { label: 'zoom amount', groupKey: 'scale', variable: '--image-zoom-scale' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();

  // Global "Use zoom" default. `none` = off; `scale(...)` = every image zooms on hover.
  const ZOOM_ON = 'scale(var(--image-zoom-scale))';
  export const intrinsics: IntrinsicSpec[] = [
    {
      key: 'zoom',
      variants: ['default'],
      variable: () => '--image-zoom-hover',
      values: ['none', ZOOM_ON],
      default: { default: 'none' },
    },
  ];
</script>

<script lang="ts">
  import Image from '../../system/components/Image.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import demoImageUrl from '../../system/assets/offering.webp';
  import { editorState, setComponentAlias } from '../core/store/editorStore';

  let aliases = $derived(
    ($editorState.components[component]?.aliases ?? {}) as Record<string, import('../core/store/editorTypes').CssVarRef>,
  );
  let useZoom = $derived.by(() => {
    const ref = aliases['--image-zoom-hover'];
    const raw = ref?.kind === 'literal' ? ref.value : intrinsics[0].default.default;
    return raw === ZOOM_ON;
  });

  function setUseZoom(checked: boolean) {
    setComponentAlias(component, '--image-zoom-hover', { kind: 'literal', value: checked ? ZOOM_ON : 'none' });
  }
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow." tokens={allTokens}>
  <VariantGroup name="image" title="Image" {states} {component}>
    {#snippet stateActions()}
      <label class="zoom-enable">
        <input type="checkbox" checked={useZoom} onchange={(e) => setUseZoom(e.currentTarget.checked)} />
        <span>Use zoom on hover</span>
      </label>
    {/snippet}
    <Image src={demoImageUrl} alt="Demo" variant="banner" zoom={useZoom ? undefined : false} />
    <p class="zoom-help">
      Checked: every image zooms its contents on hover. Unchecked: zoom is off by default and a page turns it
      on per image with the <code>zoom</code> prop.
    </p>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .zoom-enable {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
  .zoom-help {
    margin: var(--ui-space-8) 0 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }
  .zoom-help code {
    font-family: var(--ui-font-mono);
  }
</style>
