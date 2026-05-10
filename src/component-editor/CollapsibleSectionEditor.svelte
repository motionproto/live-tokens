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

  // Header tokens per variant. Chromeless has no chrome; divider exposes the
  // bottom-border (the divider line) per state; container's outer chrome lives
  // in `frame` so the header strip itself just owns surface + padding + text.
  function headerStateTokens(v: Variant, s: HeaderState): Token[] {
    const p = `--collapsiblesection-${v}-${s}`;
    const base: Token[] = [
      { label: 'surface color', variable: `${p}-surface` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` },
      { label: 'icon color', variable: `${p}-icon` },
      { label: 'icon size', canBeLinked: true, groupKey: 'font-size', variable: `${p}-icon-size` },
    ];
    if (v === 'divider') {
      base.splice(1, 0,
        { label: 'divider color', variable: `${p}-border` },
        { label: 'divider width', canBeLinked: true, groupKey: 'border-width', variable: `${p}-border-width` },
      );
    }
    return base;
  }

  function headerStates(v: Variant): Record<string, Token[]> {
    return Object.fromEntries(HEADER_STATES.map((s) => [s, headerStateTokens(v, s)]));
  }

  function headerTypeGroups(v: Variant): Record<string, TypeGroupConfig[]> {
    return Object.fromEntries(HEADER_STATES.map((s) => [s, [{
      legend: 'label',
      colorVariable: `--collapsiblesection-${v}-${s}-label`,
      familyVariable: `--collapsiblesection-${v}-${s}-label-font-family`,
      sizeVariable: `--collapsiblesection-${v}-${s}-label-font-size`,
      weightVariable: `--collapsiblesection-${v}-${s}-label-font-weight`,
      lineHeightVariable: `--collapsiblesection-${v}-${s}-label-line-height`,
    }]]));
  }

  // Container has a single Frame ruleset for the always-on outer chrome.
  const frameStates: Record<string, Token[]> = {
    frame: [
      { label: 'surface color', variable: '--collapsiblesection-container-frame-surface' },
      { label: 'border color', variable: '--collapsiblesection-container-frame-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--collapsiblesection-container-frame-border-width' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--collapsiblesection-container-frame-radius' },
    ],
  };

  // Expanded panel: chromeless/divider only own padding; container also paints
  // its own surface so the content area can read distinct from the header strip.
  function expandedStates(v: Variant): Record<string, Token[]> {
    const p = `--collapsiblesection-${v}-expanded`;
    const tokens: Token[] = [];
    if (v === 'container') tokens.push({ label: 'surface color', variable: `${p}-surface` });
    tokens.push({ label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` });
    return { expanded: tokens };
  }

  const headerTypeGroupTokens: Token[] = VARIANTS.flatMap((v) => HEADER_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--collapsiblesection-${v}-${s}-label-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--collapsiblesection-${v}-${s}-label-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--collapsiblesection-${v}-${s}-label-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--collapsiblesection-${v}-${s}-label-line-height` },
  ]));

  export const allTokens: Token[] = [
    ...VARIANTS.flatMap((v) => Object.values(headerStates(v)).flat()),
    ...VARIANTS.flatMap((v) => buildTypeGroupColorTokens(headerTypeGroups(v))),
    ...headerTypeGroupTokens,
    ...Object.values(frameStates).flat(),
    ...VARIANTS.flatMap((v) => Object.values(expandedStates(v)).flat()),
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

  const variantOptions = VARIANTS.map((v) => ({ value: v, label: capitalize(v) }));
</script>

<script lang="ts">
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let demoExpanded: Record<Variant, boolean> = { chromeless: false, divider: false, container: false };

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);

  $: visibleHeaderStates = (v: Variant) => Object.fromEntries(
    Object.entries(headerStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>;

  $: visibleExpandedStates = (v: Variant) => Object.fromEntries(
    Object.entries(expandedStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>;

  $: visibleFrameStates = Object.fromEntries(
    Object.entries(frameStates).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>;
</script>

<ComponentEditorBase {component} title="Collapsible Section" description="Expandable section with chevron toggle. Variants: chromeless, divider, container. Import from <code>components/CollapsibleSection.svelte</code>" tokens={allTokens} {linked} tabbable variants={variantOptions} let:viewMode let:focusedVariant>
  {#each VARIANTS as v}
    {#if viewMode === 'list' || focusedVariant === v}
    {#if v === 'container'}
      <VariantGroup
        name="container-frame"
        title="Container — Frame"
        states={visibleFrameStates}
        {component}
      >
        <CollapsibleSection variant={v} label="Click to expand" expanded>
          <p style="margin: 0; color: var(--text-secondary);">
            This content is revealed when the section is expanded. Any content can go here.
          </p>
        </CollapsibleSection>
      </VariantGroup>
    {/if}
    <VariantGroup
      name={`${v}-header`}
      title={`${capitalize(v)} — Header`}
      states={visibleHeaderStates(v)}
      typeGroups={headerTypeGroups(v)}
      {component}
      let:activeState
    >
      {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      {@const forceActive = activeState === 'active'}
      <CollapsibleSection
        variant={v}
        label="Click to expand"
        expanded={demoExpanded[v]}
        active={forceActive}
        class={forceClass}
        on:toggle={() => (demoExpanded = { ...demoExpanded, [v]: !demoExpanded[v] })}
      >
        <p style="margin: 0; color: var(--text-secondary);">
          This content is revealed when the section is expanded. Any content can go here.
        </p>
      </CollapsibleSection>
    </VariantGroup>
    <VariantGroup
      name={`${v}-expanded`}
      title={`${capitalize(v)} — Expanded panel`}
      states={visibleExpandedStates(v)}
      {component}
    >
      <CollapsibleSection variant={v} label="Click to expand" expanded>
        <p style="margin: 0; color: var(--text-secondary);">
          This content is revealed when the section is expanded. Any content can go here.
        </p>
      </CollapsibleSection>
    </VariantGroup>
    {/if}
  {/each}
</ComponentEditorBase>
