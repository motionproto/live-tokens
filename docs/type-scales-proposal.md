# Type scales for text styles

Status: approved 2026-10-08 and implemented by [plans/type-scales.md](plans/type-scales.md). Prototype: [type-scales-prototype.html](type-scales-prototype.html). The text below includes the plan's revisions: the editor never writes a structural size, no theme migration runs, and the migration op is `appendMediaBlock`. It also records two outcomes of the build: the scale settings use the Text Styles section's own controls, and one `breaking` migration carries the whole change.

## Summary

Text styles split into five usages: display, heading, body, editorial and code. Each usage owns a modular type scale with seven size steps. A scale is a base size and a ratio, which set every step's desktop size. The ratio is a named musical interval or a custom number. Every step's size derives from the scale in CSS, so one edit moves the whole ramp, and two steps can never collide while the ratio exceeds 1.

Each step also has a tablet size and a phone size. Both start at a recommendation that a responsive scaling rule computes from the desktop size, pulling sizes above 16px toward 16px. A 72px desktop size becomes 49px on tablets and 41px on phones, and body text stays at 16px. Any single size can be edited, and its reset restores that one recommendation.

The editor's Text Styles group becomes five tabs, one per usage. Each tab holds the scale settings above a ramp of the seven steps, and each step row shows its desktop, tablet and phone sizes.

## Current state

- Twelve styles in one list: heading-xl/lg/md/sm, body-md/sm, editorial-xl/lg/md/sm, code and eyebrow (`src/system/styles/tokens.css:663-740`).
- Each style's size aliases a step of the primitive `--font-size-*` scale. The heading ramp (18, 20, 24, 36px) has no consistent ratio: 1.11, 1.2, then 1.5.
- At 480px and below, `--font-size-2xl` drops to 20px and `--font-size-xl` stays at 20px, so h2 and h3 render at the same size.
- Display exists only as the `--font-display` stack. `SectionHero`, `Home`, `SectionDivider` and `FloatingTagsPlayground` set `--font-display` with a raw `--font-size-5xl` to `7xl`.
- Inline `code` takes a fixed 14px, so code inside an h1 renders at 14px.
- In the default theme `--font-editorial` resolves to Manrope, so editorial-md matches body-md and editorial-sm matches body-sm.

## Usages

| Usage | Role | Default face | Elements and classes |
|---|---|---|---|
| Display | Type outside the page outline: heroes, section titles, big numbers | `--font-display` | `.display-*` |
| Heading | The page outline, h1 to h6 | `--font-display` | `h1`–`h6`, `.heading-*` |
| Body | Interface text and short copy | `--font-sans` | `p`, `li`, `small`, `.body-*` |
| Editorial | Long reading, ledes, pull quotes, captions in articles | `--font-editorial` | `.editorial-*` |
| Code | Code blocks and inline code | `--font-mono` | `pre`, `code`, `.code-*` |

Eyebrow stays a single style. The editor shows it at the foot of the Body tab, and its size defaults to body-sm.

## Size steps

