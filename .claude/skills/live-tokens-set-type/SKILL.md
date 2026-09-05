---
name: live-tokens-set-type
description: Set a live-tokens theme's type: a Google Fonts pairing bound to the shipped --font-* stacks, each family verified for the weights it ships. Called with an anchor and a type intent by live-tokens-create-theme, or with the user's request directly. Use whenever the user asks to pair fonts, pick a typeface, or set the fonts; describes type by voice: editorial, friendlier, technical, elegant, less generic; or names a face for a role: a serif for headings, a display font. Changes type only, never color or geometry. Not for a request that also names color or geometry (see live-tokens-create-theme).
---

# Setting a theme's type

Choose the families. The CLI verifies each against Google Fonts, builds the URL from the weights the family has, and writes the result to the buffer. Never hand-author font JSON or edit the data tree. Google Fonts is the pool because it is freely licensable and loads by URL. Other sources go in through the editor's Project fonts section.

The result is on screen as soon as the run finishes. The three set skills write the same buffer, so color, type, and geometry compose in any order. When the user accepts the result, run `save-theme` to keep it as a theme. Loading a theme in the editor discards it.

## Workflow

1. Read the type intent and any anchor live-tokens-create-theme passed. When either names an anchor (a feeling, an idiom, or a genre), read its entry in `references/type-anchors.md`; it overrides the Voice table below.
2. Choose the pairing and write it to `scratch/font-pairing.json`.
3. Run `npx live-tokens set-type scratch/font-pairing.json`. It prints each stack that moved, each family's weights and URL, and the weights the typography tokens ask for that the family lacks.
4. Read the report. Name a weight gap and offer an alternative only when it matters: a body face without 400, 700, or italic matters; a display face without 300 does not. A family not on Google Fonts fails the run; fix the spelling and re-run.
5. Reply with the two families, the form model behind each, the matrix verdict, and any weight gap worth naming.

Flags: `--dry-run` reports without writing. `--no-verify` skips the network and requires a URL per family; use it only offline.

## The pairing file

```json
{ "display": "Fraunces", "body": "Nunito Sans" }
```

Every slot is optional; an omitted slot keeps its family. `display` is `--font-display` and `body` is `--font-sans`. `serif`, `mono`, and `editorial` exist when a theme needs them. `editorial` is `--font-editorial`, the long-reading face behind the `--editorial-*` text styles. It tracks the body face until a theme repoints it, so set it only when essays and articles need a face of their own. A slot may be `{ "name": "...", "url": "..." }` to pin a URL. Spell families as Google does; the CLI reports the canonical spelling.

## Choose the body face first

The body face is the anchor. It carries most of the words, and text faces survive small sizes where display faces do not. Pick it against the type intent, then pick the display face against it. A body face has regular, bold, and italic; low to moderate stroke contrast; open apertures; and a large x-height. A face missing any of these is a display face, whatever its name says.

The shipped text styles ask the display face for 600 and the body face for 400; `strong` and `em` add 700 and italic. Screen candidates against those four weights before running.

## The font matrix

Classify each candidate by form model and by stroke contrast and serifs.

| Form model | Construction | Reads as |
|---|---|---|
| **Dynamic** | diagonal stress, open apertures, written origin | open, warm, humane, timeless |
| **Rational** | vertical stress, closed apertures, drawn not written | orderly, reserved, elegant, authoritative |
| **Geometric** | monolinear, circle-and-line | technical, modern, systematic, sober |

- One form model with different stroke contrast or serifs pairs reliably. Helvetica and Bodoni are both rational, one a linear sans and one a high-contrast serif.
- Different form models with the same stroke contrast and serifs fail. The two look alike and fight underneath. Two arbitrary sans serifs clash for this reason.
- Different on both counts works. An unmistakable difference reads as a decision.

Many faces sit between columns. When one straddles, say so and lean on the Voice table and the x-height check.

## Voice

| The intent says | Type voice |
|---|---|
| editorial, literary, considered | dynamic serif display over a humanist sans body |
| elegant, luxurious, formal | rational high-contrast serif display; keep the body quiet |
| friendly, warm, approachable | dynamic sans on both sides, or a soft serif display |
| technical, systematic, precise | geometric or neo-grotesque sans; a mono for code |
| playful, informal | an expressive display face over a plain workhorse body |
| serious, institutional, trustworthy | rational sans body, rational serif display |
| quiet, minimal, unbranded | one superfamily across both slots |

The table covers an intent that names no anchor. An anchor's row in `references/type-anchors.md` wins.

Match the type to the design direction the color came from. A warm autumn palette under a cold geometric sans reads as two projects.

## Shortcuts

Use these when the request is vague or the type should stay quiet.

- **A superfamily.** A Google Fonts family with sans and serif siblings: Alegreya, Ancizar, IBM Plex, Inria, Merriweather, Noto, PT, Roboto, Source. The catalogue moves and this list does not; `set-type` fails on a family that is gone.
- **One family across weights.**
- **Same designer or foundry.**
- **Serif display over sans body** when nothing else decides it.

## Watch for

- **x-height parity.** Both faces share one size scale, so a small-x-height display face over a large-x-height body face gives a heading weaker than its own body text. Check it on the rendered page.
- **Print faces at small sizes.** Delicate serifs and high stroke contrast turn to mud below 16px.
- **Every family is a download.** Two is the target; three needs a reason.
- **Sets of themes.** No two share a display face or a body face.

## Scope

Type only. Color, component aliases, shape, and the type scale are untouched: `set-type` writes the font entries in the buffer and carries every other value forward. `save-theme` keeps the result; Adopt ships it and rewrites `fonts.css`, which is how a build without the editor loads the family.

## Verify

- The CLI exits 0 and names each stack that moved, before and after.
- Each URL matches the family's weights: a range for a variable family, an enumeration for a static one, a bare URL for a single-weight face.
- The app shows the new type, and the editor's Fonts section lists both families with their fallbacks.
- To revert, run the previous pairing file, or load the open theme to discard the buffer.
