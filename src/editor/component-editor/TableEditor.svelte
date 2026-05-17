<script module lang="ts">
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'table';

  // Border colors and widths are linkable across wrapper/header/row/column so
  // a user can lock "all lines on the table" to the same swatch + weight with
  // one move, then break out individual surfaces when needed. Every other
  // groupKey is slot-unique so header/cell/stripe stay independent — header bg
  // vs zebra stripe, header pad vs cell pad, header text vs cell text all
  // serve different visual roles. (Sharing a groupKey would silently declare
  // them as siblings without surfacing the link in the LinkedBlock.)
  const states: Record<string, Token[]> = {
    wrapper: [
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: '--table-default-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'width', variable: '--table-default-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--table-default-radius' },
      { label: 'table shadow', groupKey: 'shadow', variable: '--table-default-shadow' },
    ],
    header: [
      { label: 'surface color', groupKey: 'header-surface', variable: '--table-default-header-surface' },
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: '--table-default-header-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'width', variable: '--table-default-header-border-width' },
      { label: 'padding', groupKey: 'header-padding', variable: '--table-default-header-padding' },
    ],
    cell: [
      { label: 'padding', groupKey: 'cell-padding', variable: '--table-default-cell-padding' },
    ],
    row: [
      { label: 'divider color', canBeLinked: true, groupKey: 'border', variable: '--table-default-row-divider' },
      { label: 'divider width', canBeLinked: true, groupKey: 'width', variable: '--table-default-row-divider-width' },
      { label: 'stripe surface', groupKey: 'row-stripe-surface', variable: '--table-default-row-stripe-surface' },
    ],
    column: [
      { label: 'divider color', canBeLinked: true, groupKey: 'border', variable: '--table-default-column-divider' },
      { label: 'divider width', canBeLinked: true, groupKey: 'width', variable: '--table-default-column-divider-width' },
    ],
  };

  // State name is the context label so the LinkageChart rows read as
  // wrapper/header/row/column for each shared groupKey.
  const linkableContexts = new Map<string, string>(
    Object.entries(states).flatMap(([state, tokens]) =>
      tokens
        .filter((t) => t.canBeLinked)
        .map((t) => [t.variable, state] as [string, string]),
    ),
  );

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    header: [{
      legend: 'header text',
      colorVariable: '--table-default-header-text',
      familyVariable: '--table-default-header-font-family',
      sizeVariable: '--table-default-header-font-size',
      weightVariable: '--table-default-header-font-weight',
      lineHeightVariable: '--table-default-header-line-height',
    }],
    cell: [{
      legend: 'cell text',
      colorVariable: '--table-default-cell-text',
      familyVariable: '--table-default-cell-font-family',
      sizeVariable: '--table-default-cell-font-size',
      weightVariable: '--table-default-cell-font-weight',
      lineHeightVariable: '--table-default-cell-line-height',
    }],
  };
  // Slot-unique groupKeys keep header text and cell text independent. The
  // generic `buildTypeGroupColorTokens` helper isn't used here because it
  // derives groupKey from the variable's last-dash suffix, which collapses
  // both `--table-...-header-text` and `--table-...-cell-text` onto a shared
  // `text` groupKey — phantom-linking the two slots.
  const typeGroupColorTokens: Token[] = [
    { label: 'color', groupKey: 'header-text', variable: '--table-default-header-text' },
    { label: 'color', groupKey: 'cell-text', variable: '--table-default-cell-text' },
  ];
  const typeGroupTokens: Token[] = [
    { label: 'font family', groupKey: 'header-font-family', variable: '--table-default-header-font-family' },
    { label: 'font size', groupKey: 'header-font-size', variable: '--table-default-header-font-size' },
    { label: 'font weight', groupKey: 'header-font-weight', variable: '--table-default-header-font-weight' },
    { label: 'line height', groupKey: 'header-line-height', variable: '--table-default-header-line-height' },
    { label: 'font family', groupKey: 'cell-font-family', variable: '--table-default-cell-font-family' },
    { label: 'font size', groupKey: 'cell-font-size', variable: '--table-default-cell-font-size' },
    { label: 'font weight', groupKey: 'cell-font-weight', variable: '--table-default-cell-font-weight' },
    { label: 'line height', groupKey: 'cell-line-height', variable: '--table-default-cell-line-height' },
  ];

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...typeGroupColorTokens,
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import Table from '../components/Table.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([state, tokens]) => [state, withLinkedDisabled(tokens, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Table" description="Styled wrapper around <code>&lt;table&gt;</code> with horizontal scroll on narrow viewports. Import from <code>components/Table.svelte</code>" tokens={allTokens} {linked}>
  <VariantGroup name="table" title="Table" states={visibleStates} {typeGroups} {component}>
    <Table>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Yield</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Farmland</td><td>2 Food</td><td>I</td></tr>
          <tr><td>Quarry</td><td>1 Stone</td><td>II</td></tr>
          <tr><td>Mine</td><td>1 Ore</td><td>II</td></tr>
          <tr><td>Forest</td><td>2 Lumber</td><td>I</td></tr>
        </tbody>
      </table>
    </Table>
  </VariantGroup>
</ComponentEditorBase>
