# Component linkage audit

Working doc for revising linked property groups across all 14 component editors. Component order matches the editor sidebar (alphabetical by registry label).

Each section lists:
- **Linked groups** declared via `canBeLinked: true` + a shared `groupKey`. Format: `` `groupKey` `` — *representative label* (N tokens, scope: …) — `[ ]` notes column for revisions.
- **Internal-only groupKeys** — present in the schema but not user-linkable (typically hidden sub-axes like `padding-top/right/bottom/left`).

Source: each editor's `allTokens` schema in `src/component-editor/<Name>Editor.svelte`. Linkage rules live in `src/component-editor/scaffolding/linkedBlock.ts`.

---

## Review candidates (zero linked groups)

These editors declare no `canBeLinked` tokens at all. Confirm whether that's intentional or a gap:

- [ ] **Dialog** — multi-part component (overlay/header/body/footer). Should structural parts share radius/padding?
- [ ] **Image** — likely fine, single-state.
- [ ] **Section Divider** — likely fine, single-state.
- [ ] **Tooltip** — single arrangement but multiple variants? Worth a second look.

---

## Button
File: `StandardButtonsEditor.svelte`

Linked groups:
- [ ] `border-width` — *border width* (18 tokens, scope: 6 variants × 3 states — primary/secondary/outline/success/danger/warning × default/hover/disabled)
- [ ] `radius` — *corner radius* (18 tokens, scope: 6 variants × 3 states)
- [ ] `padding` — *padding* (18 tokens, scope: 6 variants × 3 states)
- [ ] `font-family` — *font family* (6 tokens, scope: primary, secondary, outline, success, danger, warning)
- [ ] `font-size` — *font size* (6 tokens, scope: primary, secondary, outline, success, danger, warning)
- [ ] `font-weight` — *font weight* (6 tokens, scope: primary, secondary, outline, success, danger, warning)
- [ ] `font-line-height` — *font line height* (6 tokens, scope: primary, secondary, outline, success, danger, warning)

Notes:
- [ ] Shape properties (border-width/radius/padding) span all 18 variant×state combinations. Typography spans only the 6 variants (no per-state typography). Confirm this asymmetry is intentional.

Internal-only groupKeys: none.

---

## Card
File: `CardEditor.svelte`

Linked groups:
- [ ] `card-border-width` — *border width* (2 tokens, scope: default, hover)
- [ ] `card-radius` — *corner radius* (2 tokens, scope: default, hover)
- [ ] `card-header-padding` — *header padding* (2 tokens, scope: default, hover)
- [ ] `card-body-padding` — *body padding* (2 tokens, scope: default, hover)
- [ ] `card-shadow` — *card shadow* (2 tokens, scope: default, hover)
- [ ] `card-blur` — *background blur* (2 tokens, scope: default, hover)
- [ ] `card-title-font-family` — *font family* (2 tokens, scope: default, hover)
- [ ] `card-title-font-size` — *font size* (2 tokens, scope: default, hover)
- [ ] `card-title-font-weight` — *font weight* (2 tokens, scope: default, hover)
- [ ] `card-title-line-height` — *line height* (2 tokens, scope: default, hover)
- [ ] `card-body-font-family` — *font family* (2 tokens, scope: default, hover)
- [ ] `card-body-font-size` — *font size* (2 tokens, scope: default, hover)
- [ ] `card-body-font-weight` — *font weight* (2 tokens, scope: default, hover)
- [ ] `card-body-line-height` — *line height* (2 tokens, scope: default, hover)

Internal-only groupKeys: none.

---

## Collapsible Section
File: `CollapsibleSectionEditor.svelte`

Linked groups:
- [ ] `border-width` — *border width* (3 tokens, scope: default, hover, active)
- [ ] `radius` — *corner radius* (3 tokens, scope: default, hover, active)
- [ ] `padding` — *padding* (3 tokens, scope: default, hover, active)
- [ ] `icon-size` — *icon size* (3 tokens, scope: default, hover, active)
- [ ] `label-font-family` — *font family* (3 tokens, scope: default, hover, active)
- [ ] `label-font-size` — *font size* (3 tokens, scope: default, hover, active)
- [ ] `label-font-weight` — *font weight* (3 tokens, scope: default, hover, active)
- [ ] `label-line-height` — *line height* (3 tokens, scope: default, hover, active)

Internal-only groupKeys: none.

