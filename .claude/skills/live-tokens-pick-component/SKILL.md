---
name: live-tokens-pick-component
description: Recommend which shipped @motion-proto/live-tokens component fits a UX need, with a decision test for each confusable family (SegmentedControl / TabBar / RadioButton / MenuSelect, Card / CollapsibleSection / Dialog / Panel, Callout / Notification / Tooltip / Badge, and others). Use when the user asks which component to use, should I use X or Y, what the difference between two components is, how to show or capture some UX outcome, or starts authoring a custom component before checking the catalogue. Read this before live-tokens-create-component. Size, emphasis, and placement are live-tokens-build-page's.
---

# Picking a live-tokens component

Choose between shipped components when several could fit. A `RadioButton` set and a `SegmentedControl` render alike and say different things. The test for each family below is what the choice means to the reader. Each component states its own job in its usage comment. `npx live-tokens components <id>` prints that comment, the declared props, and the values each union accepts. `--json` returns the same as data.

## Catalogue

Action: `Button`, `IconButton`, `InlineEditActions`. Input: `Input`, `Slider`. Selection: `SegmentedControl`, `TabBar`, `RadioButton`, `MenuSelect`, `Toggle`. Containers: `Card`, `CollapsibleSection`, `Dialog`, `Panel`. Messaging: `Callout`, `Notification`, `Tooltip`, `Badge`, `CornerBadge`. Display: `Table`, `Image`, `ImageLightbox`, `ProgressBar`, `SectionDivider`, `SideNavigation`, `CodeSnippet`.

That line is the shipped set. A project can register components of its own, and those never appear in this file. Run `npx live-tokens components` before choosing. It lists every component the project has, shipped and custom, with each one's variants and the job its comment states. A custom component is weighed against the shipped set on the same footing.

## Action family

- The action needs a word to be unambiguous: `Button`.
- The glyph alone is plain (close, edit, delete) and space is short: `IconButton`, with an `ariaLabel`.
- The pair that confirms or cancels an inline edit: `InlineEditActions`. Every inline edit on the page then resolves the same way.

## Single-selection family

Four components pick one option from a set. The test is the option count, whether the selection swaps what renders below, and how much weight the choice carries.

| Component | Test | Option count |
|---|---|---|
| `SegmentedControl` | An inline switch between views of the same data; one switch among others in a row | 2 to 4 |
| `TabBar` | The content area below swaps; the choice changes the page | 2 to 7 |
| `RadioButton` | The reader reviews every option as text before committing to a larger form | any |
| `MenuSelect` | The options would overflow a row; the list renders open, so a Button toggles it | any |

- Labels long enough to wrap rule out `SegmentedControl`. Use `RadioButton` rows.
- The URL changes: `SideNavigation`. Panels inside one page: `TabBar`.

## Text entry

- The page cannot list the answers (a name, an email, a search string, an amount): `Input`. Its label, hint, and error line are parts. A validation message goes in the `error` variant.
- A short fixed set is the single-selection family. A long fixed set is `MenuSelect`.
- A number where the position on a track carries the meaning (a volume, a price band, a percentage): `Slider`. The `range` variant takes a low and a high bound on one track. A number the reader knows and would rather type: `Input` with `type="number"`.

## On and off

Three components express a binary choice. The test is what the choice is.

| Component | Test |
|---|---|
| `Toggle` | A setting that is on or off. The label names the setting; the switch shows the state. It takes effect at once. |
| `SegmentedControl` | Two named alternatives the reader compares (Light / Dark, List / Grid). Both labels show at once. |
| `RadioButton` pair | A yes or no the reader answers inside a larger form. |

When the off and on states share a name (the feature itself), it is `Toggle`. "Email notifications" has no "off" label because the switch position is the state.

## Container family

| Component | Modality | Test |
|---|---|---|
| `Card` | Inline, always open | Grouped content the page shows. The default. |
| `CollapsibleSection` | Inline, toggleable | Secondary content most readers skip. |
| `Dialog` | Modal, blocks the page | A decision the page cannot continue without: a destructive confirmation, payment, sign-in. |
| `Panel` | Inline, fixed stage | A demo, preview, or live example whose height must not move the page. |

- A routine form goes inline in a `Card`, never in a `Dialog`.
- Content that matters stays open. Collapse is for secondary content, never a styling choice.
- Full-bleed media in a `Card` takes `flush` with `prose={false}`. Cover art, a poster, and a chart that reaches its own border are full-bleed. Never zero the card's padding tokens from the page.

## Messaging family

| Component | Scope | Trigger | Dismissable | Test |
|---|---|---|---|---|
| `Callout` | A section | Always present | No | Something the reader must know about the content around it |
| `Notification` | The system | An action or event | Yes | Feedback about something that just happened |
| `Tooltip` | An element | Hover or focus | Auto | A definition or hint the reader can do without |
| `Badge` | An element | Always present | No | A standing label read at a glance ("Beta", "New", "v2") |
| `CornerBadge` | A parent's corner | Always present | No | A count or status marker on the thing it describes |

- A persistent message is a `Callout`, never a `Notification`.
- Content the reader must not miss never lives in a `Tooltip`.
- `Badge` and `CornerBadge` differ in position only.

## Display family

- A picture the page shows: `Image`. A picture whose detail the reader must open, or a gallery: `ImageLightbox`. It puts a modal behind every picture it wraps.
- Records the reader scans and compares: `Table`. A set of things the reader acts on: a stack of `Card`s.
- A read-out of progress: `ProgressBar`. A number the reader sets: `Slider`.
- Text the reader runs or pastes (an install command, a key, an id): `CodeSnippet`. Prose the reader only reads: `Card`.
- A titled break between the sections of one page: `SectionDivider`. Movement between pages: `SideNavigation`.

## Nothing fits

When nothing in the catalogue fits (a `DatePicker`, a `Stepper`, a custom widget), author it with **live-tokens-create-component**. A custom component is a maintenance commitment, so confirm the catalogue first. Placement on the page, emphasis, and size are **live-tokens-build-page**'s.
