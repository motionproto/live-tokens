# Layout sources

Read this when a layout decision in SKILL.md needs its reason. Each law in the
Layout section comes from one of these sources. The sources are for layout and
hierarchy only. Do not take color or type opinions from them: the theme owns
those.

## Edward Tufte

Tufte wrote about information graphics. His laws apply to a page because a page
is an information display with controls on it.

| Law | Statement | Rule in SKILL.md |
|---|---|---|
| Smallest effective difference | Make all visual distinctions as subtle as possible, but still clear and effective. | Separate with space first, then a hairline rule, then a second surface. |
| 1+1=3 | Two heavy marks side by side make a third mark: the space between them. | A section of containers with borders and header bars reads as a set of posters. |
| Layering and separation | Put data on top, labels next, and scaffolding faintest. | Content, labels, and chrome each take their own token. |
| Administrative debris | The metaphor for the interface is the information. Remove the chrome that the tool adds for itself. | The stage takes the space. Controls take their shipped default. |
| Spatial over temporal | Show information adjacent in space. A control that hides it stacks it in time. | Show related items side by side. Frames in a strip are small multiples. |
| Erase non-data ink | Remove each mark that carries no information. | The Verify question: does the page lose information when this element is removed? |
| Micro and macro readings | A good display reads at a distance and up close. | Verify from a distance, then closely. |

Sources:

- Envisioning Information (1990): layering and separation, small multiples, micro and macro. https://www.edwardtufte.com/book/envisioning-information/
- The Visual Display of Quantitative Information (1983): data-ink, chartjunk.
- iPhone interface design, edwardtufte.com notebook: administrative debris, spatial over temporal. https://www.edwardtufte.com/notebook/iphone-interface-design/

## Josef Müller-Brockmann

Grid Systems in Graphic Design (1981) is the discipline behind the page column
grid. The grid does the separating, so an element needs no border to show
where it sits. His stated aim is compact planning, intelligibility, and
clarity. That is Tufte's aim in a typographer's words.

## Refactoring UI

Adam Wathan and Steve Schoger, Refactoring UI (2018), turns both into working
rules for product screens:

- Put more space around a group than within it.
- Start with too much white space, then remove some.
- Use fewer borders. Separate with space, a shadow, or a second background.
- Emphasize by de-emphasizing the secondary content.
- Labels are a last resort.
- Keep a spacing scale where no two steps are closer than a quarter. The `--space-*` scale is that scale.

https://www.refactoringui.com/

## Material Design 3, canonical layouts

The Page layouts table takes its rows from Material's canonical layouts.

| Layout | Statement | Row in SKILL.md |
|---|---|---|
| Supporting pane | The primary area takes about two thirds of the window; the secondary pane takes the rest. At compact width the pane moves below the main content. | Main with a supporting pane, two thirds and one third; the stacking sentence. |
| List-detail | The list and the detail of the selected item sit side by side at expanded width. | List with detail. |
| Feed | Equivalent items in an adaptive grid. | Grid of equals. |

https://m3.material.io/foundations/layout/canonical-examples/overview
https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts

## Cloudscape patterns

| Pattern | Statement | Rule in SKILL.md |
|---|---|---|
| Dashboard | Three areas top to bottom: overview, data, support. "Consider seven as the limit number for data representation." | Verify: the first section holds what the user came for. Grid of equals: up to seven per section. |
| Single-page create | One container; the essential fields first and few; secondary inputs in an expandable section; cancel then submit at the bottom. | Containers: a form. Single column. |
| Details page | The title with its actions, then a summary, then related blocks. | Stacked sections. |
| Empty state | A heading, an optional line, and one action. "Always provide an action." Errors go elsewhere. | Containers: an empty stage. |

https://cloudscape.design/patterns/general/service-dashboard/static-dashboard/
https://cloudscape.design/patterns/resource-management/create/single-page-create/
https://cloudscape.design/patterns/resource-management/details/details-page/
https://cloudscape.design/patterns/general/empty-states/

## Matthew Butterick, line length

"45 to 90 characters per line, including spaces." The Separation paragraph and the Verify check carry the measure, and the half-width copy span holds it at body size.

https://practicaltypography.com/line-length.html

## Nielsen Norman Group, proximity

"Proximity is one of the most important grouping principles and can overpower competing visual cues such as similarity of color or shape." Space inside a group is smaller than space between groups. An unrelated action inside a group is camouflaged, so a `danger` Button sits apart from the toolbar group.

https://www.nngroup.com/articles/gestalt-proximity/
