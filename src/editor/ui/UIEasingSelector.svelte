<script lang="ts">
  import { resolveAliasChain } from '../core/palettes/tokenRegistry';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    onchange,
  }: Props = $props();

  /** Family list mirrors easings.net's catalog. `linear` is the special-case
      curve with no variant; all others take in/out/in-out. Keys are the suffix
      portion of the corresponding `--ease-*` token name. */
  const FAMILIES = [
    { key: 'linear', label: 'Linear' },
    { key: 'sine',    label: 'Sine' },
    { key: 'quad',    label: 'Quad' },
    { key: 'cubic',   label: 'Cubic' },
    { key: 'quart',   label: 'Quart' },
    { key: 'quint',   label: 'Quint' },
    { key: 'expo',    label: 'Expo' },
    { key: 'circ',    label: 'Circ' },
    { key: 'back',    label: 'Back' },
    { key: 'elastic', label: 'Elastic' },
    { key: 'bounce',  label: 'Bounce' },
  ] as const;
  type FamilyKey = typeof FAMILIES[number]['key'];

  const VARIANTS = [
    { key: 'in',     label: 'In' },
    { key: 'out',    label: 'Out' },
    { key: 'in-out', label: 'In-Out' },
  ] as const;
  type VariantKey = typeof VARIANTS[number]['key'];

  const FAMILY_KEYS = new Set<string>(FAMILIES.map((f) => f.key));
  const VARIANT_KEYS = new Set<string>(VARIANTS.map((v) => v.key));

  let selector: UITokenSelector;
  let chosenFamily: FamilyKey | null = $state(null);
  let chosenVariant: VariantKey | null = $state(null);
  let currentValue: string = $state('');

  /** Parse `--ease-linear` or `--ease-<variant>-<family>` into its parts.
      Returns nulls when the name doesn't match the ease-token convention. */
  function parseEaseToken(varName: string): { family: FamilyKey | null; variant: VariantKey | null } {
    if (varName === '--ease-linear') return { family: 'linear', variant: null };
    const m = varName.match(/^--ease-(in-out|in|out)-([a-z]+)$/);
    if (!m) return { family: null, variant: null };
    const variant = m[1] as VariantKey;
    const family = m[2] as FamilyKey;
    if (!FAMILY_KEYS.has(family) || family === 'linear') return { family: null, variant: null };
    if (!VARIANT_KEYS.has(variant)) return { family: null, variant: null };
    return { family, variant };
  }

  function buildEaseToken(family: FamilyKey, variant: VariantKey | null): string | null {
    if (family === 'linear') return '--ease-linear';
    if (!variant) return null;
    return `--ease-${variant}-${family}`;
  }

  /** Pull the var() reference out of `var(--ease-...)`, returns the inner name. */
  function parseRef(raw: string): string | null {
    const m = raw.match(/var\((--ease-[a-z-]+)\)/);
    return m ? m[1] : null;
  }

  function readResolved() {
    currentValue = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  function initFromCurrent() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    if (raw) {
      const inner = parseRef(raw);
      if (inner) {
        const parts = parseEaseToken(inner);
        chosenFamily = parts.family;
        chosenVariant = parts.variant;
        return;
      }
    }
    for (const alias of resolveAliasChain(variable)) {
      const parts = parseEaseToken(alias);
      if (parts.family) {
        chosenFamily = parts.family;
        chosenVariant = parts.variant;
        return;
      }
    }
    chosenFamily = null;
    chosenVariant = null;
  }

  function handleReset() {
    chosenFamily = null;
    chosenVariant = null;
    readResolved();
    onchange?.();
  }

  /** Commit (family, variant) — writes the override if both halves are valid;
      for non-linear families without a variant yet, defaults to `out`. Closes
      the dropdown only when a full token name was produced. */
  function commit(family: FamilyKey, variant: VariantKey | null, close: () => void): void {
    let v = variant;
    if (family !== 'linear' && !v) v = 'out';
    const target = buildEaseToken(family, v);
    if (!target) return;
    if (target === variable) {
      selector.writeOverride(null);
    } else {
      selector.writeOverride(target);
    }
    chosenFamily = family;
    chosenVariant = family === 'linear' ? null : v;
    readResolved();
    close();
    onchange?.();
  }

  function selectFamily(key: FamilyKey, close: () => void) {
    commit(key, chosenVariant, close);
  }
  function selectVariant(key: VariantKey, close: () => void) {
    if (!chosenFamily || chosenFamily === 'linear') return;
    commit(chosenFamily, key, close);
  }

  let lastSeenVariable: string | null = null;
  $effect(() => {
    if (variable !== lastSeenVariable) {
      lastSeenVariable = variable;
      initFromCurrent();
    }
  });

  let familyLabel = $derived(FAMILIES.find((f) => f.key === chosenFamily)?.label ?? '');
  let variantLabel = $derived(VARIANTS.find((v) => v.key === chosenVariant)?.label ?? '');
  let triggerTitleText = $derived(
    chosenFamily === 'linear'
      ? 'Linear'
      : chosenFamily && chosenVariant
      ? `${variantLabel} ${familyLabel}`
      : chosenFamily
      ? `${familyLabel} —`
      : '',
  );
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  dropdownMinWidth="18rem"
  onreset={handleReset}
  onvarChange={initFromCurrent}
>
  {#snippet triggerTitle()}{triggerTitleText}{/snippet}
  {#snippet triggerMeta()}{currentValue || '—'}{/snippet}

  {#snippet children({ close })}
    <div class="ease-grid" class:no-variants={chosenFamily === 'linear'}>
      <div class="ease-col">
        <span class="ease-col-label">Curve</span>
        <UIOptionList>
          {#each FAMILIES as fam (fam.key)}
            <UIOptionItem
              active={chosenFamily === fam.key}
              onclick={() => selectFamily(fam.key, close)}
            >
              {#snippet label()}{fam.label}{/snippet}
            </UIOptionItem>
          {/each}
        </UIOptionList>
      </div>
      {#if chosenFamily && chosenFamily !== 'linear'}
        <div class="ease-col">
          <span class="ease-col-label">Variant</span>
          <UIOptionList>
            {#each VARIANTS as v (v.key)}
              <UIOptionItem
                active={chosenVariant === v.key}
                onclick={() => selectVariant(v.key, close)}
              >
                {#snippet label()}{v.label}{/snippet}
              </UIOptionItem>
            {/each}
          </UIOptionList>
        </div>
      {/if}
    </div>
  {/snippet}
</UITokenSelector>

<style>
  .ease-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ui-space-8);
    min-width: 18rem;
  }
  .ease-grid.no-variants {
    grid-template-columns: 1fr;
  }
  .ease-col {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }
  .ease-col-label {
    padding: var(--ui-space-4) var(--ui-space-8) 0;
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
