<script context="module" lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import { badgeVariants } from '../components/Badge.svelte';

  export const component = 'badge';
  const variants = badgeVariants;
  type Variant = typeof variants[number];

  // Each variant is its own visual presentation; surface/text/border colors are unique.
  // Shape props (radius/border-width/padding/shadow) and font props can be linked across variants.
  function variantTokens(variant: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--badge-${variant}-surface` },
      { label: 'border color', groupKey: 'border', variable: `--badge-${variant}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--badge-${variant}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--badge-${variant}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--badge-${variant}-padding` },
      { label: 'badge shadow', canBeLinked: true, groupKey: 'shadow', variable: `--badge-${variant}-shadow` },
      { label: 'backdrop blur', canBeLinked: true, groupKey: 'blur', variable: `--badge-${variant}-blur` },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--badge-${variant}-icon-size` },
    ];
  }
  function variantTypeGroups(variant: Variant): TypeGroupConfig[] {
    return [{
      legend: `${variant} text`,
      colorVariable: `--badge-${variant}-text`,
      familyVariable: `--badge-${variant}-text-font-family`,
      sizeVariable: `--badge-${variant}-text-font-size`,
      weightVariable: `--badge-${variant}-text-font-weight`,
      lineHeightVariable: `--badge-${variant}-text-line-height`,
    }];
  }
  function variantTypeGroupTokens(variant: Variant): Token[] {
    return [
      { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--badge-${variant}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--badge-${variant}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--badge-${variant}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--badge-${variant}-text-line-height` },
    ];
  }
  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v),
    ...buildTypeGroupColorTokens(variantTypeGroups(v)),
    ...variantTypeGroupTokens(v),
  ]);

  // Cross-variant sharing: any token with canBeLinked+groupKey participates in
  // the linked block when ≥2 variants currently agree on its alias.
  const linkableProps = [
    'border-width', 'radius', 'padding', 'shadow', 'blur', 'icon-size',
    'text-font-family', 'text-font-size', 'text-font-weight', 'text-line-height',
  ] as const;
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) => linkableProps.map((p) => [`--badge-${v}-${p}`, v] as [string, string]))
  );

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';
  import UIRadioGroup from '../ui/UIRadioGroup.svelte';

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);
  $: visibleVariantTokens = (v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet);

  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-badge-surface';

  // Preview-only props for Badge's floating/anchor/flush features (not persisted).
  // For corner-anchored use, prefer the dedicated CornerBadge component; Badge.floating
  // is the low-level escape hatch for off-corner floating placements.
  let floating: boolean = false;
  let flush: boolean = false;
  let anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
  const anchorOptions = [
    { value: 'top-left' as const, label: 'TL' },
    { value: 'top-right' as const, label: 'TR' },
    { value: 'bottom-left' as const, label: 'BL' },
    { value: 'bottom-right' as const, label: 'BR' },
  ];
</script>

<ComponentEditorBase {component} title="Badge" description="Pill-shaped badges with color variants. Import from <code>components/Badge.svelte</code>" tokens={allTokens} {linked} variants={variantOptions}>
  <svelte:fragment slot="config">
    <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} />
    <label class="float-toggle">
      <input type="checkbox" bind:checked={floating} />
      <span>Floating preview</span>
    </label>
    {#if floating}
      <label class="float-toggle">
        <input type="checkbox" bind:checked={flush} />
        <span>Flush corner</span>
      </label>
      <div class="anchor-control">
        <span>Anchor</span>
        <UIRadioGroup bind:value={anchor} name="badge-anchor" options={anchorOptions} />
      </div>
    {/if}
  </svelte:fragment>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      siblings={buildSiblings(variants, v, (sv) => ({ [sv]: variantTokens(sv) }), (sv) => ({ [sv]: variantTypeGroups(sv) }))}
    >
      <ShadowBackdrop mode={bgMode} colorVariable={bgVar}>
        {#if floating}
          <div class="floating-stage">
            <Badge variant={v} {floating} {anchor} {flush}>{v.charAt(0).toUpperCase() + v.slice(1)}</Badge>
          </div>
        {:else}
          <div class="badge-showcase-grid">
            <Badge variant={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</Badge>
            <Badge variant={v} icon="fa-solid fa-dice-d20">With Icon</Badge>
          </div>
        {/if}
      </ShadowBackdrop>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .badge-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    align-items: center;
  }

  /* Anchor parent for floating-preview mode — gives the badge a positioned ancestor
     and a visible surface so blur/offset/flush are observable. */
  .floating-stage {
    position: relative;
    width: 100%;
    min-height: 160px;
    border-radius: var(--ui-radius-md);
    background: rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .float-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }

  .anchor-control {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
