# Editor token-list grouping review

Goal: break flat token lists in the component editors into logically named
groups (`frame`, `text`, `icon`, …) so each panel is easier to scan, the way
CodeSnippet now does (code / frame / icon / scrollbar).

Status: **clear wins implemented** (see below); medium/optional set still open.

## Implemented (2026-05-31)

Decisions taken: leave multi-part editors flat · CodeSnippet `code`→`text` ·
allow distinct singleton groups · roll out clear wins first.

- **CodeSnippet** — `code`→`text` rename; label `text color`→`color`.
- **ProgressBar** — fill / frame / label / value. Label & value typeGroups blanked (`legend: ''`).
- **Callout** (×4 variants) — frame / label / message. Legends blanked.
- **Tooltip** — frame / text. Legend blanked; `tooltip shadow`→`shadow`.
- **TabBar** — tab states → frame / icon / indicator / text; `bar` left flat.
- **Toggle** — `default` → track / thumb / label; `on` → track / thumb; thin states flat.
- **SegmentedControl** — `control bar` → frame / divider (both sizes); `selected option` → frame / icon / text; thin option states flat.

Medium set (also done):
- **InlineEditActions** — frame / text / icon (per button, both states).
- **Input** — `default`/`focused`/`disabled` → frame / icon / text; `field`/`label`/`hint`/`error` left flat.
- **MenuSelect** — `menu` → frame / item; item states → frame / icon / text (+ `indicator` on selected).

Verified: `npm run check` 0 errors.

Gotcha found: **do NOT pass `elementOrder` when any state in the VariantGroup
must stay flat.** StateBlock seeds `order` with every listed element
unconditionally, forcing grouped mode on (and dropping untagged tokens from) the
flat state. Control section order via token array order instead (typeGroups
always sort last, so a `text` typeGroup lands after the plain-token sections).

Still open: only the optional header/footer re-splits inside multi-part editors
(Dialog header, SideNavigation Toggle/Footer, CollapsibleSection header). These
were judged LEAVE FLAT in the survey; revisit only if a panel feels crowded.

---

(original proposal below)

## The key finding: two grouping mechanisms already exist

1. **Part/State strip** (top-level tabs in the editor): structural parts like
   Dialog's overlay/dialog/header/body/footer, Table's wrapper/header/cell/row/column,
   SideNavigation's Panel/Title/Toggle/Section/Item/Footer, CollapsibleSection's
   Container/Header/Body, MenuSelect's menu/item-states.
2. **`element` subsections within a state** (what CodeSnippet uses): partitions a
   single state's token list into labeled headings when ≥2 distinct `element`
   tags appear.

**These do the same job at different altitudes.** Where an editor already uses a
Part strip, each part *is* the element, surfaced one level up. Adding `element`
subsections inside those parts nests groups-in-groups and tends to over-segment
(e.g. "header › text", a 5-row state split into three 1–2 row headings).

So the policy that falls out of the survey:

> Add `element` grouping to **single-state / long-flat-list editors**. Leave
> **multi-part editors flat** — their Part strip is already the grouping.

## Standard vocabulary (proposed)

- `frame` — outer container: surface/background, border, border-width, radius, padding, gap, shadow, blur.
- `text` — a single text element's typography + color.
- `icon` — icon color / size / gap.
- Multiple distinct text elements → structural part names instead of `text`:
  `title`, `body`, `label`, `value`, `eyebrow`, `description`, `placeholder`, …
- Component-specific parts: `track`, `thumb`, `fill`, `divider`, `indicator`, `scrollbar`, …

Already-grouped editors are consistent with this: Badge/Button/CornerBadge use
`frame`/`text`; Card `frame`/`header`/`body`; Notification `frame`/`title`/`body`;
SectionDivider `eyebrow`/`title`/`description`/`hairline`.
**One outlier:** CodeSnippet uses `code` for its single text element where the
standard would be `text`. Decision needed (see Open questions).

## Recommendations per editor

### Group — clear wins (single-state or long-list)

