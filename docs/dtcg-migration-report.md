# DTCG migration report

This report assesses the Design Tokens Community Group (DTCG) 2025.10 specification against the live-tokens token model and plans a migration. It was written 2026-09-15 against v0.79.0.

The report covers two framings:

- **Owner framing:** live-tokens owns the tokens and exports DTCG. Every section through "Risks" covers this framing.
- **Consumer and editor framing:** live-tokens reads, previews and writes the user's DTCG files. The section of that name covers it.

## The spec

- **Status.** 2025.10 is the first stable release, from 28 Oct 2025. It has three modules: Format, Color and Resolver. A preview draft dated 2026-09-08 is in progress, and it says not to implement it yet.
- **Format.**
  - Each token is JSON with `$value`, `$type`, `$description`, `$extensions` and `$deprecated`. Tools must preserve extensions they don't understand.
  - Groups, `$root` tokens and `$extends` are supported.
  - References are `{a.b}` aliases, plus JSON Pointer `$ref`, which can point into sub-values. Tools must support `$ref` and must detect cycles.
  - Seven primitive types: color, dimension, fontFamily, fontWeight, duration, cubicBezier and number. Dimension allows only `px` and `rem`.
  - Six composite types: strokeStyle, border, transition, shadow, gradient and typography. Gradient holds stops only. Typography has five fixed properties.
  - There are no expressions, no math and no color operations.
