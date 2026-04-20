<script lang="ts">
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIRadiusSelector from '../../ui/UIRadiusSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UIDividerHeightSelector from '../../ui/UIDividerHeightSelector.svelte';
  import TypeEditor from './TypeEditor.svelte';
  import DividerEditor from './DividerEditor.svelte';

  type Token = { label: string; variable: string; canBeShared?: boolean; disabled?: boolean };

  type SimpleKind =
    | 'surface'
    | 'border'
    | 'border-width'
    | 'radius'
    | 'divider-width'
    | 'divider-height'
    | 'font-family'
    | 'font-weight'
    | 'extras';

  type SimpleEntry = { kind: SimpleKind; token: Token };
  type FontEntry = { kind: 'font'; color?: Token; family?: Token; weight?: Token };
  type DividerEntry = { kind: 'divider'; color?: Token; width?: Token; height?: Token };
  type Entry = SimpleEntry | FontEntry | DividerEntry;

  export let title: string = '';
  export let tokens: Token[];
  /** Forwarded to each selector; when set, writes persist through the editor store. */
  export let component: string | undefined = undefined;

  function isFontFamily(v: string): boolean {
    return v.endsWith('-font-family');
  }

  function isFontWeight(v: string): boolean {
    return v.endsWith('-font-weight');
  }

  function isRadius(v: string): boolean {
    return v.endsWith('-radius') || v.startsWith('--radius-');
  }

  function isBorderWidth(v: string): boolean {
    return v.endsWith('-border-width') || v.startsWith('--border-width-');
  }

  function isDividerWidth(v: string): boolean {
    return v.endsWith('-divider-width');
  }

  function isDividerHeight(v: string): boolean {
    return v.endsWith('-divider-height');
  }

  function isDividerColor(v: string): boolean {
    return v.endsWith('-divider-color');
  }

  function isBorder(v: string): boolean {
    return v.endsWith('-border') || v.startsWith('--border-');
  }

  function isSurface(v: string): boolean {
    return v.endsWith('-surface') || v.startsWith('--surface-');
  }

  function isTextColor(v: string): boolean {
    return v.endsWith('-text') || v.startsWith('--text-');
  }

  const orderRank: Record<SimpleKind, number> = {
    surface: 0,
    border: 1,
    'border-width': 2,
    radius: 3,
    'divider-width': 4,
    'divider-height': 5,
    extras: 6,
    // Font-family / font-weight never appear at the top level — they always
    // fold into a font group. Rank is unused but must satisfy the key set.
    'font-family': 7,
    'font-weight': 7,
  };

  function categorize(v: string, byVar: Map<string, Token>): SimpleKind | 'font-color' | 'divider-color' {
    if (isFontFamily(v)) return 'font-family';
    if (isFontWeight(v)) return 'font-weight';
    if (byVar.has(`${v}-font-family`) || byVar.has(`${v}-font-weight`)) return 'font-color';
    if (isTextColor(v)) return 'font-color';
    if (isRadius(v)) return 'radius';
    if (isDividerColor(v)) return 'divider-color';
    if (isDividerWidth(v)) return 'divider-width';
    if (isDividerHeight(v)) return 'divider-height';
    if (isBorderWidth(v)) return 'border-width';
    if (isBorder(v)) return 'border';
    if (isSurface(v)) return 'surface';
    return 'extras';
  }

  /** Given a divider-role token variable, derive the group's base prefix
   *  (e.g. `--segment-divider-color` → `--segment-divider`). */
  function dividerBase(v: string): string | null {
    if (isDividerColor(v)) return v.slice(0, -'-color'.length);
    if (isDividerWidth(v)) return v.slice(0, -'-width'.length);
    if (isDividerHeight(v)) return v.slice(0, -'-height'.length);
    return null;
  }

  function buildEntries(list: Token[]): Entry[] {
    const byVar = new Map<string, Token>(list.map((t) => [t.variable, t]));
    const consumed = new Set<string>();

    // Pass 1: identify font groups. A font-color token claims its matching
    // family/weight siblings (if present) into one group.
    const fontGroups: FontEntry[] = [];
    for (const token of list) {
      if (consumed.has(token.variable)) continue;
      const kind = categorize(token.variable, byVar);
      if (kind !== 'font-color') continue;
      const familyVar = `${token.variable}-font-family`;
      const weightVar = `${token.variable}-font-weight`;
      const family = byVar.get(familyVar);
      const weight = byVar.get(weightVar);
      fontGroups.push({ kind: 'font', color: token, family, weight });
      consumed.add(token.variable);
      if (family) consumed.add(familyVar);
      if (weight) consumed.add(weightVar);
    }

    // Pass 1b: identify divider groups. Any divider-role token (color, width,
    // height) claims its siblings sharing the same `*-divider` base prefix.
    const dividerGroups: DividerEntry[] = [];
    for (const token of list) {
      if (consumed.has(token.variable)) continue;
      const base = dividerBase(token.variable);
      if (!base) continue;
      const colorVar = `${base}-color`;
      const widthVar = `${base}-width`;
      const heightVar = `${base}-height`;
      const color = byVar.get(colorVar);
      const width = byVar.get(widthVar);
      const height = byVar.get(heightVar);
      dividerGroups.push({ kind: 'divider', color, width, height });
      if (color) consumed.add(colorVar);
      if (width) consumed.add(widthVar);
      if (height) consumed.add(heightVar);
    }

    // Pass 2: categorize the rest. Orphan family/weight fall through to their
    // own selectors so nothing is lost.
    const simple: SimpleEntry[] = [];
    for (const token of list) {
      if (consumed.has(token.variable)) continue;
      const kind = categorize(token.variable, byVar);
      // font-color / divider-color are handled above; anything left maps 1:1.
      const simpleKind: SimpleKind =
        kind === 'font-color' || kind === 'divider-color' ? 'extras' : kind;
      simple.push({ kind: simpleKind, token });
      consumed.add(token.variable);
    }

    // Stable sort by canonical rank; preserve declared order within a bucket.
    const indexed = simple.map((e, i) => ({ e, i }));
    indexed.sort((a, b) => orderRank[a.e.kind] - orderRank[b.e.kind] || a.i - b.i);

    return [...indexed.map((x) => x.e as Entry), ...fontGroups, ...dividerGroups];
  }

  $: entries = buildEntries(tokens);
  $: dividerOnly = entries.length === 1 && entries[0].kind === 'divider';
