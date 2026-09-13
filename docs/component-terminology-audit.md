# Component terminology audit

Measured on 2026-09-13 at a823f7b, after the catalogue entry plan and its
follow-up. The rule under test is the one `docs/terminology.md` states: one
concept, one word, across the components, the editor, the CLI, and the
skills. Three layers were read for every shipped component: the catalogue
entry, the `Props` interface with its value unions, and the semantic
properties declared in `:global(:root)`. The census script tabulated each
property's prefix, its part segments, its state segments, and its kind
suffix; the props and the entries were read by hand.

Each finding carries a proposal and a cost class. The proposals are for
discussion. Nothing in this document is decided, and no rename lands until a
plan names it.

`src/editor/core/components/aliasKinds.ts` is the map of the drift. Every
synonym its suffix lists accept is a name that could be unified, after which
that spelling can be deleted from the list. A picker that needs no synonym
list is the definition of done for the property layer.

## Cost classes

| Class | What a rename touches |
|---|---|
| **Text** | One catalogue sentence. A changelog line. |
| **Prop** | A public prop name or value. A `### Changed (breaking)` changelog entry, the create-component skill where it states the convention, and every consumer call site. Pre-1.0, so no migration. |
| **Property** | A semantic property name. The runtime file, the editor's `allTokens`, the shipped config through `sync:component-defaults`, the nine preset themes, a theme-file migration in `src/editor/core/themes/migrations/` (precedent: `2026-09-07-stroke-role-renames.ts`), the contract tests, and the `aliasKinds.ts` suffix that then goes. |

## Words with two senses

The most expensive class of drift: a reader who learned the word on one
component reads it wrong on the next.

### primary

| Component | Sense |
|---|---|
| Button, IconButton | emphasis: the one primary action per page |
| Badge, CornerBadge | the brand color family; the token is `--surface-brand` |
| the text scale | a level: `--text-primary`, `--text-secondary`, `--text-tertiary` |

**Proposal.** Keep the first and the third; both are conventions a reader
brings in. Rename the Badge and CornerBadge variant `primary` to `brand`, so
the variant says what its token says. Cost: Prop and Property
(`--badge-primary-*`, `--corner-badge-primary-*`).

### active

| Component | Sense |
|---|---|
| Button, IconButton | pressed, from `:active` |
| RadioButton (prop and properties), TabBar, SideNavigation | selected |
| MenuSelect, SegmentedControl | selected, already named `selected` |

**Proposal.** `selected` wherever the word means selection: RadioButton's
prop `active` becomes `selected`, and the `-active-` segment becomes
`-selected-` in RadioButton, TabBar, and SideNavigation. `active` survives
as the pressed interaction state only, and the terminology doc's interaction
states row gains it. Cost: Prop (RadioButton) and Property (three
components).

### accent

| Component | Sense |
|---|---|
| Badge, CornerBadge | the accent color family |
| SideNavigation | the bar beside the current item: `--sidenavigation-item-active-accent` |
| Callout | the stripe on the leading edge: `--callout-info-accent-width` |

**Proposal.** The bar and the stripe are indicators, the word MenuSelect and
TabBar already use (`--menuselect-selected-indicator`,
`--tabbar-*-indicator`). `-accent` becomes `-indicator` and `-accent-width`
becomes `-indicator-width` in SideNavigation and Callout; `aliasKinds.ts`
already reads `-indicator-width` as the same kind. Cost: Property (two
components).

### The graphic line and its width

| Name in use | Components |
|---|---|
| `-divider` for the line | Dialog, Table, TabBar, SegmentedControl |
| `-hairline` for the line | SectionDivider |
| both in one name | CollapsibleSection: `--collapsiblesection-divider-default-hairline-thickness` |
| `-thickness` for the width | CollapsibleSection, SectionDivider, SegmentedControl, TabBar (eight names) |
| `-border-width` for the width | twenty-five components |

`aliasKinds.ts` reads `-divider-width`, `-divider-thickness`,
`-hairline-thickness`, and `-thickness` as one kind.

