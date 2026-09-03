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
| 1+1=3 | Two heavy marks side by side make a third mark: the space between them. | A band of boxes with borders and header bars looks like a set of posters. |
| Layering and separation | Put data on top, labels next, and scaffolding faintest. | Content, labels, and scaffolding each take their own token. |
| Administrative debris | The metaphor for the interface is the information. Remove the chrome that the tool adds for itself. | The stage takes the space. Controls take the smallest size that still works. |
| Spatial over temporal | Show information adjacent in space, not stacked in time behind controls. | Show related items side by side. Frames in a strip are small multiples. |
| Erase non-data ink | Remove each mark that carries no information. | The Verify question: does the page lose information if this element is removed? |
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
