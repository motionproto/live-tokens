# Contrast pair inventory

Worksheet for `temp/contrast-checker-audit.md`. Four readers built it on 2026-10-09 from each editor file and its runtime component, read in full. Each table lists one row per panel that sets a foreground color. Line numbers match commit 59802c8.

### Button (ButtonEditor.svelte:19-34 base, :37-44 state colors, :49-51 outline active, :67-79 small, :216-233 tint/shimmer rows; Button.svelte:103-238 :root, :256-277 shimmer + hover tint, :292-502 variants, :510-528 small + icon)
Panels: variant strip primary/secondary/outline/success/danger/warning. Each variant has base (frame/text sections) · default · hover (+ tint layer, tint color and hover shimmer rows) · active (outline only, surface row only) · disabled. Size=small swaps all of that for one shared `small` panel (frame/text).
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| all 6 | default | --button-<v>-text (primary/secondary/outline --text-primary; success/danger/warning --text-<f>) | text (`<i>` inherits it) | token row "text color", flat state panel (no element tags), next to surface row | --button-<v>-surface (same `<button>`) | same section | opaque: primary --surface-brand, secondary --surface-neutral, success/danger/warning --surface-<f>-low. **outline: --color-transparent** | --button-<v>-text-font-size (lg) / -text-font-weight (semibold) in base panel text section; small: --button-small-text-font-size (sm) / -font-weight (normal) | no |
| all 6 | hover | --button-<v>-hover-text (all --text-primary) | text + icon | token row, flat hover panel | --button-<v>-hover-surface + background-image gradient of --button-hover-tint-enabled | same section; tint color is an extra row below the grid, shown only when tint is on | opaque: brand-higher / neutral-higher / outline neutral-lower / success-higher / danger-high / warning-high. Tint gate --color-transparent (off) | as default | no |
| outline | active | --button-outline-text (preview uses force-active without hover) / --button-outline-hover-text (real :active while hovered) | text + icon | no fg row in active panel; fg lives in default/hover panel | --button-outline-active-surface (`background` shorthand drops the tint) | fg in other state panel, bg in this panel | opaque --surface-neutral-low | as default | no |
| all 6 | disabled | --button-<v>-disabled-text (--text-tertiary) | text + icon | token row, flat disabled panel | --button-<v>-disabled-surface | same section | opaque --color-neutral-700. **outline: --color-transparent** | as default | yes |
- The icon `<i>` has no color var and inherits the text var in every state. Icon size comes from --button-<v>-icon-size (md) or --button-small-icon-size (font-size-xs). Outline default and outline disabled show the page or parent component through. The editor preview shows the ShadowBackdrop instead (--ui-surface-lowest, an image, or --backdrop-button-surface), never --page-bg.
- Hover overlays:
  - Tint on: hover surface rows are disabled and aliased to the base surface, so the backdrop is base surface + --button-hover-tint (--tint, white 10%).
  - Shimmer: the ::before sweep (white .2/.1, black .15 on danger) is absolutely positioned, so it paints over the text during the 0.5s hover transition.
- A slotted `.badge/.count` child paints --tint-low (white 5%) behind button-colored text at font-size-sm, opacity .9. columns=1.

### IconButton (IconButtonEditor.svelte:17-28 base, :30-37 state colors, :40-42 outline active, :57-66 small, :193-205 tint rows; IconButton.svelte:76-176 :root, :186-191 hover tint, :201-340 variants, :342-353 icon size)
Panels: same variant strip and states as Button. Base is flat (no element tags, no typography). Size=small uses one shared `small` panel.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| all 6 | default | --iconbutton-<v>-icon (primary/secondary/outline --text-primary; others --text-<f>) | icon | token row "icon color", flat state panel | --iconbutton-<v>-surface | same section | same as Button (**outline transparent**) | --iconbutton-<v>-icon-size (md, base panel); small --iconbutton-small-icon-size (icon-size-sm); no weight var | no |
| all 6 | hover | --iconbutton-<v>-hover-icon (all --text-primary) | icon | token row, flat hover panel | --iconbutton-<v>-hover-surface + --iconbutton-hover-tint-enabled gradient | same section; tint row below the grid | same as Button hover | as default | no |
| outline | active | --iconbutton-outline-icon (preview) / -hover-icon (real) | icon | other state panel | --iconbutton-outline-active-surface | bg in this panel | opaque --surface-neutral-low | as default | no |
| all 6 | disabled | --iconbutton-<v>-disabled-icon (--text-tertiary) | icon | token row, flat disabled panel | --iconbutton-<v>-disabled-surface | same section | --color-neutral-700; **outline transparent** | as default | yes |
- The glyph is the only content, so these are non-text 3:1 pairs whose var resolves to text-color kind (-icon suffix). There is no shimmer. The tint layer works as in Button. columns=1.

### InlineEditActions (InlineEditActionsEditor.svelte:13-23; InlineEditActions.svelte:65-101 :root, :116-120 disabled, :123-159 save/cancel)
Panels: part strip save button / cancel button (separate VariantGroups). States default · hover. Each panel splits into frame / text / icon sections.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| save | default / hover | --inlineeditactions-save-<s>-text (--text-success both) | icon (fa-check, the only content) | token row "color" in **text** section | --inlineeditactions-save-<s>-surface (same `<button>`) | same panel, other section (frame) | opaque --surface-success-low / --surface-success-high | glyph font-size = --inlineeditactions-save-<s>-icon-size (md, icon section); no weight | no |
| cancel | default / hover | --inlineeditactions-cancel-<s>-text (--text-danger both) | icon (fa-times) | token row "color" in text section | --inlineeditactions-cancel-<s>-surface | same panel, other section (frame) | opaque --surface-danger-low / --surface-danger-high | --inlineeditactions-cancel-<s>-icon-size (md) | no |
| both | disabled | --text-disabled (hardcoded) | icon | not exposed | --surface-neutral-low (hardcoded) | not exposed | opaque | default icon-size | yes |
- The "color" row sits under a "text" heading but paints an icon glyph, so it takes the 3:1 non-text rule. Hover changes only the surface; the text var default stays the same.
- The disabled state exists only at runtime: it uses system tokens and has no panel or preview. The demo's "Editing value..." label (--text-secondary over the preview stage) exists only in the editor. columns=1.

