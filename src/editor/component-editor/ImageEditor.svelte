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

  // Global zoom defaults. `none` = off; `scale(...)` = on. `--image-zoom-hover` scales the
  // content within the masked frame (overflow scaling); `--image-grow-hover` scales the whole
  // frame so it grows. At most one is ever `scale(...)`.
  const ZOOM_ON = 'scale(var(--image-zoom-scale))';
  export const intrinsics: IntrinsicSpec[] = [
    {
      key: 'zoom',
      variants: ['default'],
      variable: () => '--image-zoom-hover',
      values: ['none', ZOOM_ON],
      default: { default: 'none' },
    },
    {
      key: 'grow',
      variants: ['default'],
      variable: () => '--image-grow-hover',
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
  function aliasValue(variable: string, fallback: string): string {
    const ref = aliases[variable];
    return ref?.kind === 'literal' ? ref.value : fallback;
  }
  let contentOn = $derived(aliasValue('--image-zoom-hover', intrinsics[0].default.default) === ZOOM_ON);
  let frameOn = $derived(aliasValue('--image-grow-hover', intrinsics[1].default.default) === ZOOM_ON);
  let useZoom = $derived(contentOn || frameOn);
  // Overflow scaling = mask the zoom to the frame (the content path). Off = grow the frame.
  let overflowScaling = $derived(!frameOn);

  function applyZoom(zoomOn: boolean, masked: boolean) {
    setComponentAlias(component, '--image-zoom-hover', { kind: 'literal', value: zoomOn && masked ? ZOOM_ON : 'none' });
    setComponentAlias(component, '--image-grow-hover', { kind: 'literal', value: zoomOn && !masked ? ZOOM_ON : 'none' });
  }
  const setUseZoom = (checked: boolean) => applyZoom(checked, overflowScaling);
  const setOverflowScaling = (checked: boolean) => applyZoom(useZoom, checked);
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow." tokens={allTokens}>
  <VariantGroup name="image" title="Image" {states} {component}>
    {#snippet stateActions()}
      <label class="zoom-enable">
        <input type="checkbox" checked={useZoom} onchange={(e) => setUseZoom(e.currentTarget.checked)} />
        <span>Use zoom on hover</span>
      </label>
      <label class="zoom-enable" class:disabled={!useZoom}>
        <input type="checkbox" checked={overflowScaling} disabled={!useZoom} onchange={(e) => setOverflowScaling(e.currentTarget.checked)} />
        <span>Overflow scaling (mask zoom to frame)</span>
      </label>
    {/snippet}
    <Image src={demoImageUrl} alt="Demo" variant="banner" zoom={useZoom ? undefined : false} {overflowScaling} />
    <p class="zoom-help">
      Use zoom on hover: every image scales on hover (a page can still force it per image with the
      <code>zoom</code> prop). Overflow scaling on (default): the content zooms inside the fixed frame,
      masked by overflow. Off: the whole framed image grows past its box. Override per image with
      <code>overflowScaling</code>.
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
  .zoom-enable.disabled {
    opacity: var(--ui-opacity-disabled);
    cursor: not-allowed;
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
