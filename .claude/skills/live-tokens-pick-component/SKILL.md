---
name: live-tokens-pick-component
description: Recommend which shipped @motion-proto/live-tokens component fits a UX need, with a decision test for each confusable family. Called by live-tokens-create-page when more than one component could fit, and by live-tokens-create-component before it authors anything. Use when the user asks which component to use, or what the difference between two components is. Use when the user asks how to show or capture a UX outcome. Edits no file. For size, emphasis, or placement, read live-tokens-create-page. When the catalogue lacks a component with chrome, read live-tokens-create-component.
---

# Picking a live-tokens component

When more than one shipped component could fit, find the family below that names the candidates. Apply its test, which asks what the choice means to the reader.

## Catalogue

Before choosing, run `npx live-tokens components`. The list holds every component the project has, shipped and custom, with each one's variants and usage comment. The family tests below name the shipped set only. Weigh a custom component by the same tests.

## Action family

- The action needs a word to be unambiguous: `Button`.
- The glyph alone is plain (close, edit, delete) and space is short: `IconButton`.
- The pair that confirms or cancels an inline edit: `InlineEditActions`.

## Single-selection family

Four components pick one option from a set. The test is the option count, whether the selection swaps the content below, and how much the choice asks of the reader.

| Component | Test | Option count |
|---|---|---|
| `SegmentedControl` | An inline switch between views of the same data. It sits in a row of controls. | 2 to 4 |
| `TabBar` | The content area below swaps. | 2 to 7 |
| `RadioButton` | The reader reads every option as text inside a larger form. | any |
| `MenuSelect` | The options would overflow a row. | any |

- When a label would wrap in a `SegmentedControl`, use `RadioButton` rows.
- The URL changes: `SideNavigation`. Sections inside one page: `TabBar`.

## Text entry

The test is whether the answer comes from a predefined list of options.

- A predefined list (a status, a currency, a size, a country): the single-selection family, by its own test. Up to four options sit in a row; more go in a `MenuSelect`, which scrolls.
- No list (a name, a search string, an amount, a message, a street address): `Input`. Validation keeps a typed answer well-formed.
- A long list the reader would rather filter by typing (a city): no shipped component filters a list. Use `Input` with validation, or author a filtering select with **live-tokens-create-component**.
- A number where the position on a track carries the meaning (a volume, a price band, a percentage): `Slider`. A number the reader knows and would rather type: `Input` with `type="number"`.

## On and off

Three components express a binary choice. The test is whether the two states have names of their own.

| Component | Test |
|---|---|
| `Toggle` | A setting that takes effect at once. The label names the setting. The switch position is the state. |
| `SegmentedControl` | Two named alternatives the reader compares (Light / Dark, List / Grid). Both labels show at once. |
| `RadioButton` pair | A yes or no the reader answers inside a larger form. |

When the two states share the feature's one name, use `Toggle`. "Email notifications" has no "off" label.

## Container family

Four components hold a block of content. The test is what the block is to the reader: one item, a section of the page, secondary content that stays collapsed until opened, or a decision.

| Component | Modality | Test |
|---|---|---|
| `Card` | Inline, always open | One item, or each item in a set: a product, a record, a plan. It has a title and can react to hover. |
| `Panel` | Inline, always open | One section of the page's content in a frame: a stage, a list, a form, a block of copy. `minHeight` holds its height while the content changes. |
| `CollapsibleSection` | Inline, collapsed until the reader opens it | Secondary content most readers skip. |
| `Dialog` | Modal, blocks the page | A decision the page cannot continue without: a destructive confirmation, payment, sign-in. |

A set of items is one `Card` per item. A routine form goes inline in a `Panel`.

## Messaging family

Five components carry a message. The test is what the message is about, what brings it on, and whether the reader dismisses it.

| Component | Scope | Trigger | Dismissable | Test |
|---|---|---|---|---|
| `Callout` | A section | Always present | No | Something the reader must know about the content around it |
| `Notification` | The system | An action or event | Yes | Feedback about something that just happened |
| `Tooltip` | An element | Hover or focus | On leave | A definition or hint the reader can do without |
| `Badge` | An element | Always present | No | A standing label read at a glance ("Beta", "New", "v2") |
| `CornerBadge` | A parent's corner | Always present | No | A count or status marker on the thing it describes |

`Badge` and `CornerBadge` differ in position only.

## Display family

Each pair holds a block the reader views and one the reader interacts with. The test is which of the two the page needs.

- A picture the page shows: `Image`. A picture whose detail the reader must open, or a gallery: `ImageLightbox`.
- Records the reader scans and compares: `Table`. A set of items the reader acts on: one `Card` per item.
- A read-out of progress: `ProgressBar`. A number the reader sets: `Slider`.
- Text the reader runs or pastes (an install command, a key, an id): `CodeSnippet`. Prose the reader only reads: a paragraph in its `Card` or `Panel`.
- A titled break between the sections of one page: `SectionDivider`. Movement between pages: `SideNavigation`.

## Nothing fits

A native element with no chrome of its own needs no component: an `<input type="file">` behind a Button, a `<canvas>`, an `<img>` inside a stage. When nothing in the catalogue fits a piece with chrome (a `DatePicker`, a `Stepper`), author the component with **live-tokens-create-component**. Size, emphasis, and placement are **live-tokens-create-page**'s.

`npx live-tokens components <id>` prints one component's usage comment, its declared props, and the values each union accepts. `--json` returns the same as data.
