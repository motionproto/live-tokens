# Suffix vocabulary

The editor picker is chosen by suffix. There is no per-token override; if a
token renders with the wrong picker, rename it to one of these.

`KIND_RULES` in `src/editor/core/components/aliasKinds.ts` is authoritative, and
`check-component` fails on a suffix outside it. `check:skills` holds this file
to that list, so the two cannot drift apart.

## Color and surface

| Suffix      | Meaning                                                       |
|-------------|---------------------------------------------------------------|
| `-surface`  | Fill / background color                                        |
| `-border`   | Border color                                                  |
| `-text`     | Text color                                                    |
| `-icon`     | Icon color                                                    |
| `-label`    | Label text color                                              |
| `-fill`     | Inner fill (distinct from outer surface)                      |
| `-color`    | A hairline rule's colour, or a color no role word above names |
| `-shadow`   | Box-shadow                                                    |
| `-blur`     | Backdrop or filter blur radius                                |
| `-tint`     | A wash over the surface, aliasing a `--tint-*` stop            |
| `-indicator` | The colour of the bar or stripe that marks an item             |
| `-thumb`    | A scrollbar or slider thumb's colour                           |
| `-title`    | Title text colour                                              |
| `-body`     | Body text colour                                               |
| `-eyebrow`  | Eyebrow text colour                                            |
| `-description` | Description text colour                                     |
| `-hint`     | Hint text colour                                               |
| `-error`    | Error text colour                                              |
| `-placeholder` | Placeholder text colour                                     |
| `-value`    | A displayed value's colour                                     |

## Geometry

| Suffix          | Meaning                                                       |
|-----------------|---------------------------------------------------------------|
| `-radius`       | Corner radius                                                 |
| `-border-width` | Stroke thickness (used even when CSS uses `outline:`)         |
| `-indicator-width` | An indicator's thickness                                  |
| `-hairline-width` | A hairline rule's thickness                               |
| `-dot-size`     | A dot indicator's diameter                                    |
| `-hairline-inset` | Inset trimmed from a stretched hairline                     |
| `-track-height` | A track's height (progress bar, slider)                       |
| `-icon-size`    | An icon's rendered size                                       |
| `-thumb-size`   | A thumb's rendered size                                       |
| `-height`       | A measured height (a track, a panel)                          |
| `-margin`       | Outer spacing, moved on the same scale as `-padding`          |
| `-duration`     | Motion duration                                               |
| `-easing`       | Motion easing curve                                           |
| `-scale`        | A transform scale factor                                      |
| `-width`        | Width dimension                                               |
| `-size`         | Square / uniform dimension                                    |
| `-padding`      | Internal spacing                                              |
| `-gap`          | Spacing between sibling elements                              |

`-width`, `-height` and `-size` are the fall-through: any dimension with no
more specific name behind it. They read the `--space-*` scale through the same
picker `-gap` uses, and they match last, so `-border-width`, `-hairline-width`,
`-icon-size` and the rest claim their token first. Reach for the specific name
when one fits; a stroke is `-border-width` even where the CSS says `outline:`.

## Typography

| Suffix             | Meaning                  |
|--------------------|--------------------------|
| `-font-family`     | Font family reference    |
| `-font-weight`     | Font weight reference    |
| `-font-size`       | Font size reference      |
| `-line-height`     | Line height              |
| `-letter-spacing`  | Letter spacing           |

A suffix that is not here is either a rename away from one that is, or
an issue against `@motion-proto/live-tokens`. Inventing one costs the token its
picker: the editor falls back to a plain text input.