### SegmentedControl (SegmentedControlEditor.svelte:11-46 default states, :53-70 small, :73-107 typeGroups, :214-227 tint rows; SegmentedControl.svelte:91-168 :root, :170-178 bar, :190-224 small, :233-263 segment/icon, :283-321 hover/selected/disabled)
Panels: one group. Strip: control bar (frame/hairline) · option base (flat) · default option (flat, TypeEditor + grid) · selected option (frame/icon/text) · hover option (flat) · disabled option (flat). Size=small shows only control bar, option base and selected option, with no color rows and no TypeEditors.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| option | default | --segmentedcontrol-option-text (--text-primary) | text | TypeEditor "option text", default option panel (flat two-col) | --segmentedcontrol-bar-surface on parent `.segmented-control` (`.segment` background is hardcoded transparent) | other state panel (control bar, frame) | translucent: color-mix(--surface-neutral-lowest 75%, transparent) over page | --segmentedcontrol-option-text-font-size (md) / -font-weight (normal); small rebinds size to --segmentedcontrol-option-small-text-font-size (sm) | no |
| option | default | --segmentedcontrol-option-icon (--text-secondary) | icon | token row, default option panel | same | other state panel (control bar) | same | --segmentedcontrol-option-icon-size (md, option base); small --segmentedcontrol-option-small-icon-size | no |
| option | hover | --segmentedcontrol-option-hover-text (--text-primary) | text | TypeEditor "option text", hover option (flat) | --segmentedcontrol-option-hover-surface + tint gradient, over bar | same panel (flat) | opaque --surface-neutral; tint off | --segmentedcontrol-option-hover-text-font-size / -font-weight (md/normal) | no |
| option | hover | --segmentedcontrol-option-hover-icon (--text-primary) | icon | token row, same panel | same | same panel | same | option-icon-size | no |
| selected | selected | --segmentedcontrol-selected-text (--text-primary) | text | TypeEditor in **text** section of selected option | --segmentedcontrol-selected-surface | same panel, other section (frame) | opaque --surface-brand | --segmentedcontrol-selected-text-font-size / -font-weight (md/normal) | no |
| selected | selected | --segmentedcontrol-selected-icon (--text-secondary) | icon | token row in **icon** section | same | same panel, other section (frame) | opaque --surface-brand | option-icon-size | no |
| option | disabled | --segmentedcontrol-disabled-text (--text-secondary) | text | TypeEditor, disabled option (flat) | --segmentedcontrol-disabled-surface over bar; segment opacity 0.4 (hardcoded) | disabled surface in same panel; bar in other panel | transparent, so the 75% translucent bar shows | --segmentedcontrol-disabled-text-font-size / -font-weight (md/normal) | yes |
| option | disabled | --segmentedcontrol-disabled-icon (--text-secondary) | icon | token row, same panel | same | same | same | option-icon-size | yes |
- Default and disabled options paint no backdrop of their own. The bar, set in another panel, paints it at 75% alpha over the page or parent. Disabled also fades fg and surface to 40% through opacity.
- With tint on, the hover surface is aliased to --color-transparent, so the hover backdrop is --segmentedcontrol-hover-tint (--tint, white 10%) over the bar over the page. Hover skips `.selected`. The disabled background beats the selected one (later rule).
- The selected ring --segmentedcontrol-selected-border and the hairline --segmentedcontrol-hairline-color (surface kind) are non-text lines over the bar. They are not counted. columns=1.

### TabBar (TabBarEditor.svelte:13-25 tab tokens, :26-36 typeGroups, :40-53 states, :163-176 tint rows; TabBar.svelte:88-165 :root, :167-174 bar, :184-226 tab/icon, :228-280 hover/selected/disabled)
Panels: one group. Strip: bar (flat) · default tab · hover tab · selected tab · disabled tab. Each tab panel splits into frame / icon / indicator / text.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| tab | default | --tabbar-default-text (--text-tertiary) | text + icon (`<i>` inherits; there is no icon color var) | TypeEditor (legend ''), **text** section | --tabbar-default-surface; `.tab-bar` paints no background, so page/parent shows | surface: same panel, other section (frame); page: not exposed | transparent | --tabbar-default-text-font-size (md) / -font-weight (light); icon --tabbar-default-icon-size (icon section) | no |
| tab | hover | --tabbar-hover-text (--text-secondary) | text + icon | TypeEditor, text section | --tabbar-hover-surface + tint gradient | same panel, other section | opaque --surface-neutral-lower | --tabbar-hover-text-font-size / -font-weight (md/light) | no |
| tab | selected | --tabbar-selected-text (--text-primary) | text + icon | TypeEditor, text section | --tabbar-selected-surface over page | same panel, other section; page not exposed | translucent --tint-low (tint color 5%) | --tabbar-selected-text-font-size / -font-weight (md/light) | no |
| tab | selected | --tabbar-selected-border | mark (bottom indicator; width --tabbar-selected-indicator-width = border-width-2) | token row "color" in **indicator** section (border kind) | tab surface under the border (border-box) over page; bar hairline --tabbar-bar-hairline-color below | surface: other section; hairline: other panel (bar) | fg --color-brand-500 over --tint-low over page | — | no |
| tab | default / hover / disabled | --tabbar-<s>-border | mark | indicator section | as that state's surface | other section | fg --color-transparent (invisible) | — | disabled: yes |
| tab | disabled | --tabbar-disabled-text (--text-disabled) | text + icon | TypeEditor, text section | --tabbar-disabled-surface, then page | same panel, other section | transparent | --tabbar-disabled-text-font-size / -font-weight (md/light) | yes |
- Every tab surface except hover ships transparent or translucent. The backdrop is the page or parent behind the bar, which the editor never exposes (the preview shows the ShadowBackdrop, --ui-surface-lowest). Text weight is light at md size.
- The icon section holds only size. The icon's color comes from the text TypeEditor in a different section. With tint on, the hover surface is aliased to the default surface (transparent), so the hover backdrop is --tint over the page. columns=1; elementOrder is not passed.

