<script lang="ts">
  import Button from '../components/Button.svelte';
  import Dialog from '../components/Dialog.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'dialog';
  let showDialog = false;
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

  // Frame-level tokens (the dialog box itself + overlay + header + body + footer + close icon).
  const frameStates: Record<string, Token[]> = {
    overlay: [
      { label: 'backdrop color', variable: '--dialog-overlay-surface' },
    ],
    dialog: [
      { label: 'surface color', variable: '--dialog-surface' },
      { label: 'border color', variable: '--dialog-border' },
      { label: 'border width', variable: '--dialog-border-width' },
      { label: 'radius', variable: '--dialog-radius' },
      { label: 'shadow', variable: '--dialog-shadow' },
    ],
    header: [
      { label: 'surface color', variable: '--dialog-header-surface' },
      { label: 'border color', variable: '--dialog-header-border' },
      { label: 'border width', variable: '--dialog-header-border-width' },
      { label: 'padding', variable: '--dialog-header-padding' },
      { label: 'close icon color', variable: '--dialog-close-icon' },
      { label: 'close icon size', variable: '--dialog-close-icon-size' },
    ],
    body: [
      { label: 'padding', variable: '--dialog-body-padding' },
    ],
    footer: [
      { label: 'border color', variable: '--dialog-footer-border' },
      { label: 'border width', variable: '--dialog-footer-border-width' },
      { label: 'padding', variable: '--dialog-footer-padding' },
    ],
  };

  const frameTypeGroups: Record<string, TypeGroupConfig[]> = {
    header: [{
      legend: 'title',
      colorVariable: '--dialog-title',
      familyVariable: '--dialog-title-font-family',
      sizeVariable: '--dialog-title-font-size',
      weightVariable: '--dialog-title-font-weight',
      lineHeightVariable: '--dialog-title-line-height',
    }],
  };
  const frameTypeGroupTokens: Token[] = [
    { label: 'font family', variable: '--dialog-title-font-family' },
    { label: 'font size', variable: '--dialog-title-font-size' },
    { label: 'font weight', variable: '--dialog-title-font-weight' },
    { label: 'line height', variable: '--dialog-title-line-height' },
  ];

  // Buttons (primary, secondary) — each with default + hover. Same-button cross-state linking.
  const btnObjects = ['primary', 'secondary'] as const;
  type Btn = typeof btnObjects[number];
  const btnStateNames = ['default', 'hover'] as const;
  type BtnState = typeof btnStateNames[number];
  function btnTokens(b: Btn, s: BtnState): Token[] {
    return [
      { label: 'surface color', variable: `--dialog-${b}-${s}-surface` },
      { label: 'text color', variable: `--dialog-${b}-${s}-text` },
      { label: 'border color', variable: `--dialog-${b}-${s}-border` },
      { label: 'border width', canBeShared: true, groupKey: `${b}-border-width`, variable: `--dialog-${b}-${s}-border-width` },
      { label: 'radius', canBeShared: true, groupKey: `${b}-radius`, variable: `--dialog-${b}-${s}-radius` },
      { label: 'padding', canBeShared: true, groupKey: `${b}-padding`, variable: `--dialog-${b}-${s}-padding` },
    ];
  }

  function btnStates(b: Btn): Record<string, Token[]> {
    return {
      default: btnTokens(b, 'default'),
      hover: btnTokens(b, 'hover'),
    };
  }
  const allTokens: Token[] = [
    ...Object.values(frameStates).flat(),
    ...frameTypeGroupTokens,
    ...btnObjects.flatMap((b) => Object.values(btnStates(b)).flat()),
  ];
  registerComponentSchema(component, allTokens);

  const shareableContexts = new Map<string, string>(btnObjects.flatMap((b) => [
    [`--dialog-${b}-default-border-width`, `${b} button`] as const,
    [`--dialog-${b}-default-radius`, `${b} button`] as const,
    [`--dialog-${b}-default-padding`, `${b} button`] as const,
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

  $: visibleBtnStates = (b: Btn) => Object.fromEntries(
    Object.entries(btnStates(b)).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = allTokens.map((t) => t.variable);
</script>

<ComponentEditorBase {component} title="Dialog" description="Modal dialog with focus management and slide-in animation. Import from <code>components/Dialog.svelte</code>" resetVariables={allVariables}>
  {#if shared.groups.length > 0}
    <FieldsetWrapper legend="shared">
      <TokenLayout
        tokens={shared.groups.map((g) => ({ ...g.token, disabled: !g.shared }))}
        {component}
        contexts={shared.contextsByVar}
        {highlightedVars}
        sharedOrder={shared.sharedOrder}
        isSharedBlock
        on:tokenhover={handleTokenHover}
        on:change
      />
    </FieldsetWrapper>
  {/if}

  <VariantGroup name="dialog" title="Dialog" states={frameStates} typeGroups={frameTypeGroups} {component}>
    <Button variant="secondary" icon="fas fa-external-link-alt" on:click={() => showDialog = true}>
      Open Dialog
    </Button>

    <Dialog
      bind:show={showDialog}
      title="Sample Dialog"
      confirmLabel="Save"
      cancelLabel="Cancel"
      on:confirm={() => showDialog = false}
    >
      <p style="color: var(--text-secondary); margin: 0;">This is the dialog body content. It supports any slotted content including forms, lists, or other components.</p>
    </Dialog>
  </VariantGroup>
  {#each btnObjects as b}
    <VariantGroup
      name={b}
      title={b === 'primary' ? 'Primary button' : 'Secondary button'}
      states={visibleBtnStates(b)}
      {component}
      {highlightedVars}
      sharedOrder={shared.sharedOrder}
      on:tokenhover={handleTokenHover}
    >
      <Button variant="secondary" icon="fas fa-external-link-alt" on:click={() => showDialog = true}>
        Open Dialog (preview {b} button)
      </Button>
    </VariantGroup>
  {/each}
</ComponentEditorBase>
