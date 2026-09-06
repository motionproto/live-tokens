# Interaction sources

Read this when a Verify read or an emphasis rule in SKILL.md needs its reason.
Each principle below is held by one of three parties. A shipped component
holds it when the component's own design answers it, so the page's rule is
the component and pick-component names the test. The page holds it when only
the page can get it right, so SKILL.md states a read or the checker a rule.
The product holds it when no page decision touches it, and the row says so
to keep a later edit from reopening it.

## Jakob Nielsen, ten usability heuristics

| Heuristic | Holder | Rule in SKILL.md, or the component |
|---|---|---|
| Visibility of system status | Page | Verify: an action that runs longer than a moment shows progress in a `ProgressBar` or a `Notification`. |
| Match between system and the real world | Page | Verify: labels use the user's words. |
| User control and freedom | Page | Verify: every row of actions holds an exit in `outline`. Emphasis: `outline` is an action that undoes or leaves. |
| Consistency and standards | Page | One size, one primary action, type by place. The components carry the rest. |
| Error prevention | Page | Verify: an action that destroys saved work confirms in a `Dialog`; the checker's `danger-without-dialog`. Verify: every field has a default and Reset restores it. |
| Recognition rather than recall | Component | `MenuSelect` lists the options; `Input` carries its label and hint; `Tooltip` defines in place. |
| Flexibility and efficiency of use | Product | Shortcuts and customisation are product decisions. |
| Aesthetic and minimalist design | Page | Layout: each mark does a job no other mark does. Verify: secondary settings sit in a `CollapsibleSection`. |
| Help users recognise, diagnose, and recover from errors | Component | `Input` carries the error line; `Callout variant="danger"` carries a section's. |
| Help and documentation | Product | Contextual help is a product decision. |

The complex-application version of the ten (Kaley, Nielsen Norman Group)
describes a tool with a stage and controls, which is the tool page SKILL.md
lays out. Its additions that the page holds: a wait past ten seconds shows
steps done and steps left, and the stage is the live preview of every
control. Undo, version history, and autosave are the product's.

## Bruce Tognazzini, first principles of interaction design

| Principle | Holder | Rule in SKILL.md, or the component |
|---|---|---|
| Anticipation | Page | Layout: show related items side by side; do not put them behind a toggle. |
| Colour | Component | `Callout`, `Badge`, and `Notification` carry an icon or text beside the colour. |
| Consistency | Page | One size, one primary action. |
| Defaults | Page | Verify: every field has a default and Reset restores it. |
| Discoverability | Page | Verify: no control is hidden in the content area. |
| Explorable interfaces | Page | Verify: every row of actions holds an exit. |
| Fitts's law | Component | The shipped default is the large target; SKILL.md's one-size rule keeps it. A toolbar sits on the band's bottom edge. |
| Protect users' work | Page | Verify: an action that destroys saved work confirms in a `Dialog`. |
| Readability | Component | live-tokens-set-colors gates every text pair at WCAG AA. |
| Simplicity | Page | Verify: secondary settings sit in a `CollapsibleSection`; no capability is removed for the sake of simplicity. |
| Visible navigation | Component | `SideNavigation` follows the current path. |
| Aesthetics, Autonomy, Efficiency of the user, Human-interface objects, Latency reduction, Learnability, Metaphors, State | Product | Measured, engineered, or researched outside a page. |

Sources:

- Nielsen, 10 Usability Heuristics for User Interface Design (1994, updated 2024). https://www.nngroup.com/articles/ten-usability-heuristics/
- Kaley, 10 Usability Heuristics Applied to Complex Applications. https://www.nngroup.com/articles/usability-heuristics-complex-applications/
- Tognazzini, First Principles of Interaction Design (revised 2014). https://asktog.com/atc/principles-of-interaction-design/
