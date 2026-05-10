<script context="module" lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'sectiondivider';

  type Variant = 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';
  const variants: { key: Variant; title: string }[] = [
    { key: 'canvas', title: 'Background' },
    { key: 'neutral', title: 'Neutral' },
    { key: 'alternate', title: 'Alternate' },
    { key: 'primary', title: 'Primary' },
    { key: 'accent', title: 'Accent' },
    { key: 'special', title: 'Special' },
  ];

  /** Frame tokens (padding, radius, outline, gradient stops) for a variant.
   *  Gradient stops are explicitly variant-local — they define the variant — and
   *  carry no groupKey, so they never participate in linking. */
  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--sectiondivider-${v}-padding` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--sectiondivider-${v}-radius` },
      { label: 'outline thickness', canBeLinked: true, groupKey: 'title-border-width', variable: `--sectiondivider-${v}-title-border-width` },
      { label: 'outline color', canBeLinked: true, groupKey: 'title-stroke-color', variable: `--sectiondivider-${v}-title-stroke-color` },
      { label: 'gradient stop 1', variable: `--sectiondivider-${v}-gradient-stop-1` },
      { label: 'gradient stop 2', variable: `--sectiondivider-${v}-gradient-stop-2` },
      { label: 'gradient stop 3', variable: `--sectiondivider-${v}-gradient-stop-3` },
      { label: 'gradient stop 4', variable: `--sectiondivider-${v}-gradient-stop-4` },
    ];
  }

  /** Two type groups per variant: title and description. The TypeEditor
   *  fieldset visually groups each color with its font-shape props. */
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: 'title',
        colorVariable: `--sectiondivider-${v}-title`,
        familyVariable: `--sectiondivider-${v}-title-font-family`,
        sizeVariable: `--sectiondivider-${v}-title-font-size`,
        weightVariable: `--sectiondivider-${v}-title-font-weight`,
        lineHeightVariable: `--sectiondivider-${v}-title-line-height`,
      },
      {
        legend: 'description',
        colorVariable: `--sectiondivider-${v}-description`,
        familyVariable: `--sectiondivider-${v}-description-font-family`,
        sizeVariable: `--sectiondivider-${v}-description-font-size`,
        weightVariable: `--sectiondivider-${v}-description-font-weight`,
        lineHeightVariable: `--sectiondivider-${v}-description-line-height`,
      },
    ];
  }

  /** Token registry entries for the type-group properties. Colors are emitted
   *  with canBeLinked so the LinkedBlock keeps the cross-variant linkage they
   *  ship with (title/description colors share the same theme defaults across
   *  every variant). */
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'title color', canBeLinked: true, groupKey: 'title-color', variable: `--sectiondivider-${v}-title` },
      { label: 'title font family', canBeLinked: true, groupKey: 'title-font-family', variable: `--sectiondivider-${v}-title-font-family` },
      { label: 'title font size', canBeLinked: true, groupKey: 'title-font-size', variable: `--sectiondivider-${v}-title-font-size` },
      { label: 'title font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: `--sectiondivider-${v}-title-font-weight` },
      { label: 'title line height', canBeLinked: true, groupKey: 'title-line-height', variable: `--sectiondivider-${v}-title-line-height` },
      { label: 'description color', canBeLinked: true, groupKey: 'description-color', variable: `--sectiondivider-${v}-description` },
      { label: 'description font family', canBeLinked: true, groupKey: 'description-font-family', variable: `--sectiondivider-${v}-description-font-family` },
      { label: 'description font size', canBeLinked: true, groupKey: 'description-font-size', variable: `--sectiondivider-${v}-description-font-size` },
      { label: 'description font weight', canBeLinked: true, groupKey: 'description-font-weight', variable: `--sectiondivider-${v}-description-font-weight` },
      { label: 'description line height', canBeLinked: true, groupKey: 'description-line-height', variable: `--sectiondivider-${v}-description-line-height` },
    ];
  }

  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v.key),
    ...variantTypeGroupTokens(v.key),
  ]);

  // Linked block contexts: every linkable token registers under its variant name.
  // Gradient stops are intentionally absent — they're variant-defining and never link.
  const LINKED_GROUP_KEYS = [
    'padding', 'radius',
    'title-border-width', 'title-stroke-color',
    'title-color', 'title-font-family', 'title-font-size', 'title-font-weight', 'title-line-height',
    'description-color', 'description-font-family', 'description-font-size', 'description-font-weight', 'description-line-height',
  ] as const;
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) =>
      [...variantTokens(v.key), ...variantTypeGroupTokens(v.key)]
        .filter((t) => t.groupKey && (LINKED_GROUP_KEYS as readonly string[]).includes(t.groupKey))
        .map((t) => [t.variable, v.key] as const),
    ),
  );

  const variantOptions = variants.map((v) => ({ value: v.key, label: v.title }));
</script>

<script lang="ts">
  import SectionDivider from '../components/SectionDivider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let testTitle = 'Section Title';
  let showDescription = true;
  let descriptionText = 'This text is meant to provide additional context or meaning.';

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);
  $: visibleVariantTokens = (v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet);
</script>

<ComponentEditorBase {component} title="Section Divider" description="Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>" tokens={allTokens} {linked} tabbable variants={variantOptions}>
  <svelte:fragment slot="config">
    <label class="text-field">
      <span>Test title</span>
      <input type="text" bind:value={testTitle} placeholder="Section Title" />
    </label>
    <label class="checkbox-field">
      <input type="checkbox" bind:checked={showDescription} />
      <span>Show description</span>
    </label>
    <label class="text-field text-field-wide">
      <span>Description text</span>
      <input type="text" bind:value={descriptionText} placeholder="Description text" />
    </label>
  </svelte:fragment>
  {#each variants as v}
    <VariantGroup
      name={v.key}
      title={v.title}
      states={{ [v.key]: visibleVariantTokens(v.key) }}
      typeGroups={{ [v.key]: variantTypeGroups(v.key) }}
      {component}
      siblings={buildSiblings(
        variants.map((x) => x.key),
        v.key,
        (sv) => ({ [sv]: variantTokens(sv) }),
        (sv) => ({ [sv]: variantTypeGroups(sv) }),
      )}
    >
      <SectionDivider
        title={testTitle || v.title}
        variant={v.key}
        description={showDescription ? descriptionText : undefined}
      />
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .text-field,
  .checkbox-field {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
  }

  .checkbox-field {
    cursor: pointer;
    user-select: none;
  }

  .checkbox-field input {
    margin: 0;
    cursor: pointer;
  }

  .text-field input {
    padding: var(--ui-space-4) var(--ui-space-8);
    background: var(--ui-surface-input);
    color: var(--ui-text-primary);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    min-width: 16rem;
  }

  .text-field-wide input {
    min-width: 28rem;
  }
</style>
