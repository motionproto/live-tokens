# Token naming

Every editable property in Live Tokens is a CSS custom property.
This page is the short version of the naming rules. Follow them and
the editor will pick up your component without bespoke wiring.

## The pattern

```
--<componentId>-<part>[-<state>][-<element>]-<property>
```

- **`componentId`**: the lowercase id you pass to
  `registerComponent()`. The runtime filename matches:
  `MyWidget.svelte` has id `mywidget`. No abbreviations.
- **`part`**: which sub-region. Examples: `bar`, `option`, `track`,
  `header`, `body`, `footer`, `overlay`, `value`, `label`.
- **`state`** (optional): interaction or component state. `hover`,
  `disabled`, `selected`, `focus`. Always before the property.
- **`element`** (optional): a sub-element inside a part. `dot`,
  `icon`, `label`, `text`.
- **`property`**: always last. Either a theme role (`surface`,
  `border`, `text`, `icon`, `fill`) or a CSS property name
  (`radius`, `padding`, `font-family`, `font-weight`, `font-size`).

## State order matters

```
--mywidget-button-hover-surface   ✓  state before property
--mywidget-button-surface-hover   ✗  breaks sibling matching, reads oddly
```

The editor groups siblings by the final property segment. Putting
state after the property would put `-hover` into the property group
and the linked-block would silently merge unrelated states.

## Default values reference theme tokens

```
--mywidget-primary-surface: var(--surface-primary);   ✓  re-pointable
--mywidget-primary-surface: #6a4ce8;                  ✗  raw value, frozen
```

The editor lets users repoint each component slot to any theme token.
That only works if the slot's default *is* a theme token reference.

## Property suffix vocabulary

| Suffix          | Meaning |
|-----------------|---------|
| `-surface`      | Fill or background colour |
| `-border`       | Border colour |
| `-text`         | Text colour |
| `-icon`         | Icon colour |
| `-label`        | Label text colour |
| `-fill`         | Inner fill (distinct from outer surface) |
| `-radius`       | Corner radius |
| `-border-width` | Stroke thickness |
| `-padding`      | Padding |
| `-font-family`  | Font family reference |
| `-font-weight`  | Font weight reference |
| `-font-size`    | Font size reference |
| `-thickness`    | Alternative to `-width` when fallback siblings would collide |

The editor infers the right picker (colour picker, radius slider,
font menu, etc.) from the suffix. Mis-naming gives the wrong picker.

## No abbreviations

- `bg` ✗ → `surface` ✓
- `fg` ✗ → `text` ✓
- Component ids never abbreviated: `segmentedcontrol` not `sc`,
  `mywidget` not `mw`.

## Text scale

Two text-token families:

- **Neutral text scale**: `--text-primary`, `--text-secondary`,
  `--text-tertiary`, `--text-muted`, `--text-disabled`. The default
  for body copy and labels.
- **Family-tinted text**: `--text-brand`, `--text-accent`,
  `--text-success`, etc. For text that should pick up a colour family.

There is no `--text-neutral`. Neutral text is `--text-primary`.

## Sibling linking

Two tokens with the same `groupKey` form a linked sibling set. The
editor shows a single link toggle that broadcasts one value to every
sibling.

```ts
// in your editor's <script module>
const allTokens: Token[] = [
  { label: 'corner radius', variable: `--mywidget-primary-radius`,
    canBeLinked: true, groupKey: 'radius' },
  { label: 'corner radius', variable: `--mywidget-subtle-radius`,
    canBeLinked: true, groupKey: 'radius' },
];
```

With `groupKey: 'radius'` on both, editing one updates both.

For multi-slot typography (e.g. a component with both `value` and
`label` slots), the `groupKey` must include the slot prefix:

```
groupKey: 'value-font-family', 'label-font-family'   ✓  separate
groupKey: 'font-family'                              ✗  silently merged
```

**Linkage is dev-declared, not user-editable.** You author it when
you build the component. Users can opt *out* of an existing link
per-property, but they cannot add or reshape links from the UI.

## State model

- **Component states**: `default`, `selected`, `disabled`. Mutually
  exclusive. One fieldset per component state in the editor.
- **Interaction states**: `default`, `hover`. Layer on top of
  component states. Apply to anything pointer-interactive.
- **Disabled is terminal.** No hover on disabled. The `disabled`
  fieldset is flat: no interaction-state selector.
- **`selected-disabled` is impossible.** Don't author tokens for it.

Token consequences:

```
--mywidget-disabled-surface           ✓  component-state-level
--mywidget-option-hover-surface       ✓  default state, hover interaction
--mywidget-selected-hover-surface     ✓  selected state, hover interaction
--mywidget-selected-disabled-text     ✗  selected-disabled doesn't exist
--mywidget-option-disabled-surface    ✗  implies disabled is an interaction
```

## Parts vs states

A component's structural sub-regions are *parts*, not states.
Dialog's `overlay`, `header`, `body`, `footer` are parts. All
present at once. Use them as the `part` segment of the name:

```
--dialog-overlay-surface       ✓
--dialog-header-surface        ✓
--dialog-body-padding          ✓
```

Do not label parts as states in the editor UI. The component-system
reference chapter has the full state-model invariants.

## Where to go next

- [Creating components](creating-components.md): how to use this in a new
  component, with the Claude skill or manually.
- For the comprehensive list of theme-side categories, scale shapes,
  and edge cases, see `src/system/styles/CONVENTIONS.md` in the
  package.
