# Extension: linked siblings

Read this when your component has more than one variant and those variants share base properties (surface, radius, padding) that should move together. Toggle and SectionDivider have no linked tokens and skip all of it.

Toggle's tokens are flat per state. Most multi-variant components (Badge, Card, SegmentedControl) share base properties across variants and surface that equality via a *linked block*: one edit propagates to every variant, while per-variant properties stay independent. Five additions to the Toggle pattern; see `BadgeEditor.svelte` in `node_modules` for the full file.

1. **Mark linkable tokens** with `canBeLinked: true` + a `groupKey`. Peers sharing a `groupKey` form a link set across variants.

   ```ts
   function variantBaseTokens(v: Variant): Token[] {
     return [
       { label: 'padding',       canBeLinked: true, groupKey: 'padding', variable: `--badge-${v}-padding` },
       { label: 'corner radius', canBeLinked: true, groupKey: 'radius',  variable: `--badge-${v}-radius` },
     ];
   }
   // Colors omit canBeLinked. Per-variant by design.
   function variantColorTokens(v: Variant): Token[] {
     return [
       { label: 'surface color', groupKey: 'surface', variable: `--badge-${v}-surface` },
       { label: 'text color',    groupKey: 'text',    variable: `--badge-${v}-text` },
     ];
   }
   ```

2. **Build a `linkableContexts: Map<variable, contextLabel>`** in `<script module>`. The label (e.g. `"success base"`) is how the LinkageChart row identifies this variable. Plain literal Map, no helper needed.

   ```ts
   const linkableContexts = new Map<string, string>(
     variants.flatMap((v) =>
       variantBaseTokens(v)
         .filter((t) => t.canBeLinked)
         .map((t) => [t.variable, `${v} base`] as [string, string]),
     ),
   );
   ```

3. **Compute `linked` and mask currently-linked rows** out of per-state lists, so they render once inside the LinkedBlock instead of twice.

   ```ts
   import { editorState } from '@motion-proto/live-tokens';
   import { computeLinkedBlock, withLinkedDisabled, buildSiblings }
     from '@motion-proto/live-tokens/component-editor';

   let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
   let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
     Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
   ));
   ```

4. **Pass `{linked}` to `ComponentEditorBase`** so the LinkedBlock renders above the variant groups.

5. **Multi-variant editors iterate VariantGroups** with `buildSiblings` so cross-variant link rows resolve to their peers.

   ```svelte
   <ComponentEditorBase {component} title="Badge" tokens={allTokens} {linked} variants={variantOptions}>
     {#each variants as v}
       <VariantGroup
         name={v}
         title={v}
         states={visibleVariantStates(v)}
         {component}
         siblings={buildSiblings(variants, v, variantStates)}
       >
         ...preview snippet
       </VariantGroup>
     {/each}
   </ComponentEditorBase>
   ```

Single-variant components with multi-state linked tokens still set `canBeLinked` + `linkableContexts`, but skip `buildSiblings` and the `{#each}` loop. Components with no linked tokens (Toggle, SectionDivider) skip all five steps — `ComponentEditorBase` renders fine without a `{linked}` prop.
