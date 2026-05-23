<!--
  Smoke-test editor for Stat. Uses ONLY public imports from
  @motion-proto/live-tokens and @motion-proto/live-tokens/component-editor
  so this file doubles as the proof that the public surface is complete
  enough for consumer-authored components. Excluded from the published
  tarball via package.json `files`.
-->
<script module lang="ts">
  import { buildSiblings, type Token } from '@motion-proto/live-tokens/component-editor';

  export const component = 'stat';
  const variants = ['primary', 'subtle'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover'] as const;
  type StateName = typeof stateNames[number];

  function variantStateTokens(v: Variant, s: StateName): Token[] {
    if (s === 'default') {
      return [
        { label: 'surface',           variable: `--stat-${v}-surface` },
        { label: 'border',            variable: `--stat-${v}-border` },
        { label: 'corner radius',     variable: `--stat-${v}-radius`,             canBeLinked: true, groupKey: 'radius' },
        { label: 'padding',           variable: `--stat-${v}-padding`,            canBeLinked: true, groupKey: 'padding' },
        { label: 'value text',        variable: `--stat-${v}-value-text` },
        { label: 'value font family', variable: `--stat-${v}-value-font-family`,  canBeLinked: true, groupKey: 'value-font-family' },
        { label: 'value font size',   variable: `--stat-${v}-value-font-size`,    canBeLinked: true, groupKey: 'value-font-size' },
        { label: 'value font weight', variable: `--stat-${v}-value-font-weight`,  canBeLinked: true, groupKey: 'value-font-weight' },
        { label: 'label text',        variable: `--stat-${v}-label-text` },
        { label: 'label font family', variable: `--stat-${v}-label-font-family`,  canBeLinked: true, groupKey: 'label-font-family' },
        { label: 'label font size',   variable: `--stat-${v}-label-font-size`,    canBeLinked: true, groupKey: 'label-font-size' },
      ];
    }
    return [
      { label: 'surface', variable: `--stat-${v}-hover-surface` },
    ];
  }

  function variantStates(v: Variant): Record<StateName, Token[]> {
    return Object.fromEntries(stateNames.map((s) => [s, variantStateTokens(v, s)])) as Record<StateName, Token[]>;
  }

  export const allTokens: Token[] = variants.flatMap((v) => Object.values(variantStates(v)).flat());

  const linkableContexts = new Map<string, string>([
    ['--stat-primary-radius', 'primary'],
    ['--stat-subtle-radius',  'subtle'],
    ['--stat-primary-padding','primary'],
    ['--stat-subtle-padding', 'subtle'],
    ['--stat-primary-value-font-family', 'primary'],
    ['--stat-subtle-value-font-family',  'subtle'],
    ['--stat-primary-value-font-size',   'primary'],
    ['--stat-subtle-value-font-size',    'subtle'],
    ['--stat-primary-value-font-weight', 'primary'],
    ['--stat-subtle-value-font-weight',  'subtle'],
    ['--stat-primary-label-font-family', 'primary'],
    ['--stat-subtle-label-font-family',  'subtle'],
    ['--stat-primary-label-font-size',   'primary'],
    ['--stat-subtle-label-font-size',    'subtle'],
  ]);

  const variantOptions = variants.map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
  }));
</script>

<script lang="ts">
  import {
    ComponentEditorBase,
    VariantGroup,
    computeLinkedBlock,
    withLinkedDisabled,
  } from '@motion-proto/live-tokens/component-editor';
  import { editorState } from '@motion-proto/live-tokens';
  import Stat from './Stat.svelte';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<StateName, Token[]>);
</script>

<ComponentEditorBase
  {component}
  title="Stat"
  description="A number above a label. Smoke-test custom component for the registerComponent() API."
  tokens={allTokens}
  {linked}
  variants={variantOptions}
>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      {component}
      siblings={buildSiblings(variants, v, variantStates)}
    >
      <div class="stat-preview">
        <Stat variant={v} value="248" label="Active users" />
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .stat-preview {
    display: flex;
    gap: var(--ui-space-16);
    padding: var(--ui-space-16);
  }
</style>