---

## Dialog
File: `DialogEditor.svelte`

Linked groups: **none declared.** No tokens carry `canBeLinked` or `groupKey`.

Notes:
- [ ] Dialog has structural parts (overlay/header/body/footer). Decide whether shared properties (e.g. radius, padding) across parts should link.

---

## Image
File: `ImageEditor.svelte`

Linked groups: **none declared.** No tokens carry `canBeLinked` or `groupKey`.

---

## Inline Edit Actions
File: `InlineEditActionsEditor.svelte`

Linked groups:
- [ ] `save-border-width` — *border width* (2 tokens, scope: save default, save hover)
- [ ] `save-radius` — *corner radius* (2 tokens, scope: save default, save hover)
- [ ] `save-padding` — *padding* (2 tokens, scope: save default, save hover)
- [ ] `save-icon-size` — *icon size* (2 tokens, scope: save default, save hover)
- [ ] `cancel-border-width` — *border width* (2 tokens, scope: cancel default, cancel hover)
- [ ] `cancel-radius` — *corner radius* (2 tokens, scope: cancel default, cancel hover)
- [ ] `cancel-padding` — *padding* (2 tokens, scope: cancel default, cancel hover)
- [ ] `cancel-icon-size` — *icon size* (2 tokens, scope: cancel default, cancel hover)

Notes:
- [ ] Save/cancel are split into separate groupKeys — save and cancel never link to each other. Review whether shape properties should unify across both buttons.

Internal-only groupKeys: none.

---

## Notification
File: `NotificationEditor.svelte`

Linked groups:
- [ ] `border-width` — *border width* (4 tokens, scope: info, success, warning, danger)
- [ ] `radius` — *corner radius* (4 tokens, scope: info, success, warning, danger)
- [ ] `padding` — *padding* (4 tokens, scope: info, success, warning, danger)
- [ ] `icon-size` — *icon size* (4 tokens, scope: info, success, warning, danger)
- [ ] `title-font-family` — *font family* (4 tokens, scope: info, success, warning, danger)
- [ ] `title-font-size` — *font size* (4 tokens, scope: info, success, warning, danger)
- [ ] `title-font-weight` — *font weight* (4 tokens, scope: info, success, warning, danger)
- [ ] `title-line-height` — *line height* (4 tokens, scope: info, success, warning, danger)
- [ ] `text-font-family` — *font family* (4 tokens, scope: info, success, warning, danger)
- [ ] `text-font-size` — *font size* (4 tokens, scope: info, success, warning, danger)
- [ ] `text-font-weight` — *font weight* (4 tokens, scope: info, success, warning, danger)
- [ ] `text-line-height` — *line height* (4 tokens, scope: info, success, warning, danger)

Internal-only groupKeys: none.

---

## Progress Bar
File: `ProgressBarEditor.svelte`

Linked groups:
- [ ] `track-border-width` — *track border width* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `radius` — *corner radius* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `track-height` — *track height* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `label-font-family` — *font family* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `label-font-size` — *font size* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `label-font-weight` — *font weight* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `label-line-height` — *line height* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `value-font-family` — *font family* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `value-font-size` — *font size* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `value-font-weight` — *font weight* (5 tokens, scope: primary, success, warning, danger, info)
- [ ] `value-line-height` — *line height* (5 tokens, scope: primary, success, warning, danger, info)

Internal-only groupKeys: none.

---

## Radio Button
File: `RadioButtonEditor.svelte`

Linked groups:
- [ ] `dot-border-color` — *border color* (3 tokens, scope: default, hover, active)
- [ ] `dot-border-width` — *border thickness* (3 tokens, scope: default, hover, active)
- [ ] `dot-fill` — *dot fill* (3 tokens, scope: default, hover, active)
- [ ] `label-font-family` — *font family* (3 tokens, scope: default, hover, active)
- [ ] `label-font-size` — *font size* (3 tokens, scope: default, hover, active)
- [ ] `label-font-weight` — *font weight* (3 tokens, scope: default, hover, active)
- [ ] `label-line-height` — *line height* (3 tokens, scope: default, hover, active)

Notes:
- [ ] `dot-border-color` is unusual — most components don't link colors. Verify this is intentional.

Internal-only groupKeys: none.

---

## Section Divider
File: `SectionDividerEditor.svelte`

Linked groups: **none declared.** No tokens carry `canBeLinked` or `groupKey`. Likely intentional — single arrangement.

