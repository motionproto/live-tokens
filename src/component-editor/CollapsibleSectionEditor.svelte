<script context="module" lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'collapsiblesection';

  const VARIANTS = ['chromeless', 'divider', 'container'] as const;
  type Variant = typeof VARIANTS[number];
  const HEADER_STATES = ['default', 'hover', 'active'] as const;
  type HeaderState = typeof HEADER_STATES[number];

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const VARIANT_LABELS: Record<Variant, string> = {
    chromeless: 'Chromeless',
    divider: 'With Divider',
    container: 'Container',
  };

  // Header tokens per variant. Chromeless has no chrome; divider exposes the
  // bottom-border (the divider line) per state; container's outer chrome lives
  // in `frame` so the header strip itself just owns surface + padding + text.
  function headerStateTokens(v: Variant, s: HeaderState): Token[] {
    const p = `--collapsiblesection-${v}-${s}`;
    const base: Token[] = [
      { label: 'surface color', groupKey: 'surface', variable: `${p}-surface` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` },
      { label: 'icon color', groupKey: 'icon', variable: `${p}-icon` },
      { label: 'icon size', canBeLinked: true, groupKey: 'font-size', variable: `${p}-icon-size` },
    ];
    if (v === 'divider') {
      base.splice(1, 0,
        { label: 'divider color', groupKey: 'border', variable: `${p}-border` },
        { label: 'divider width', canBeLinked: true, groupKey: 'border-width', variable: `${p}-border-width` },
      );
    }
    return base;
  }

  // Container has a single Frame ruleset for the always-on outer chrome.
  const frameTokens: Token[] = [
    { label: 'surface color', groupKey: 'surface', variable: '--collapsiblesection-container-frame-surface' },
    { label: 'border color', groupKey: 'border', variable: '--collapsiblesection-container-frame-border' },
    { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--collapsiblesection-container-frame-border-width' },
    { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--collapsiblesection-container-frame-radius' },
  ];

  // Expanded panel: chromeless/divider only own padding; container also paints
  // its own surface so the content area can read distinct from the header strip.
  function expandedTokens(v: Variant): Token[] {
    const p = `--collapsiblesection-${v}-expanded`;
    const tokens: Token[] = [];
    if (v === 'container') tokens.push({ label: 'surface color', groupKey: 'surface', variable: `${p}-surface` });
    tokens.push({ label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` });
    return tokens;
  }

  // Single per-variant state map: frame (container only), default/hover/active,
  // expanded. State-tab strip inside the VariantGroup walks this sequence so the
  // user moves through the whole variant from one tabbed surface.
  function variantStates(v: Variant): Record<string, Token[]> {
    const out: Record<string, Token[]> = {};
    if (v === 'container') out.frame = frameTokens;
    for (const s of HEADER_STATES) out[s] = headerStateTokens(v, s);
    out.expanded = expandedTokens(v);
    return out;
  }

  // Label typography only attaches to header states; frame and expanded don't
  // own text. VariantGroup tolerates a partial map.
  function variantTypeGroups(v: Variant): Record<string, TypeGroupConfig[]> {
    return Object.fromEntries(HEADER_STATES.map((s) => [s, [{
      legend: 'label',
      colorVariable: `--collapsiblesection-${v}-${s}-label`,
      familyVariable: `--collapsiblesection-${v}-${s}-label-font-family`,
      sizeVariable: `--collapsiblesection-${v}-${s}-label-font-size`,
      weightVariable: `--collapsiblesection-${v}-${s}-label-font-weight`,
      lineHeightVariable: `--collapsiblesection-${v}-${s}-label-line-height`,
    }]]));
  }

  const headerTypeGroupTokens: Token[] = VARIANTS.flatMap((v) => HEADER_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--collapsiblesection-${v}-${s}-label-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--collapsiblesection-${v}-${s}-label-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--collapsiblesection-${v}-${s}-label-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--collapsiblesection-${v}-${s}-label-line-height` },
  ]));

  export const allTokens: Token[] = [
    ...VARIANTS.flatMap((v) => Object.values(variantStates(v)).flat()),
    ...VARIANTS.flatMap((v) => buildTypeGroupColorTokens(variantTypeGroups(v))),
    ...headerTypeGroupTokens,
  ];

  const linkableContexts = new Map<string, string>([
    ...VARIANTS.flatMap((v) => HEADER_STATES.flatMap((s) => {
      const base: Array<[string, string]> = [
        [`--collapsiblesection-${v}-${s}-padding`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-icon-size`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-font-family`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-font-size`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-font-weight`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-line-height`, `${v} ${s}`],
      ];
      if (v === 'divider') base.push([`--collapsiblesection-divider-${s}-border-width`, `divider ${s}`]);
      return base;
    })),
    ['--collapsiblesection-container-frame-border-width', 'container frame'],
    ['--collapsiblesection-container-frame-radius', 'container frame'],
    ...VARIANTS.flatMap((v) => [
      [`--collapsiblesection-${v}-expanded-padding`, `${v} expanded`] as [string, string],
    ]),
  ]);

  const variantOptions = VARIANTS.map((v) => ({ value: v, label: VARIANT_LABELS[v] }));
</script>

<script lang="ts">
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { buildSiblings } from './scaffolding/siblings';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);

  $: visibleVariantStates = (v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>;
</script>

<ComponentEditorBase {component} title="Collapsible Section" description="Expandable section with chevron toggle. Variants: chromeless, divider, container. Import from <code>components/CollapsibleSection.svelte</code>" tokens={allTokens} {linked} tabbable variants={variantOptions}>
  {#each VARIANTS as v}
    <VariantGroup
      name={v}
      title={VARIANT_LABELS[v]}
      states={visibleVariantStates(v)}
      typeGroups={variantTypeGroups(v)}
      {component}
      siblings={buildSiblings(VARIANTS, v, variantStates, variantTypeGroups)}
      let:activeState
    >
      {@const isExpanded = activeState === 'expanded'}
      {@const isFrame = activeState === 'frame'}
      {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      {@const forceActive = activeState === 'active'}
      <CollapsibleSection
        variant={v}
        label="Click to expand"
        expanded={isExpanded}
        active={forceActive}
        class={forceClass}
      >
        <p style="margin: 0; color: var(--text-secondary);">
          {#if isFrame}
            (Frame) — outer chrome only; expand the section to see content area styling.
          {:else}
            This content is revealed when the section is expanded. Any content can go here.
          {/if}
        </p>
      </CollapsibleSection>
    </VariantGroup>
  {/each}
</ComponentEditorBase>