</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div class="token-grid">
    {#each entries as entry}
      {#if entry.kind === 'font'}
        <TypeEditor
          colorVariable={entry.color?.variable ?? ''}
          colorLabel={entry.color?.label ?? ''}
          familyVariable={entry.family?.variable}
          familyLabel={entry.family?.label}
          weightVariable={entry.weight?.variable}
          weightLabel={entry.weight?.label}
          {component}
          on:change
        />
      {:else if entry.kind === 'divider'}
        <DividerEditor
          colorVariable={entry.color?.variable}
          colorLabel={entry.color?.label}
          widthVariable={entry.width?.variable}
          widthLabel={entry.width?.label}
          heightVariable={entry.height?.variable}
          heightLabel={entry.height?.label}
          {component}
          on:change
        />
      {:else}
        {@const token = entry.token}
        {@const dis = token.disabled ?? false}
        <div class="token-entry">
          {#if entry.kind === 'radius'}
            <UIRadiusSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'border-width' || entry.kind === 'divider-width'}
            <UIBorderWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'divider-height'}
            <UIDividerHeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'font-family'}
            <UIFontFamilySelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'font-weight'}
            <UIFontWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else}
            <UIPaletteSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {/if}
          <span class="token-label">{token.label}</span>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .token-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .token-group-title {
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }

  .token-entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-label {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }
</style>