- **Color.** A value is `{colorSpace, components, alpha?, hex?}`. It supports 14 color spaces, including `oklch`.
- **Resolver.** A document has sets, modifiers (named contexts with a default) and a `resolutionOrder`, where the later source wins. Each input resolves to one flat token tree. Tokens can be written inline. The spec leaves CSS output (selectors, media queries) to each tool.
- **Tooling.** Style Dictionary still lacks the resolver, gradient and duration pieces (issue #1590 is open). Terrazzo is furthest along.

## Fit

DTCG fits our reference layers well. It doesn't fit our generative layer, and the gaps are concentrated in a few places.

| Area | Our model | DTCG | Fit |
|---|---|---|---|
| Component aliases | 1292 in `default.json`, 1282 of them bare names | `{surface.brand}` | Direct |
| Color scales (~280 values) | Computed from a base color plus curves | Stores resolved values only; `oklch` supported | Values fit. Generator inputs go in `$extensions` |
| References with opacity | `color-mix(… transparent)`: 9 aliases, 6 scrim and tint tokens, gradient stops | An alias cannot carry alpha | **Gap** |
| Shadows and focus rings (9) | Literal `hsla` strings | `shadow` composite | Direct, after parsing |
| Gradients (4) | `linear-gradient` with an angle | Stops only, no angle or kind (issue 101 open) | Partial |
| Font stacks | Stack slots, plus font source URLs | `fontFamily` array | Stacks direct. URLs go in an extension |
| Text styles (61 declarations) | `em` letter-spacing, and properties beyond the five | `typography` requires exactly five properties; `letterSpacing` must be `px` or `rem` | Partial |
| Responsive font sizes (12) | `@media` blocks | Resolver modifier; we emit the `@media` ourselves | Fits |
| Plain values | 55 `rem`, 19 `px`, 34 unitless `0`, 31 cubic-bezier easings, 7 durations, z-index and scale | Standard types | Direct |
| Unsupported CSS values (~25) | 4 `em`, 9 `%`, 3 `deg`, 1 `clamp(vw)`, 6 `linear()` easings, plus keywords `none`, `block` and `scroll` | No type | **Gap** |
| Picker kind | radius vs padding vs gap, inferred from the name suffix (`KIND_RULES`) | All three are `dimension` | `$type` is coarser, so suffix inference stays |
| Themes | Complete documents with `_active` and `_production` pointers | A `theme` modifier with one context per theme; the pointers become resolver inputs | Fits |
| Names | `--surface-brand` and `--surface-brand-low` both exist | `surface.brand.$root` and `surface.brand.low` | Fits, given a two-way name-to-path map |

### Findings

1. **The editor is a generator, and DTCG only stores values.** Our generator inputs (curves, harmony axes, font sources) would ride in `$extensions`. Other tools keep that data but can't regenerate from it. An edit to a single scale step made in Figma would come back as a palette override, which we already support.
2. **References with opacity are the largest loss.** DTCG has no way to express "this token at 38%", so we would need an extension to keep those references live.
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
- **Write our own resolver and CSS emitter** in the core, and use Terrazzo only as an interop test. We need our own because:
  - the editor has to re-resolve single tokens in the browser;
  - our CSS output (`color-mix`, `@media`, `:root:root`) is specific to us.

One rule holds in every phase: the CSS we emit stays byte-identical to today's `tokens.css`, `tokens.generated.css` and component `:global(:root)` blocks. Token names are public API.

## Phases

| Phase | Work | Done when |
|---|---|---|
| 0. Mapping spec | Settle the name-to-path mapping, the `$type` for each kind, the extension schema and the handling of each gap | Every CSS name converts to a path and back; a test covers all 540 + 1312 declarations |
| 1. Neutral core | Break the `buildColors` → `svelte/store` chain; move the linked-group logic onto plain data; replace `?raw` and glob imports with explicit inputs; move `curveEngine` and `paletteMath` out of `ui/` | A test fails on any `svelte`, `?raw` or `import.meta.glob` import in the core; `dist-plugin/setColors` has no Svelte import. This pays off even without DTCG |
| 2. DTCG engine | Parser and validator (type inheritance, `$root`, `$extends`, aliases, `$ref`, cycles), resolver, CSS emitter, incremental resolution through a dependency graph | The spec's own examples pass as test fixtures |
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

- **Spec drift.** The gradient and typography shapes are still open questions (issues 101 and 102), and a new preview draft is active. Each type's encoder and decoder should sit in its own module so a change stays contained.
- **Migration chain.** The v6 migration has to chain after ~50 data migrations. The 15 `tokens.css` migrations have to keep working for consumers who haven't migrated yet.
- **Live editing.** Whole-tree resolution is too slow for the editor. Per-token updates must still write to both our own `:root` and the parent frame's `:root` through `cssVarSync`.
- **A drift bug already exists.** `CONTRACT_SCALES` lists `zoom` and `stroke`, which have no tokens, and it omits `z`, `ring`, `dot-size`, `page` and `shimmer`. Phase 7 fixes this by deriving the list from the token tree.

## Consumer and editor framing

The sections above treat live-tokens as the owner of the tokens: our theme model stays the source, and DTCG is an export format. In this framing, the user's DTCG files are the source, and they may come from Figma, Tokens Studio or a brand team. Live-tokens opens those files, previews our components against them, edits them live, and writes them back.

### Changes from the owner framing

| Topic | Owner framing | Consumer and editor framing |
|---|---|---|
| Source of truth | `data/themes/*.json`, exported to DTCG | The user's resolver document and its token files |
| Our token names | The contract, and DTCG is an output of it | A required set of semantic tokens that the user's files point into |
| Palette generator | The storage model | An optional tool that writes literal values and records its inputs in `$extensions` |
| Unsupported CSS values | ~25 gaps to encode in extensions | Limited to files we ship. Foreign files can't express them anyway |
| Themes and modes | One scheme per complete theme | Modifiers arrive as data (light/dark, brand, density), and the editor must support all of them |
| `_working.json` buffer | Our own file | An inline set placed last in `resolutionOrder`. Save merges it into its source file; discard drops it |
| Renames | Breaking changes with CSS migrations | `$deprecated` plus an alias to the new name, so a rename stops breaking consumers |
| First shippable step | Export | Read-only preview of a foreign DTCG repo |

### The contract as a set

Our components consume about 1300 semantic properties, which point at tokens like `--surface-brand` and `--radius-xl`. A foreign file won't use those names. The DTCG-native answer is to ship the contract itself as a set of aliases, with defaults that point at our foundation set. The user's brand set loads after it and repoints those aliases:

```json
{ "surface": { "brand": { "$root": { "$value": "{acme.blue.600}" } } } }
```

Resolution order: live-tokens foundation → live-tokens contract → the user's brand set → the user's contract overrides.

This keeps the component tokens unchanged, and the contract becomes checkable: `check-page` verifies that the resolved tree defines every required path with the right `$type`.

The owner framing's biggest gaps shrink in this model:

- **Opacity.** Scrim, tint and the opacity aliases live in the contract set we ship, so the extension lives only there. A foreign file overrides the base color, and our emitter still writes the `color-mix`.
- **`em` letter-spacing and `linear()` easings.** These also stay confined to our own files.

### New difficulties

1. **Writing back to the right file.** The resolver flattens every layer into one tree. To save an edit, the editor needs each token's origin: the source file, the JSON Pointer inside it, and the set or context it came from. The UI also has to ask where an edit belongs, for example "base" or "dark only". Today's model never needed this.
2. **Lossless round trips.** These files live in git and sync with other tools. Opening and saving a file must change only the edited value. Key order, formatting, `$description`, unknown `$extensions` and splits across `$ref`'d files must all survive. The spec requires tools to preserve extensions.
3. **Modifiers in the UI and in CSS.** The editor needs a context picker for each modifier. The emitter must scope each modifier's differences to a selector or media query. Permutations multiply across modifiers, so it has to compare contexts one modifier at a time rather than emit every combination.
4. **Foreign names break suffix inference.** `KIND_RULES` can't tell whether `acme.space.4` is a padding or a gap. That conflicts with the recorded rule "picker selection is suffix-based; rename, don't override". Foreign tokens need a role from `$type` plus their group, or from an extension.
5. **Generator drift.** If Figma changes a step the curve generated, the stored inputs and the stored value disagree. The editor must detect that and show the step as an override. Today this is a nice-to-have; in this framing it becomes required.
6. **Editors for structured values.** Shadows, typography and gradients arrive as structured values, and their sub-values may be references. The current editors edit CSS strings.
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

## Sources

- [DTCG Technical Reports](https://www.designtokens.org/technical-reports/)
- [Format 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Color 2025.10](https://www.designtokens.org/TR/2025.10/color/)
- [Resolver 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [Style Dictionary #1590](https://github.com/style-dictionary/style-dictionary/issues/1590)
- [Style Dictionary DTCG page](https://styledictionary.com/info/dtcg/)
- [Terrazzo docs](https://terrazzo.app/docs/)
- [DTCG stable release announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