**Proposal.** One part, hairline, the term the terminology doc defines, and
one kind for its width. `-divider` becomes `-hairline` and every `-thickness`
becomes `-hairline-width`. The kind names `divider-width`, `divider-height`,
and `divider-inset` in `aliasKinds.ts` become `hairline-*`. The word
"divider" then names the SectionDivider component only. CollapsibleSection's
variant value `divider` is a separate Prop decision: it names the variant by
its line, and `hairline` would keep that reading. Cost: Property (six
components) and, if the variant renames, Prop.

### panel

TabBar's entry says "two to seven panels the reader moves between" and
SideNavigation's says "switching panels inside one page (TabBar)", while
Panel is a component.

**Proposal.** "views", the word SegmentedControl's entry already uses for the
same thing ("one view of the same data"). Cost: Text.

### hint

Tooltip's entry is "A hint that appears on an element on hover or focus" and
Callout's says "a hint that hangs off one element (Tooltip)". Input has a
`hint` prop and a `--input-hint` property for the line under the field.

**Proposal.** Keep Input's `hint`; it is the field's helper line in every
form library a consumer knows. Tooltip becomes "a note": "A short note that
appears on an element on hover or focus", and Callout's line follows. Cost:
Text.

### default

Four uses: a variant value on Card and Image, a size value on five
components, the rest-state segment in nine token sets, and the prefix
`--table-default-*` on Table.

**Proposal.** Keep all four. The rest state and the variant are the
conventions every component reads by. Table's editor declares
`variants: ['default']`, so its segment is the variant model at work rather
than a stray word; removing it means teaching the model a component with no
variant, which is a larger change than this audit proposes. Cost: none.

## Prop splits

| Axis | Spellings in use | Proposal | Cost |
|---|---|---|---|
| size values | `default \| small` on Badge, Button, IconButton, CornerBadge, SegmentedControl; `default \| compact` on Card; `normal \| compact` on Notification | `default \| small` on all seven. Card and Notification carry no `-compact-` properties, so the rename is the prop and its CSS class. | Prop |
| open state | `show` on Dialog; `open` on Tooltip and SideNavigation; `expanded` on CollapsibleSection, with `-expanded-` properties | `open` everywhere. CollapsibleSection's `-expanded-` segment becomes `-open-`. | Prop and Property |
| selection | `checked` on Toggle; `active` on RadioButton; `selectedTab` on TabBar; `value` on SegmentedControl, MenuSelect, Slider | `checked` stays: it is the native checkbox word. RadioButton takes `selected` (above). TabBar's `selectedTab` becomes `value`, matching SegmentedControl and MenuSelect, which hold the same kind of id. | Prop |
| callback casing | `ontabChange` on TabBar; `onSave`, `onCancel` on InlineEditActions; lowercase `onclick`, `onchange`, `oninput`, `ontoggle`, `onclose`, `ondismiss`, `onrangechange` elsewhere | Lowercase `on` plus the event: `onchange`, `onsave`, `oncancel`. The create-component skill records the rule. | Prop |
| main text | `label` on Callout, CollapsibleSection, Input, ProgressBar, RadioButton, Slider, Toggle; `title` on Card, Dialog, Notification, SectionDivider; `text` on Tooltip; `titleLabel` on SideNavigation | The split is a rule once stated: `label` names a control, `title` heads content, `text` is body copy. Only `titleLabel` falls outside it; it becomes `title`. | Prop (one) |
| secondary text | `description` on Notification and SectionDivider; `hint` on Input; a `summary` snippet on CollapsibleSection | Keep. A description sits under a title, a hint under a field, a summary beside a header. Record the three. | none |
| no chrome | `bare` on Card drops the header; `chromeless` on CollapsibleSection drops the frame | Keep. They remove different parts, and one word would hide that. Record both. | none |
| size naming | Image `banner \| medium \| compact` by role and adjective; SectionDivider `lg \| md \| sm` by scale step | Keep. `banner` is a role, and the two heights below it are named to read beside it. Record the rule: a step name where only size differs, a role name where the value means something. | none |
| editor preview hooks | `forceHover` on Image; `forceHoverValue` on MenuSelect and SegmentedControl; `forceHoverPart` and `forceActivePart` on SideNavigation; `forceFocus` on Input; a `class="force-hover"` convention on CodeSnippet, Slider, Toggle | One convention, later. A `force*` prop is visible API; the class is invisible. Replacing the class with a `forceHover` boolean on the three touches the editor previews and the contract tests, so it is its own plan. | Prop, deferred |
| hover intrinsics | `hoverTint` on six; `hover` on Card; `zoom` on Image | Keep. Each names its effect: a wash, a border and shadow, a scale. Record the rule: an interaction intrinsic is named for what it does. | none |

