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
| `-enabled`  | Gate for an optional interaction: its off value, or its on one |

## Geometry

| Suffix          | Meaning                                                       |
|-----------------|---------------------------------------------------------------|
| `-radius`       | Corner radius                                                 |
| `-border-width` | Stroke thickness (used even when CSS uses `outline:`)         |
| `-thickness`    | Alternative to `-width` when fallback siblings would collide  |
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
