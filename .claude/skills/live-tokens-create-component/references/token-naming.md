# Suffix vocabulary

The editor picker is chosen by suffix. There is no per-token override; if a
token renders with the wrong picker, rename it to one of these.

`KNOWN_SUFFIXES` in `bin/check-component.mjs` is authoritative, and
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
| `-divider`  | Divider / separator color                                     |
| `-color`    | Generic color, when none of the above name the role           |
| `-shadow`   | Box-shadow                                                    |
| `-opacity`  | Opacity (0–1)                                                 |
| `-blur`     | Backdrop or filter blur radius                                |
| `-tint`     | A wash over the surface, aliasing a `--tint-*` stop            |
| `-background` | Fill, where the component's own vocabulary says background   |
| `-accent`   | An accent bar or indicator's colour                            |
| `-indicator` | A selection indicator's colour                                |
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
| `-thickness`    | Alternative to `-width` when fallback siblings would collide  |
| `-accent-width` | An accent bar's thickness                                     |
| `-hairline-thickness` | A hairline rule's thickness                             |
| `-dot-size`     | A dot indicator's diameter                                    |
| `-divider-width` | A divider's thickness                                        |
| `-divider-thickness` | Alternative to `-divider-width`                          |
| `-divider-height` | A divider's length                                          |
| `-divider-inset` | Inset trimmed from a stretched divider                       |
| `-track-height` | A track's height (progress bar, slider)                       |
| `-icon-size`    | An icon's rendered size                                       |
| `-thumb-size`   | A thumb's rendered size                                       |
| `-height`       | A measured height (a track, a panel)                          |
| `-margin`       | Outer spacing, moved on the same scale as `-padding`          |
| `-inset`        | Inset trimmed from a stretched element                        |
| `-duration`     | Motion duration                                               |
| `-easing`       | Motion easing curve                                           |
| `-scale`        | A transform scale factor                                      |
| `-width`        | Width dimension                                               |
| `-size`         | Square / uniform dimension                                    |
| `-padding`      | Internal spacing                                              |
| `-gap`          | Spacing between sibling elements                              |

## Typography

| Suffix             | Meaning                  |
|--------------------|--------------------------|
| `-font-family`     | Font family reference    |
| `-font-weight`     | Font weight reference    |
| `-font-size`       | Font size reference      |
| `-line-height`     | Line height              |
| `-letter-spacing`  | Letter spacing           |

A suffix you need that is not here is either a rename away from one that is, or
an issue against `@motion-proto/live-tokens`. Inventing one costs the token its
picker: the editor falls back to a plain text input.