## Semantic property splits

### Prefix

CornerBadge declares `--corner-badge-*` for the id `cornerbadge`. Every
other prefix is the id verbatim, and the create-component skill states that
rule for the id. **Proposal.** `--cornerbadge-*`. Cost: Property (forty
names).

### The color of a text part

Two forms name the same thing:

| Form | Examples |
|---|---|
| the bare part | `--card-default-title`, `--callout-info-label`, `--dialog-body`, `--input-hint`, `--input-error`, `--progressbar-value`, `--sectiondivider-md-description`, `--sectiondivider-md-eyebrow` |
| the part plus `-text` | `--toggle-label-text`, `--toggle-disabled-label-text`, `--sidenavigation-item-default-text` |

`aliasKinds.ts` lists nine bare part names under text-color, beside `-text` and `-icon`, to make the
first form work.

**Proposal.** The bare part is the color, and `-font-*` are its type; that
is the majority form and it reads well. Toggle's `-label-text` becomes
`-label`. The rule goes in the terminology doc, and the bare names stay in
the picker's list as the rule rather than as fallbacks. Cost: Property
(Toggle).

### Fill

SectionDivider says `-background` (three names) where twenty-three
components say `-surface`. **Proposal.** `-surface`. Cost: Property
(SectionDivider).

### The main text part across components

`-text` on eleven components, `-label` on eight, `-title` on five. Read
against the prop rule above, the split resolves: `-text` is the text of a
control the reader presses (Button, Badge, TabBar's tab, SegmentedControl's
option, MenuSelect's item), `-label` is text beside a control (Toggle,
Slider, Input, RadioButton, ProgressBar) or a header's text
(CollapsibleSection), and `-title` heads content. No property falls outside
it. **Proposal.** Record the rule. Cost: none.

## Catalogue text

| Component | Now | Proposal |
|---|---|---|
| Panel | "a block of copy that reads as one region" | "a block of copy that forms one section" |
| CollapsibleSection | "`divider` rules a line under the header" | "`divider` draws a hairline under the header" |
| TabBar | "two to seven panels the reader moves between" | "two to seven views the reader moves between" |
| SideNavigation | "switching panels inside one page (TabBar)" | "switching views inside one page (TabBar)" |
| Tooltip | "A hint that appears on an element on hover or focus." | "A short note that appears on an element on hover or focus." |
| Callout | "a hint that hangs off one element (Tooltip)" | "a note that hangs off one element (Tooltip)" |
| Panel | "a modal surface (Dialog)" | "a modal window (Dialog)", matching Dialog's own description |

Cost: Text, one commit.

## Order of work

1. **Catalogue text.** The table above, one commit, no migration.
2. **Properties with two senses**, one word per commit, each with its
   migration and its `aliasKinds.ts` deletion: `active` to `selected`;
   `-divider` and `-thickness` to `-hairline` and `-hairline-width`;
   `-accent` to `-indicator`; `-background` to `-surface`;
   `--corner-badge-` to `--cornerbadge-`; Toggle `-label-text` to `-label`.
3. **Props**, one axis per commit, each a breaking changelog entry: callback
   casing; `open`; `size` values; `selectedTab` and `titleLabel`; Badge and
   CornerBadge `brand`.
4. **The rules**, recorded once each in `docs/terminology.md` and, where a
   consumer authors against them, in the create-component skill: label,
   title, and text; the bare part as its color; a step name against a role
   name; an intrinsic named for its effect; `active` as pressed only.

## Left as it is

The Button and text-scale senses of `primary`; `default` in all four uses;
`bare` beside `chromeless`; `description`, `hint`, and `summary`; Image's
variant names; `hoverTint`, `hover`, and `zoom`; and the preview hooks,
which wait for their own plan.
