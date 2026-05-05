<script lang="ts">
  /**
   * Shared inner block rendered inside a single state in VariantGroup.
   *
   * Both the tabs branch and the list branch of VariantGroup render the same
   * `<TypeEditor>` (when a state has type groups) followed by `<TokenLayout>`,
   * differing only in the surrounding chrome (preview placement, toggles,
   * tab strip). This component owns the duplicated inner block so a per-state
   * control change happens in exactly one place.
   */
  import TokenLayout from './TokenLayout.svelte';
  import TypeEditor from './TypeEditor.svelte';
  import type { Token, TypeGroupConfig } from './types';

  /** Tokens for this state, fed to `<TokenLayout>`. */
  export let tokens: Token[];
  /** Type groups for this state; rendered as a row of `<TypeEditor>` blocks. */
  export let typeGroups: TypeGroupConfig[] = [];
  /** Forwarded to TypeEditor and TokenLayout so writes persist through the editor store. */
  export let component: string | undefined = undefined;
  /** Per-variable rank passed through to TokenLayout for linked-block alignment. */
  export let linkedOrder: Map<string, number> | undefined = undefined;

  $: hasTypeGroups = typeGroups.length > 0;
</script>

<div class="state-controls" class:two-col={hasTypeGroups}>
  {#if hasTypeGroups}
    <div class="state-type-groups">
      {#each typeGroups as tg}
        <TypeEditor
          legend={tg.legend ?? 'type'}
          colorVariable={tg.colorVariable}
          colorLabel={tg.colorLabel ?? 'text color'}
          familyVariable={tg.familyVariable}
          familyLabel={tg.familyLabel ?? 'font family'}
          sizeVariable={tg.sizeVariable}
          sizeLabel={tg.sizeLabel ?? 'font size'}
          weightVariable={tg.weightVariable}
          weightLabel={tg.weightLabel ?? 'font weight'}
          lineHeightVariable={tg.lineHeightVariable}
          lineHeightLabel={tg.lineHeightLabel ?? 'line height'}
          {component}
          on:change
        />
      {/each}
    </div>
  {/if}
  <TokenLayout
    title=""
    {tokens}
    {component}
    {linkedOrder}
    on:change
  />
</div>

<style>
  .state-controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--ui-space-12);
    align-items: start;
    margin-top: var(--ui-space-4);
  }

  .state-controls.two-col {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16) var(--ui-space-16);
    align-items: flex-start;
    justify-content: flex-start;
  }

  .state-type-groups {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  /* Inside a state's two-col layout the fieldset frame is redundant with the
     surrounding state card. Flatten the border/padding but keep the legend so
     each block ("title", "body text", …) is identifiable. */
  .state-controls.two-col .state-type-groups :global(.fieldset-wrapper) {
    border: none;
    padding: 0;
  }

  .state-controls.two-col .state-type-groups :global(.fieldset-wrapper.active) {
    outline: none;
  }

  .state-controls.two-col .state-type-groups :global(.fieldset-legend) {
    padding: 0 var(--ui-space-4) var(--ui-space-4);
  }

  /* The general-properties column has no legend of its own; pad it down by
     one legend-line so its first row aligns with the first row of the
     adjacent type-group. */
  .state-controls.two-col > :global(.token-group) {
    padding-top: calc(var(--ui-font-size-xs) + var(--ui-space-4));
  }
</style>
