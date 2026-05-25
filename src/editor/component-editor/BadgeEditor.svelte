<script module lang="ts">
  import type { Token } from './scaffolding/types';
  import { badgeVariants } from '../../system/components/Badge.svelte';

  export const component = 'badge';
  const variants = badgeVariants;
  type Variant = typeof variants[number];

  // Base part: shape, spacing, and typography props that almost never differ
  // between variants. Defaults are identical across the palette; the linked
  // block surfaces that equality so authors edit one value and it co-applies.
  // Tagged with `element` so StateBlock partitions the panel into labeled
  // `frame` and `text` subsections instead of one long column.
  function variantBaseTokens(v: Variant): Token[] {
    return [
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--badge-${v}-padding`, element: 'frame' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--badge-${v}-radius`, element: 'frame' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--badge-${v}-border-width`, element: 'frame' },
      { label: 'badge shadow', canBeLinked: true, groupKey: 'shadow', variable: `--badge-${v}-shadow`, element: 'frame' },
      { label: 'backdrop blur', canBeLinked: true, groupKey: 'blur', variable: `--badge-${v}-blur`, element: 'frame' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--badge-${v}-icon-size`, element: 'frame' },
      { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--badge-${v}-text-font-family`, element: 'text' },
      { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--badge-${v}-text-font-size`, element: 'text' },
      { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--badge-${v}-text-font-weight`, element: 'text' },
      { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--badge-${v}-text-line-height`, element: 'text' },
    ];
  }

  // Colors part: the shade triple that actually distinguishes one variant from
  // another. groupKey keys siblings across variants so a user can opt into a
  // shared value via the link UI, but they default divergent (variant = palette).
  function variantColorTokens(v: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--badge-${v}-surface` },
      { label: 'border color', groupKey: 'border', variable: `--badge-${v}-border` },
      { label: 'text color', groupKey: 'text', variable: `--badge-${v}-text` },
    ];
  }

  function variantStates(v: Variant): Record<string, Token[]> {
    return { base: variantBaseTokens(v), colors: variantColorTokens(v) };
  }

  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantBaseTokens(v),
    ...variantColorTokens(v),
  ]);

  // Only base props join the linked block — colors are intentionally per-variant
  // so each shade can be retuned without dragging shape/type behind it.
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) =>
      variantBaseTokens(v)
        .filter((t) => t.canBeLinked)
        .map((t) => [t.variable, `${v} base`] as [string, string]),
    ),
  );

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Badge from '../../system/components/Badge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Badge" description="Pill-shaped badges with color variants." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      {component}
      siblings={buildSiblings(variants, v, variantStates)}
    >
      <div class="badge-showcase-grid">
        <Badge variant={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</Badge>
        <Badge variant={v} icon="fa-solid fa-dice-d20">With Icon</Badge>
      </div>
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
