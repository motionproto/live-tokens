# DTCG migration report

This report assesses the [Design Tokens Community Group (DTCG) 2025.10 specification](https://www.designtokens.org/technical-reports/) against the live-tokens token model and plans a migration. It was written 2026-09-15 against v0.79.0.

The report covers two framings:

- **Owner framing:** live-tokens owns the tokens and exports DTCG. Every section through "Risks" covers this framing.
- **Consumer and editor framing:** live-tokens reads, previews and writes the user's DTCG files. The section of that name covers it.

Two further sections cover related work:

- **Style Dictionary and DESIGN.md:** framework-neutral outputs for other build tools and for agents.
- **Component token duplication:** how much of the component token set repeats itself.

## The spec

- **Status.** 2025.10 is the [first stable release](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/), from 28 Oct 2025. It has three modules: [Format](https://www.designtokens.org/TR/2025.10/format/), [Color](https://www.designtokens.org/TR/2025.10/color/) and [Resolver](https://www.designtokens.org/TR/2025.10/resolver/). A [preview draft](https://www.designtokens.org/TR/drafts/) dated 2026-09-08 is in progress, and it says not to implement it yet.
- **[Format](https://www.designtokens.org/TR/2025.10/format/).**
  - Each token is JSON with `$value`, `$type`, `$description`, `$extensions` and `$deprecated`. Tools [must preserve extensions](https://www.designtokens.org/TR/2025.10/format/#x5-2-3-extensions) they don't understand.
  - [Groups](https://www.designtokens.org/TR/2025.10/format/#x6-groups), [`$root` tokens](https://www.designtokens.org/TR/2025.10/format/#x6-2-root-tokens-in-groups) and [`$extends`](https://www.designtokens.org/TR/2025.10/format/#x6-4-extending-groups) are supported.
  - References are [`{a.b}` aliases](https://www.designtokens.org/TR/2025.10/format/#x7-1-1-curly-brace-syntax-token-references), plus [JSON Pointer `$ref`](https://www.designtokens.org/TR/2025.10/format/#x7-1-2-json-pointer-syntax-required-support), which can [point into sub-values](https://www.designtokens.org/TR/2025.10/format/#x7-3-property-level-references). Tools must support `$ref` and must [detect cycles](https://www.designtokens.org/TR/2025.10/format/#x7-2-3-circular-references).
  - [Seven primitive types](https://www.designtokens.org/TR/2025.10/format/#x8-types): color, dimension, fontFamily, fontWeight, duration, cubicBezier and number. [Dimension](https://www.designtokens.org/TR/2025.10/format/#x8-2-dimension) allows only `px` and `rem`.
  - [Six composite types](https://www.designtokens.org/TR/2025.10/format/#x9-composite-types): strokeStyle, border, transition, shadow, gradient and typography. [Gradient](https://www.designtokens.org/TR/2025.10/format/#x9-7-gradient) holds stops only. [Typography](https://www.designtokens.org/TR/2025.10/format/#x9-8-typography) has five fixed properties.
  - There are no expressions, no math and no color operations.
- **[Color](https://www.designtokens.org/TR/2025.10/color/).** A value is [`{colorSpace, components, alpha?, hex?}`](https://www.designtokens.org/TR/2025.10/color/#x4-1-format). It supports [14 color spaces](https://www.designtokens.org/TR/2025.10/color/#x4-2-supported-color-spaces), including [`oklch`](https://www.designtokens.org/TR/2025.10/color/#x4-2-8-oklch).
- **[Resolver](https://www.designtokens.org/TR/2025.10/resolver/).** A document has [sets](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-4-sets), [modifiers](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-5-modifiers) (named contexts with a default) and a [`resolutionOrder`](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-6-resolution-order), where the later source wins. Each input [resolves](https://www.designtokens.org/TR/2025.10/resolver/#x6-resolution-logic) to one flat token tree. Tokens can be [written inline](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-6-1-inline-sets-and-modifiers). The spec leaves CSS output (selectors, media queries) to each tool.
- **Tooling.** Style Dictionary still lacks the resolver, gradient and duration pieces ([issue #1590](https://github.com/style-dictionary/style-dictionary/issues/1590) is open). [Terrazzo](https://terrazzo.app/docs/) is furthest along.

## Fit

DTCG fits our reference layers well. It doesn't fit our generative layer, and the gaps are concentrated in a few places.

| Area | Our model | DTCG | Fit |
|---|---|---|---|
| Component aliases | 1292 in `default.json`, 1282 of them bare names | [`{surface.brand}`](https://www.designtokens.org/TR/2025.10/format/#x7-1-1-curly-brace-syntax-token-references) | Direct |
| Color scales (~280 values) | Computed from a base color plus curves | Stores resolved values only; [`oklch` supported](https://www.designtokens.org/TR/2025.10/color/#x4-2-8-oklch) | Values fit. Generator inputs go in [`$extensions`](https://www.designtokens.org/TR/2025.10/format/#x5-2-3-extensions) |
| References with opacity | `color-mix(… transparent)`: 9 aliases, 6 scrim and tint tokens, gradient stops | An alias cannot carry alpha | **Gap** |
| Shadows and focus rings (9) | Literal `hsla` strings | [`shadow` composite](https://www.designtokens.org/TR/2025.10/format/#x9-6-shadow) | Direct, after parsing |
| Gradients (4) | `linear-gradient` with an angle | [Stops only](https://www.designtokens.org/TR/2025.10/format/#x9-7-gradient), no angle or kind ([issue 101](https://github.com/design-tokens/community-group/issues/101) open) | Partial |
| Font stacks | Stack slots, plus font source URLs | [`fontFamily` array](https://www.designtokens.org/TR/2025.10/format/#x8-3-font-family) | Stacks direct. URLs go in an extension |
| Text styles (61 declarations) | `em` letter-spacing, and properties beyond the five | [`typography`](https://www.designtokens.org/TR/2025.10/format/#x9-8-typography) requires exactly five properties; `letterSpacing` must be `px` or `rem` | Partial |
| Responsive font sizes (12) | `@media` blocks | [Resolver modifier](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-5-modifiers); we emit the `@media` ourselves | Fits |
| Plain values | 55 `rem`, 19 `px`, 34 unitless `0`, 31 cubic-bezier easings, 7 durations, z-index and scale | [Standard types](https://www.designtokens.org/TR/2025.10/format/#x8-types) | Direct |
| Unsupported CSS values (~25) | 4 `em`, 9 `%`, 3 `deg`, 1 `clamp(vw)`, 6 `linear()` easings, plus keywords `none`, `block` and `scroll` | No type ([additional types](https://www.designtokens.org/TR/2025.10/format/#x8-8-additional-types) are still undocumented) | **Gap** |
| Picker kind | radius vs padding vs gap, inferred from the name suffix (`KIND_RULES`) | All three are `dimension` | `$type` is coarser, so suffix inference stays |
| Themes | Complete documents with `_active` and `_production` pointers | A `theme` modifier with [one context per theme](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-5-1-contexts); the pointers become [resolver inputs](https://www.designtokens.org/TR/2025.10/resolver/#x5-inputs) | Fits |
| Names | `--surface-brand` and `--surface-brand-low` both exist | `surface.brand.$root` and `surface.brand.low` ([root tokens](https://www.designtokens.org/TR/2025.10/format/#x6-2-root-tokens-in-groups)) | Fits, given a two-way name-to-path map |

### Findings

1. **The editor is a generator, and DTCG only stores values.** Our generator inputs (curves, harmony axes, font sources) would ride in [`$extensions`](https://www.designtokens.org/TR/2025.10/format/#x5-2-3-extensions). Other tools keep that data but can't regenerate from it. An edit to a single scale step made in Figma would come back as a palette override, which we already support.
2. **References with opacity are the largest loss.** DTCG has no way to express "this token at 38%", so we would need an extension to keep those references live. [Property-level references](https://www.designtokens.org/TR/2025.10/format/#x7-3-property-level-references) can read a color's alpha but cannot override it.
3. **Typed JSON is a real gain.** Structured references would replace three regex parsers: `globalRootBlock.ts`, `colorOpacity.ts` and `cssStringToRef`.
4. **Less of the token code depends on Svelte than it appears.** `bin/`, `vite-plugin/`, the palette math, the parsers and the migrations are already free of it. These are the blockers:
   - `buildColors.ts:24` reaches `svelte/store` through `slices/gradients.ts` and `store/editorCore`. As a result, the shipped `dist-plugin/setColors` imports `svelte/store`.
   - `palettes/tokenRegistry.ts` uses Vite's `?raw` and `import.meta.glob`.
   - The linked-group logic in `themes/slices/components.ts` is built on `svelte/store`.
   - `curveEngine.ts` and `paletteMath.ts` are pure, but they live under `ui/`.
   - Token data lives inside `.svelte` files: 26 `:global(:root)` blocks (1312 declarations), 26 `catalogue` exports, and `allTokens` and `intrinsics` in the 26 editor components.
   - `peerDependencies` require Svelte for every consumer.

This report reads "split from Svelte" as making the token core framework-neutral. The editor and the 26 components would stay in Svelte and use that core. Rewriting the components as web components would be a separate project.

## Recommendation

- **Make DTCG the main format** for tokens, aliases and themes.
- **Generate CSS from it.** The CSS becomes build output.
- **Store generator inputs in `$extensions["com.motionproto.live-tokens"]`.**
- **Write our own resolver and CSS emitter** in the core, and use [Terrazzo](https://terrazzo.app/docs/) only as an interop test. We need our own because:
  - the editor has to re-resolve single tokens in the browser;
  - our CSS output (`color-mix`, `@media`, `:root:root`) is specific to us.

One rule holds in every phase: the CSS we emit stays byte-identical to today's `tokens.css`, `tokens.generated.css` and component `:global(:root)` blocks. Token names are public API.

## Phases

| Phase | Work | Done when |
|---|---|---|
| 0. Mapping spec | Settle the name-to-path mapping, the `$type` for each kind, the extension schema and the handling of each gap | Every CSS name converts to a path and back; a test covers all 540 + 1312 declarations |
| 1. Neutral core | Break the `buildColors` → `svelte/store` chain; move the linked-group logic onto plain data; replace `?raw` and glob imports with explicit inputs; move `curveEngine` and `paletteMath` out of `ui/` | A test fails on any `svelte`, `?raw` or `import.meta.glob` import in the core; `dist-plugin/setColors` has no Svelte import. This pays off even without DTCG |
| 2. DTCG engine | Parser and validator ([type inheritance](https://www.designtokens.org/TR/2025.10/format/#x6-7-3-type-inheritance), `$root`, `$extends`, aliases, `$ref`, cycles), [resolver](https://www.designtokens.org/TR/2025.10/resolver/#x6-resolution-logic), CSS emitter, incremental resolution through a dependency graph | The spec's own examples pass as test fixtures |
| 3. Export | `live-tokens export --format dtcg` writes a resolver document plus sets for the foundation tokens, the theme and the components | DTCG → CSS round-trips byte-identical; Terrazzo reads the export. Ship as a minor release. **Decide here whether to continue** |
| 4. Foundation source | `tokens.css` becomes a generated file from `foundation.tokens.json`; the CSS-text migrations become JSON operations; `npx live-tokens migrate` converts consumers | Both local consumers are migrated and CSS output is unchanged. This breaks consumers |
| 5. Themes | Theme `schemaVersion` 6 is a DTCG set with extensions; literal `cssVariables` become typed tokens; `_active` and `_production` become resolver inputs | The v5 → v6 migration runs on all 10 themes, and all ~50 existing data migrations still chain into it |
| 6. Component tokens | Each component gets `<id>.tokens.json` as its source; `:global(:root)` becomes generated; `sync:component-defaults` and `globalRootBlock.ts` are deleted; `catalogue` and schema move to TS modules; `registerComponent` accepts token JSON | 26 components converted; contract suites pass |
| 7. Editor, CLI, checkers, skills | `CssVarRef` becomes a DTCG reference; the checker vocabulary comes from the resolved token tree; skills and the atlas are updated, with both syncs run | `check:skill-atlas`, `check:skill-sources`, `check:cli-strings` and the full suite pass |
| 8. Import (optional) | Import from Figma, Tokens Studio or Penpot; tokens we don't recognise become overrides | A round trip through one external tool preserves the extensions |

## Open decisions

1. **Unsupported CSS values (~25 tokens).** Keep them as extension-only tokens that other tools skip, or change the design (for example, `em` letter-spacing to `rem`, which stops tracking from scaling with font size). Recommended: extension-only tokens.
2. **References with opacity.** Store the alpha as an extension on the alias, which keeps the link live, or turn each one into a fixed color, which breaks the link. Recommended: the extension.
3. **Where component defaults live.** Moving them into `.tokens.json` reverses the current rule that the `.svelte` `:global(:root)` block is the source of truth. A framework-neutral core requires that reversal.
4. **Package shape.** A separate `@motion-proto/live-tokens-core` package, or a subpath export. Recommended: a separate package, because `peerDependencies` apply to the whole package and Svelte is currently required. The cost is a second CI publish.
5. **Stopping point.** Phases 0–3 give a neutral core and DTCG export without breaking consumers. Phases 4–7 are the expensive part.

## Risks

- **Spec drift.** The gradient and typography shapes are still open questions ([issue 101](https://github.com/design-tokens/community-group/issues/101) and [issue 102](https://github.com/design-tokens/community-group/issues/102)), and a new [preview draft](https://www.designtokens.org/TR/drafts/) is active. Each type's encoder and decoder should sit in its own module so a change stays contained.
- **Migration chain.** The v6 migration has to chain after ~50 data migrations. The 15 `tokens.css` migrations have to keep working for consumers who haven't migrated yet.
- **Live editing.** Whole-tree resolution is too slow for the editor. Per-token updates must still write to both our own `:root` and the parent frame's `:root` through `cssVarSync`.
- **A drift bug already exists.** `CONTRACT_SCALES` lists `zoom` and `stroke`, which have no tokens, and it omits `z`, `ring`, `dot-size`, `page` and `shimmer`. Phase 7 fixes this by deriving the list from the token tree.

## Consumer and editor framing

The sections above treat live-tokens as the owner of the tokens: our theme model stays the source, and DTCG is an export format. In this framing, the user's DTCG files are the source, and they may come from Figma, Tokens Studio or a brand team. Live-tokens opens those files, previews our components against them, edits them live, and writes them back.

### Changes from the owner framing

| Topic | Owner framing | Consumer and editor framing |
|---|---|---|
| Source of truth | `data/themes/*.json`, exported to DTCG | The user's [resolver document](https://www.designtokens.org/TR/2025.10/resolver/) and its token files |
| Our token names | The contract, and DTCG is an output of it | A required set of semantic tokens that the user's files point into |
| Palette generator | The storage model | An optional tool that writes literal values and records its inputs in `$extensions` |
| Unsupported CSS values | ~25 gaps to encode in extensions | Limited to files we ship. Foreign files can't express them anyway |
| Themes and modes | One scheme per complete theme | [Modifiers](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-5-modifiers) arrive as data (light/dark, brand, density), and the editor must support all of them |
| `_working.json` buffer | Our own file | An [inline set](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-6-1-inline-sets-and-modifiers) placed last in `resolutionOrder`. Save merges it into its source file; discard drops it |
| Renames | Breaking changes with CSS migrations | [`$deprecated`](https://www.designtokens.org/TR/2025.10/format/#x5-2-4-deprecated) plus an alias to the new name, so a rename stops breaking consumers |
| First shippable step | Export | Read-only preview of a foreign DTCG repo |

### The contract as a set

Our components consume about 1300 semantic properties, which point at tokens like `--surface-brand` and `--radius-xl`. A foreign file won't use those names. The DTCG-native answer is to ship the contract itself as a [set](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-4-sets) of aliases, with defaults that point at our foundation set. The user's brand set loads after it and repoints those aliases:

```json
{ "surface": { "brand": { "$root": { "$value": "{acme.blue.600}" } } } }
```

Resolution order: live-tokens foundation → live-tokens contract → the user's brand set → the user's contract overrides.

This keeps the component tokens unchanged, and the contract becomes checkable: `check-page` verifies that the resolved tree defines every required path with the right `$type`.

The owner framing's biggest gaps shrink in this model:

- **Opacity.** Scrim, tint and the opacity aliases live in the contract set we ship, so the extension lives only there. A foreign file overrides the base color, and our emitter still writes the `color-mix`.
- **`em` letter-spacing and `linear()` easings.** These also stay confined to our own files.

### New difficulties

1. **Writing back to the right file.** The resolver [flattens every layer into one tree](https://www.designtokens.org/TR/2025.10/resolver/#x6-2-ordering). To save an edit, the editor needs each token's origin: the source file, the JSON Pointer inside it, and the set or context it came from. The UI also has to ask where an edit belongs, for example "base" or "dark only". Today's model never needed this.
2. **Lossless round trips.** These files live in git and sync with other tools. Opening and saving a file must change only the edited value. Key order, formatting, `$description`, unknown `$extensions` and splits across `$ref`'d files must all survive. The spec requires tools to [preserve extensions](https://www.designtokens.org/TR/2025.10/format/#x5-2-3-extensions).
3. **Modifiers in the UI and in CSS.** The editor needs a context picker for each modifier. The emitter must scope each modifier's differences to a selector or media query. [Permutations multiply across modifiers](https://www.designtokens.org/TR/2025.10/resolver/#x4-1-5-4-resolution-count), so it has to compare contexts one modifier at a time rather than emit every combination.
4. **Foreign names break suffix inference.** `KIND_RULES` can't tell whether `acme.space.4` is a padding or a gap. That conflicts with the recorded rule "picker selection is suffix-based; rename, don't override". Foreign tokens need a role from `$type` plus their group, or from an extension.
5. **Generator drift.** If Figma changes a step the curve generated, the stored inputs and the stored value disagree. The editor must detect that and show the step as an override. Today this is a nice-to-have; in this framing it becomes required.
6. **Editors for structured values.** Shadows, typography and gradients arrive as structured values, and their sub-values may be [references](https://www.designtokens.org/TR/2025.10/format/#x7-3-property-level-references). The current editors edit CSS strings.
7. **Positioning.** Live-tokens could open any DTCG repository, even one without our components. That moves the product beyond "a design system for building microsites".

### Phases for this framing

| Phase | Work |
|---|---|
| 0. Contract and fixtures | Ship the foundation and contract as `.tokens.json`. Build a fixture corpus: the spec's examples, a Tokens Studio export, a Figma variables export and Terrazzo samples |
| 1. Neutral core | Unchanged from the owner framing |
| 2. Reader | Load and validate a resolver document, resolve with each token's origin, emit CSS for the selected contexts, and preview our components through the contract. Checkers report missing contract tokens. Consumers see no breaking change; this is the proof point |
| 3. Writer | Lossless round trip (opening and saving without edits changes nothing), edits written back to each token's source file, the buffer as a trailing set, a layer target and a context picker in the UI |
| 4. Structured editors | Color with color space, dimension, shadow, typography and gradient, including sub-value references |
| 5. Optional generator | Palette curves write literal values plus their inputs in extensions; drift detection shows overrides |
| 6. Our own data | Convert theme v5 to DTCG sets and contexts, `tokens.css` to the foundation set, and component defaults to sets. Renames go through `$deprecated` aliases |
| 7. CLI, checkers, skills | Run everything on the resolved tree |

### Decisions for this framing

Two of the owner framing's open decisions change and two stay:

- **Opacity:** answered by the contract set.
- **Stopping point:** the read-only reader replaces export as the cheap first step.
- **Where component defaults live:** stays open.
- **Separate core package:** stays open. This framing makes the case for a separate package stronger.

New decisions:

1. **Contract shape.** A required set that user files point into, or a binding table kept in the editor. Recommended: the set, because it's native to DTCG and a checker can verify it.
2. **How a theme maps.** A theme becomes one context of a `theme` modifier, or a whole resolver document.
3. **Picker role for foreign tokens.** `$type` plus group, or a role stored in an extension. Either choice revises the suffix rule.
4. **Round-trip standard.** Byte-identical output, or semantically equal output with key order kept. Recommended: byte-identical, because these files live in git.
5. **Scope.** A general DTCG editor, or an editor only for trees that satisfy our contract.

## Style Dictionary and DESIGN.md

### The agentic design system model

[Josef Richter's article](https://josefrichter.design/blog/agentic-design-system) describes a pipeline built from framework-neutral files. Only the component layer depends on a framework.

1. **DTCG tokens are the source.** They come in three tiers: primitive, semantic and component.
2. **[Style Dictionary](https://styledictionary.com/info/dtcg/) or [Terrazzo](https://terrazzo.app/docs/) compiles them** into CSS variables, Swift, Compose and other targets.
3. **Tailwind v4 `@theme`** reads the compiled variables.
4. **[DESIGN.md](https://github.com/google-labs-code/design.md)** records intent and rules for agents, without repeating token values.
5. **Figma Code Connect** maps design variants to code.

His rule: "Keep DTCG canonical, treat everything downstream as derived."

| Article layer | Live-tokens today | Gap |
|---|---|---|
| DTCG tokens | `tokens.css` (primitives and semantic scales), theme JSON (generator inputs), component `:global(:root)` blocks (component tier) | The format, and a component tier held inside `.svelte` files |
| Style Dictionary build | `regenerateTokensCss` and `editorRenderer` | CSS is the only output |
| Tailwind `@theme` | None | Could be an extra output |
| DESIGN.md | `catalogue` entries (`description`, `whenToUse`, `whenNotToUse`, `constraints`, `props`), nine skills, and checker rules | The intent exists, but only as Svelte module scripts and Claude Code skills |
| Code Connect | None | Out of scope |

The article lists two problems in real codebases: hand-written CSS drifting away from the token files, and semantic intent kept in prose instead of references. Live-tokens already solves both. It generates the CSS, and its checkers require semantic properties.

### Style Dictionary options

- **A. Export DTCG and let the consumer run Style Dictionary.** `live-tokens export --format dtcg` writes one flat token file per theme, and the consumer brings their own build config.
  - Style Dictionary v5 still lacks the resolver module, gradients and durations ([issue #1590](https://github.com/style-dictionary/style-dictionary/issues/1590) open). A flat file per theme works around that.
  - Our themes are already complete documents, which is exactly what the flat-file approach needs.
- **B. Generate a working Style Dictionary setup.** `live-tokens export --style-dictionary` scaffolds `tokens/`, a config with CSS, iOS Swift, Compose and JS outputs, and a small hooks package (`@motion-proto/live-tokens-style-dictionary`) built on Style Dictionary's [hooks and formats](https://styledictionary.com/reference/hooks/formats/).
  - The hooks read our `com.motionproto.live-tokens` extension, so opacity references still come out as `color-mix` in CSS and as alpha on native platforms.
  - A parity test checks that Style Dictionary's CSS output matches `tokens.generated.css`.
- **C. Replace our emitter with Style Dictionary.** Not recommended.
  - The editor updates single tokens in the browser, and Style Dictionary builds whole files per platform. Browser support is unconfirmed.
  - If emission is ever handed to an outside tool, Terrazzo fits better. Its [JS API](https://terrazzo.app/docs/reference/js-api/) runs in the browser, accepts resolver documents held in memory, and its [CSS integration](https://terrazzo.app/docs/integrations/css/) emits modes with a `prepare()` function per permutation.

**Recommendation: A, then B.** Our own emitter stays for the web app and the editor, and Style Dictionary covers every other platform.

Native targets bring three limits:

- **Easings.** The six `linear()` easings have no iOS or Android equivalent.
- **Letter-spacing.** `em` values need converting per platform.
- **Components.** Tokens travel to every platform. Each platform still needs its own components.

### DESIGN.md

The format comes from Google Labs and is still [alpha](https://github.com/google-labs-code/design.md#status). A file has two parts, defined in the [DESIGN.md spec](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md):

- **YAML front matter:**
  - token groups `colors`, `typography`, `rounded` and `spacing`;
  - a `components` map that uses `{path}` references.
- **Markdown prose in eight ordered sections:** Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, and Do's and Don'ts.

The [`@google/design.md` CLI](https://github.com/google-labs-code/design.md#cli-reference) has three commands:

- **[`lint`](https://github.com/google-labs-code/design.md#lint)** runs [eleven rules](https://github.com/google-labs-code/design.md#linting-rules), including `broken-ref`, `contrast-ratio` and `orphaned-tokens`.
- **[`diff`](https://github.com/google-labs-code/design.md#diff)** compares two files.
- **[`export`](https://github.com/google-labs-code/design.md#export)** writes DTCG or Tailwind.

It fits us better than DTCG in places:

- **Colors** are CSS strings, so `oklch()` and `color-mix()` both work, and our opacity references need no extension.
- **Dimensions** allow `em`, so letter-spacing fits.

It fits worse in others:

- **Component properties.** It names eight: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height` and `width`. Our components have about 1300 semantic properties.
- **Variants** are written as key suffixes (`button-primary-hover`).
- **Shadows, motion and borders** have no token group.

For framework abstraction, DESIGN.md does the most. It separates intent from Svelte without touching any component. A React or native team would get the tokens from DTCG or Style Dictionary and the rules from DESIGN.md, then build their own components. Our Svelte components become one reference implementation.

We can generate it today, with no refactor, from sources that already exist:

| DESIGN.md part | Source |
|---|---|
| `colors`, `typography`, `rounded`, `spacing` | Resolved theme values |
| `components` | Component aliases, mapped onto the eight standard names where they fit |
| Components prose | `catalogue` entries, which `describeComponents` already reads from the `.svelte` text without running it (`components --json`) |
| Do's and Don'ts | Checker rules and catalogue `constraints`, such as "one primary per page" |
| Overview | The design direction that create-theme derives |

The editor would regenerate DESIGN.md on save and promote, so it never drifts. Running `design.md lint` becomes a test gate.

### Revised order

1. **DESIGN.md export.** It's cheap, breaks nothing, and proves the framework-neutral intent layer first.
2. **Neutral core** (owner framing phase 1).
3. **DTCG export, one flat file per theme.**
4. **Style Dictionary scaffold and hooks package**, with the parity test.
5. **The rest of the owner framing's phases.** Move `catalogue` out of `<script module>` in phase 6 as planned.

### Decisions for Style Dictionary and DESIGN.md

1. **Build tool.** Style Dictionary, Terrazzo, or both. Flat files per theme work for both tools, and resolver documents can wait.
2. **DESIGN.md component mapping.** The eight standard names pass lint but lose detail. Our semantic property names keep everything but trigger lint warnings. Emitting both would put the standard names in `components` and the full set in a custom key, which lint ignores.
3. **Direction of DESIGN.md.** Export only, or import too. With import, create-theme could take any DESIGN.md as its brief and route it through set-colors, set-type and set-geometry. [designmd.app](https://designmd.app/) lists 759 such files.

## Component token duplication

Most of the ~1300 component properties come from how we structured the tokens, and DTCG itself doesn't require them.

The 26 components declare 1312 properties. 568 of them (43%) repeat the value of a sibling whose name differs in exactly one part: the variant, the state or the element.

| Property kind | Declarations | Same value as a sibling | After collapsing repeats |
|---|---|---|---|
| Typography (font family, size, weight, line height) | 383 | 233 (61%) | 150 |
| Shape (padding, radius, border width, icon size, gap) | 390 | 209 (54%) | 181 |
| Color and other | 539 | 126 (23%) | 413 |

Variants mostly differ in color. Shape and type repeat.

### Causes

1. **Every variant repeats every property.**
   - Badge has 7 variants with 13 properties each. Only surface, text and border differ, so its 130 declarations reduce to 40.
   - Button's 6 variants each set the same padding, radius, border width, icon size and four font properties.
   - The editor keeps those copies equal through `groupKey` and `canBeLinked` (`ButtonEditor.svelte:21-32`). The data stores six copies, and editor code holds the link between them.
2. **States repeat structural properties.**
   - Of 385 declarations for states such as hover, selected and disabled, 201 equal the default.
   - 176 of those 385 are shape or type properties, and 151 of the 176 equal the default.
   - SideNavigation's title hover state repeats padding, border width and every font property from its default state (64 of 93 state declarations). TabBar repeats 36 of 44, CollapsibleSection 30 of 33.
   - A hover state that can change padding or font size also makes layout shift possible.
3. **Typography is spelled out property by property.** Components hold 95 typography bundles in 381 declarations. `tokens.css` already defines 12 text styles, and only 27 bundles match one of them.

Some repetition across components is correct. `--font-sans` appears in 20 components and `--border-width-1` in 20. That is each property pointing at one shared token, which is how the system should work.

### DTCG remedies

CSS custom properties can't inherit from one another, so every editable slot needs its own declaration in the output. The decision to make every variant × state × property combination editable was ours. DTCG gives us what CSS lacks:

- **[`$extends`](https://www.designtokens.org/TR/2025.10/format/#x6-4-extending-groups):** `button.secondary` extends `button.base` and overrides only its colors.
- **[Aliases](https://www.designtokens.org/TR/2025.10/format/#x7-aliases-references):** `button.secondary.radius: {button.radius}` stores the link in the data. Unlinking becomes replacing an alias with a local value, so the current per-property unlinking survives without stored copies.
- **[`typography` tokens](https://www.designtokens.org/TR/2025.10/format/#x9-8-typography):** each text element references one style, and the emitter writes out the individual font variables.

Because the emitter can still write every existing CSS variable, the source can shrink without renaming anything consumers use. Emitted CSS stays byte-identical.

### Size after restructuring

- About **744** properties if sibling repeats become aliases or `$extends`.
- About **632** if typography bundles also become text-style references.

These numbers count values that happen to be equal today. Where two variants match by coincidence and should stay independently editable, each one should keep its own property. That decision belongs to the component author for each property, and it matches the existing rule that linkage is declared by the developer.

Method: two declarations count as duplicates when they share a value and their names differ in one segment. The census parsed the `:global(:root)` blocks in `src/system/components/*.svelte`.

## Sources

### DTCG specification

- [DTCG Technical Reports](https://www.designtokens.org/technical-reports/)
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Design Tokens Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/)
- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [Preview draft](https://www.designtokens.org/TR/drafts/)
- [DTCG stable release announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [DTCG issue 101: gradient type feedback](https://github.com/design-tokens/community-group/issues/101)
- [DTCG issue 102: typography type feedback](https://github.com/design-tokens/community-group/issues/102)

### Build tools

- [Style Dictionary DTCG support](https://styledictionary.com/info/dtcg/)
- [Style Dictionary issue #1590: support for DTCG v2025.10](https://github.com/style-dictionary/style-dictionary/issues/1590)
- [Style Dictionary formats and hooks](https://styledictionary.com/reference/hooks/formats/)
- [Terrazzo docs](https://terrazzo.app/docs/)
- [Terrazzo CSS integration](https://terrazzo.app/docs/integrations/css/)
- [Terrazzo JS API](https://terrazzo.app/docs/reference/js-api/)

### Agentic design systems and DESIGN.md

- [Josef Richter, "Agentic design system"](https://josefrichter.design/blog/agentic-design-system)
- [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
- [DESIGN.md format specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
- [DESIGN.md linting rules](https://github.com/google-labs-code/design.md#linting-rules)
- [designmd.app](https://designmd.app/)
