<script lang="ts">
  import InlineEditActions from '../components/InlineEditActions.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'inlineeditactions';
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };

  // Two objects (save button, cancel button), each with default/hover states.
  // Within each button, link shape props (border-width, radius, padding, icon-size) across states.
  // Save and cancel are different objects, so they don't link to each other by default.
  const buttons = ['save', 'cancel'] as const;
  type Button = typeof buttons[number];
  function buttonStateTokens(btn: Button, state: 'default' | 'hover'): Token[] {
    return [
      { label: 'surface color', variable: `--inlineeditactions-${btn}-${state}-surface` },
      { label: 'text color', variable: `--inlineeditactions-${btn}-${state}-text` },
      { label: 'border color', variable: `--inlineeditactions-${btn}-${state}-border` },
      { label: 'border width', canBeShared: true, groupKey: `${btn}-border-width`, variable: `--inlineeditactions-${btn}-${state}-border-width` },
      { label: 'radius', canBeShared: true, groupKey: `${btn}-radius`, variable: `--inlineeditactions-${btn}-${state}-radius` },
      { label: 'padding', canBeShared: true, groupKey: `${btn}-padding`, variable: `--inlineeditactions-${btn}-${state}-padding` },
      { label: 'icon size', canBeShared: true, groupKey: `${btn}-icon-size`, variable: `--inlineeditactions-${btn}-${state}-icon-size` },
    ];
  }

  // Each button gets its own VariantGroup with its own default/hover states.
  function buttonStates(btn: Button): Record<string, Token[]> {
    return {
      default: buttonStateTokens(btn, 'default'),
      hover: buttonStateTokens(btn, 'hover'),
    };
  }
  const allTokens: Token[] = buttons.flatMap((b) => Object.values(buttonStates(b)).flat());
  registerComponentSchema(component, allTokens);

  // Shared block surfaces shape props per button (linked across default/hover within same button).
  const shareableContexts = new Map<string, string>(buttons.flatMap((btn) => [
    [`--inlineeditactions-${btn}-default-border-width`, btn] as const,
    [`--inlineeditactions-${btn}-default-radius`, btn] as const,
    [`--inlineeditactions-${btn}-default-padding`, btn] as const,
    [`--inlineeditactions-${btn}-default-icon-size`, btn] as const,
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

  $: visibleStatesByButton = (btn: Button) => Object.fromEntries(
    Object.entries(buttonStates(btn)).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = allTokens.map((t) => t.variable);
</script>

<ComponentEditorBase {component} title="Inline Edit Actions" description="Confirm/cancel button pair for inline editing. Import from <code>components/InlineEditActions.svelte</code>" resetVariables={allVariables}>
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
  {#each buttons as btn}
    <VariantGroup
      name={btn}
      title={btn === 'save' ? 'Save button' : 'Cancel button'}
      states={visibleStatesByButton(btn)}
      {component}
      {highlightedVars}
      sharedOrder={shared.sharedOrder}
      on:tokenhover={handleTokenHover}
      let:activeState
    >
      {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      <div class="inline-edit-demo-row">
        <span style="color: var(--text-secondary);">Editing value...</span>
        <InlineEditActions
          onSave={() => {}}
          onCancel={() => {}}
          class={forceClass}
        />
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .inline-edit-demo-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
</style>
