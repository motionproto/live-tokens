# Component contrast checker

Audit and proposal, 2026-10-09. Nothing is implemented. The per-pair evidence sits in `temp/contrast-checker-inventory.md`.

## Goal

Every component editor panel that sets a foreground color shows the contrast ratio between that color and what paints behind it, with both properties in view, and warns when the pair falls below WCAG 2.2.

## WCAG 2.2 criteria

| Criterion | Level | Applies to | Floor |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | text | 4.5:1, large text 3:1 |
| 1.4.6 Contrast (Enhanced) | AAA | text | 7:1, large text 4.5:1 |
| 1.4.11 Non-text Contrast | AA | icons, control marks (thumb, fill, dot, indicator) | 3:1 |

- Large text is 24px and up, or 18.66px and up at weight 700 or more.
- 1.4.3 and 1.4.11 exempt an inactive control. A disabled state shows its ratio and carries no warning.
- WCAG 2.2 kept the 2.1 floors. Its relative-luminance formula uses an sRGB threshold of 0.04045 where `contrast.ts` uses 0.03928. Both give the same result on 8-bit channels, so `contrast.ts` stays as it is.

## Existing pieces

- `src/editor/core/palettes/contrast.ts` has `contrastRatio`, `AA_BODY` and `AA_LARGE`.
- `src/testing/support/pageHarness.ts` (`observeContrast`) resolves any color syntax through a 1×1 canvas and composites a translucent foreground over its surface. It also holds the large-text sizes (`LARGE_TEXT_PX`, `LARGE_BOLD_PX`, `BOLD`). It skips component roots, so no check covers component pairs today.
- `src/system/backdrop/backdrop.ts` parses gradient stops out of a `background` value and falls back to `--page-bg`.
- `TokenLayout` ranks `text-color` directly before `surface`, so a flat color panel already lists text color, then surface color.

## Inventory

24 of the 29 editors set a foreground color. Panel and Image paint none. The pairs come to 125 text and 140 non-text, counted per variant and state.

Placement describes where the backdrop row sits relative to the foreground row:

- **Adjacent.** Both rows sit in one grid, next to each other.
- **Split section.** Same panel, different element section, or a TypeEditor beside the token grid.
- **Split panel.** The backdrop row sits in another state or part panel.
- **Page.** The backdrop is `--page-bg`, which no component panel shows.
- **Media.** The backdrop includes an image, video or scrim.

| Component | Adjacent | Split section | Split panel | Page | Media |
|---|---|---|---|---|---|
| Button | default, hover, disabled | | outline active | outline default and disabled | |
| IconButton | default, hover, disabled (icons) | | outline active | outline default and disabled | |
| Badge | colors part | | | | |
| CornerBadge | colors part | | | | image behind the badge edge |
| Notification | title, icon | | | body text | |
| Dialog | close icon | title | body (dialog part) | | |
| Tooltip | | text | | translucent surface | |
| Callout | | label, message | | | |
| Input | placeholder (default) | text, icons | placeholder (focused, disabled) | label, hint, error | |
| InlineEditActions | | save and cancel icons | | | |
| SegmentedControl | hover | selected text and icon | default and disabled (bar) | translucent bar | |
| TabBar | | every state | | transparent tab surfaces | |
| MenuSelect | | every item state | default and disabled (menu) | | |
| Card | | title, body | | translucent surfaces | |
| Table | | header text | cell text (row, wrapper) | translucent wrapper | |
| CollapsibleSection | header icon | header label | | chromeless and hairline headers | |
| CodeSnippet | | code text, copy icon | hover icon | translucent surface | |
| SlidePager | control icons | | | inline counter | zoomed counter over scrim |
| SideNavigation | toggle and footer icons | labels beside grid | panel surface behind transparent states | | |
| SectionDivider | | title, description, eyebrow, hairline | | transparent default surface | |
| RadioButton | | | | labels, ring, dot | |
| Toggle | hover and on-hover thumbs | default and on thumbs | | label | |
| Slider | | fill, thumb | hover thumb | label, value | |
| ProgressBar | | fill | | label, value | |
| ImageLightbox | chrome icon (broken, see finding 6) | | | | chrome over scrim |
| VideoLightbox | badge icon | | close hover | | badge over footage, close over scrim |
| VideoFrame | badge icon | | | | badge over footage |

## Findings

1. **Backdrops stack.** A Card title paints on the header surface, over the card surface, over the page, and all three ship translucent. A Table cell paints on the stripe, over the row surface, over the wrapper, over the page. SideNavigation, SegmentedControl and MenuSelect stack the same way. Hover tints add one more translucent layer. A pair needs the whole stack.
2. **The page is the backdrop for 17 components.** Many surfaces ship transparent or translucent. The editor preview paints `--ui-surface-lowest` behind them by default, so the preview shows a color the live site never renders.
3. **One foreground can sit on several backdrops.** Notification's `-text` colors the dismiss icon on the header surface and the body text on the page. Input's placeholder sits on three state surfaces. ImageLightbox's `chrome-icon` paints icons (3:1) and extra-small counter text (4.5:1). SlidePager's counter sits on the page inline and on the scrim when zoomed. The Slider thumb overlaps fill, track and page.
4. **Kind does not identify the foreground.** Every `-icon` color is a text-color kind and takes the 3:1 non-text floor. Toggle thumbs, Slider fills and thumbs, Radio dots, the ProgressBar fill, MenuSelect's `-indicator`, SectionDivider's `-hairline-color` and CodeSnippet's scrollbar thumb are surface kinds that paint as foregrounds. Each pair has to declare its role.
5. **Some colors are hard-coded.** CollapsibleSection body text (`--text-secondary` on the mid-tone `--surface-neutral-higher`), the Dialog close and Notification dismiss hover colors, InlineEditActions' disabled state, and Card's header icon (set by the `iconColor` prop) bypass component tokens. The checker can measure them only as fixed pairs, and the editor cannot change them.
6. **The linked-first sort splits one pair today.** In ImageLightbox's chrome panel, surface is a linked kind and the icon is not, so the icon row drops below the zone divider, away from both surface rows.
7. **Two defaults rely on a border alone.** The Slider hover thumb defaults to the fill color and the disabled thumb to the disabled track color, a 1:1 pair in both cases.

