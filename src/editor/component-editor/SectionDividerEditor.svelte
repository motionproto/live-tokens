<script module lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'sectiondivider';

  /** Variant axis = full presets. Each variant owns its size/typography +
   *  colors/background, AND its intrinsic display properties (align,
   *  hairline, eyebrow + description visibility). */
  type Variant = 'lg' | 'md' | 'sm';
  const variants: { key: Variant; title: string; family: string }[] = [
    { key: 'lg', title: 'Large', family: 'canvas' },
    { key: 'md', title: 'Medium', family: 'canvas' },
    { key: 'sm', title: 'Small', family: 'canvas' },
  ];

  function containerTokens(v: Variant): Token[] {
    return [
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--sectiondivider-${v}-radius`, element: 'Container' },
      { label: 'drop shadow', canBeLinked: true, groupKey: 'shadow', variable: `--sectiondivider-${v}-shadow`, element: 'Container' },
      { label: 'padding', canBeLinked: true, groupKey: 'container-padding', variable: `--sectiondivider-${v}-padding`, element: 'Container' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--sectiondivider-${v}-border-width`, element: 'Container' },
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: `--sectiondivider-${v}-border`, element: 'Container' },
    ];
  }
  function typePaddingTokens(v: Variant): Token[] {
    return [
      { label: 'padding', canBeLinked: true, groupKey: 'title-padding', variable: `--sectiondivider-${v}-title-padding`, element: 'title' },
      { label: 'padding', canBeLinked: true, groupKey: 'description-padding', variable: `--sectiondivider-${v}-description-padding`, element: 'description' },
      { label: 'padding', canBeLinked: true, groupKey: 'eyebrow-padding', variable: `--sectiondivider-${v}-eyebrow-padding`, element: 'eyebrow' },
    ];
  }
  function hairlineTokens(v: Variant): Token[] {
    return [
      { label: 'hairline color', canBeLinked: true, groupKey: 'hairline-color', variable: `--sectiondivider-${v}-hairline-color`, element: 'hairline' },
      { label: 'hairline thickness', canBeLinked: true, groupKey: 'hairline-thickness', variable: `--sectiondivider-${v}-hairline-thickness`, element: 'hairline' },
    ];
  }
  function titleOutlineTokens(v: Variant): Token[] {
    return [
      { label: 'outline thickness', canBeLinked: true, groupKey: 'title-outline-width', variable: `--sectiondivider-${v}-title-outline-width`, element: 'title' },
      { label: 'outline color', canBeLinked: true, groupKey: 'title-outline-color', variable: `--sectiondivider-${v}-title-outline-color`, element: 'title' },
    ];
  }
  function backgroundTokens(v: Variant): Token[] {
    return [
      { label: 'background', groupKey: 'background', variable: `--sectiondivider-${v}-background`, kind: 'gradient', family: variants.find((x) => x.key === v)!.family },
    ];
  }
  function variantTokens(v: Variant): Token[] {
    return [...containerTokens(v), ...hairlineTokens(v), ...titleOutlineTokens(v), ...backgroundTokens(v), ...typePaddingTokens(v)];
  }
  function stateTokens(v: Variant): Token[] {
    return [
      ...containerTokens(v),
      ...hairlineTokens(v),
      ...titleOutlineTokens(v).map((t) => ({ ...t, hidden: true })),
      ...backgroundTokens(v).map((t) => ({ ...t, hidden: true })),
      ...typePaddingTokens(v),
    ];
  }

  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: '',
        element: 'title',
        colorVariable: `--sectiondivider-${v}-title`,
        familyVariable: `--sectiondivider-${v}-title-font-family`,
        sizeVariable: `--sectiondivider-${v}-title-font-size`,
        weightVariable: `--sectiondivider-${v}-title-font-weight`,
        lineHeightVariable: `--sectiondivider-${v}-title-line-height`,
        letterSpacingVariable: `--sectiondivider-${v}-title-letter-spacing`,
        outlineWidthVariable: `--sectiondivider-${v}-title-outline-width`,
        outlineColorVariable: `--sectiondivider-${v}-title-outline-color`,
      },
      {
        legend: '',
        element: 'description',
        colorVariable: `--sectiondivider-${v}-description`,
        familyVariable: `--sectiondivider-${v}-description-font-family`,
        sizeVariable: `--sectiondivider-${v}-description-font-size`,
        weightVariable: `--sectiondivider-${v}-description-font-weight`,
        lineHeightVariable: `--sectiondivider-${v}-description-line-height`,
      },
      {
        legend: '',
        element: 'eyebrow',
        colorVariable: `--sectiondivider-${v}-eyebrow`,
        familyVariable: `--sectiondivider-${v}-eyebrow-font-family`,
        sizeVariable: `--sectiondivider-${v}-eyebrow-font-size`,
        weightVariable: `--sectiondivider-${v}-eyebrow-font-weight`,
        letterSpacingVariable: `--sectiondivider-${v}-eyebrow-letter-spacing`,
      },
    ];
  }

  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'title color', canBeLinked: true, groupKey: 'title-color', variable: `--sectiondivider-${v}-title` },
      { label: 'title font family', canBeLinked: true, groupKey: 'title-font-family', variable: `--sectiondivider-${v}-title-font-family` },
      { label: 'title font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: `--sectiondivider-${v}-title-font-weight` },
      { label: 'title font size', variable: `--sectiondivider-${v}-title-font-size` },
      { label: 'title line height', canBeLinked: true, groupKey: 'title-line-height', variable: `--sectiondivider-${v}-title-line-height` },
      { label: 'title letter spacing', canBeLinked: true, groupKey: 'title-letter-spacing', variable: `--sectiondivider-${v}-title-letter-spacing` },
      { label: 'description color', canBeLinked: true, groupKey: 'description-color', variable: `--sectiondivider-${v}-description` },
      { label: 'description font family', canBeLinked: true, groupKey: 'description-font-family', variable: `--sectiondivider-${v}-description-font-family` },
      { label: 'description font weight', canBeLinked: true, groupKey: 'description-font-weight', variable: `--sectiondivider-${v}-description-font-weight` },
      { label: 'description font size', variable: `--sectiondivider-${v}-description-font-size` },
      { label: 'description line height', canBeLinked: true, groupKey: 'description-line-height', variable: `--sectiondivider-${v}-description-line-height` },
      { label: 'eyebrow color', canBeLinked: true, groupKey: 'eyebrow-color', variable: `--sectiondivider-${v}-eyebrow` },
      { label: 'eyebrow font family', canBeLinked: true, groupKey: 'eyebrow-font-family', variable: `--sectiondivider-${v}-eyebrow-font-family` },
      { label: 'eyebrow font weight', canBeLinked: true, groupKey: 'eyebrow-font-weight', variable: `--sectiondivider-${v}-eyebrow-font-weight` },
      { label: 'eyebrow font size', variable: `--sectiondivider-${v}-eyebrow-font-size` },
      { label: 'eyebrow letter spacing', canBeLinked: true, groupKey: 'eyebrow-letter-spacing', variable: `--sectiondivider-${v}-eyebrow-letter-spacing` },
    ];
  }

  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v.key),
    ...variantTypeGroupTokens(v.key),
  ]);

  const LINKED_GROUP_KEYS = [
    'container-padding', 'radius', 'border', 'border-width', 'shadow',
    'hairline-color', 'hairline-thickness',
    'title-outline-width', 'title-outline-color',
    'title-color', 'description-color', 'eyebrow-color',
    'title-padding', 'description-padding', 'eyebrow-padding',
    'title-font-family', 'title-font-weight', 'title-line-height', 'title-letter-spacing',
    'description-font-family', 'description-font-weight', 'description-line-height',
    'eyebrow-font-family', 'eyebrow-font-weight', 'eyebrow-letter-spacing',
  ] as const;
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) =>
      [...variantTokens(v.key), ...variantTypeGroupTokens(v.key)]
        .filter((t) => t.groupKey && (LINKED_GROUP_KEYS as readonly string[]).includes(t.groupKey))
        .map((t) => [t.variable, v.key] as const),
    ),
  );

  const variantOptions = variants.map((v) => ({ value: v.key, label: v.title }));

  type Align = 'start' | 'center';
  type HairlinePosition =
    | 'above-label'
    | 'through-label'
    | 'below-label'
    | 'above-description'
    | 'through-description'
    | 'below-description';
