# Extension: intrinsics

Some components expose **structural or display choices** that aren't token values: an alignment (start / center), an element's visibility (show / hide), a layout position. These ride a bespoke `<select>` or checkbox you author in an editor snippet, not the generic token grid, so they don't belong in `allTokens`. Toggle and most components have none. SectionDivider is the worked example (alignment, hairline position, eyebrow / description visibility).

An intrinsic still cascades through a CSS custom property with a default in the runtime `:global(:root)`. The trap: that default now lives in two places, the runtime `:global(:root)` AND the editor's read-back getter. When they disagree the control displays a state the page never renders, and a native `<select>` won't even fire `onchange` to write the "change" the user thinks they made. `:global(:root)` is the source of truth.

Declare intrinsics so the editor and the contract test stay honest:

1. **Runtime `:global(:root)`** carries the per-variant default like any other variable:

   ```css
   --mywidget-lg-align: start;
   --mywidget-lg-eyebrow-display: block;
   ```

2. **Editor `<script module>`** exports `intrinsics: IntrinsicSpec[]`, one entry per structural property, each `default` mirroring `:global(:root)` per variant:

   ```ts
   import type { IntrinsicSpec } from '@motion-proto/live-tokens/component-editor';

   export const intrinsics: IntrinsicSpec[] = [
     {
       key: 'align',
       variants: ['lg', 'md', 'sm'],
       variable: (v) => `--mywidget-${v}-align`,
       values: ['start', 'center'],
       default: { lg: 'start', md: 'start', sm: 'start' },
     },
   ];
   ```

3. **Read-back getters fall back to the spec default**, never a hard-coded constant. This is the rule that keeps the control's displayed default in step with what an unedited instance renders:

   ```ts
   const byKey = new Map(intrinsics.map((i) => [i.key, i]));
   function readIntrinsic(key: string, v: string): string {
     const spec = byKey.get(key)!;
     const raw = readLiteral(spec.variable(v)) ?? spec.default[v];   // store override, else runtime default
     return spec.normalize ? spec.normalize(raw) : raw;
   }
   function getAlign(v: string) {
     return readIntrinsic('align', v) === 'center' ? 'center' : 'start';
   }
   ```

   Writes go through `setComponentAlias(component, spec.variable(v), { kind: 'literal', value })` so the choice cascades to `:root` like any token.

4. **Pass `intrinsics` to `registerComponent`** so the contract test can see it:

   ```ts
   registerComponent({
     id: 'mywidget',
     // ...label, icon, sourceFile, editorComponent, schema...
     intrinsics: myWidgetIntrinsics,
   });
   ```

Use `normalize` only when two raw values render identically and the dropdown lists just one (SectionDivider folds `above-description` into `below-label`). Properties that look like intrinsics but aren't: preview-only props with no persistence (a size selector that only changes the demo), `setComponentConfig` editor metadata (Dialog's button variants), and token-valued selects (a control choosing between two tokens). None carry a duplicated runtime default, so none need an `IntrinsicSpec`.