### MenuSelect (MenuSelectEditor.svelte:8-42 states, :45-82 typeGroups, :178-191 tint rows; MenuSelect.svelte:103-162 :root, :164-176 panel, :182-217 item/icon/indicator, :219-264 hover/selected/disabled)
Panels: one group. Strip: menu (frame/item) · default item (frame/icon/text) · hover item (frame/icon/text) · selected item (frame/icon/indicator/text) · disabled item (frame/icon/text). The disabled item is always in the preview.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| item | default | --menuselect-default-text (--text-secondary) | text | TypeEditor, text section | --menuselect-default-surface on `<button>`, then --menuselect-menu-surface on `<ul>` | item surface: same panel, other section (frame); menu surface: other state panel (menu, frame) | item transparent; menu translucent color-mix(--surface-neutral-lower 95%, transparent), minOpacity 90 | --menuselect-default-text-font-size (sm) / -font-weight (normal) | no |
| item | default | --menuselect-default-icon (--text-tertiary) | icon | token row, icon section | same | same | same | --menuselect-default-icon-size (sm) | no |
| item | hover | --menuselect-hover-text (--text-primary) | text | TypeEditor, text section | --menuselect-hover-surface + tint gradient | same panel, other section | opaque --surface-neutral-higher | --menuselect-hover-text-font-size / -font-weight (sm/normal) | no |
| item | hover | --menuselect-hover-icon (--text-primary) | icon | token row, icon section | same | same | same | --menuselect-hover-icon-size | no |
| item | selected | --menuselect-selected-text (--text-primary) | text | TypeEditor, text section | --menuselect-selected-surface | same panel, other section | opaque --surface-brand-low | --menuselect-selected-text-font-size / -font-weight (sm/**semibold**) | no |
| item | selected | --menuselect-selected-icon (--text-brand) | icon | token row, icon section | same | same | same | --menuselect-selected-icon-size | no |
| item | selected | --menuselect-selected-indicator (--text-brand) | mark (fa-check glyph) | token row "color", indicator section | same | same panel, other section | opaque --surface-brand-low | size reads --menuselect-default-icon-size (default item panel) | no |
| item | disabled | --menuselect-disabled-text (--text-tertiary) | text | TypeEditor, text section | --menuselect-disabled-surface, then menu surface; item opacity 0.55 | same panel, other section; menu surface in other panel | transparent, so the 95% translucent menu shows | --menuselect-disabled-text-font-size / -font-weight (sm/normal) | yes |
| item | disabled | --menuselect-disabled-icon (--text-tertiary) | icon | token row, icon section | same | same | same | --menuselect-disabled-icon-size | yes |
- Default and disabled items show the menu panel, set in another panel, at 95% alpha, so 5% of the page bleeds through. Disabled items fade through opacity 0.55.
- --menuselect-selected-indicator paints a glyph but resolves to surface kind (-indicator suffix). Its size reads a var from another panel. With tint on, the hover surface is aliased to the default surface (transparent), so the hover backdrop is --tint over the menu surface. columns=1.

pairs: 31 text, 37 non-text (counts distinct fg/backdrop var pairs, including 9 disabled text and 10 disabled non-text pairs; another 23 icons inherit a text var and are not counted: Button 19, TabBar 4)

---

### Input (editor InputEditor.svelte:10-43 tokens, 47-99 typeGroups; runtime Input.svelte:159-223 defaults, 246-299 control, 308-356 icons, 232-238 label, 358-384 hint/error)
Panels: one variant with 7 state tabs: field / default / focused / disabled / label / hint / error. default, focused and disabled split into frame | icon | text sections. field, label, hint and error are flat (TypeEditor beside the grid).
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime) | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| input | default | --input-default-text | text | TypeEditor, default/text | --input-default-surface (same element .input-control) | same panel, other section (frame) | opaque --surface-neutral-lower | --input-default-text-font-size sm / -font-weight normal | no |
| input | focused | --input-focused-text | text | TypeEditor, focused/text | --input-focused-surface | same panel, other section (frame) | opaque --surface-neutral-lower | --input-focused-text-font-size / -weight | no |
| input | disabled | --input-disabled-text | text | TypeEditor, disabled/text | --input-disabled-surface | same panel, other section (frame) | opaque --surface-neutral | --input-disabled-text-font-size / -weight | yes |
| input | default / focused / disabled | --input-default-placeholder | text | token row, default/frame (sorted just above the surface row) | --input-default-surface / --input-focused-surface / --input-disabled-surface | default: same section; focused and disabled: other state panel | opaque (as above) | the active state's --input-<s>-text-font-size / -weight | disabled pair: yes |
| input | default | --input-default-icon | icon | token row, default/icon | --input-default-surface (icon is absolutely positioned over .input-control) | same panel, other section (frame) | opaque | --input-default-icon-size sm | no |
| input | focused | --input-focused-icon | icon | token row, focused/icon | --input-focused-surface, and also --input-default-surface | focused-surface: same panel, other section; default-surface: other state panel | opaque | --input-focused-icon-size | no |
| input | disabled | --input-disabled-icon | icon | token row, disabled/icon | --input-disabled-surface | same panel, other section | opaque; the trailing button icon renders at opacity 0.6 (341-344) | --input-disabled-icon-size | yes |
| label | label | --input-label | text | TypeEditor, label panel | page (.input-field is transparent) | not exposed | --page-bg | --input-label-font-size sm / semibold | no |
| hint | hint | --input-hint | text | TypeEditor, hint panel | page | not exposed | --page-bg | --input-hint-font-size xs / normal | no |
| error | error | --input-error | text | TypeEditor, error panel | page | not exposed | --page-bg | --input-error-font-size xs / medium | no |
| error | error | --input-error (inherited by .input-error-icon) | icon | none, inherits | page | not exposed | --page-bg | 1em of --input-error-font-size | no |
- --input-focused-icon paints over --input-default-surface when the reveal or clear button is hovered (337-339) or keyboard-focused (`:focus-within`, 347) while the input itself is unfocused. --input-default-placeholder has one row and paints on three surfaces. The placeholder row sits in the frame section; text color sits in the text section.
- Disabled styling leaves label, hint and error unchanged. Boundary pairs against the page are not counted: --input-<s>-border, the focus outline --input-focused-border and the error outline --input-error-border.
- Editor preview: transparent components sit on ShadowBackdrop (ShadowBackdrop.svelte:32), which paints --ui-surface-lowest by default and --backdrop-<component>-surface in color mode, not --page-bg. Every "page" backdrop in this report renders on that preview surface in the editor.

### RadioButton (editor RadioButtonEditor.svelte:7-53; runtime RadioButton.svelte:54-87 defaults, 100-153 hover/selected, 156-177 dot, 179-185 label)
Panels: one variant with states default / hover / selected. Each panel is flat: TypeEditor "label" beside the grid, with no element tags.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| radio | default | --radiobutton-default-label | text | TypeEditor "label" | page (button background is transparent) | not exposed | transparent, showing --page-bg | --radiobutton-default-label-font-size md / semibold | no |
| radio | hover, selected | --radiobutton-hover-label, --radiobutton-selected-label | text | TypeEditor "label" in each panel | page; with the `color` prop, a gradient of color-mix(color 12%/15%, --surface-neutral-lowest) | not exposed | transparent (without the prop, the gradient is invalid at computed-value time); with the prop, a gradient | hover/selected -label-font-size md / semibold | no |
| radio | default / hover / selected | --radiobutton-<s>-dot-border-color (ring) | mark | token row "border color" (surface kind, because of the -color suffix) | page / gradient | not exposed | transparent | ring 12px, --radiobutton-<s>-dot-border-width (2) | no |
| radio | hover / selected | --radiobutton-<s>-dot-fill | mark | token row "dot fill" | page (the ring is hollow) | not exposed | transparent | --radiobutton-<s>-dot-size (dot-size-50) | no |
- The default dot is invisible (opacity 0, dot-size-0), so it forms no pair. The `color` prop replaces ring and dot colors through `var(--radiobutton-color, token)` and bypasses the tokens.
- The selected rule wins over hover by source order. The component has no disabled state. Dot-fill defaults to --text-secondary, a text token used as a fill.

### Toggle (editor ToggleEditor.svelte:9-44; runtime Toggle.svelte:59-93 defaults, 110-140 track/thumb/label, 142-185 states)
Panels: one variant with states default (track | thumb | label sections) / hover (flat) / on (track | thumb) / on hover (flat) / disabled (flat). There is no TypeEditor.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| label | default, hover, on, on hover | --toggle-label | text | token row "text", default/label (text-color sorts after the font and gap rows) | page (.toggle is transparent) | not exposed | --page-bg | --toggle-label-font-size sm / -font-weight normal | no |
| label | disabled | --toggle-disabled-label | text | token row, disabled panel | page | not exposed | --page-bg | same vars | yes |
| thumb | default | --toggle-thumb-surface | mark | default/thumb | --toggle-track-surface | same panel, other section (track) | opaque --surface-neutral | --toggle-thumb-size md | no |
| thumb | hover | --toggle-hover-thumb-surface | mark | hover panel | --toggle-hover-track-surface | same section | opaque --surface-neutral-high | same | no |
| thumb | on | --toggle-on-thumb-surface | mark | on/thumb | --toggle-on-track-surface | same panel, other section (track) | opaque --surface-brand-high | same | no |
| thumb | on hover | --toggle-on-hover-thumb-surface | mark | on hover panel | --toggle-on-hover-track-surface | same section | opaque --surface-brand-higher | same | no |
| thumb | disabled | --toggle-disabled-thumb-surface | mark | disabled panel | --toggle-disabled-track-surface | same section | opaque --surface-neutral-lower | same | yes |
- The hover, on and on-hover thumbs default to --text-primary, a text token used as a surface. The thumb edge (--toggle-thumb-border, --toggle-on-thumb-border) separates thumb from track. The disabled state paints the borders in the surface color, so they disappear.
- Hover and on swap the thumb's backdrop by recoloring the track. Boundary pairs are not counted: --toggle-track-surface / --toggle-track-border against the page, in each state.

### Slider (editor SliderEditor.svelte:13-44 tokens, 60-81 typeGroups, 152 typeGroups single-only; runtime Slider.svelte:129-184 defaults, 199-213 label, 231-283 track/fill, 321-358 cap)
Panels: variants single and range, each with states default / hover / disabled. single default has track | fill | thumb | label | value sections. range default has track | fill | thumb. hover and disabled are flat.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| single, range (shared) | all | --slider-label | text | TypeEditor, single/default/label (range has no control) | page (.slider is transparent) | not exposed | --page-bg | --slider-label-font-size md / normal | no restyle when disabled |
| single, range (shared) | all | --slider-value | text | TypeEditor, single/default/value | page | not exposed | --page-bg | --slider-value-font-size md / normal (mono) | no restyle when disabled |
| single, range | default | --slider-<v>-fill | mark | default/fill | --slider-<v>-track-surface | same panel, other section (track) | opaque --surface-neutral-lowest | --slider-<v>-track-height | no |
| single, range | default | --slider-<v>-thumb-surface (.cap) | mark | default/thumb | --slider-<v>-fill (left half), --slider-<v>-track-surface (right half), page (overhang) | fill and track: same panel, other sections; page: not exposed | fill opaque --surface-brand-high | --slider-<v>-thumb-size lg | no |
| single, range | hover | --slider-<v>-hover-thumb-surface | mark | hover panel | fill / track / page | other state panel (default) | default equals the fill (--surface-brand-high) | same | no |
| single, range | disabled | --slider-<v>-disabled-fill | mark | disabled panel | --slider-<v>-disabled-track-surface | same section | opaque --surface-neutral-lower | same | yes |
| single, range | disabled | --slider-<v>-disabled-thumb-surface | mark | disabled panel | disabled-fill / disabled-track-surface / page | same section; page not exposed | default equals the disabled track (--surface-neutral-lower) | same | yes |
- The cap paints on three backdrops at once. The hover thumb defaults to the fill color (1:1 against the fill), and the disabled thumb defaults to the disabled track color (1:1). In both cases only --slider-<v>-*-thumb-border separates them. The focus-visible outline uses the thumb border against the page.
- Label and value text are shared by both variants but editable only under single, and the disabled state does not dim them. Boundary pairs are not counted: track surface and track border against the page.

### ProgressBar (editor ProgressBarEditor.svelte:9-42; runtime ProgressBar.svelte:62-80 defaults, 103-117 label, 119-137 track/fill, 38-43 fill prop)
Panels: one variant and one state "default", with sections fill | frame | label | value.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| label | default | --progressbar-label | text | TypeEditor, label section | page (.progress is transparent) | not exposed | --page-bg | --progressbar-label-font-size md / normal | no |
| value | default | --progressbar-value | text | TypeEditor, value section | page | not exposed | --page-bg | --progressbar-value-font-size md / normal (mono) | no |
| fill | default | --progressbar-fill | mark | token row, fill section | --progressbar-track-surface | same panel, other section (frame) | opaque --surface-neutral-lowest | --progressbar-track-height (space-16) | no |
- The `fill` prop replaces the fill with any CSS value (a var name, a literal or a gradient) through an inline style, so the token-based pair stops applying.
- Boundary pairs are not counted: --progressbar-track-surface / -track-border against the page.

### Tooltip (editor TooltipEditor.svelte:8-29; runtime Tooltip.svelte:42-54 defaults, 61-81 box, 83-95 arrow)
Panels: one variant and one panel "tooltip", with sections frame | text.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| tooltip | tooltip | --tooltip-text | text | TypeEditor, text section | --tooltip-surface (same element .tooltip) | same panel, other section (frame) | translucent: color-mix(--surface-canvas-lowest 75%, transparent), alpha 0.75 | --tooltip-text-font-size sm / normal | no |
- The surface is translucent and overlays whatever sits above or below the trigger (page content, images, a parent component), so the effective backdrop is a composite. In the editor it composites over ShadowBackdrop, including the newspaper image in image mode.

### Badge (editor BadgeEditor.svelte:14-42; runtime Badge.svelte:76-226 defaults, 238-242 icon, 252-267 variant rule)
Panels: 10 variants (brand, accent, neutral, alternate, canvas, special, success, warning, danger, info), each with two parts: base (frame | text sections) and colors (flat).
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| all 10 | colors | --badge-<v>-text | text | token row "text color" in the colors part, sorted directly above surface | --badge-<v>-surface (same .badge element) | same section | opaque --surface-<v> | --badge-<v>-text-font-size md / -font-weight normal (base part, text section) | no |
| all 10 | colors | --badge-<v>-text (inherited by .icon) | icon | none, inherits | --badge-<v>-surface | same section as the text row | opaque | --badge-<v>-icon-size sm (base part, frame section) | no |
- Text defaults are --text-<v>. Two variants differ: neutral uses --text-primary on --surface-neutral, and alternate uses --text-alternate (white).
- The backdrop-filter blur (--badge-<v>-blur, default none) only matters once a surface becomes translucent. The `small` size changes only the gap. Boundary pairs are not counted: --badge-<v>-border against the parent.

### CornerBadge (editor CornerBadgeEditor.svelte:10-35; runtime CornerBadge.svelte:61-106 defaults, 121-127 font forwarding, 133-139 color rebinding; paint in Badge.svelte:252-267)
Panels: 10 variants, each with parts base (frame | text sections; one flat token set shared by all variants) and colors (flat, per variant).
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| all 10 | colors | --cornerbadge-<v>-text (rebinds --badge-<v>-text) | text | token row "text color" in the colors part | --cornerbadge-<v>-surface, painted by the inner Badge .badge | same section | opaque --surface-<v> | --cornerbadge-text-font-size sm / -font-weight medium (base part, text section) | no |
| all 10 | colors | inherited text color on the Badge .icon | icon | none, inherits | --cornerbadge-<v>-surface | same section | opaque | --badge-<v>-icon-size (exposed only in the Badge editor) | no |
- Paint comes from the child Badge. CornerBadge rebinds only surface, border and text. Border width, blur, shadow and icon size stay on Badge's --badge-<v>-* tokens, which the CornerBadge editor does not expose.
- The editor preview places the badge on an image (newspaper.webp). The text pair stays internal because the surface is opaque, and the badge edge (--cornerbadge-<v>-border) meets the image. The demo renders no icon.

### Callout (editor CalloutEditor.svelte:10-42, 97-98; runtime Callout.svelte:41-113 defaults, 121-129 links, 137-161 variant rule)
Panels: 4 variants (info, success, warning, danger), each with one panel and no state strip. Sections: frame | label | message.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | backdrop default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| info, success, warning, danger | — | --callout-<v>-label | text | TypeEditor, label section | --callout-<v>-surface (ancestor .callout div) | same panel, other section (frame) | opaque --surface-<v>-lowest | --callout-<v>-label-font-size lg / bold | no |
| info, success, warning, danger | — | --callout-<v>-text | text | TypeEditor, message section | --callout-<v>-surface | same panel, other section (frame) | opaque --surface-<v>-lowest | --callout-<v>-text-font-size lg / normal | no |
- The label defaults to --text-primary in all four variants. The message defaults to --text-<v>.
- Slotted links inherit the message color and drop to opacity 0.8 on hover, which makes the text translucent over the surface. Other slotted elements inherit --callout-<v>-text unless they set their own color.

pairs: 47 text, 58 non-text (boundary pairs, such as borders, outlines and tracks against the page, are not counted)

---

### Card (src/editor/component-editor/CardEditor.svelte:8-50; src/system/components/Card.svelte:104-151, 153-229)
Panels: one variant `card`, shown in default and bare previews. States: default, with element sections frame / header / body, and hover, which has only border and shadow and no sections.
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| default (header) | default, hover inherits | --card-default-title (=--text-primary) | text | TypeEditor "title", header section | --card-default-header-surface on .card-header, over --card-default-surface on .card, over the page | same section ("header color"); the lower layer sits in the frame section | translucent: color-mix(--surface-neutral-lowest 80%, transparent) over color-mix(--surface-neutral-lower 70%, transparent) | --card-default-title-font-size (2xl) / -font-weight (medium); size=small hard-codes --font-size-md | no |
| default (header icon) | default | --card-color, set inline from the `iconColor` prop (default `var(--text-secondary)`); the fallback --card-default-title is never reached | icon | not exposed (only "icon size" is a row) | --card-default-header-surface over --card-default-surface | same section | translucent (as above) | --card-default-icon-size (2xl); small hard-codes --icon-size-md | no |
| default + bare (body) | default | --card-default-body (=--text-secondary) | text | TypeEditor "body", body section | --card-default-surface on the .card ancestor (.card-body has no fill), over the page | same panel, other section (frame "surface color") | translucent: color-mix(--surface-neutral-lower 70%, transparent) | --card-default-body-font-size (xl) / -font-weight (normal); small hard-codes --font-size-sm | no |
- Hover does not change the backdrop. Every Card backdrop is translucent and composites over the page or a parent. The editor preview's ShadowBackdrop defaults to --ui-surface-lowest (modes: image = newspaper.webp, color = --backdrop-card-surface), never --page-bg.
- The icon color is prop-driven and has no token row. The `aside` snippet puts consumer content (such as a Badge) on the header surface. Slot-prose pins p/ul/li to inherit, but `a` and `strong` keep the site's colors over the card surface.

### Dialog (src/editor/component-editor/DialogEditor.svelte:17-64; src/system/components/Dialog.svelte:181-222, 224-257, 274-328)
Panels: part tabs scrim | dialog | header | body | footer. No states and no element sections. A panel with a TypeEditor uses the two-column layout.
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| header | n/a | --dialog-title (=--text-primary) | text | TypeEditor "title", header panel | --dialog-header-surface on .dialog-header | same panel (token grid) | opaque: --surface-neutral-lower | --dialog-title-font-size (2xl) / -font-weight (normal) | no |
| header (close button) | rest | --dialog-close-icon (=--text-secondary) | icon | token row "close icon color", header panel; sorts directly above "surface color" | --dialog-header-surface (the button background is none) | same panel | opaque: --surface-neutral-lower | --dialog-close-icon-size (xl) | no |
| header (close button) | :hover | --text-primary, hard-coded | icon | not exposed | --surface-neutral-low, hard-coded on .dialog-close:hover | not exposed | opaque | --dialog-close-icon-size | no |
| body | n/a | --dialog-body (=--text-secondary) | text | TypeEditor "body text", body panel | --dialog-surface on the .dialog ancestor (.dialog-body has no fill) | other part panel ("dialog") | opaque: --surface-neutral-lowest | --dialog-body-font-size (md) / -font-weight (normal) | no |
- The footer has no fill, so its Button labels paint on --dialog-surface. The cancel button defaults to outline, whose surface is --color-transparent, so --button-outline-text sits directly on --dialog-surface. The Button editor owns those colors.
- The dialog box sits on --dialog-scrim-surface (=--scrim-high, 90% translucent). No text paints on the scrim. The body has no slot-prose, so a site-level `p { color }` overrides --dialog-body on slotted paragraphs.

### Notification (src/editor/component-editor/NotificationEditor.svelte:13-44; src/system/components/Notification.svelte:129-209, 237-269, 300-320, 324-343)
Panels: four VariantGroups (info / success / warning / danger), each with parts base and colors. Base has element sections frame / title / body. Colors has no sections; its text-color rows (icon, title, body) sort directly above the surface and action-surface rows. All four variants are structurally identical; only the family in the defaults differs ({v}).
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| all 4 (header title) | n/a | --notification-{v}-title (=--text-{v}) | text | token row "title color", colors part | --notification-{v}-surface on .notification-header | same panel | opaque: --surface-{v} | --notification-{v}-title-font-size (lg) / -font-weight (bold): base part, title section | no |
| all 4 (header icon) | n/a | --notification-{v}-icon (=--text-{v}) | icon | token row "icon color", colors part | --notification-{v}-surface | same panel | opaque: --surface-{v} | --notification-{v}-icon-size: base part, frame section | no |
| all 4 (dismiss ×) | rest | --notification-{v}-text, through `color: inherit` | icon | token row "body color", colors part | --notification-{v}-surface | same panel | opaque: --surface-{v} | inherits --notification-{v}-text-font-size | no |
| all 4 (dismiss ×) | :hover | --text-primary, hard-coded | icon | not exposed | --notification-{v}-surface | same panel | opaque | n/a | no |
| all 4 (description / inline description-text / children) | n/a | --notification-{v}-text (=--text-primary) | text | token row "body color", colors part | none. Neither .notification-body nor the root .notification has a fill, so the text shows the page or a parent. | not exposed | transparent | --notification-{v}-text-font-size (md) / -font-weight (normal): base part, body section; size=small hard-codes --font-size-sm | no |
- --notification-{v}-text paints on two backdrops: the opaque header surface (dismiss icon) and the transparent body (description). The surface fills only the header strip.
- Foreground colors live in the colors part. Their size and weight live in the base part and link across all four variants (LinkedBlock).
- The header action Button (outline by default) sits on --notification-{v}-action-surface (=--surface-neutral-lowest, opaque, colors part). The body action Buttons (left outline, right primary) sit on the transparent body, so their backdrop is the page.

### Table (src/editor/component-editor/TableEditor.svelte:8-35, 46-63; src/system/components/Table.svelte:28-64, 66-128)
Panels: part tabs wrapper | header | cell | row | column. No states and no element sections.
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| header (th) | n/a | --table-default-header-text (=--text-primary) | text | TypeEditor "header text", header panel | --table-default-header-surface on th | same panel | opaque: --surface-neutral-lowest | --table-default-header-font-size (lg) / -font-weight (semibold) | no |
| cell (td), odd rows | n/a | --table-default-cell-text (=--text-secondary) | text | TypeEditor "cell text", cell panel | --table-default-row-surface on td, over --table-default-surface on .table-wrapper, over the page | other part panels (row; wrapper) | row surface transparent (--color-transparent); wrapper translucent color-mix(--surface-neutral-lower 57%, transparent) | --table-default-cell-font-size (md) / -font-weight (medium) | no |
| cell (td), even rows | n/a | --table-default-cell-text | text | TypeEditor "cell text", cell panel | --table-default-row-stripe-surface as a background-image gradient, over row-surface, over wrapper surface, over the page | other part panels (row; wrapper) | stripe transparent; the rest as above | same | no |
- The cell panel has no surface row. A cell's backdrop is a stack of three translucent or transparent layers, edited in two other panels, over the page. Odd and even rows give the cell text two different backdrops.

### CollapsibleSection (src/editor/component-editor/CollapsibleSectionEditor.svelte:25-91; src/system/components/CollapsibleSection.svelte:104-182, 244-318)
Panels: variant groups chromeless / hairline / container. Parts: Container (container variant only) | Header, with sub-states Default and Hover | Body. No element sections. The Header panels use the two-column layout: the TypeEditor "label" beside a grid where "icon color" sorts directly above "surface color".
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| chromeless, hairline / Header | default, hover | --collapsiblesection-{v}-{s}-label (=--text-primary) | text | TypeEditor "label", Header/{s} panel | --collapsiblesection-{v}-{s}-surface on .section-header | same panel | transparent (--color-transparent), so the label shows the page or a parent | --collapsiblesection-{v}-{s}-label-font-size (md) / -font-weight (normal) | no |
| chromeless, hairline / Header | default, hover | --collapsiblesection-{v}-{s}-icon (=--text-primary) | icon (chevron) | token row "icon color", Header/{s} panel | same as the label row | same panel | transparent | --collapsiblesection-{v}-{s}-icon-size (xs) | no |
| container / Header | default, hover | --collapsiblesection-container-{s}-label (=--text-primary) | text | TypeEditor "label", Header/{s} panel | --collapsiblesection-container-{s}-surface | same panel | opaque: --surface-neutral (default), --surface-neutral-high (hover) | -label-font-size (md) / -font-weight (normal) | no |
| container / Header | default, hover | --collapsiblesection-container-{s}-icon (=--text-primary) | icon | token row, Header/{s} panel | same as the label row | same panel | opaque, as the label row | -icon-size (xs) | no |
| container / Body | open | --text-secondary, hard-coded on .section-content | text | not exposed | --collapsiblesection-container-open-surface | same panel (Body "surface color") | opaque: --surface-neutral-higher (mid-tone) | --font-size-md, hard-coded; no weight | no |
| chromeless, hairline / Body | open | --text-secondary, hard-coded | text | not exposed | none, so the page or a parent shows through | not exposed | transparent | --font-size-md, hard-coded | no |
- Hover swaps the backdrop in the container variant (surface-neutral to surface-neutral-high). In chromeless and hairline, both header states stay transparent over the page or a parent.
- The Body panel exposes the container's body surface but no text color. The fixed --text-secondary sits on a mid-tone --surface-neutral-higher.

### CodeSnippet (src/editor/component-editor/CodeSnippetEditor.svelte:9-33; src/system/components/CodeSnippet.svelte:63-87, 89-151)
Panels: default, with element sections text / frame / icon / scrollbar, and hover, with one ungrouped row. Font tokens are plain rows; there is no TypeEditor.
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| code | default | --codesnippet-code-text (=--text-brand) | text | token row "color", text section | --codesnippet-surface on the .codesnippet ancestor | same panel, other section (frame) | translucent: color-mix(--surface-neutral-lowest 76%, transparent) | --codesnippet-code-font-size (md) / -font-weight (normal) | no |
| copy button | default | --codesnippet-icon (=--text-secondary) | icon | token row "color", icon section | --codesnippet-surface (the button background is transparent) | same panel, other section (frame) | translucent (as above) | --codesnippet-icon-size | no |
| copy button | hover | --codesnippet-hover-icon (=--text-primary) | icon | token row "icon color", hover panel | --codesnippet-surface | other state panel (default, frame) | translucent | --codesnippet-icon-size | no |
| scrollbar | default | --codesnippet-scrollbar-thumb (=--text-tertiary; kind surface through -thumb) | mark | token row "thumb", scrollbar section | transparent track over --codesnippet-surface | same panel, other section (frame) | translucent | --codesnippet-scrollbar-border-width (6) | no |
- The "Copied" popover is a Tooltip, which paints its own colors.

### Panel (src/editor/component-editor/PanelEditor.svelte:10-27, 47-57; src/system/components/Panel.svelte:36-59)
Panels: one default state. elementOrder forces the frame / stage sections. The surface is a GradientEditor (compositeControls) above Properties.
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| stage | default | none: slotted content inherits color from the page or ancestor | n/a | n/a | --panel-stage-surface on .panel | GradientEditor (stage) | gradient: linear-gradient(0deg, color-mix(--surface-neutral-low 40%, transparent), color-mix(--surface-neutral-lowest 75%, transparent)), translucent over the page | n/a | no |
- Panel owns no foreground. Its translucent gradient becomes the backdrop for any transparent child: inherited page text, chromeless or hairline CollapsibleSection, Table cells, Notification bodies.

### SlidePager (src/editor/component-editor/SlidePagerEditor.svelte:8-46, 85; src/system/components/SlidePager.svelte:281-319, 327-453, 459-502)
Panels: default | hover | disabled. elementOrder forces the frame / bar / control / counter / overlay sections in every panel; hover and disabled fill only the control section. The preview shows the inline pager and the open zoom.
| variant/part | state | foreground var | fg type | editor control + element section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| control (prev, next, zoom close) | default | --slidepager-control-icon (=--text-primary) | icon (SVG stroke) | token row "icon color", control section | --slidepager-control-surface on the button | same section | opaque: --surface-neutral-low | --slidepager-control-icon-size (md) | no |
| control | hover | --slidepager-control-hover-icon (=--text-inverted) | icon | hover panel, control section | --slidepager-control-hover-surface | same section | opaque: --surface-brand-high | --slidepager-control-icon-size (default panel) | no |
| control (prev, next only) | disabled | --slidepager-control-disabled-icon (=--text-disabled) | icon | disabled panel, control section | --slidepager-control-disabled-surface | same section | opaque: --surface-neutral-lower | --slidepager-control-icon-size | yes |
| counter (inline pager) | n/a | --slidepager-counter-text (=--text-secondary) | text | token row "text color", counter section | none: .slidepager-bar and .slidepager have no fill, so the page shows | not exposed | transparent (page) | --slidepager-counter-font-size (lg) / -font-weight (medium) | no |
| counter (zoom modal) | n/a | --slidepager-counter-text | text | token row "text color", counter section | --slidepager-scrim-surface on .slidepager-modal; the bar is pinned to the bottom and can overlap the slide image's lower edge | same panel, other section (overlay) | translucent: --scrim-high (90% scrim-color) over the page | same | no |
- The counter has two backdrops: the page when inline and the scrim (possibly the image edge) when zoomed. The default --slidepager-frame-surface never sits behind text, because the bar is a sibling below the frame.
- The control surfaces also form a non-text boundary against the bar backdrop (page or scrim); that pair is not counted. In sketch mode, --sketch-fill is mapped to the same surface tokens.

pairs: 24 text, 22 non-text (also not counted: 2 hard-coded text pairs on the CollapsibleSection body and 2 hard-coded hover icons, the Dialog close and the Notification dismiss; Button and Tooltip foregrounds over Dialog and Notification backdrops are cross-component)

---

### SideNavigation (src/editor/component-editor/SideNavigationEditor.svelte:23-31, 46-97, 105-182, 185-200; src/system/components/SideNavigation.svelte:266-468, 498-586, 588-643, 669-719, 727-845; child src/system/components/CollapsibleSection.svelte:105-124, 244-272)
Panels: Part strip has Panel · Title/{Default,Hover,Selected} · Title Block · Toggle/{Default,Hover} · Section/{Default,Hover,Selected} · Item/{Default,Hover,Selected} · Footer/{Default,Hover,Selected} · Animation. No `element` tags. Each panel with a type group uses the two-column StateBlock layout, with the TypeEditor beside the token grid. columns=1.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| Title label | default/hover/selected | `--sidenavigation-title-{s}-label` | text | TypeEditor "title label", Title/{s} | `.sn-title-label` `--sidenavigation-title-label-surface` → `.sn-title` `--sidenavigation-title-{s}-surface` (+ hover tint layer) → aside `--sidenavigation-panel-surface` | title-{s}-surface: same panel, token grid. label-surface: other part (Title Block). panel-surface: other part (Panel) | label-surface transparent. Title default/hover transparent, selected `--surface-canvas-low` (opaque). Panel `--surface-canvas-lower` (opaque). fg `--text-primary` in all states | `--sidenavigation-title-{s}-label-font-size` (2xl) / `-font-weight` (bold) | no |
| Toggle | default/hover | `--sidenavigation-toggle-{s}-icon` | icon (fa angles) | token row "icon color", Toggle/{s}; sorts just before "surface color" | `.sn-toggle` `--sidenavigation-toggle-{s}-surface` → `.sn-title` `--sidenavigation-title-{default\|hover\|selected}-surface` → panel | toggle surface: same panel. title/panel surfaces: other part | toggle default transparent, hover `--surface-brand-lowest` (opaque, + tint). fg default `--text-primary`, hover `--text-brand` | `--sidenavigation-toggle-{s}-icon-size` (md) | no |
| Section header label | default/hover/selected | `--sidenavigation-section-{s}-text`, forwarded into `--collapsiblesection-chromeless-{default\|hover}-label` | text | TypeEditor "section text", Section/{s} | CollapsibleSection `.section-header` `--collapsiblesection-chromeless-{default\|hover}-surface` → `.sn-section-header` `--sidenavigation-section-{s}-surface` (+ tint) → panel | section surface: same panel. chromeless surface: not exposed (CollapsibleSection editor). panel: other part | chromeless transparent. section default transparent, hover `--surface-canvas`, selected `--surface-canvas-low`. fg `--text-primary` | `--sidenavigation-section-{s}-text-font-size` (lg) / `-font-weight` (medium) | no |
| Section chevron | default/hover/selected | `--collapsiblesection-chromeless-default-icon` (default and selected), `-hover-icon` (pointer hover only) | icon | not exposed. CollapsibleSection does not forward it | same chain as section label | fg not exposed. Backdrop: same panel | fg `--text-primary` | `--collapsiblesection-chromeless-*-icon-size` (xs) | no |
| Item | default/hover/selected | `--sidenavigation-item-{s}-text` | text | TypeEditor "item text", Item/{s} | `.sn-item` (same element) `--sidenavigation-item-{s}-surface` (+ tint) → panel | same panel. panel: other part | default transparent, hover `--surface-canvas`, selected `--surface-canvas-low`. fg `--text-tertiary` / `--text-secondary` / `--text-primary` | `--sidenavigation-item-{s}-text-font-size` (md) / `-font-weight` (semibold / light / normal) | no |
| Footer text | default/hover/selected | `--sidenavigation-footer-{s}-text` | text | TypeEditor "footer text", Footer/{s} | `.sn-footer` (same element) `--sidenavigation-footer-{s}-surface` (+ tint) → panel | same panel | default transparent, hover `--surface-canvas`, selected `--surface-canvas-low`. fg tertiary / secondary / primary | `--sidenavigation-footer-{s}-text-font-size` (sm) / `-font-weight` (light / light / normal) | no |
| Footer icon | default/hover/selected | `--sidenavigation-footer-{s}-icon` | icon | token row "icon color", Footer/{s}; sorts just before surface | same as footer text | same panel | fg `--text-muted` / `--text-secondary` / `--text-primary` | `--sidenavigation-footer-{s}-icon-size` (xs) | no |
- Every part surface ships transparent except the selected ones and the toggle and hover surfaces. The text's effective backdrop in the Default state is therefore `--sidenavigation-panel-surface`, which sits in a different Part tab. The hover tint (`--sidenavigation-hover-tint` = `--tint`, 10% white) is a translucent `background-image` layer over the hover surface. Switching the "tint layer" on aliases each hover surface to its default surface and disables those rows. The tint picker sits in each "/ Hover" panel's extra rows.
- The toggle sits inside `.sn-title`. A real pointer hover on the toggle also hovers the title, putting the title's hover surface and tint behind a transparent toggle. The editor's Toggle/Hover forces only the toggle. A selected title (`currentPath === ''`) changes the toggle's backdrop to `--surface-canvas-low`.
- Section text and the chevron paint inside a child CollapsibleSection. That child's surface and icon tokens belong to the CollapsibleSection editor. The `lead` and `actions` snippets paint consumer content on the panel surface.

### SectionDivider (src/editor/component-editor/SectionDividerEditor.svelte:17-111, 397-432; src/system/components/SectionDivider.svelte:120-227, 229-251, 429-490)
Panels: variants lg/md/sm (focus-mode tabs), one panel each with no states. Element sections forced by elementOrder: Container · title · description · eyebrow · hairline. The surface row is hidden. A GradientEditor "Surface" block above Properties edits it. columns=1.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| lg/md/sm title | — | `--sectiondivider-{v}-title` | text | TypeEditor, "title" section | `.section-divider` `--sectiondivider-{v}-surface` (gradient kind) → page or parent | same panel, but outside every element section (GradientEditor above Properties) | transparent in all three, so the page shows through (`--page-bg` at runtime; `--ui-surface-lowest`, image or colour backdrop in the editor). fg lg/md `--text-primary`, sm `--text-brand` | `--sectiondivider-{v}-title-font-size` (5xl/4xl/3xl) / `-font-weight` (bold/bold/medium) | no |
| lg/md/sm description | — | `--sectiondivider-{v}-description` | text (italic) | TypeEditor, "description" section (Show toggle) | same | same | same. fg lg `--text-alternate`, md/sm `--text-secondary`. Shown by default on lg only | `-description-font-size` (lg/lg/5xl) / `-font-weight` (medium) | no |
| lg/md/sm eyebrow | — | `--sectiondivider-{v}-eyebrow` | text | TypeEditor, "eyebrow" section (Show and All caps controls) | same | same | same. fg lg `--text-brand`, md/sm `--text-tertiary`. Shown by default on lg only | `-eyebrow-font-size` (md/sm/xs) / `-font-weight` (medium) | no |
| lg/md/sm hairline | — | `--sectiondivider-{v}-hairline-color` | mark (decorative rule, aria-hidden) | token row "hairline color", "hairline" section | same | same | same. fg lg/md `--border-brand-medium`, sm `color-mix(... 50%, transparent)` (translucent). sm hairline is off by default | `--sectiondivider-{v}-hairline-width` (1) | no |
- The backdrop can become a linear or radial gradient with per-stop colour and opacity, or "None". Text must clear every stop, and a translucent stop lets the page or parent through.
- `--sectiondivider-*-hairline-color` takes the surface kind because of its `-color` suffix. A pairing rule that keys on kind would miss it as a foreground. The colour-family select rewrites every colour alias in the variant.

### Image (src/editor/component-editor/ImageEditor.svelte:9-20; src/system/components/Image.svelte:96-126)
Panels: variants default and bare, one panel each.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var | backdrop in editor? | default | size+weight | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| — | — | none | — | — | — | — | — | — | — |
- No text or icon. Only `--image-{v}-border` (the frame edge, `--border-neutral` / transparent) paints, against the page and the picture.

### ImageLightbox (src/editor/component-editor/ImageLightboxEditor.svelte:9-28; src/system/components/ImageLightbox.svelte:829-849, 986-1127)
Panels: tile · overlay · chrome. Flat tabs with no sub-states and no element sections. columns=1.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| close, gallery prev/next | default | `--imagelightbox-chrome-icon` | icon (16px SVG stroke) | token row "icon color", chrome panel; sorts last, after a zone divider | own bg `--imagelightbox-chrome-surface` (blur) → scrim `--imagelightbox-scrim-surface` → page | same panel | `--surface-neutral-low` (opaque). fg `--text-primary` | none (16px hard-coded) | no |
| close, gallery prev/next | hover | same | icon | same row | own bg `--imagelightbox-chrome-hover-surface` | same panel ("hover surface color"; there is no hover tab) | `--surface-brand-high` (opaque) | none | no |
| zoom −/+ (extended) | default / hover | same, via `color: inherit` from the toolbar | icon | same row | button transparent → toolbar `--imagelightbox-chrome-surface`; on hover the button paints `--imagelightbox-chrome-hover-surface` | same panel | as above | none | yes: opacity 0.4 at minimum or maximum zoom |
| counter "i / n" (gallery) | default | `--imagelightbox-chrome-icon` | text (aria-hidden) | same row | own bg `--imagelightbox-chrome-surface` | same panel | `--surface-neutral-low` | `--font-size-xs` and `--font-mono` hard-coded; no weight var | no |
| toolbar "%" label (extended) | default | same, inherited | text | same row | toolbar `--imagelightbox-chrome-surface` | same panel | `--surface-neutral-low` | `--font-size-xs` hard-coded | no |
- One `-icon` var paints both icons (3:1 threshold) and extra-small text (4.5:1 threshold), over two backdrops. Surface, radius and border are linked kinds through shared groupKeys and the icon is not, so in the chrome panel the icon row drops below the zone divider, away from both surface rows.
- The chrome floats over the scrim (`--scrim-high`, 90% scrim colour plus blur; overlay tab). The chrome surface or border against the scrim is the non-text boundary pair. The modal portals to `<body>` only after a click, so the editor stage shows only the thumbnail and never the chrome.
- The thumbnail has no text. The `overlay` snippet (for example a CornerBadge) belongs to its own component. The thumbnail focus outline uses `--border-brand-medium`, hard-coded.

### VideoLightbox (src/editor/component-editor/VideoLightboxEditor.svelte:6-37, 61; src/system/components/VideoLightbox.svelte:248-279, 334-378, 380-435)
Panels: default and hover. Element sections forced by elementOrder: tile · badge · overlay · close. In the hover panel, tile and overlay render as empty headings. No groupKeys, so no kind is linked. columns=1.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| tile badge (`chrome="badge"`) | default | `--videolightbox-badge-default-icon` | icon (play triangle, aria-hidden) | token row, default panel, "badge" section; sorts just before surface | own bg `--videolightbox-badge-default-surface` → poster image or hover-play video | same section | `--surface-brand-lower` (opaque). fg `--text-primary` | `--videolightbox-badge-default-icon-size` (4xl) | no |
| tile badge | hover | `--videolightbox-badge-hover-icon` | icon | hover panel, "badge" section | `--videolightbox-badge-hover-surface` | same section | `--surface-brand`. fg `--text-primary` | default icon-size (no hover var) | no |
| close (open modal) | default | `--videolightbox-chrome-icon` | icon (16px SVG) | token row, default panel, "close" section | own bg `--videolightbox-chrome-surface` (blur) → scrim `--videolightbox-scrim-surface` → page | same section | `--surface-neutral-low`. Scrim `--scrim-high` (translucent) | none (hard-coded) | no |
| close | hover | `--videolightbox-chrome-icon` (no hover icon var) | icon | the icon row stays in the default panel | `--videolightbox-chrome-hover-surface` | other state panel (hover, "close" section) | `--surface-brand-high` | none | no |
- The badge sits over footage, so the badge surface against the footage is an image boundary. The close button sits 24px in from the modal edge over the scrim gutter (overlay padding 64px). Below about 68px of padding it can overlap the video.
- The editor renders the open state inline (scrim and close button over the stage backdrop). The Hover tab drives both previews through `force-hover`.

### VideoFrame (src/editor/component-editor/VideoFrameEditor.svelte:6-27, 51; src/system/components/VideoFrame.svelte:139-160, 168-188, 232-274)
Panels: default and hover. Element sections forced: frame · badge. In the hover panel, frame renders as an empty heading. No groupKeys. columns=1.
| variant/part | state | foreground var | fg type | editor control + section | backdrop var (runtime truth) | backdrop in editor? | backdrop shipped default | size+weight vars | disabled? |
|---|---|---|---|---|---|---|---|---|---|
| badge (`chrome="badge"`, before first play) | default | `--videoframe-badge-default-icon` | icon (aria-hidden) | token row, default panel, "badge" section; sorts just before surface | own bg `--videoframe-badge-default-surface` → poster or video → `--videoframe-clip-surface` → `--videoframe-frame-surface` | same section | `--surface-brand-lower`. fg `--text-primary` | `--videoframe-badge-default-icon-size` (4xl) | no |
| badge | hover | `--videoframe-badge-hover-icon` | icon | hover panel, "badge" section | `--videoframe-badge-hover-surface` | same section | `--surface-brand`. fg `--text-primary` | default icon-size | no |
- The badge disappears after the first play and the browser's native `<video controls>` take over, with no tokens. `chrome="none"` removes the badge. The badge sits over footage.
- Sketch mode hatches the `.sketch-chip` badge and the `.sketch-surface` frame fill, and also the `.sidenavigation` and `.sd-hairline` parts above. A sketched backdrop is not a flat colour.

pairs: 23 text, 23 non-text