---
name: live-tokens-pick-component
description: Recommend which shipped @motion-proto/live-tokens component fits a UX need, with decision trees for the confusable pairs (SegmentedControl vs TabBar vs RadioButton vs MenuSelect; Card vs CollapsibleSection vs Dialog; Callout vs Notification vs Tooltip; Badge vs CornerBadge). Use when the user asks which / what component to use, should I use X or Y, what is the difference between two components, how do I show / let the user / capture / display some UX outcome, or starts to author a custom component before checking the catalogue. Read this before reaching for live-tokens-add-component. Not for actually placing the chosen component on a page (see live-tokens-build-page).
---

# Picking the right live-tokens component

This skill helps you choose between shipped components when several could plausibly fit. The catalogue is small enough to keep in your head once the decisions are explicit, and the right choice depends as much on *semantic intent* as on visual shape — a `RadioButton` set and a `SegmentedControl` can render identical-looking selection UIs but communicate different things.

For composing a page once you've picked the components, see [[live-tokens-build-page]]. For authoring a brand-new component because nothing in the catalogue fits, see [[live-tokens-add-component]] — but read this skill first to confirm nothing fits.

## Quick lookup by intent

| You want to…                                          | Use                                |
|-------------------------------------------------------|-----------------------------------|
| Trigger an action                                     | `Button`                          |
| Single-select 2–4 short options, always visible       | `SegmentedControl`                |
| Single-select many options, always visible            | `RadioButton` (rows) or `TabBar`  |
| Single-select from a dropdown                         | `MenuSelect`                      |
| Switch between tab panels (view changes below)        | `TabBar`                          |
| Capture text input                                    | `Input`                           |
| Display tabular data                                  | `Table`                           |
| Contain related content in a bordered surface         | `Card`                            |
| Hide secondary content behind a toggle                | `CollapsibleSection`              |
| Block the page for a confirmation                     | `Dialog`                          |
| Inline message scoped to a section                    | `Callout`                         |
| System-level dismissable message                      | `Notification`                    |
| Hover-anchored explanation                            | `Tooltip`                         |
| Small status pill (e.g. "Beta", "New")                | `Badge`                           |
| Indicator anchored to a parent corner                 | `CornerBadge`                     |
| Binary on/off setting                                 | `Toggle`                          |
| Determinate or indeterminate progress                 | `ProgressBar`                     |
| Visual section break with optional heading            | `SectionDivider`                  |
| Nested left-rail navigation                           | `SideNavigation`                  |
| Themed image with radius/border                       | `Image`                           |
| Click-to-zoom image                                   | `ImageLightbox`                   |

## Confusing pairs (and how to decide)

### Single-selection family: SegmentedControl vs TabBar vs RadioButton vs MenuSelect

All four pick one option from a set. The right one depends on **option count**, **whether the selection changes what's rendered below**, and **how much visual weight you want**.

| Component         | Best for                                                           | Visual weight | Option count |
|-------------------|--------------------------------------------------------------------|---------------|--------------|
| `SegmentedControl`| Inline switch between alternative *views of the same data*         | Compact pill  | 2–4          |
| `TabBar`          | Switching between *tab panels* (content area swaps below)          | Page-section  | 2–7          |
| `RadioButton`     | Form-style selection where the user reviews all options as text    | Form-row      | Any          |
| `MenuSelect`      | Hide the option set behind a dropdown to save vertical/horizontal space | Compact dropdown | Any         |

**Rules of thumb:**

- If the selection drives what's *visually rendered below* it (Overview / Activity / Settings tabs), it's a `TabBar`. The selection labels the panel.
- If the selection is just one of several settings on a configuration row (Day / Week / Month), it's a `SegmentedControl`. It looks like a control, not a tab.
- If the user is filling in a form and needs to read all options before picking, it's `RadioButton`. The labels deserve room to breathe.
- If options would overflow horizontally or there are too many to display at once, it's `MenuSelect`.
- **TabBar and SegmentedControl look similar but communicate differently.** TabBar implies "this changes the page"; SegmentedControl implies "this is one knob among others."

