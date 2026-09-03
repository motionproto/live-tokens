# build-page gap analysis

A consumer (Robosprite, a sprite-sheet studio) asked for its Studio page to be
rearranged: frames and preview on top, inputs below, smaller type. The first
pass followed `live-tokens-build-page` and passed `check-page`,
`check-component --strict`, and `svelte-check`, and the result was still
wrong. This records what the skill could not say and what now closes each gap.

## Findings

| # | What went wrong | Why the skill allowed it | Closed by |
|---|---|---|---|
| 1 | The page was placed column by column with no top-to-bottom shape, so the preview and the action rail fought for the right column and the inputs had no bottom edge. | Layout began at the column grid. | *Layout* opens with bands: name each by its job, stage on top, toolbar on the bottom edge, a rule between bands, boxes stretched to one height. |
| 2 | Every box was a `Card` with its header bar, and the headers read as huge. | The skill named `Card` as the container and said nothing about what its header is typed at, or what a tool box wants instead. | *Containers by job*: a card header is typed by `--card-default-title-*` at 2xl; a tool box is `variant="bare" size="compact"` with its own text-style label; a toolbar has no card. |
| 3 | Seven full-width default-size buttons stacked in a rail. | No guidance on control size or on when `fullWidth` applies. | *Density*: `size="small"` in toolbars and compose rows, `fullWidth` only in a rail, project wrappers forward `size`. |
| 4 | Status text inside a card ran at 20px because it inherited the card body size. | The skill covered text in `p`/`li` under the slot-prose pin, and left own elements to inherit. | *Density*: text in your own elements inside a card sets a text style of its own. |
| 5 | The Discuss panel showed the model list permanently open. | `pick-component` called `MenuSelect` a compact dropdown; it renders open. | `pick-component` row corrected; *Density* shows the toggle pattern. |
| 6 | A `width: 100%` textarea overflowed its card by its padding. Every check was green. | Nothing asks for a look at the rendered page. | *Verify* adds a band-by-band read at the real width before moving on. |

## Left open

- **Card's default title and body sizes.** `--card-default-title-font-size`
  is `--font-size-2xl` and `--card-default-body-font-size` is
  `--font-size-xl`, which sits above `body-md`. Re-pointing a component
  token at a text style (`--heading-sm-font-size`) is not the fix: the
  editor's size picker enumerates `--font-size-*` only, and
  `docs/semantic-text-styles-plan.md` keeps component labels in component
  territory. The open decision is whether the shipped defaults should drop
  a step (title lg, body md), which is a visible change for every consumer
  and belongs in a release with a breaking heading.
- **A checker rule for it.** A band whose boxes end at different heights or
  a label larger than body copy is a rendered fact, and no
  static rule sees it. The skill asks for eyes instead.