## Decisions

Recorded 2026-10-09.

1. **Grouping stays.** No row moves between sections, panels or parts. The readout sits beside the foreground's color row, so a background change that breaks a pair shows up beside the text it broke.
2. **The readout always shows the ratio.** A passing pair shows the value. A failing pair turns amber and shows an exclamation mark with the value.
3. **The readout explains its rule.** Clicking the value or the exclamation mark opens a popover that names the rule it tracks, such as "3:1 contrast ratio, WCAG 2.2 success criterion 1.4.11", and links to that success criterion.
4. **Text and non-text pairs ship together.** Proposed default, awaiting confirmation.
5. **Hard-coded colors stay out** of the first pass and stay listed as token gaps (finding 5). Proposed default, awaiting confirmation.
6. **Open: preview backdrop.** The preview still paints `--ui-surface-lowest` behind transparent components, while page-backed readouts measure `--page-bg` (finding 2). The plan leaves the preview as it is.

## Proposal

### 1. Pair declarations

Each editor exports `contrastPairs` beside `allTokens` and `intrinsics`:

```ts
export type ContrastPair = {
  foreground: string;
  /** Component layers behind the foreground, top first. `--page-bg` always sits under the last one. */
  backdrop: string[];
  role: 'text' | 'non-text';
  /** Text only. Sets the large-text floor. */
  fontSize?: string;
  /** Text only. Normal weight when absent. */
  fontWeight?: string;
  /** Disabled state: the readout shows the ratio and applies no floor. */
  inactive?: boolean;
  /** Names the context when one foreground has several pairs ("inline", "zoomed"). */
  context?: string;
};
```

A separate export carries what a `Token` field cannot hold: backdrop stacks (finding 1), several backdrops per foreground (finding 3) and surface-kind foregrounds (finding 4). Editors build the list with the same per-variant functions that build their tokens.

A contract test pins the declarations:

- Every token of kind `text-color` in a registry schema is the foreground of at least one pair. Type-group colors reach the schema through `buildTypeGroupColorTokens`, so the rule covers them.
- Every foreground and backdrop variable belongs to the component's schema or names one of its intrinsics.
- Every text pair names its font size.

### 2. Readout

The palette selector renders the readout after the value name on any color row whose variable is the foreground of a pair. That covers the token grid, TypeEditor and the linked block with one change.

- **Passing:** `4.8:1` in the row's secondary text color.
- **Failing:** amber (`--ui-highlight`) exclamation mark and value, `! 2.9:1`.
- **Inactive:** the value in tertiary text. It never turns amber.
- **Several pairs on one foreground:** the readout shows the pair closest to failing.
- **Popover:** opens on a click on the value or the mark. For each pair it names the rule, the measured ratio and the backdrop layers, and it links to the success criterion. An inactive pair says that WCAG exempts disabled controls.

| Role | Criterion | Floor | Link |
|---|---|---|---|
| text | 1.4.3 Contrast (Minimum), AA | 4.5:1, large text 3:1 | https://www.w3.org/TR/WCAG22/#contrast-minimum |
| non-text | 1.4.11 Non-text Contrast, AA | 3:1 | https://www.w3.org/TR/WCAG22/#non-text-contrast |

### 3. Measurement

- Resolve each variable in the editor document through a probe element and a 1×1 canvas, the `pageHarness` method, moved into an editor module.
- Composite bottom-up: `--page-bg`, then each backdrop layer, then the foreground.
- A gradient layer is measured at each stop, and the readout reports the worst stop.
- A hover tint is one more layer in the stack. Its gate variable resolves to transparent when the tint is off.
- Large text uses the 24px and 18.66px/700 thresholds, measured at the size the editor computes. Those constants move from `pageHarness.ts` into `contrast.ts`, so the page check and the editor share one definition.
- Readouts recompute on every editor store change and on theme load.

## Follow-ups

- A default-theme test: every active pair clears its floor in the shipped theme. The declarations make it a loop over the registry. Findings 5 and 7 will likely surface there first.
- `check-component` learns `contrastPairs` for consumer components.
- A failing-pair count on each component's tab.
- Responsive type: a size token that aliases a responsive text style renders smaller on phones than the editor measures.
- Finding 6, the split ImageLightbox chrome rows.
- SC 2.4.13 Focus Appearance (AAA) has no component focus-ring token to measure.
- Separate bug, reported from motionproto-site: a gradient on a hover surface renders transparent, because hover rules read the slot through `background-color`.

## Plan

`docs/plans/contrast-checker.md` holds the waves.
