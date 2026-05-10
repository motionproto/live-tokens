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
      { label: 'surface color', variable: `--badge-${variant}-surface` },
      { label: 'border color', variable: `--badge-${variant}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--badge-${variant}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--badge-${variant}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--badge-${variant}-padding` },
      { label: 'badge shadow', canBeLinked: true, groupKey: 'shadow', variable: `--badge-${variant}-shadow` },
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
    'border-width', 'radius', 'padding', 'shadow', 'icon-size',
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
  import UIPaletteSelector from '../ui/UIPaletteSelector.svelte';
  import { onMount } from 'svelte';
  import { setCssVar } from '../lib/cssVarSync';

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);
  $: visibleVariantTokens = (v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet);

  const bgVar = '--backdrop-badge-surface';

  onMount(() => {
    if (!document.documentElement.style.getPropertyValue(bgVar)) {
      setCssVar(bgVar, 'var(--surface-canvas)');
    }
  });
</script>

<ComponentEditorBase {component} title="Badge" description="Pill-shaped badges with color variants. Import from <code>components/Badge.svelte</code>" tokens={allTokens} {linked} tabbable variants={variantOptions}>
  <svelte:fragment slot="config">
    <label class="backdrop-config">
      <span>Sample background</span>
      <div class="picker-slot">
        <UIPaletteSelector variable={bgVar} />
      </div>
    </label>
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
      <ShadowBackdrop mode="color" colorVariable={bgVar}>
        <div class="badge-showcase-grid">
          <Badge variant={v}>{v}</Badge>
          <Badge variant={v} icon="fa-solid fa-dice-d20">With Icon</Badge>
        </div>
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

  .backdrop-config {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .picker-slot {
    min-width: 8rem;
  }

  .picker-slot :global(.ui-token-selector) {
    width: 100%;
  }
</style>