### Container family: Card vs CollapsibleSection vs Dialog

| Component             | Modality            | Use for                                                |
|-----------------------|---------------------|--------------------------------------------------------|
| `Card`                | Inline, always open | Default container for grouped content                  |
| `CollapsibleSection`  | Inline, toggleable  | Progressive disclosure inside a longer page            |
| `Dialog`              | Modal, blocks page  | Confirmations, focused tasks the page can't continue around |

**Rules of thumb:**

- Default to `Card`. It's the workhorse.
- Reach for `CollapsibleSection` only when the content is *legitimately secondary* — most users skip it, advanced users open it. Don't use collapse as a styling choice when the content matters.
- Reach for `Dialog` only when the page cannot meaningfully continue until the user decides. Destructive confirmations, payment, sign-in. Don't use it for routine forms — those go inline.

### Messaging family: Callout vs Notification vs Tooltip vs Toast vs Badge

| Component       | Scope          | Triggered by    | Dismissable | Use for                                              |
|-----------------|----------------|-----------------|-------------|------------------------------------------------------|
| `Callout`       | Section-inline | Always present  | No          | "Heads up about this section"                        |
| `Notification`  | System-level   | Event / save    | Yes         | "Your changes were saved"                            |
| `Tooltip`       | Element-inline | Hover / focus   | Auto        | Definition or hint anchored to an element            |
| `Badge`         | Element-inline | Always present  | No          | Status pill ("Beta", "New", "v2")                    |
| `CornerBadge`   | Element-corner | Always present  | No          | Position-anchored marker (count, status dot)         |

**Rules of thumb:**

- `Callout` is *content*. It's part of the section, written into the markup, says something important about what surrounds it. Variants (`info`, `success`, `warning`, `danger`) set the tone.
- `Notification` is *feedback*. It appears in response to an action, then either dismisses itself or the user dismisses it. Never write a Notification as static content.
- If the message is *what an element means*, use `Tooltip`. If it's *that something happened*, use `Notification`. If it's *information about the section*, use `Callout`.
- `Badge` and `CornerBadge` differ only in positioning. `CornerBadge` lives at a `top-right` / `bottom-left` / etc. anchor on a parent and is for things like notification counts or "NEW" stickers on a card.

### Toggle vs SegmentedControl vs RadioButton (for on/off)

All three can express a binary choice. The right one depends on what the choice *is*.

| Component          | Best for                                                          |
|--------------------|-------------------------------------------------------------------|
| `Toggle`           | A *setting* that's either on or off (notifications on/off, dark mode). The label names the setting; the switch shows the state. |
| `SegmentedControl` | A *choice between two named alternatives* (Light / Dark, List / Grid). Both labels are visible at once. |
| `RadioButton` pair | A *form-style choice* where the user reviews both labels before committing (Yes / No questions, opt-in selections). |

**Rules of thumb:**

- If the off and on states have the *same name* (the feature itself), it's a `Toggle`. "Email notifications" has no "off" label because the switch position is the state.
- If the two states have *different names* you want users to compare, it's a `SegmentedControl`. The labels carry meaning the switch position can't.
- A `Toggle` flips immediately; a `RadioButton` pair is for forms where the choice is part of a larger submission.

## Anti-patterns

- **Don't reach for a custom component before checking the catalogue.** The shipped set covers most needs; a custom component is a maintenance commitment.
- **Don't use `Dialog` for routine forms.** It interrupts. Inline `Card` is almost always better.
- **Don't use `Tooltip` as the primary location of important content.** Tooltips are auto-dismissed; they're not accessible for content the user must read.
- **Don't pick `SegmentedControl` when the option labels are long enough to wrap.** It loses its compactness. Use `RadioButton` rows instead.
- **Don't use `Notification` for static content.** It's for transient feedback; persistent messages belong in a `Callout`.

## When the answer is "none of these"

If you genuinely need something the catalogue doesn't offer (a `Slider`, a `DatePicker`, a `Stepper`, a custom widget), author it via [[live-tokens-add-component]]. Read that skill first; it walks the token-naming, state-model, and registration rules so your new component participates in the editor like the shipped ones do.
