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

  function frameTokens(v: Variant): Token[] {
    return [
      { label: 'spacing', canBeLinked: true, groupKey: 'spacing', variable: `--sectiondivider-${v}-spacing`, splittable: false },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--sectiondivider-${v}-radius` },
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: `--sectiondivider-${v}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--sectiondivider-${v}-border-width` },
      { label: 'drop shadow', canBeLinked: true, groupKey: 'shadow', variable: `--sectiondivider-${v}-shadow` },
      { label: 'hairline color', canBeLinked: true, groupKey: 'hairline-color', variable: `--sectiondivider-${v}-hairline-color` },
      { label: 'hairline thickness', canBeLinked: true, groupKey: 'hairline-thickness', variable: `--sectiondivider-${v}-hairline-thickness` },
    ];
  }
  function titleOutlineTokens(v: Variant): Token[] {
    return [
      { label: 'outline thickness', canBeLinked: true, groupKey: 'title-outline-width', variable: `--sectiondivider-${v}-title-outline-width` },
      { label: 'outline color', canBeLinked: true, groupKey: 'title-outline-color', variable: `--sectiondivider-${v}-title-outline-color` },
    ];
  }
  function backgroundTokens(v: Variant): Token[] {
    return [
      { label: 'background', groupKey: 'background', variable: `--sectiondivider-${v}-background`, kind: 'gradient', family: variants.find((x) => x.key === v)!.family },
    ];
  }
  function variantTokens(v: Variant): Token[] {
    return [...frameTokens(v), ...titleOutlineTokens(v), ...backgroundTokens(v)];
  }
  function stateTokens(v: Variant): Token[] {
    return [
      ...frameTokens(v),
      ...titleOutlineTokens(v).map((t) => ({ ...t, hidden: true })),
      ...backgroundTokens(v).map((t) => ({ ...t, hidden: true })),
    ];
  }

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
        outlineWidthVariable: `--sectiondivider-${v}-title-outline-width`,
        outlineColorVariable: `--sectiondivider-${v}-title-outline-color`,
      },
      {
        legend: 'description',
        colorVariable: `--sectiondivider-${v}-description`,
        familyVariable: `--sectiondivider-${v}-description-font-family`,
        sizeVariable: `--sectiondivider-${v}-description-font-size`,
        weightVariable: `--sectiondivider-${v}-description-font-weight`,
        lineHeightVariable: `--sectiondivider-${v}-description-line-height`,
      },
      {
        legend: 'eyebrow',
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
    'spacing', 'radius', 'border', 'border-width', 'shadow',
    'hairline-color', 'hairline-thickness',
    'title-outline-width', 'title-outline-color',
    'title-color', 'description-color', 'eyebrow-color',
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
  type HairlineChoice = 'off' | HairlinePosition;
</script>

<script lang="ts">
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import GradientEditor from '../ui/GradientEditor.svelte';
  import { editorState, mutate, setComponentConfig } from '../core/store/editorStore';
  import { componentGradientSource } from '../core/store/gradientSource';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  const KNOWN_FAMILIES = [
    'neutral', 'alternate', 'canvas', 'brand',
    'accent', 'special', 'success', 'warning', 'info', 'danger',
  ] as const;

  const TEXT_STEPS = ['primary', 'secondary', 'tertiary', 'muted', 'disabled'] as const;

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
  function getHairline(v: Variant): HairlineChoice {
    const raw = cfg[`--sectiondivider-${v}-hairline`];
    const positions: HairlineChoice[] = ['off', 'above-label', 'through-label', 'below-label', 'above-description', 'through-description', 'below-description'];
    return (positions as string[]).includes(raw as string) ? (raw as HairlineChoice) : 'off';
  }
  function getShowEyebrow(v: Variant): boolean {
    return cfg[`--sectiondivider-${v}-show-eyebrow`] === '1';
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

  let monochrome = $state<Record<Variant, boolean>>({ lg: true, md: true, sm: true });

  function initMonochrome(v: Variant) {
    const slice = $editorState.components[component];
    const ref = slice?.aliases[`--sectiondivider-${v}-background`];
    if (ref?.kind !== 'gradient') return;
    const fam = variants.find((x) => x.key === v)!.family;
    monochrome[v] = ref.value.stops.every((s) => stopMatchesFamily(s.color, fam));
  }

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

  function buildTextToken(family: string, step: string): string {
    if (family === 'neutral') return `--text-${step}`;
    return step === 'primary' ? `--text-${family}` : `--text-${family}-${step}`;
  }

  function stopMatchesFamily(colorRef: string, family: string): boolean {
    if (!colorRef.startsWith('--')) return false;
    const text = parseTextToken(colorRef);
    if (text) return text.family === family;
    return colorRef.slice(2).split('-').includes(family);
  }

  function detectFamily(colorRef: string): string | null {
    if (!colorRef.startsWith('--')) return null;
    const parts = colorRef.slice(2).split('-');
    for (const p of parts) {
      if ((KNOWN_FAMILIES as readonly string[]).includes(p)) return p;
    }
    return null;
  }

  function snapToFamily(v: Variant) {
    const targetFamily = variants.find((x) => x.key === v)!.family;
    const varName = `--sectiondivider-${v}-background`;
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
        value: { type: ref.value.type, angle: ref.value.angle, ...(ref.value.radius !== undefined ? { radius: ref.value.radius } : {}), stops },
      };
    });
  }

  function onMonochromeToggle(v: Variant) {
    if (monochrome[v]) snapToFamily(v);
  }

  function hairlineOptions(v: Variant): { value: HairlineChoice; label: string }[] {
    const base: { value: HairlineChoice; label: string }[] = [
      { value: 'off', label: 'Off' },
      { value: 'above-label', label: 'Above title' },
      { value: 'through-label', label: 'Through title' },
      { value: 'below-label', label: 'Below title' },
    ];
    if (!getShowDescription(v)) return base;
    return [
      ...base,
      { value: 'above-description', label: 'Above description' },
      { value: 'through-description', label: 'Through description' },
      { value: 'below-description', label: 'Below description' },
    ];
  }

  function hairlineProp(v: Variant): { position: HairlinePosition } | undefined {
    const choice = getHairline(v);
    return choice === 'off' ? undefined : { position: choice };
  }

  // If a variant's description gets turned off while a description-targeted
  // hairline was selected, reset the hairline to off so the preview stays
  // consistent.
  $effect(() => {
    for (const v of variants) {
      const ch = getHairline(v.key);
      if (!getShowDescription(v.key) && ch !== 'off' && ch.endsWith('-description')) {
        setCfg(v.key, 'hairline', 'off');
      }
    }
  });
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
    >
      {#snippet canvasToolbarExtras()}
        <hr class="canvas-toolbar-divider" />
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
        />
      </div>
      {#snippet compositeControls(_stateName)}
        <div class="gradient-section-header">
          <span class="gradient-section-label">Background</span>
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
          familyFilter={monochrome[v.key] ? v.family : null}
        />
      {/snippet}
      {#snippet extraPropertyRows(_stateName)}
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
          <span class="property-label">hairline</span>
          <select
            class="sd-intrinsic-select"
            value={getHairline(v.key)}
            onchange={(e) => setCfg(v.key, 'hairline', (e.currentTarget as HTMLSelectElement).value)}
          >
            {#each hairlineOptions(v.key) as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="property-row sd-intrinsic-row">
          <span class="property-label">eyebrow</span>
          <label class="sd-intrinsic-check">
            <input
              type="checkbox"
              checked={getShowEyebrow(v.key)}
              onchange={(e) => setCfg(v.key, 'show-eyebrow', (e.currentTarget as HTMLInputElement).checked ? '1' : '')}
            />
            <span>Show eyebrow</span>
          </label>
        </div>
        <div class="property-row sd-intrinsic-row">
          <span class="property-label">description</span>
          <label class="sd-intrinsic-check">
            <input
              type="checkbox"
              checked={getShowDescription(v.key)}
              onchange={(e) => setCfg(v.key, 'show-description', (e.currentTarget as HTMLInputElement).checked ? '1' : '')}
            />
            <span>Show description</span>
          </label>
        </div>
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

  .monochrome-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .monochrome-toggle:hover { color: var(--ui-text-primary); }
  .monochrome-toggle input { margin: 0; cursor: pointer; }

  /* Intrinsic-property rows. Sit in the Properties section under the token
     grid (via VariantGroup.extraPropertyRows). The grid columns are inherited
     from the parent so labels line up with token labels above. */
  :global(.sd-intrinsic-select) {
    appearance: none;
    -webkit-appearance: none;
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

  :global(.sd-intrinsic-check) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
  :global(.sd-intrinsic-check input) {
    margin: 0;
    cursor: pointer;
  }
</style>