Every usage has the same seven steps: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`. The `md` step equals the base. Each step above multiplies by the ratio once more, and each step below divides by it.

Headings map onto the steps so h1 to h4 keep today's token names:

| Element | h1 | h2 | h3 | h4 | h5 | h6 | spare |
|---|---|---|---|---|---|---|---|
| Step | xl | lg | md | sm | xs | 2xs | 2xl |

Body maps `p` and `li` to md and `small` to sm. Code maps `pre` to md. Inline `code` sizes at `0.875em` of its parent, and `pre code` inherits.

Each step is a bundle of tokens: font family, a desktop, tablet and phone font size, font weight, line height and letter spacing. The step's `-font-size` token keeps its public name and resolves to the size for the current viewport.

## Scale settings

Each usage has four settings.

| Setting | Token | Picker |
|---|---|---|
| Face | `--{usage}-font-family` | Font family |
| Weight | `--{usage}-font-weight` | Font weight |
| Base | `--{usage}-scale-base` | Number of rem, entered and shown in px |
| Ratio | `--{usage}-scale-ratio` | Interval list or custom number |

Two type-wide settings set the tablet and phone recommendations, described under Responsive scaling.

| Setting | Token | Picker |
|---|---|---|
| Tablet scaling | `--type-tablet-scale-compression` | Slider from 0.4 to 1 |
| Phone scaling | `--type-phone-scale-compression` | Slider from 0.4 to 1 |

The interval list:

| Interval | Ratio |
|---|---|
| Minor second | 1.067 |
| Major second | 1.125 |
| Minor third | 1.2 |
| Major third | 1.25 |
| Perfect fourth | 1.333 |
| Augmented fourth | 1.414 |
| Perfect fifth | 1.5 |
| Golden ratio | 1.618 |
| Custom | any number from 1.01 to 2 |

Bases take any value. Tying a base to the primitive scale would lose most useful values (22px, 32px), and those primitives already shrink at breakpoints, which would shrink a base twice. Bases are unitless counts of rem (`--heading-scale-base: 1.5` means 1.5rem), because the responsive scaling raises them to a power, and CSS `pow()` takes plain numbers.

## Responsive scaling

Each step's tablet and phone sizes start at a recommendation computed from its desktop size. Each size above 16px moves toward 16px by a power rule:

```
viewport size = 16px × (desktop size ÷ 16px) ^ compression
```

At a compression of 1 a viewport keeps desktop sizes. Lower values pull large sizes harder toward 16px. The defaults are 0.75 for tablets and 0.63 for phones.

| Desktop size | 72 | 56 | 48 | 36 | 30 | 24 | 20 |
|---|---|---|---|---|---|---|---|
| Tablet at 0.75 | 49.4 | 40.9 | 36.5 | 29.4 | 25.6 | 21.7 | 18.9 |
| Today's tablet size | 48 | 40 | 36 | 30 | 26 | 22 | 20 |
| Phone at 0.63 | 41.3 | 35.2 | 32.0 | 26.7 | 23.8 | 20.7 | 18.4 |
| Today's phone size | 42 | 36 | 32 | 28 | 24 | 20 | 20 |

The defaults reproduce the breakpoint sizes `tokens.css` ships today within 1.4px for every size above 20px. Today 20px holds its size on every screen; the rule takes it to 18.9px and 18.4px. The approach matches the one fluid type tools such as Utopia take: smaller screens get a smaller base and a smaller ratio, so large sizes shrink the most and reading sizes barely move. A phone compression of 0.63 turns a perfect fourth (1.333) into a minor third (1.2), the pairing common type-scale advice gives for desktop and phone.

Sizes at or below 16px keep their desktop size. The power rule alone would pull them up toward 16px, so each recommendation takes the smaller of the desktop size and the rule's result. No recommendation is larger than its desktop size. An edited size takes whatever value the designer enters.

Each recommendation follows the step's current desktop size, so editing a desktop size moves its tablet and phone recommendations with it. Editing a tablet or phone size replaces only that one recommendation. Its reset brings the recommendation back and leaves every other size as it is.

### Hierarchy on smaller screens

The rule narrows the size gap between levels on smaller screens. The order of levels never changes, and no two steps meet.

| Heading | Desktop | Tablet at 0.75 | Phone at 0.63 | Phone at 0.8 |
|---|---|---|---|---|
| h1 | 37.5px | 30.3px | 27.4px | 31.6px |
| h1 ÷ body text | 2.34 | 1.89 | 1.71 | 1.98 |
| Each step ÷ the step below | 1.25 | 1.18 | 1.15 | 1.20 |

The narrowing follows from keeping body text at 16px while fitting large type to a 375px screen. Keeping the desktop ratio means scaling every size by the same factor. Bringing h1 to 27.4px that way takes body text to 11.7px. Leaving body text at 16px with the desktop ratio leaves h1 at 37.5px and display-2xl at 83px, which wrap after a word or two on a phone. Any rule that shrinks large type more than small type lowers the ratio between levels, so the open choice is how far.

Today's breakpoints narrow the gap by the same amount: h1 ÷ body text runs 2.25, 1.88 and 1.75 across desktop, tablet and phone. They also collapse h2 and h3 onto one size on phones, which the rule cannot do.

The phone scaling slider is the control for this trade. Raising it from 0.63 to 0.8 keeps more of the desktop hierarchy, with h1 at 31.6px on phones. Hierarchy also comes from weight, face and spacing, which stay the same on every screen. A single step that needs more presence on phones takes an edited phone size.

## CSS shape

`tokens.css` declares the editable settings and, for each step, three editable sizes and one structural size. An unedited size holds its recommendation as a CSS expression, and an edited size holds a length. The breakpoint blocks re-point only the structural sizes.

```css
:root {
  --type-tablet-scale-compression: 0.75;
  --type-phone-scale-compression: 0.63;

  --heading-scale-base: 1.5;
  --heading-scale-ratio: 1.25;
  --heading-font-family: var(--font-display);
  --heading-font-weight: var(--font-weight-semibold);

  --heading-xl-desktop-font-size: calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2) * 1rem);
  --heading-xl-tablet-font-size: min(
    var(--heading-xl-desktop-font-size),
    calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem)
  );
  --heading-xl-phone-font-size: 1.875rem; /* edited on phones */
  --heading-xl-font-size: var(--heading-xl-desktop-font-size);
  /* Every step follows this pattern with its own exponent, from -3 at 2xs to 3 at 2xl. */

  --heading-xl-font-family: var(--heading-font-family);
  --heading-xl-font-weight: var(--heading-font-weight);
}

