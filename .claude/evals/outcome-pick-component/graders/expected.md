Reference table for `criteria.md`. Not itself a grader.

| # | Expected id | Variant | Key props | Note |
|---|---|---|---|---|
| 1 | `button` | `primary` | n/a | The word carries the action; `danger` is wrong here, nothing is destroyed. |
| 2 | `segmentedcontrol` | n/a | `segments` with the two view labels | Inline, among other controls, same data. |
| 3 | `tabbar` | n/a | `tabs` with the five report names | The content area below swaps. |
| 4 | `radiobutton` | n/a | one `RadioButton` per shipping method, each `label` carrying its eligibility line | Read as text inside a form, not a row of short labels. |
| 5 | `input` | `type: 'text'` (default) | `label` | No predefined list. |
| 6 | `slider` | `single` | `min: 0`, `max: 2000` | One number; `range` would be two. |
| 7 | `toggle` | n/a | `label: 'Email notifications'` | One name for both states rules out `RadioButton` yes/no. |
| 8 | `notification` | `success` | `dismissible` optional | Confirms an outcome; `Callout` is wrong, it stays present and isn't about an event. |
| 9 | `dialog` | n/a | `confirm` set to a `danger`-variant `Button` (e.g. `{ label: 'Delete', variant: 'danger' }`) | The trap is a bare danger `Button`; `danger-without-dialog` requires the Dialog. |
| 10 | `table` | n/a | rows for the 40 orders | Reader compares records; not one `Card` per item. |
| 11 | none | none | none | Every single-selection component picks one value. A multiple selection has nothing shipped; the answer routes to **live-tokens-create-component**. Naming `menuselect` here is a fail. |
| 12 | none | none | none | No shipped component filters a list by typing. The picker names two outs: `Input` with validation, or author a filtering select with **live-tokens-create-component**. Either is acceptable; inventing a filtering `MenuSelect` is a fail. |
