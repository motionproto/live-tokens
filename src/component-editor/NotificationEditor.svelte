<script lang="ts">
  import Notification from '../components/Notification.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import SharedBlock from './scaffolding/SharedBlock.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'notification';
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    sizeVariable?: string;
    weightVariable?: string;
    lineHeightVariable?: string;
  };
  const variants = ['info', 'success', 'warning', 'danger'] as const;
  type Variant = typeof variants[number];

  // Per variant: notification frame (surface, border, border-width, radius, padding) + icon (color, size).
  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'surface color', variable: `--notification-${v}-surface` },
      { label: 'border color', variable: `--notification-${v}-border` },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: `--notification-${v}-border-width` },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: `--notification-${v}-radius` },
      { label: 'padding', canBeShared: true, groupKey: 'padding', variable: `--notification-${v}-padding` },
      { label: 'icon color', variable: `--notification-${v}-icon` },
      { label: 'icon size', canBeShared: true, groupKey: 'icon-size', variable: `--notification-${v}-icon-size` },
    ];
  }

  // Two type groups per variant: title and body text.
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: 'title',
        colorVariable: `--notification-${v}-title`,
        familyVariable: `--notification-${v}-title-font-family`,
        sizeVariable: `--notification-${v}-title-font-size`,
        weightVariable: `--notification-${v}-title-font-weight`,
        lineHeightVariable: `--notification-${v}-title-line-height`,
      },
      {
        legend: 'body text',
        colorVariable: `--notification-${v}-text`,
        familyVariable: `--notification-${v}-text-font-family`,
        sizeVariable: `--notification-${v}-text-font-size`,
        weightVariable: `--notification-${v}-text-font-weight`,
        lineHeightVariable: `--notification-${v}-text-line-height`,
      },
    ];
  }
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'font family', canBeShared: true, groupKey: 'title-font-family', variable: `--notification-${v}-title-font-family` },
      { label: 'font size', canBeShared: true, groupKey: 'title-font-size', variable: `--notification-${v}-title-font-size` },
      { label: 'font weight', canBeShared: true, groupKey: 'title-font-weight', variable: `--notification-${v}-title-font-weight` },
      { label: 'line height', canBeShared: true, groupKey: 'title-line-height', variable: `--notification-${v}-title-line-height` },
      { label: 'font family', canBeShared: true, groupKey: 'text-font-family', variable: `--notification-${v}-text-font-family` },
      { label: 'font size', canBeShared: true, groupKey: 'text-font-size', variable: `--notification-${v}-text-font-size` },
      { label: 'font weight', canBeShared: true, groupKey: 'text-font-weight', variable: `--notification-${v}-text-font-weight` },
      { label: 'line height', canBeShared: true, groupKey: 'text-line-height', variable: `--notification-${v}-text-line-height` },
    ];
  }
  const allTokens: Token[] = variants.flatMap((v) => [...variantTokens(v), ...variantTypeGroupTokens(v)]);
  registerComponentSchema(component, allTokens);

  // Shared block surfaces shape and font props that may be linked across variants.
  const shareableContexts = new Map<string, string>(variants.flatMap((v) => [
    [`--notification-${v}-border-width`, v] as const,
    [`--notification-${v}-radius`, v] as const,
    [`--notification-${v}-padding`, v] as const,
    [`--notification-${v}-icon-size`, v] as const,
    [`--notification-${v}-title-font-family`, v] as const,
    [`--notification-${v}-title-font-size`, v] as const,
    [`--notification-${v}-title-font-weight`, v] as const,
    [`--notification-${v}-title-line-height`, v] as const,
    [`--notification-${v}-text-font-family`, v] as const,
    [`--notification-${v}-text-font-size`, v] as const,
    [`--notification-${v}-text-font-weight`, v] as const,
    [`--notification-${v}-text-line-height`, v] as const,
  ]));

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  let highlightedVars = new Set<string>();
  function handleTokenHover(e: CustomEvent<{ variable: string | null }>) {
    const v = e.detail.variable;
    if (!v) {
      highlightedVars = new Set();
      return;
    }
    const group = shared.groups.find((g) => g.variables.includes(v));
    highlightedVars = group ? new Set(group.variables) : new Set();
  }

  $: visibleVariantTokens = (v: Variant) => withSharedDisabled(variantTokens(v), shared.varSet);
  const allVariables = allTokens.map((t) => t.variable);

  function siblingsFor(toVariant: Variant) {
    return variants
      .filter((v) => v !== toVariant)
      .map((v) => ({
        name: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
        states: { [v]: variantTokens(v) },
        typeGroups: { [v]: variantTypeGroups(v) },
      }));
  }
</script>

<ComponentEditorBase {component} title="Notification" description="Contextual feedback notifications with multiple variants. Import from <code>components/Notification.svelte</code>" resetVariables={allVariables}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      {highlightedVars}
      sharedOrder={shared.sharedOrder}
      siblings={siblingsFor(v)}
      on:tokenhover={handleTokenHover}
    >
      {#if v === 'info'}
        <Notification variant="info" title="Information" description="This is an informational message to keep you updated." />
      {:else if v === 'success'}
        <Notification variant="success" title="Success" description="Your action was completed successfully." />
      {:else if v === 'warning'}
        <Notification variant="warning" title="Warning" description="Caution: This action may have unintended consequences." />
        <Notification variant="warning" title="Food Shortage" description="Your kingdom is running low on food supplies." impact="-2 to Economy until resolved" />
      {:else if v === 'danger'}
        <Notification variant="danger" title="Danger" description="Critical error: Please address this issue immediately." />
      {/if}
    </VariantGroup>
  {/each}
  <SharedBlock {component} {shared} {highlightedVars} on:tokenhover={handleTokenHover} on:change />
</ComponentEditorBase>
