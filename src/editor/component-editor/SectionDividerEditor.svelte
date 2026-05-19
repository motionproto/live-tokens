<script module lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'sectiondivider';

  type Variant = 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';
  const variants: { key: Variant; title: string }[] = [
    { key: 'primary', title: 'Primary' },
    { key: 'accent', title: 'Accent' },
    { key: 'neutral', title: 'Neutral' },
    { key: 'special', title: 'Special' },
    { key: 'canvas', title: 'Canvas' },
    { key: 'alternate', title: 'Alternate' },
  ];

  /** Frame tokens for a variant. Gradient tokens are owned by GradientCard, and
   *  outline thickness/color are rendered nested under the title TypeEditor;
   *  both are emitted only for `allTokens` (reset/registry) — not for the
   *  per-state token grid. */
  function frameTokens(v: Variant): Token[] {
    return [
      // Padding is routed through an internal `--_divider-padding` aggregator
      // per variant — split mode would require per-side forwarding in every
      // variant rule. Until that lands, present single-value only.
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--sectiondivider-${v}-padding`, splittable: false },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--sectiondivider-${v}-radius` },
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: `--sectiondivider-${v}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--sectiondivider-${v}-border-width` },
      { label: 'drop shadow', canBeLinked: true, groupKey: 'shadow', variable: `--sectiondivider-${v}-shadow` },
    ];
  }
  /** Title outline tokens — rendered inside the title TypeEditor (not the
   *  property grid) but registered here so reset/linkage still see them. */
  function titleOutlineTokens(v: Variant): Token[] {
    return [
      { label: 'outline thickness', canBeLinked: true, groupKey: 'title-border-width', variable: `--sectiondivider-${v}-title-border-width` },
      { label: 'outline color', canBeLinked: true, groupKey: 'title-stroke-color', variable: `--sectiondivider-${v}-title-stroke-color` },
    ];
  }
  function gradientTokens(v: Variant): Token[] {
    return [
      { label: 'gradient angle', groupKey: 'angle', variable: `--sectiondivider-${v}-gradient-angle` },
      { label: 'gradient stop 1 color', groupKey: 'color', variable: `--sectiondivider-${v}-gradient-stop-1-color` },
      { label: 'gradient stop 1 position', groupKey: 'position', variable: `--sectiondivider-${v}-gradient-stop-1-position` },
      { label: 'gradient stop 2 color', groupKey: 'color', variable: `--sectiondivider-${v}-gradient-stop-2-color` },
      { label: 'gradient stop 2 position', groupKey: 'position', variable: `--sectiondivider-${v}-gradient-stop-2-position` },
      { label: 'gradient stop 3 color', groupKey: 'color', variable: `--sectiondivider-${v}-gradient-stop-3-color` },
      { label: 'gradient stop 3 position', groupKey: 'position', variable: `--sectiondivider-${v}-gradient-stop-3-position` },
    ];
  }
  function variantTokens(v: Variant): Token[] {
    return [...frameTokens(v), ...titleOutlineTokens(v), ...gradientTokens(v)];
  }

  /** Token list passed to VariantGroup.states + sibling builder so Copy-from
   *  iterates ALL tokens (frame + outline + gradient), not just the visible
   *  frame. Outline + gradient are flagged `hidden` so the property grid still
   *  shows only frame tokens — outline renders inside the title TypeEditor,
   *  gradient renders in GradientCard. Mismatch between this list and the
   *  sibling list would mis-align positional copy. */
  function stateTokens(v: Variant): Token[] {
    return [
      ...frameTokens(v),
      ...titleOutlineTokens(v).map((t) => ({ ...t, hidden: true })),
      ...gradientTokens(v).map((t) => ({ ...t, hidden: true })),
    ];
  }

  /** Two type groups per variant: title and description. The TypeEditor
   *  fieldset visually groups each color with its font-shape props. The
   *  title fieldset also nests the SVG-text outline width + color so those
   *  controls sit with the typography that drives them. */
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: 'title',
        colorVariable: `--sectiondivider-${v}-title`,
        familyVariable: `--sectiondivider-${v}-title-font-family`,
        sizeVariable: `--sectiondivider-${v}-title-font-size`,
        weightVariable: `--sectiondivider-${v}-title-font-weight`,
        lineHeightVariable: `--sectiondivider-${v}-title-line-height`,
        letterSpacingVariable: `--sectiondivider-${v}-title-letter-spacing`,
        outlineWidthVariable: `--sectiondivider-${v}-title-border-width`,
        outlineColorVariable: `--sectiondivider-${v}-title-stroke-color`,
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
      { label: 'title letter spacing', canBeLinked: true, groupKey: 'title-letter-spacing', variable: `--sectiondivider-${v}-title-letter-spacing` },
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
    'border', 'border-width', 'shadow',
    'title-border-width', 'title-stroke-color',
    'title-color', 'title-font-family', 'title-font-size', 'title-font-weight', 'title-line-height', 'title-letter-spacing',
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
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import GradientCard from './scaffolding/GradientCard.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let testTitle = $state('Section Title');
  let showDescription = $state(true);
  let descriptionText = $state('This text is meant to provide additional context or meaning.');

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  // Pass the full stateTokens list (with outline/gradient hidden) so positional
  // Copy-from covers every variable. TokenLayout filters hidden tokens from the
  // grid render path, so the user still sees only frame tokens.
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(stateTokens(v), linked.varSet));
</script>

<ComponentEditorBase {component} title="Section Divider" description="Full-width section banner with display font and palette variants." tokens={allTokens} {linked} variants={variantOptions}>
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
        (sv) => ({ [sv]: stateTokens(sv) }),
        (sv) => ({ [sv]: variantTypeGroups(sv) }),
      )}
      backdropPadding="32px"
    >
      {#snippet canvasToolbarExtras()}
        <hr class="canvas-toolbar-divider" />
        <label class="toolbar-field">
          <span>Test title</span>
          <input type="text" class="canvas-toolbar-input" bind:value={testTitle} placeholder="Section Title" />
        </label>
        <label class="toolbar-check">
          <input type="checkbox" bind:checked={showDescription} />
          <span>Show description</span>
        </label>
        <label class="toolbar-field">
          <span>Description text</span>
          <input type="text" class="canvas-toolbar-input" bind:value={descriptionText} placeholder="Description text" />
        </label>
      {/snippet}
      <div class="section-divider-stage">
        <SectionDivider
          title={testTitle || v.title}
          variant={v.key}
          description={showDescription ? descriptionText : undefined}
        />
      </div>
      {#snippet compositeControls(_stateName)}
        <span class="gradient-section-label">Gradient</span>
        <GradientCard {component} prefix={`--sectiondivider-${v.key}`} />
      {/snippet}
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .toolbar-check {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: rgba(255, 255, 255, 0.78);
    cursor: pointer;
  }

  .toolbar-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }

  /* Floor the preview width so the divider always reads as a banner, even
     when the canvas gets cramped (e.g. on narrower editor viewports). */
  .section-divider-stage {
    width: 100%;
    min-width: 32rem;
  }

  .gradient-section-label {
    display: block;
    margin-top: var(--ui-space-8);
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }
</style>
