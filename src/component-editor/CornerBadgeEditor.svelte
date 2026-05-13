<script context="module" lang="ts">
  import type { Token } from './scaffolding/types';
  import { badgeVariants } from '../components/Badge.svelte';

  export const component = 'cornerbadge';

  // One state per Badge variant. Each variant carries the same five tokens, and
  // every token has a role-specific groupKey so the LinkedBlock groups
  // "outer-radius" across variants (not against inner/h-axis/v-axis). Changing
  // a variant's outer corner radius propagates to the same role on every other
  // variant when linked; roles within a variant stay independent.
  function variantTokens(v: typeof badgeVariants[number]): Token[] {
    return [
      { label: 'offset from corner', canBeLinked: true, groupKey: 'margin', variable: `--corner-badge-${v}-margin` },
      { label: 'outer corner radius', canBeLinked: true, groupKey: 'outer-radius', variable: `--corner-badge-${v}-outer-radius` },
      { label: 'inner corner radius', canBeLinked: true, groupKey: 'inner-radius', variable: `--corner-badge-${v}-inner-radius` },
      { label: 'horizontal-axis radius', canBeLinked: true, groupKey: 'h-axis-radius', variable: `--corner-badge-${v}-h-axis-radius` },
      { label: 'vertical-axis radius', canBeLinked: true, groupKey: 'v-axis-radius', variable: `--corner-badge-${v}-v-axis-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--corner-badge-${v}-padding` },
      // Per-side overrides written by the UIPaddingSelector when the user splits
      // padding. Declared (hidden) so the schema sees them as siblings across
      // variants — `padding-top` on primary links to `padding-top` on accent, etc.
      // The themed-padding mixin in CornerBadge.svelte reads them via
      // `var(--corner-badge-${v}-padding-top, fallback)`; no `:root` default is
      // needed (test skips `hidden: true` tokens by design — see editorTokens.test.ts).
      { label: 'padding-top', canBeLinked: true, groupKey: 'padding-top', variable: `--corner-badge-${v}-padding-top`, hidden: true },
      { label: 'padding-right', canBeLinked: true, groupKey: 'padding-right', variable: `--corner-badge-${v}-padding-right`, hidden: true },
      { label: 'padding-bottom', canBeLinked: true, groupKey: 'padding-bottom', variable: `--corner-badge-${v}-padding-bottom`, hidden: true },
      { label: 'padding-left', canBeLinked: true, groupKey: 'padding-left', variable: `--corner-badge-${v}-padding-left`, hidden: true },
      { label: 'font family', canBeLinked: true, groupKey: 'text-font-family', variable: `--corner-badge-${v}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'text-font-size', variable: `--corner-badge-${v}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'text-font-weight', variable: `--corner-badge-${v}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'text-line-height', variable: `--corner-badge-${v}-text-line-height` },
    ];
  }
  const states: Record<string, Token[]> = Object.fromEntries(
    badgeVariants.map((v) => [v, variantTokens(v)]),
  );

  export const allTokens: Token[] = Object.values(states).flat();

  // Every linkable variable across variants — the LinkedBlock uses this to detect
  // when ≥2 variants currently agree on an alias for the same groupKey. Variant
  // name is the context label so the chart rows mirror the variant tab strip.
  const linkableContexts = new Map<string, string>(
    badgeVariants.flatMap((v) =>
      variantTokens(v)
        .filter((t) => t.canBeLinked)
        .map((t) => [t.variable, v] as [string, string]),
    ),
  );
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import CornerBadge, { type CornerAnchor } from '../components/CornerBadge.svelte';
  import type { BadgeVariant } from '../components/Badge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import UIRadioGroup from '../ui/UIRadioGroup.svelte';
  import UIPaletteSelector from '../ui/UIPaletteSelector.svelte';
  import { setCssVar } from '../lib/cssVarSync';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import demoImageUrl from '../assets/newspaper.webp';

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);
  $: visibleStates = Object.fromEntries(
    badgeVariants.map((v) => [v, withLinkedDisabled(variantTokens(v), linked.varSet)]),
  ) as Record<string, Token[]>;

  const bgVar = '--backdrop-cornerbadge-surface';

  onMount(() => {
    if (!document.documentElement.style.getPropertyValue(bgVar)) {
      setCssVar(bgVar, 'var(--surface-canvas)');
    }
  });

  let anchor: CornerAnchor = 'bottom-right';
  const anchorGrid: ReadonlyArray<{ value: CornerAnchor; icon: string; label: string }> = [
    { value: 'top-left',     icon: 'fas fa-arrow-up-left',     label: 'Top left' },
    { value: 'top-right',    icon: 'fas fa-arrow-up-right',    label: 'Top right' },
    { value: 'bottom-left',  icon: 'fas fa-arrow-down-left',   label: 'Bottom left' },
    { value: 'bottom-right', icon: 'fas fa-arrow-down-right',  label: 'Bottom right' },
  ];

  let variant: BadgeVariant = 'accent';
  const variantOptions = badgeVariants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<ComponentEditorBase {component} title="Corner Badge" description="Badge pinned flush to a corner of a positioned ancestor. Composes <code>Badge</code>; adds offset + inner-radius tokens. Import from <code>components/CornerBadge.svelte</code>" tokens={allTokens} {linked}>
  <svelte:fragment slot="config">
    <label class="backdrop-config">
      <span>Sample background</span>
      <div class="picker-slot">
        <UIPaletteSelector variable={bgVar} />
      </div>
    </label>
    <div class="control-row">
      <span>Anchor</span>
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
            on:click={() => (anchor = opt.value)}
          >
            <i class={opt.icon} aria-hidden="true"></i>
          </button>
        {/each}
      </div>
    </div>
    <div class="control-row">
      <span>Variant</span>
      <UIRadioGroup bind:value={variant} name="corner-badge-variant" options={variantOptions} />
    </div>
  </svelte:fragment>
  <VariantGroup name="cornerbadge" title="Corner Badge" states={visibleStates} {component}>
    <ShadowBackdrop mode="color" colorVariable={bgVar}>
      <div class="corner-stage-wrap">
        <div class="corner-stage">
          <img src={demoImageUrl} alt="" class="corner-stage-image" />
          <CornerBadge {variant} {anchor}>{variant.charAt(0).toUpperCase() + variant.slice(1)}</CornerBadge>
        </div>
      </div>
    </ShadowBackdrop>
  </VariantGroup>
</ComponentEditorBase>

<style>
  /* Center the stage in the backdrop so the smaller surface doesn't stretch full-width. */
  .corner-stage-wrap {
    display: grid;
    place-items: center;
  }

  /* Anchor parent for the preview — gives CornerBadge a positioned ancestor so it
     actually pins to a corner, and a visible surface so offset/radius are observable. */
  /* No overflow:hidden here — the badge needs to be able to extend past the stage
     (e.g. when the offset is 0 or negative). Rounded corners live on the image. */
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

  .control-row {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .backdrop-config {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
  }
  .picker-slot {
    min-width: 8rem;
  }
  .picker-slot :global(.ui-token-selector) {
    width: 100%;
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
    border: 1px solid var(--ui-border-subtle, rgba(255, 255, 255, 0.1));
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
    border-color: var(--ui-border-strong, rgba(255, 255, 255, 0.25));
  }
</style>