@media (max-width: 768px) {
  :root { --heading-xl-font-size: var(--heading-xl-tablet-font-size); }
}

@media (max-width: 480px) {
  :root { --heading-xl-font-size: var(--heading-xl-phone-font-size); }
}
```

The recommendation raises the step's desktop size, counted in rem, to the compression. While the desktop size follows the scale, the expression uses the scale's terms, so a change to the base, the ratio or the compression moves every unedited size in the browser. Once the desktop size is edited, the editor writes that size's rem count into the expression in place of the scale's terms.

The editor never writes a structural `-font-size` token, so no theme, `_working.json` or `tokens.generated.css` holds one. That matters because `tokens.generated.css` writes every theme token under `:root:root` and has no media blocks, so a structural size there would outweigh its breakpoint re-points. A promoted theme then overrides the editable sizes, and the breakpoint blocks in `tokens.css` still switch between them. This closes the gap the semantic text styles work left open, where a promoted size outweighed its 768px re-point. Consumer CSS that reads `--heading-xl-font-size` keeps working, now with responsive sizes.

`pow()` ships in Chrome and Edge 120, Firefox 118 and Safari 15.4.

## Links

- A step's family and weight link to the usage's face and weight. The editor shows these with the existing link bar and lock glyph. Unlinking keeps the current value and lets the user change it, and relinking restores the link value.
- A step's desktop size follows the scale, and its tablet and phone sizes follow their recommendations. Each size is a number input with the link bar. Typing a value edits that size and turns its bar into the amber tick; typing the recommendation back clears the edit. Its reset icon restores the recommendation.

Link state lives in the values. A linked token holds its link expression, and an unlinked or edited token holds a literal or another token, so no separate record is needed.

## Small sizes

Steps under 12px carry a "Below 12px" marker in the ramp. The scale applies no minimum. A `max()` floor would collapse adjacent steps onto the same size, which reintroduces the collision the ratio removes. The marker leaves the choice with the designer, and the lowest steps are the ones a usage rarely maps to an element.

## Default values

### Settings

| Usage | Face | Weight | Base | Ratio |
|---|---|---|---|---|
| Display | display | semibold | 48px | Minor third 1.2 |
| Heading | display | semibold | 24px | Major third 1.25 |
| Body | sans | normal | 16px | Major second 1.125 |
| Editorial | editorial | normal | 16px | Major second 1.125 |
| Code | mono | normal | 14px | Major second 1.125 |

Responsive scaling ships at 0.75 for tablets and 0.63 for phones, and every size ships unedited.

Heading sm, xs and 2xs ship with family unlinked to `--font-sans`, which keeps today's sans h4.

### Sizes in px

| Usage | Viewport | 2xs | xs | sm | md | lg | xl | 2xl |
|---|---|---|---|---|---|---|---|---|
| Display | Desktop | 27.8 | 33.3 | 40.0 | 48.0 | 57.6 | 69.1 | 82.9 |
| Display | Tablet | 24.2 | 27.7 | 31.8 | 36.5 | 41.8 | 47.9 | 55.0 |
| Display | Phone | 22.6 | 25.4 | 28.5 | 32.0 | 35.9 | 40.2 | 45.1 |
| Heading | Desktop | 12.3 | 15.4 | 19.2 | 24.0 | 30.0 | 37.5 | 46.9 |
| Heading | Tablet | 12.3 | 15.4 | 18.3 | 21.7 | 25.6 | 30.3 | 35.8 |
| Heading | Phone | 12.3 | 15.4 | 17.9 | 20.7 | 23.8 | 27.4 | 31.5 |
| Body, editorial | Desktop | 11.2 | 12.6 | 14.2 | 16.0 | 18.0 | 20.2 | 22.8 |
| Body, editorial | Tablet | 11.2 | 12.6 | 14.2 | 16.0 | 17.5 | 19.1 | 20.9 |
| Body, editorial | Phone | 11.2 | 12.6 | 14.2 | 16.0 | 17.2 | 18.6 | 20.0 |
| Code | Desktop | 9.8 | 11.1 | 12.4 | 14.0 | 15.8 | 17.7 | 19.9 |
| Code | Tablet | 9.8 | 11.1 | 12.4 | 14.0 | 15.8 | 17.3 | 18.9 |
| Code | Phone | 9.8 | 11.1 | 12.4 | 14.0 | 15.8 | 17.1 | 18.4 |

### Changes from today

| Element | Desktop today → proposed | Tablet | Phone |
|---|---|---|---|
| h1 | 36 → 37.5 | 30 → 30.3 | 28 → 27.4 |
| h2 | 24 → 30 | 22 → 25.6 | 20 → 23.8 |
| h3 | 20 → 24 | 20 → 21.7 | 20 → 20.7 |
| h4 | 18 → 19.2 | 18 → 18.3 | 18 → 17.9 |
| p | 16 → 16 | same | same |
| small | 14 → 14.2 | same | same |
| pre | 14 → 14 | same | same |
| Hero title, display-xl | 72 → 69.1 | 48 → 47.9 | 42 → 40.2 |

h2 and h3 grow the most. Today's h2 sits closer to h3 than to h1, and the major third evens that out. On phones today h2 and h3 both render at 20px; the scale separates them.

### Line height

| Step | Display | Heading | Body | Editorial | Code |
|---|---|---|---|---|---|
| 2xl | tightest | tightest | tighter | tightest | normal |
| xl | tightest | tightest | tighter | tighter | normal |
| lg | tightest | tightest | tight | tight | normal |
| md | tightest | tighter | normal | normal | normal |
| sm | tighter | tighter | tight | tight | normal |
| xs | tighter | tight | tight | tighter | normal |
| 2xs | tighter | tight | tight | tighter | normal |

Existing steps keep today's values. Editorial extends its rule: md takes the most open leading and each step away tightens by one, stopping at tighter below md so small text stays legible.

### Letter spacing

Display lg, xl and 2xl take `tight`. Every other step takes `normal`, as today.

## Editor

The Text Styles group in Typography opens with a Responsive scaling row: a tablet slider and a phone slider, each with a readout of what it does to 72, 48 and 24px. A tab bar follows: Display, Heading, Body, Editorial, Code. Each tab shows:

1. **Scale panel.** Face, weight, base and ratio, and a "Reset {usage}" button.
2. **Viewport switch.** Desktop, Tablet and Phone, which sets the size the samples render at and highlights that row in each step's sizes. It changes no token.
3. **Ramp.** Seven rows from 2xl down to 2xs. Each row shows the step, its element chip (h1, p, pre), its desktop, tablet and phone sizes as inputs, a sample at the chosen viewport's size, and the step's face, weight, line height and letter spacing controls.
4. **Eyebrow row.** Body tab only, under the ramp. Its sizes follow body-sm on every screen until edited.

Resets work at three levels. Every setting, size and step control shows a reset icon once it leaves its default, and the icon restores that one value. Each tab has a "Reset {usage}" button, and the group header has "Reset all". Both buttons are disabled at the defaults. Every control has a fixed width, and unlinking narrows a control by the width of its indent, so lock and reset icons hold their positions as values change.

The Font Sizes table stays in Typography, because components still use the primitive scale.

## Tokens

| Group | Count |
|---|---|
| Responsive scaling, type-wide | 2 |
| Usage settings, 4 per usage | 20 |
| Step tokens, 7 steps × 7 tokens × 5 usages | 245 |
| Eyebrow, with three sizes | 8 |
| Theme total | 275 (today 61) |
| Structural `-font-size` tokens, one per step and one for the eyebrow | 36 |

The Text Styles section renders its own controls for the scale settings: a px input for each base that stores a rem count, the interval list with a custom number for each ratio, and a slider for each compression. `src/editor/core/components/aliasKinds.ts` keeps its existing rules. The `--type-` prefix was unused before this change. The desktop, tablet and phone sizes end in `-font-size`, which the existing rule maps to the primitive size picker; the Text Styles section renders its own number inputs for them.

Renamed: `--code-font-size`, `--code-line-height` and `--code-letter-spacing` become `--code-md-font-size`, `--code-md-line-height` and `--code-md-letter-spacing`. `--code-font-family` and `--code-font-weight` keep their names and become the code usage's face and weight. No other proposed name collides with an existing token.

## Migration and release

- **Release level.** One `breaking` migration, `2026-10-08-type-scales`, carries the whole change, because the code rename breaks consumers. `CHANGELOG.md` lists the rename under Changed (breaking) and the new usages, steps and settings under Added.
- **Consumer `tokens.css`.** A migration renames the three code tokens and their references, adds the settings and the desktop, tablet and phone sizes with `ensureScale`, re-points each existing step's `-font-size` to its desktop size, and appends the breakpoint blocks with `appendMediaBlock`. A step's `-font-size` that differs from its 0.91.2 default moves into the step's desktop size, so a consumer's hand edits to `tokens.css` carry over.
- **Saved themes.** No theme migration runs. Text Styles edits never reached a saved theme before this change, so no theme holds a text-style key.
- **Default theme.** The default theme adopts the scales, so projects on the default theme see the size changes above on upgrade. The release notes list them.
- **`site.css`.** `site.css` is user-owned. The proposal adds rules for h5, h6, the `.display-*`, `.heading-*`, `.body-*`, `.editorial-*` and `.code-*` classes, and the relative inline `code` size. Each needs approval before it lands.
- **Skills.** The create-page skill names text styles and needs the new usages and a rule for choosing among them: headings use the full set, and other usages mostly use md and sm. Run `npm run sync:skill-atlas` and `npm run sync:skill-sources` after the edit.

## Follow-ups

- Point `SectionHero`, `Home`, `SectionDivider` and `FloatingTagsPlayground` at display steps.
- Teach set-type to set ratios from a voice brief, for example a perfect fifth for dramatic display type.
- Add a `check-page` finding for a used step under 12px.
- Offer fluid sizing with `clamp()` between the phone and desktop scales in place of the stepped breakpoints. Unitless bases make the interpolation expressible in CSS.

## Decisions for approval

1. Five usages, with eyebrow kept as a single style in the Body tab.
2. Seven steps per usage, md as the base, h1 at xl.
3. Bases as unitless rem counts, outside the primitive scale.
4. Tablet and phone sizes for each step, recommended by the power rule at 0.75 and 0.63 and never above the desktop size, each editable and resettable on its own. This narrows the ratio between levels on smaller screens and makes `pow()` a browser requirement.
5. A "Below 12px" marker in place of a size floor.
6. The default values above, including the larger h2 and h3.
7. Heading sm, xs and 2xs in sans, shipped unlinked. The alternative ships them linked to the display face and changes h4's face.
8. The default theme adopts the scales. Saved themes need no migration, because none holds a text-style key.
9. The `site.css` additions.
