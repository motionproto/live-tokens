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

  /** Color-family prefix each variant scopes monochrome picks to. `primary`
   *  is the brand family; the rest of the variant names match the palette
   *  family directly. Used to drive the gradient editor's `familyFilter`. */
  const VARIANT_FAMILY: Record<Variant, string> = {
    canvas: 'canvas',
    neutral: 'neutral',
    alternate: 'alternate',
    primary: 'brand',
    accent: 'accent',
    special: 'special',
  };

  /** Frame tokens for a variant. The gradient slot is the structured
   *  `{ kind: 'gradient' }` alias edited via GradientEditor; outline
   *  thickness/color are rendered nested under the title TypeEditor.
   *  Both are emitted only for `allTokens` (reset/registry) — not for
   *  the per-state token grid. */
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
      { label: 'gradient', groupKey: 'gradient', variable: `--sectiondivider-${v}-gradient`, kind: 'gradient', family: VARIANT_FAMILY[v] },
    ];
  }
  function variantTokens(v: Variant): Token[] {
    return [...frameTokens(v), ...titleOutlineTokens(v), ...gradientTokens(v)];
  }

  /** Token list passed to VariantGroup.states + sibling builder so Copy-from
   *  iterates ALL tokens (frame + outline + gradient), not just the visible
   *  frame. Outline + gradient are flagged `hidden` so the property grid still
   *  shows only frame tokens — outline renders inside the title TypeEditor,
   *  gradient renders in GradientEditor. Mismatch between this list and the
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
  import GradientEditor from '../ui/GradientEditor.svelte';
  import { editorState, mutate } from '../core/store/editorStore';
  import { componentGradientSource } from '../core/store/gradientSource';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  /** Known color families the picker exposes — kept in sync with
   *  `UIPaletteSelector.svelte`'s `families` list. Used to detect a stop's
   *  current family so checking Monochrome can map it to the variant's. */
  const KNOWN_FAMILIES = [
    'neutral', 'alternate', 'canvas', 'brand',
    'accent', 'special', 'success', 'warning', 'info', 'danger',
  ] as const;

  /** Step names on the text ramp. Mirrors UIPaletteSelector's `textSteps`. */
  const TEXT_STEPS = ['primary', 'secondary', 'tertiary', 'muted', 'disabled'] as const;

  let testTitle = $state('Section Title');
  let showDescription = $state(true);
  let descriptionText = $state('This text is meant to provide additional context or meaning.');

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  // Pass the full stateTokens list (with outline/gradient hidden) so positional
  // Copy-from covers every variable. TokenLayout filters hidden tokens from the
  // grid render path, so the user still sees only frame tokens.
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(stateTokens(v), linked.varSet));

  /** Per-variant gradient sources, memoized by variant key so the adapter
   *  identity stays stable for GradientEditor's snapshot/restore lifecycle. */
  const gradientSources = Object.fromEntries(
    variants.map((v) => [v.key, componentGradientSource(component, `--sectiondivider-${v.key}-gradient`)]),
  ) as Record<Variant, ReturnType<typeof componentGradientSource>>;

  /** Per-variant Monochrome toggles. Derived "on" when every current stop's
   *  color sits within the variant's family. Checking the box also rewrites
   *  any out-of-family stops to their family-equivalent (e.g. flipping
   *  `--color-special-500` → `--color-accent-500` when the variant is
   *  accent), so the gradient visibly snaps into the family. Unchecking
   *  the box just widens the picker; existing stops are not touched. */
  let monochrome = $state<Record<Variant, boolean>>({
    canvas: true, neutral: true, alternate: true,
    primary: true, accent: true, special: true,
  });

  /** Refresh `monochrome[v]` from current stop colors. Called once per
   *  variant on mount; the user-toggleable state then drifts independently. */
  function initMonochrome(v: Variant) {
    const slice = $editorState.components[component];
    const ref = slice?.aliases[`--sectiondivider-${v}-gradient`];
    if (ref?.kind !== 'gradient') return;
    const fam = VARIANT_FAMILY[v];
    const allInFamily = ref.value.stops.every((s) => stopMatchesFamily(s.color, fam));
    monochrome[v] = allInFamily;
  }

  /** Parse a text-ramp token into `{family, step}`. The text namespace has
   *  three canonical shapes:
   *    `--text-{step}`           — neutral (family segment elided)
   *    `--text-{family}`         — non-neutral, primary step elided
   *    `--text-{family}-{step}`  — non-neutral, explicit step
   *  Returns null when the token isn't a text-ramp token. */
  function parseTextToken(colorRef: string): { family: string; step: string } | null {
    if (!colorRef.startsWith('--text-')) return null;
    const rest = colorRef.slice('--text-'.length);
    const parts = rest.split('-');
    if (parts.length === 1) {
      const p = parts[0];
      if ((TEXT_STEPS as readonly string[]).includes(p)) return { family: 'neutral', step: p };
      if ((KNOWN_FAMILIES as readonly string[]).includes(p)) return { family: p, step: 'primary' };
      return null;
    }
    if (parts.length === 2) {
      const [fam, step] = parts;
      if ((KNOWN_FAMILIES as readonly string[]).includes(fam) && (TEXT_STEPS as readonly string[]).includes(step)) {
        return { family: fam, step };
      }
    }
    return null;
  }

  /** Build a text-ramp token name from `{family, step}`. Inverse of
   *  `parseTextToken` — neutral elides the family segment; non-neutral
   *  primary elides the step segment. */
  function buildTextToken(family: string, step: string): string {
    if (family === 'neutral') return `--text-${step}`;
    return step === 'primary' ? `--text-${family}` : `--text-${family}-${step}`;
  }

  /** True when the stop's color token resolves to the named color family.
   *  Text tokens go through the dedicated parser since neutral text elides
   *  the family segment; everything else falls back to a segment scan. */
  function stopMatchesFamily(colorRef: string, family: string): boolean {
    if (!colorRef.startsWith('--')) return false;
    const text = parseTextToken(colorRef);
    if (text) return text.family === family;
    const parts = colorRef.slice(2).split('-');
    return parts.includes(family);
  }

  /** Find the first known color-family segment in a CSS-var token slug.
   *  Returns null when no family segment is present (raw hex literal, or
   *  text token — those go through `parseTextToken` instead). */
  function detectFamily(colorRef: string): string | null {
    if (!colorRef.startsWith('--')) return null;
    const parts = colorRef.slice(2).split('-');
    for (const p of parts) {
      if ((KNOWN_FAMILIES as readonly string[]).includes(p)) return p;
    }
    return null;
  }

  /** Snap every out-of-family stop in variant `v` to the variant's family.
   *  Text tokens take the canonical text-rebuild path (handles the neutral
   *  elision asymmetry); everything else does a clean segment swap. Stops
   *  whose color is a raw hex literal — no family info to work from — are
   *  left untouched. */
  function snapToFamily(v: Variant) {
    const targetFamily = VARIANT_FAMILY[v];
    const varName = `--sectiondivider-${v}-gradient`;
    mutate(`monochrome snap ${varName}`, (s) => {
      const slice = s.components[component];
      const ref = slice?.aliases[varName];
      if (!ref || ref.kind !== 'gradient') return;
      const stops = ref.value.stops.map((stop) => {
        const text = parseTextToken(stop.color);
        if (text) {
          if (text.family === targetFamily) return { ...stop };
          return { ...stop, color: buildTextToken(targetFamily, text.step) };
        }
        const fromFamily = detectFamily(stop.color);
        if (!fromFamily || fromFamily === targetFamily) return { ...stop };
        const parts = stop.color.slice(2).split('-');
        const idx = parts.indexOf(fromFamily);
        if (idx < 0) return { ...stop };
        parts[idx] = targetFamily;
        return { ...stop, color: '--' + parts.join('-') };
      });
      slice!.aliases[varName] = {
        kind: 'gradient',
        value: { type: ref.value.type, angle: ref.value.angle, stops },
      };
    });
  }

  function onMonochromeToggle(v: Variant) {
    if (monochrome[v]) snapToFamily(v);
  }
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
        <div class="gradient-section-header">
          <span class="gradient-section-label">Gradient</span>
          <label class="monochrome-toggle">
            <input
              type="checkbox"
              bind:checked={monochrome[v.key]}
              onfocus={() => initMonochrome(v.key)}
              onchange={() => onMonochromeToggle(v.key)}
            />
            <span>Monochrome</span>
          </label>
        </div>
        <GradientEditor
          source={gradientSources[v.key]}
          stopIdPrefix={`sectiondivider-${v.key}`}
          familyFilter={monochrome[v.key] ? VARIANT_FAMILY[v.key] : null}
        />
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

  /* Label + toggle sit as an inline pair. The toggle reads as a modifier
     on the section heading, so we keep them adjacent (small gap) rather
     than pushing the toggle to the row's far edge. */
  .gradient-section-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-top: var(--ui-space-8);
    gap: var(--ui-space-16);
  }

  .gradient-section-label {
    display: block;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  /* Sits inline with the Gradient eyebrow on the right. Mirrors the
     editor's "toolbar-check" look-and-feel without re-importing it (this
     editor doesn't have those tokens in scope; the styles below stay
     greyscale per the editor's color discipline). */
  .monochrome-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .monochrome-toggle:hover {
    color: var(--ui-text-primary);
  }

  .monochrome-toggle input {
    margin: 0;
    cursor: pointer;
  }
</style>
