<script module lang="ts">
  import type { Token } from './scaffolding/types';
  import { badgeVariants } from '../../system/components/Badge.svelte';

  export const component = 'cornerbadge';
  type Variant = typeof badgeVariants[number];

  // Shape, spacing, type — uniform across variants, one flat token set.
  // Authored from any variant's panel; edits write the same flat keys.
  const baseTokens: Token[] = [
    { label: 'offset from corner', canBeLinked: true, groupKey: 'margin', variable: '--corner-badge-margin', element: 'frame' },
    { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: '--corner-badge-padding', element: 'frame' },
    { label: 'padding-top', canBeLinked: true, groupKey: 'padding-top', variable: '--corner-badge-padding-top', hidden: true, element: 'frame' },
    { label: 'padding-right', canBeLinked: true, groupKey: 'padding-right', variable: '--corner-badge-padding-right', hidden: true, element: 'frame' },
    { label: 'padding-bottom', canBeLinked: true, groupKey: 'padding-bottom', variable: '--corner-badge-padding-bottom', hidden: true, element: 'frame' },
    { label: 'padding-left', canBeLinked: true, groupKey: 'padding-left', variable: '--corner-badge-padding-left', hidden: true, element: 'frame' },
    { label: 'outer corner radius', canBeLinked: true, groupKey: 'outer-radius', variable: '--corner-badge-outer-radius', element: 'frame' },
    { label: 'inner corner radius', canBeLinked: true, groupKey: 'inner-radius', variable: '--corner-badge-inner-radius', element: 'frame' },
    { label: 'horizontal-axis radius', canBeLinked: true, groupKey: 'h-axis-radius', variable: '--corner-badge-h-axis-radius', element: 'frame' },
    { label: 'vertical-axis radius', canBeLinked: true, groupKey: 'v-axis-radius', variable: '--corner-badge-v-axis-radius', element: 'frame' },
    { label: 'font family', canBeLinked: true, groupKey: 'text-font-family', variable: '--corner-badge-text-font-family', element: 'text' },
    { label: 'font size', canBeLinked: true, groupKey: 'text-font-size', variable: '--corner-badge-text-font-size', element: 'text' },
    { label: 'font weight', canBeLinked: true, groupKey: 'text-font-weight', variable: '--corner-badge-text-font-weight', element: 'text' },
    { label: 'line height', canBeLinked: true, groupKey: 'text-line-height', variable: '--corner-badge-text-line-height', element: 'text' },
  ];

  // Per-variant color slots — surface, border, text — rebind the inner Badge's
  // colors inside .corner-badge-{v} scope.
  function variantColorTokens(v: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--corner-badge-${v}-surface` },
      { label: 'border color', groupKey: 'border', variable: `--corner-badge-${v}-border` },
      { label: 'text color', groupKey: 'text', variable: `--corner-badge-${v}-text` },
    ];
  }

  function variantStates(v: Variant): Record<string, Token[]> {
    return { base: baseTokens, colors: variantColorTokens(v) };
  }

  export const allTokens: Token[] = [
    ...baseTokens,
    ...badgeVariants.flatMap((v) => variantColorTokens(v)),
  ];

  const variantOptions = badgeVariants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import CornerBadge, { type CornerAnchor } from '../../system/components/CornerBadge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { buildSiblings } from './scaffolding/siblings';
  import demoImageUrl from '../../system/assets/newspaper.webp';

  let anchor: CornerAnchor = $state('bottom-right');

  const anchorGrid: ReadonlyArray<{ value: CornerAnchor; icon: string; label: string }> = [
    { value: 'top-left',     icon: 'fas fa-arrow-up-left',     label: 'Top left' },
    { value: 'top-right',    icon: 'fas fa-arrow-up-right',    label: 'Top right' },
    { value: 'bottom-left',  icon: 'fas fa-arrow-down-left',   label: 'Bottom left' },
    { value: 'bottom-right', icon: 'fas fa-arrow-down-right',  label: 'Bottom right' },
  ];
</script>

<ComponentEditorBase
  {component}
  title="Corner Badge"
  description="Badge pinned flush to a corner of a positioned ancestor. Composes <code>Badge</code>; carries its own per-variant color tokens that override the inner Badge inside the corner scope."
  tokens={allTokens}
  variants={variantOptions}
>
  {#each badgeVariants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={variantStates(v)}
      {component}
      siblings={buildSiblings(badgeVariants, v, variantStates)}
    >
      {#snippet canvasToolbarExtras()}
        <span class="canvas-toolbar-eyebrow">Anchor</span>
        <div class="anchor-grid" role="radiogroup" aria-label="Corner badge anchor">
          {#each anchorGrid as opt (opt.value)}
            <button
              type="button"
              class="anchor-btn"
              class:checked={anchor === opt.value}
              role="radio"
              aria-checked={anchor === opt.value}
              aria-label={opt.label}
              title={opt.label}
              onclick={() => (anchor = opt.value)}
            >
              <i class={opt.icon} aria-hidden="true"></i>
            </button>
          {/each}
        </div>
      {/snippet}
      <div class="corner-stage-wrap">
        <div class="corner-stage">
          <img src={demoImageUrl} alt="" class="corner-stage-image" />
          <CornerBadge variant={v} {anchor}>{v.charAt(0).toUpperCase() + v.slice(1)}</CornerBadge>
        </div>
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  /* Center stage so it doesn't stretch full-width. */
  .corner-stage-wrap {
    display: grid;
    place-items: center;
  }

  /* Positioned ancestor for CornerBadge; no overflow:hidden so badge can extend past edges. */
  .corner-stage {
    position: relative;
    width: 380px;
  }

  .corner-stage-image {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--ui-radius-md);
  }

  .anchor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1.5rem);
    grid-template-rows: repeat(2, 1.5rem);
    gap: 2px;
  }
  .anchor-btn {
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--ui-border-low, rgba(255, 255, 255, 0.1));
    border-radius: var(--ui-radius-sm);
    background: transparent;
    color: var(--ui-text-tertiary);
    cursor: pointer;
    font-size: 0.7rem;
    line-height: 1;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }
  .anchor-btn:hover {
    color: var(--ui-text-primary);
  }
  .anchor-btn.checked {
    background: var(--ui-surface-active, rgba(255, 255, 255, 0.12));
    color: var(--ui-text-primary);
    border-color: var(--ui-border-higher, rgba(255, 255, 255, 0.25));
  }
</style>