</script>

<script lang="ts">
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import GradientEditor from '../ui/GradientEditor.svelte';
  import { editorState, mutate, setComponentAlias, setComponentConfig } from '../core/store/editorStore';
  import { componentGradientSource } from '../core/store/gradientSource';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { KNOWN_FAMILIES, swapTokenFamily } from '../core/palettes/familySwap';

  // Variants list above carries a default family ('canvas') used as the starting
  // value for new presets. Live family is per-variant config so the user can
  // swap a divider's color world without touching the variants array.
  const FAMILY_OPTIONS: { value: string; label: string }[] = KNOWN_FAMILIES.map((f) => ({
    value: f,
    label: f.charAt(0).toUpperCase() + f.slice(1),
  }));

  // Sample content lives in the canvas toolbar (per-variant editor state).
  // It's not persisted — it drives the preview's text content only. The
  // user keys it differently per-variant so each card has its own preview text.
  let testTitle: Record<Variant, string> = $state({
    lg: 'Large Section',
    md: 'Medium Section',
    sm: 'Small Section',
  });
  let eyebrowText: Record<Variant, string> = $state({
    lg: 'SECTION', md: 'SECTION', sm: 'SECTION',
  });
  let descriptionText: Record<Variant, string> = $state({
    lg: 'This text is meant to provide additional context or meaning.',
    md: 'This text is meant to provide additional context or meaning.',
    sm: 'This text is meant to provide additional context or meaning.',
  });

  // Intrinsic per-variant properties — persisted in the component config bucket.
  // Read live from the editor state so the property-row controls reflect saves.
  let cfg = $derived(($editorState.components[component]?.config ?? {}) as Record<string, unknown>);

  function getAlign(v: Variant): Align {
    const raw = cfg[`--sectiondivider-${v}-align`];
    return raw === 'start' ? 'start' : 'center';
  }
  function getColorFamily(v: Variant): string {
    const raw = cfg[`--sectiondivider-${v}-color-family`];
    if (typeof raw === 'string' && (KNOWN_FAMILIES as readonly string[]).includes(raw)) return raw;
    return variants.find((x) => x.key === v)!.family;
  }
  function getHairlinePosition(v: Variant): HairlinePosition {
    const raw = cfg[`--sectiondivider-${v}-hairline`];
    // 'above-description' renders identically to 'below-label' (both place the
    // hairline in the gap between title and description), so the dropdown only
    // exposes one. Coerce legacy data here so the select stays selected.
    if (raw === 'above-description') return 'below-label';
    const positions: HairlinePosition[] = ['above-label', 'through-label', 'below-label', 'through-description', 'below-description'];
    return (positions as string[]).includes(raw as string) ? (raw as HairlinePosition) : 'above-label';
  }
  function getShowHairline(v: Variant): boolean {
    const raw = cfg[`--sectiondivider-${v}-show-hairline`];
    // Migrate legacy `hairline = 'off'` data: if explicit show key is unset,
    // infer from whether the legacy choice was a real position.
    if (raw === undefined) {
      const h = cfg[`--sectiondivider-${v}-hairline`];
      return typeof h === 'string' && h !== 'off' && h !== '';
    }
    return raw === '1';
  }
  function getShowEyebrow(v: Variant): boolean {
    return cfg[`--sectiondivider-${v}-show-eyebrow`] === '1';
  }
  function getEyebrowUppercase(v: Variant): boolean {
    return cfg[`--sectiondivider-${v}-eyebrow-uppercase`] === '1';
  }
  function getShowDescription(v: Variant): boolean {
    const raw = cfg[`--sectiondivider-${v}-show-description`];
    // Default to true if unset, '' or '1' otherwise (legacy data may carry no key at all).
    if (raw === undefined) return true;
    return raw === '1';
  }
  function setCfg(v: Variant, prop: string, value: string) {
    setComponentConfig(component, `--sectiondivider-${v}-${prop}`, value);
  }

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(stateTokens(v), linked.varSet));

  const gradientSources = Object.fromEntries(
    variants.map((v) => [v.key, componentGradientSource(component, `--sectiondivider-${v.key}-background`)]),
  ) as Record<Variant, ReturnType<typeof componentGradientSource>>;

  // Family swap on color-family change: for every alias under this variant
  // that currently references `oldFamily`, rewrite the reference to
  // `newFamily`. Aliases targeting other families are left alone so an
  // intentionally-cross-family border doesn't get swept along. Gradient stops
  // flagged `monochrome: false` are off-palette overrides — those skip the
  // rewrite so the user's deliberate non-family stop survives the swap.
  function remapFamily(v: Variant, oldFamily: string, newFamily: string) {
    if (oldFamily === newFamily) return;
    const prefix = `--sectiondivider-${v}-`;
    mutate(`color-family remap ${v} ${oldFamily}->${newFamily}`, (s) => {
      const slice = s.components[component];
      if (!slice) return;
      for (const [key, ref] of Object.entries(slice.aliases)) {
        if (!key.startsWith(prefix)) continue;
        if (ref.kind === 'token') {
          const swapped = swapTokenFamily(ref.name, oldFamily, newFamily);
          if (swapped !== ref.name) {
            slice.aliases[key] = { kind: 'token', name: swapped };
          }
        } else if (ref.kind === 'gradient') {
          let changed = false;
          const stops = ref.value.stops.map((stop) => {
            if (stop.monochrome === false) return stop;
            const swapped = swapTokenFamily(stop.color, oldFamily, newFamily);
            if (swapped === stop.color) return stop;
            changed = true;
            return { ...stop, color: swapped };
          });
          if (changed) {
            slice.aliases[key] = {
              kind: 'gradient',
              value: {
                type: ref.value.type,
                angle: ref.value.angle,
                ...(ref.value.radius !== undefined ? { radius: ref.value.radius } : {}),
                ...(ref.value.centerX !== undefined ? { centerX: ref.value.centerX } : {}),
                ...(ref.value.aspectX !== undefined ? { aspectX: ref.value.aspectX } : {}),
                ...(ref.value.aspectY !== undefined ? { aspectY: ref.value.aspectY } : {}),
                stops,
              },
            };
          }
        }
      }
    });
  }

  // "None" on the background segmented control clears the container outright:
  // the gradient flips to `type: 'none'` (handled inside GradientEditor) and
  // we follow through here by clearing the border color too — a convenience
  // so the user doesn't have to chase the residual outline. The user can
  // re-set the border independently afterwards; changing border alone never
  // bounces the background back to solid.
  function clearContainerBorder(v: Variant) {
    setComponentAlias(component, `--sectiondivider-${v}-border`, { kind: 'literal', value: 'transparent' });
  }

  function hairlineOptions(v: Variant): { value: HairlinePosition; label: string }[] {
    const base: { value: HairlinePosition; label: string }[] = [
      { value: 'above-label', label: 'Above title' },
      { value: 'through-label', label: 'Through title' },
      { value: 'below-label', label: 'Below title' },
    ];
    if (!getShowDescription(v)) return base;
    return [
      ...base,
      { value: 'through-description', label: 'Through description' },
      { value: 'below-description', label: 'Below description' },
    ];
  }

  function hairlineProp(v: Variant): { position: HairlinePosition } | undefined {
    if (!getShowHairline(v)) return undefined;
    return { position: getHairlinePosition(v) };
  }

  // If a variant's description gets turned off while a description-targeted
  // hairline was selected, snap the position back to a title-targeted choice
  // so the dropdown's options stay consistent with the rendered preview.
  $effect(() => {
    for (const v of variants) {
      const pos = getHairlinePosition(v.key);
      if (!getShowDescription(v.key) && pos.endsWith('-description')) {
        setCfg(v.key, 'hairline', 'above-label');
      }
    }
  });

  function elementTogglesFor(v: Variant) {
    return {
      description: {
        checked: getShowDescription(v),
        label: 'Show description',
        onchange: (c: boolean) => setCfg(v, 'show-description', c ? '1' : ''),
      },
      eyebrow: {
        checked: getShowEyebrow(v),
        label: 'Show eyebrow',
        onchange: (c: boolean) => setCfg(v, 'show-eyebrow', c ? '1' : ''),
      },
      hairline: {
        checked: getShowHairline(v),
        label: 'Show',
        onchange: (c: boolean) => setCfg(v, 'show-hairline', c ? '1' : ''),
      },
    };
  }