---

## Segmented Control
File: `SegmentedControlEditor.svelte`

Linked groups:
- [ ] `divider-thickness` — *divider width* (1 token, scope: control bar)
- [ ] `divider-height` — *divider height* (1 token, scope: control bar)
- [ ] `bar-radius` — *corner radius* (1 token, scope: control bar)
- [ ] `border-width` — *border width* (1 token, scope: selected option)
- [ ] `selected-radius` — *corner radius* (1 token, scope: selected option)
- [ ] `option-text-font-family` — *font family* (4 tokens, scope: default, selected, hover, disabled)
- [ ] `option-text-font-size` — *font size* (4 tokens, scope: default, selected, hover, disabled)
- [ ] `option-text-font-weight` — *font weight* (4 tokens, scope: default, selected, hover, disabled)
- [ ] `option-text-font-line-height` — *font line height* (4 tokens, scope: default, selected, hover, disabled)

Notes:
- [ ] Single-token "linked" groups (divider-thickness, divider-height, bar-radius, border-width, selected-radius) form no actual sibling group — `computeLinkedBlock` requires ≥2 siblings. They render unlinked in the UI. Decide whether to drop `canBeLinked` on these or wire up a real sibling.
- [ ] `bar-radius` (control bar) and `selected-radius` (selected option) are both "corner radius" — should they unify into one linked group?

Internal-only groupKeys:
- `bar-padding`, `bar-padding-top`, `bar-padding-right`, `bar-padding-bottom`, `bar-padding-left` (parent + four hidden sub-axes; padding parent itself is not `canBeLinked`).

---

## Tab Bar
File: `TabBarEditor.svelte`

Linked groups:
- [ ] `tab-border-width` — *border width* (3 tokens, scope: default, hover, active)
- [ ] `tab-padding` — *padding* (3 tokens, scope: default, hover, active)
- [ ] `tab-icon-size` — *icon size* (3 tokens, scope: default, hover, active)
- [ ] `tab-font-family` — *font family* (3 tokens, scope: default, hover, active)
- [ ] `tab-font-size` — *font size* (3 tokens, scope: default, hover, active)
- [ ] `tab-font-weight` — *font weight* (3 tokens, scope: default, hover, active)
- [ ] `tab-line-height` — *line height* (3 tokens, scope: default, hover, active)

Notes:
- [ ] No `tab-radius` linked group — verify whether tabs have a corner radius and whether it should link.

Internal-only groupKeys: none.

---

## Tooltip
File: `TooltipEditor.svelte`

Linked groups: **none declared.** No tokens carry `canBeLinked` or `groupKey`.

Notes:
- [ ] Does Tooltip have variants (info/warning/etc.)? If so, this is likely a gap — shape and typography should probably link across variants the way Notification does.

---

## Trait Badge
File: `BadgeEditor.svelte`

Linked groups:
- [ ] `border-width` — *border width* (3 tokens, scope: info, accent, trait)
- [ ] `radius` — *corner radius* (3 tokens, scope: info, accent, trait)
- [ ] `padding` — *padding* (3 tokens, scope: info, accent, trait)
- [ ] `shadow` — *badge shadow* (3 tokens, scope: info, accent, trait)
- [ ] `font-family` — *font family* (3 tokens, scope: info, accent, trait)
- [ ] `font-size` — *font size* (3 tokens, scope: info, accent, trait)
- [ ] `font-weight` — *font weight* (3 tokens, scope: info, accent, trait)
- [ ] `line-height` — *line height* (3 tokens, scope: info, accent, trait)

Internal-only groupKeys: none.

---

## Cross-component consistency checklist

Patterns to look for when revising:

- [ ] **Shape trio** (border-width, radius, padding) — should link wherever a component has multiple variants or states. Currently linked in: Button, Card, Collapsible Section, Inline Edit Actions, Notification, Progress Bar, Tab Bar, Trait Badge.
- [ ] **Typography quad** (font-family, font-size, font-weight, line-height) — same pattern. Currently linked in all "shape trio" components above plus Radio Button.
- [ ] **GroupKey naming** — some editors prefix with the component slug (`card-border-width`, `tab-border-width`), others don't (`border-width`, `radius`). Pick a convention.
- [ ] **Single-token linked groups** — only present in Segmented Control. Either drop `canBeLinked` or expand the sibling set.
