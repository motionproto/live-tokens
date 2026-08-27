---
name: live-tokens-pair-fonts
description: Choose and apply a Google Fonts pairing for a live-tokens theme, binding families to the shipped --font-* stacks. Use whenever the user asks to pair fonts, pick a typeface, change or set the fonts, or describes type by voice: what font should the headings use, make the type more editorial, friendlier, more technical, more elegant, a serif for headings, a display font for this theme, less generic type, match the fonts to the theme. Also invoked by live-tokens-generate-theme for the type half of a whole look. Changes type only, never color. Not for a single token (use the editor) or for color (see live-tokens-generate-theme).
---

# Pairing fonts for a theme

You choose the families; the CLI verifies each against Google Fonts, builds the URL from the weights the family actually has, and writes the result into the unsaved buffer. Never hand-author font JSON and never edit the data tree directly. Google Fonts is the pool because it is freely licensable and loads by URL; other sources go in by hand through the editor's Project fonts section.

## Workflow

1. Choose the pairing with the framework below and write a brief to `scratch/font-brief.json`.
2. Run `npx live-tokens set-fonts scratch/font-brief.json`. It prints each stack that moved, each family's real weights and URL, and the weights your typography tokens ask for that the family lacks.
3. Read the report. A weight gap is a quality note: name it and offer an alternative only if it matters (a body face without 400, 700, or italic matters; a display face without 300 does not). A family not on Google Fonts fails the run; fix the spelling and re-run.
4. Tell the user to reload the editor page before saving. A running editor holds its own copy of the buffer this CLI just wrote and never re-reads it, so a Save without a reload writes the stale copy back and the pairing vanishes with a success report still on screen. After the reload the type is on the page, and unsaved until they save the open theme.

State your reasoning when you propose the pairing: each face's form model and the matrix verdict, in one sentence, so the user can argue with the argument rather than only the result.

Flags: `--dry-run` reports without writing. `--no-verify` skips the network and requires an explicit URL per family; use it only offline with a URL in hand.

## The brief

```json
{ "display": "Fraunces", "body": "Nunito Sans" }
```

Every slot is optional and an omitted slot is left exactly as it is. `display` is `--font-display`, `body` is `--font-sans`; `serif`, `mono` and `editorial` exist when a theme needs them. `editorial` is `--font-editorial`, the long-reading face behind the `--editorial-*` text styles: it tracks the body face until a theme repoints it, so set it only when essays and articles should not carry the body face. A slot may be `{ "name": "...", "url": "..." }` to pin an exact URL. Spell families as Google does; the CLI reports the canonical spelling back.

## Choose the body face first

The body face is the anchor. It carries most of the words, and text faces survive small sizes where display faces do not. Pick it against the brief, then pick the display face against it. A body face must have regular, bold, and italic; low to moderate stroke contrast; open apertures; and a large x-height. A face failing any of these is a display face whatever its name says. Single-weight families are fine for `display` and disqualifying for `body`.

The shipped text styles ask the display face for 600, across all four heading levels, and the body face for 400; prose markup adds 700 and italic for `strong` and `em`. Screen candidates against those four before running, so the report confirms a decision instead of reporting a surprise.

## The font matrix: the decision rule

Classify each candidate on two layers. The **skeleton** is its form model; the **flesh** is its stroke contrast and serif treatment.

| Form model | Construction | Reads as |
|---|---|---|
| **Dynamic** | diagonal stress, open apertures, written origin | open, warm, humane, timeless |
| **Rational** | vertical stress, closed apertures, drawn not written | orderly, reserved, elegant, authoritative |
| **Geometric** | monolinear, circle-and-line | technical, modern, systematic, sober |

- **Same skeleton, different flesh: reliable.** Helvetica and Bodoni are both rational, one a linear sans and one a contrasting serif.
- **Same flesh, different skeleton: the failure case.** The two look alike on the surface and fight underneath. This is why two arbitrary sans-serifs so often clash.
- **Far apart on both: works, deliberately.** An unmistakable difference reads as a decision.

Many faces sit between columns. When one straddles, say so and lean on the voice table and the x-height check instead.

## Voice

| Brief says | Type voice |
|---|---|
| editorial, literary, considered | dynamic serif display over a humanist sans body |
| elegant, luxurious, formal | rational high-contrast serif display; keep the body quiet |
| friendly, warm, approachable | dynamic sans on both sides, or a soft serif display |
| technical, systematic, precise | geometric or neo-grotesque sans; a mono for code |
| playful, informal | an expressive display face over a plain workhorse body |
| serious, institutional, trustworthy | rational sans body, rational serif display |
| quiet, minimal, unbranded | one superfamily across both slots |

Match the type to the same brief the color came from. A warm autumn palette under a cold geometric sans reads as two projects.

## Shortcuts

These find an adequate pairing fast and skip the reasoning; use them when the brief is vague or the type should stay quiet.

- **A superfamily.** Google Fonts families with both sans and serif siblings: Alegreya, Ancizar, IBM Plex, Inria, Merriweather, Noto, PT, Roboto, Source.
- **One family across weights.**
- **Same designer or foundry.**
- **Serif display over sans body** when nothing else decides it.

## Watch for

- **x-height parity.** Both faces are set from one size scale, so a small-x-height display face over a large-x-height body face gives a heading that looks weaker than its own body text. This is the one visual check that matters on screen; make it on the rendered page.
- **Print faces at small sizes.** Delicate serifs and high stroke contrast turn to mud below 16px.
- **Every family is a request.** Two is the target; three needs a reason.
- **Sets of themes:** no two share a display face or a body face.

## Scope

Type only. Color, component aliases, shape, and the type scale are untouched: `set-fonts` moves families between stacks and nothing else, writing only the unsaved colors-and-type buffer. Save the theme to keep it, Adopt to ship it. Adopt is also what rewrites `fonts.css`, which is how a build with no editor in it loads the family at all.

## Verify

- The CLI exits 0 and names each stack that moved, before and after.
- Each URL reflects the family's real weights: a range for a variable family, an enumeration for a static one, a bare URL for a single-weight face.
- The app shows the new type after a reload, and the editor's Fonts section lists both families with their fallbacks intact.
- To revert, run the inverse brief, or load the open theme again to discard the buffer.