</script>

<ComponentEditorBase {component} title="Section Divider" description="Full-width section banner. Each variant (lg/md/sm) is a full preset: its own size, typography, colors, AND intrinsic properties (alignment, hairline, eyebrow/description visibility)." tokens={allTokens} {linked} variants={variantOptions}>
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
      elementToggles={elementTogglesFor(v.key)}
      elementOrder={['Container', 'title', 'description', 'eyebrow', 'hairline']}
    >
      {#snippet canvasToolbarExtras()}
        <label class="toolbar-field">
          <span>Test title</span>
          <input type="text" class="canvas-toolbar-input" bind:value={testTitle[v.key]} placeholder={v.title} />
        </label>
        {#if getShowEyebrow(v.key)}
          <label class="toolbar-field">
            <span>Eyebrow text</span>
            <input type="text" class="canvas-toolbar-input" bind:value={eyebrowText[v.key]} placeholder="SECTION" />
          </label>
        {/if}
        {#if getShowDescription(v.key)}
          <label class="toolbar-field">
            <span>Description text</span>
            <input type="text" class="canvas-toolbar-input" bind:value={descriptionText[v.key]} placeholder="Description" />
          </label>
        {/if}
      {/snippet}
      <div class="section-divider-stage">
        <SectionDivider
          title={testTitle[v.key] || v.title}
          variant={v.key}
          description={getShowDescription(v.key) ? descriptionText[v.key] : undefined}
          eyebrow={getShowEyebrow(v.key) ? eyebrowText[v.key] : undefined}
          align={getAlign(v.key)}
          hairline={hairlineProp(v.key)}
          eyebrowUppercase={getEyebrowUppercase(v.key)}
        />
      </div>
      {#snippet compositeControls(_stateName)}
        <div class="gradient-bg-section">
          <span class="gradient-section-label">Background</span>
          <GradientEditor
            source={gradientSources[v.key]}
            stopIdPrefix={`sectiondivider-${v.key}`}
            familyFilter={getColorFamily(v.key)}
            showNone
            onNone={() => clearContainerBorder(v.key)}
          />
        </div>
      {/snippet}
      {#snippet extraPropertyRowsTop(_stateName)}
        <div class="property-row sd-intrinsic-row">
          <span class="property-label">alignment</span>
          <select
            class="sd-intrinsic-select"
            value={getAlign(v.key)}
            onchange={(e) => setCfg(v.key, 'align', (e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="center">Center</option>
            <option value="start">Start</option>
          </select>
        </div>
        <div class="property-row sd-intrinsic-row">
          <span class="property-label">color family</span>
          <select
            class="sd-intrinsic-select"
            value={getColorFamily(v.key)}
            onchange={(e) => {
              const next = (e.currentTarget as HTMLSelectElement).value;
              const prev = getColorFamily(v.key);
              setCfg(v.key, 'color-family', next);
              remapFamily(v.key, prev, next);
            }}
          >
            {#each FAMILY_OPTIONS as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
      {/snippet}
      {#snippet elementExtras(elementName)}
        {#if elementName === 'eyebrow'}
          <label class="sd-element-check">
            <input
              type="checkbox"
              checked={getEyebrowUppercase(v.key)}
              onchange={(e) => setCfg(v.key, 'eyebrow-uppercase', (e.currentTarget as HTMLInputElement).checked ? '1' : '')}
            />
            <span>All caps</span>
          </label>
        {/if}
        {#if elementName === 'hairline'}
          <div class="property-row sd-intrinsic-row sd-hairline-position-row">
            <span class="property-label">position</span>
            <select
              class="sd-intrinsic-select"
              value={getHairlinePosition(v.key)}
              onchange={(e) => setCfg(v.key, 'hairline', (e.currentTarget as HTMLSelectElement).value)}
            >
              {#each hairlineOptions(v.key) as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        {/if}
      {/snippet}
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .toolbar-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }

  .section-divider-stage {
    width: 100%;
    min-width: 32rem;
  }

  .gradient-section-label {
    display: block;
    margin-top: var(--ui-space-8);
    margin-bottom: var(--ui-space-12);
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  /* Match the preview's content area above so the ribbon's left/right
     edges line up end-to-end with the section divider preview. Mirrors
     ShadowBackdrop's two-column grid:
     - padding-left: matches backdrop-content's left padding (1.5rem)
     - padding-right: reserves the canvas-toolbar column to the right
       (11rem + its shadow-backdrop-controls padding 16px + backdrop-
       content's right padding 32px).
     When the variant-group collapses below 32rem the canvas-toolbar
     stacks above and the right column disappears — drop the right
     reservation to match. */
  .gradient-bg-section {
    padding-left: 1.5rem;
    padding-right: calc(11rem + 16px + 32px);
    box-sizing: border-box;
  }
  @container variant-group (max-width: 32rem) {
    .gradient-bg-section {
      padding-right: 32px;
    }
  }

  /* Intrinsic-property rows. Sit in the Properties section under the token
     grid (via VariantGroup.extraPropertyRows). The grid columns are inherited
     from the parent so labels line up with token labels above. */
  /* Inline boolean control inside an element-section (e.g. "All caps" under
     the eyebrow heading). Sits flush-left so it reads as a section property
     rather than aligning with the token grid below. */
  :global(.sd-element-check) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
    margin-bottom: var(--ui-space-4);
  }
  :global(.sd-element-check:hover) { color: var(--ui-text-primary); }
  :global(.sd-element-check input) { margin: 0; cursor: pointer; }

  /* Property-row inside an element-section (e.g. hairline position) — the
     extra-property-rows grid lives in VariantGroup and only applies above
     the token list. Mirror its column layout here so the position row's
     label/select reads consistent with the alignment + color family rows. */
  :global(.sd-hairline-position-row.property-row) {
    display: grid;
    grid-template-columns: minmax(8rem, max-content) 1fr;
    column-gap: var(--ui-space-16);
    align-items: center;
    min-height: 1.75rem;
    margin-bottom: var(--ui-space-4);
  }
  :global(.sd-hairline-position-row .property-label) {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  :global(.sd-intrinsic-select) {
    appearance: none;
    -webkit-appearance: none;
    justify-self: start;
    width: max-content;
    min-width: 8rem;
    padding: 0 var(--ui-space-24) 0 var(--ui-space-8);
    min-height: 1.75rem;
    background-color: var(--ui-surface-lowest);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--ui-space-8) center;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
  }
  :global(.sd-intrinsic-select:hover) {
    background-color: var(--ui-surface-low);
    border-color: var(--ui-border);
  }
  :global(.sd-intrinsic-select:focus-visible) {
    outline: 2px solid var(--ui-highlight);
    outline-offset: 2px;
  }

</style>