| Editor | Proposed groups | Notes |
|---|---|---|
| **ProgressBar** | `frame` (track surface/border/border-width, radius, track height, label gap) · `fill` (color) · `label` (typeGroup) · `value` (typeGroup) | Strongest, cleanest. `fill` is a 1-token group but it's the defining property. |
| **Callout** (×4 variants) | `frame` (surface, border, border-width, accent edge width, radius, padding) · `label` (typeGroup) · `message` (typeGroup) | Two distinct text elements → `label`/`message`, not `text`. |
| **TabBar** (tab states) | `frame` (surface, top/bottom radius, border, border-width, padding) · `text` (typeGroup) · `icon` (size) · `indicator` (width, +color on active) | Leave the `bar` state flat. |
| **Toggle** (`default`, maybe `on`) | `track` (surface, border, border-width, radius, padding) · `thumb` (surface, border, size) · `label` (text + font props + gap) | Leave thin states (`hover`, `on hover`, `disabled`) flat. |
| **SegmentedControl** (`control bar`, `selected option`) | bar: `frame` · `divider`; selected: `frame` · `icon` · `text` | Leave the 1–3 row option states flat. |
| **Tooltip** | `frame` (surface, border, border-width, radius, padding, shadow) · `text` (typeGroup) | Lowest value (the typeGroup fieldset already separates text), but clean. |

### Group — medium value

| Editor | Proposed groups | Notes |
|---|---|---|
| **Input** (`default`/`focused`/`disabled` states) | `frame` (surface, border, border-width, placeholder) · `icon` (color, size) · `text` (input-text typeGroup) | Leave `field`, `label`, `hint`, `error` states flat. |
| **MenuSelect** | menu: `frame` (panel) · `item` (radius, padding); item states: `frame` (surface) · `icon` · `text` (+`indicator` on selected) | Several 1-token groups; item states' `frame` is a lone surface token. |
| **InlineEditActions** | `frame` (surface, border, border-width, radius, padding) · `text` (color) · `icon` (size) | `text` and `icon` are singletons — borderline. |

### Leave flat — Part strip already groups, or too small

- **Dialog** — 5-part strip (overlay/dialog/header/body/footer) is the grouping. Optional: re-split `header` into frame/icon/title.
- **CollapsibleSection** — Container/Header/Body parts. Optional: re-split Header.
- **SideNavigation** — Part strip does the work. Optional: group `Toggle`/`Footer` (frame/icon[/text]) only.
- **Table** — wrapper/header/cell/row/column states are the parts.
- **ImageLightbox** — tile/overlay/chrome parts; chrome's lone icon token not worth a heading.
- **RadioButton** — ~4 dot tokens + 1 label typeGroup per state; below threshold.
- **Image** — 4 frame-only tokens; nothing to partition against.

## Label trims (where a heading makes the prefix redundant)

Same idea as CodeSnippet (`icon color` → `color`). Apply within grouped editors:
- `icon color`/`icon size` → `color`/`size` under `icon`.
- `track *`/`thumb *` → drop the part prefix under `track`/`thumb` (Toggle).
- `divider color`/`divider width`/`divider inset` → `color`/`width`/`inset` (SegmentedControl).
- `track surface color` etc. → `surface color` under `frame` (ProgressBar).
- `tooltip shadow` → `shadow`; `fill color` → `color`; `indicator width` → `width`.

## Technical caveats (from StateBlock)

- Once a state has ≥2 distinct `element` tags, **every** token (and typeGroup) in
  that state must be tagged, or untagged ones render in no subsection.
- Element order defaults to first-encounter (tokens, then typeGroups). To force
  permanent→impermanent, order the source array or pass `elementOrder`.
- A typeGroup's `legend` will duplicate the section heading when its `element`
  matches the legend (e.g. legend "tooltip text" under a `text` heading) — blank
  or trim the legend when grouping.
- A given variable must carry the **same** `element` across all states it appears in.

## Open questions for sign-off

1. **Policy confirm:** group single-state/long-list editors, leave multi-part
   (Part-strip) editors flat? (My recommendation.)
2. **CodeSnippet `code` → `text`?** Rename for vocabulary consistency, or keep
   `code` as more descriptive?
3. **Singleton headings:** allow 1-token groups when semantically distinct
   (`fill`, `indicator`, a lone `text` color), or fold them into a neighbor?
4. **Optional re-splits** (Dialog/CollapsibleSection/SideNavigation header/footer
   panels) — in or out of scope?
5. **Rollout:** one PR for all, or land the clear wins first
   (ProgressBar, Callout, TabBar, Toggle, Tooltip, SegmentedControl) and revisit
   the medium/optional set after seeing them in the editor?
