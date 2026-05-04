<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';
  const component = 'badge';
  const variants = ['info', 'accent', 'trait'] as const;
  type Variant = typeof variants[number];

  // Each variant is its own visual presentation; surface/text/border colors are unique.
  // Shape props (radius/border-width/padding/shadow) and font props can be linked across variants.
  function variantTokens(variant: Variant): Token[] {
    return [
      { label: 'surface color', variable: `--badge-${variant}-surface` },
      { label: 'border color', variable: `--badge-${variant}-border` },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: `--badge-${variant}-border-width` },
      { label: 'corner radius', canBeShared: true, groupKey: 'radius', variable: `--badge-${variant}-radius` },
      { label: 'padding', canBeShared: true, groupKey: 'padding', variable: `--badge-${variant}-padding` },
      { label: 'badge shadow', canBeShared: true, groupKey: 'shadow', variable: `--badge-${variant}-shadow` },
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
      { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: `--badge-${variant}-text-font-family` },
      { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: `--badge-${variant}-text-font-size` },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: `--badge-${variant}-text-font-weight` },
      { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: `--badge-${variant}-text-line-height` },
    ];
  }
  const allTokens: Token[] = variants.flatMap((v) => [...variantTokens(v), ...variantTypeGroupTokens(v)]);
  registerComponentSchema(component, allTokens);

  // Cross-variant sharing: any token with canBeShared+groupKey participates in
  // the shared block when ≥2 variants currently agree on its alias.
  const shareableContexts = new Map<string, string>([
    // Use the first variant's variable as the canonical key for each groupKey.
    ['--badge-info-border-width', 'info'],
    ['--badge-accent-border-width', 'accent'],
    ['--badge-trait-border-width', 'trait'],
    ['--badge-info-radius', 'info'],
    ['--badge-accent-radius', 'accent'],
    ['--badge-trait-radius', 'trait'],
    ['--badge-info-padding', 'info'],
    ['--badge-accent-padding', 'accent'],
    ['--badge-trait-padding', 'trait'],
    ['--badge-info-shadow', 'info'],
    ['--badge-accent-shadow', 'accent'],
    ['--badge-trait-shadow', 'trait'],
    ['--badge-info-text-font-family', 'info'],
    ['--badge-accent-text-font-family', 'accent'],
    ['--badge-trait-text-font-family', 'trait'],
    ['--badge-info-text-font-size', 'info'],
    ['--badge-accent-text-font-size', 'accent'],
    ['--badge-trait-text-font-size', 'trait'],
    ['--badge-info-text-font-weight', 'info'],
    ['--badge-accent-text-font-weight', 'accent'],
    ['--badge-trait-text-font-weight', 'trait'],
    ['--badge-info-text-line-height', 'info'],
    ['--badge-accent-text-line-height', 'accent'],
    ['--badge-trait-text-line-height', 'trait'],
  ]);

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);
  $: visibleVariantTokens = (v: Variant) => withSharedDisabled(variantTokens(v), shared.varSet);

  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-badge-surface';

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<ComponentEditorBase {component} title="Badge" description="Pill-shaped badges with variant support. Import from <code>components/Badge.svelte</code>" tokens={allTokens} {shared} tabbable variants={variantOptions}>
  <svelte:fragment slot="config">
    <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} />
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
        <div class="badge-showcase-grid">
          {#if v === 'info'}
            <Badge variant="info">info</Badge>
            <Badge variant="info" icon="fa-solid fa-dice-d20">With Icon</Badge>
          {:else if v === 'accent'}
            <Badge variant="accent">scenes</Badge>
          {:else}
            <Badge variant="trait">arcane</Badge>
            <Badge variant="trait">divine</Badge>
            <Badge variant="trait">primal</Badge>
          {/if}
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
</style>
