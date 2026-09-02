# Design-system compliance: goals, mechanisms, and what to audit

A briefing for a deeper audit. It states the goals the work was built to meet,
how each is met today, how well, and what to attack. Written after the work, from
measurements taken against the tree it describes.

The audit's question is not "what exists" but **"does each goal actually hold,
and would we know if it stopped holding."**

## The goals

Four, as stated:

- **G1 — Pages use only valid components and tokens.** A page may reach for a
  component that exists in the catalogue and a token that resolves. Anything else
  is reported.
- **G2 — Components are built from semantic properties that use tokens.** A
  component token names a property; its default is the theme token that property
  reads. That is what makes a component repaint when the theme changes.
- **G3 — Blocking versus warning is a flag.** Each rule's severity is a decision
  the project makes, not one the checker imposes.
- **G4 — Skills iterate against the tests until they pass.** An agent building a
  page or a component runs the check, fixes what it reports, and repeats until it
  is clean, rather than declaring done and leaving a human to find out.

### Why they needed mechanisms

The system's premise is that a change in the editor repaints the site. A page
that writes `#6a4ce8`, or a component whose default is a raw `16rem`, opts out of
that silently. Nothing caught it. `live-tokens-build-page` said "use theme tokens
for every value" and verified it by asking a human to change a colour and look.

There was one static checker, `check-component`, covering the *naming* half of the
component contract. Nothing covered pages, and nothing checked that a token a
component reads actually exists.

## How each goal is met, and how well

| Goal | Mechanism | Enforced by | Status |
| --- | --- | --- | --- |
| G1 components | `unknown-component`, `deep-import` (error) | `check-page`, `check:pages` in `prepublishOnly` | Holds for imports; blind to how a component is *used* |
| G1 tokens | `unknown-token` (error), `color-literal` (error), `dimension-literal` (warn) | same | Holds for `<style>` blocks; see false-negative surface |
| G2 | `unknown-token-ref` (error), `default-not-token` (warn), `dimension-literal` (warn) | `check-component`, plus the catalogue fixture in `npm test` | Holds at error level; the semantic default rule is only a *warning* |
| G3 | Per-rule severity: config, `--off/--warn/--error`, `--strict` | both checkers | Fully met |
| G4 | `--json` findings, exit codes, gate step in both skills | skill text; nothing mechanical | **Weakest. Never exercised end to end.** |

Two of these deserve emphasis before the detail.

**G2 is enforced at error level only for references, not for values.** A default
that reads a token which does not exist fails the build. A default with *no token
behind it at all* is a warning, so a component can ship having opted out of the
theme without failing anything. That was a deliberate call — it kept the shipped
catalogue green while the vocabulary was still wrong — and it is now the main
thing standing between G2 and being fully enforced. The vocabulary is fixed; the
severity has not been revisited.

**G4 has a mechanism but no proof.** The commands, the flags, and the recipe step
all exist. No skill was run end to end against a new component or a new page
during this work, so the loop is designed and documented but unexercised.

## What was built

### One vocabulary, read by everything

`bin/lib/tokenVocabulary.mjs` answers "is this a real token" for both checkers.
Two sources, deliberately only two:

1. **`tokens.css`** — 528 names. A theme token *is* a name declared there. There
   is no second register to consult.
2. **Component tokens** — every `--<id>-*` a component declares in its
   `:global(:root)`, shipped or consumer-authored.

An earlier draft carried a third source: names the theme engine emits but
`tokens.css` never declares. That set turned out to hold exactly the three hover
stops, and those turned out not to be tokens at all (below), so the machinery was
deleted rather than kept for a case that no longer occurs.

The module reads files only. It must never import `dist-plugin` at module top:
CI runs the suite before the plugin is built, and `bin/engineLoadsLazily.test.ts`
enforces that.

### `check-page` — new (G1)

`bin/check-page.mjs`, `npx live-tokens check-page [paths...]`. Ten rules:

| Rule | Default | What it catches |
| --- | --- | --- |
| `unknown-component` | error | An import of a component not in the catalogue |
| `deep-import` | error | Reaching into `@motion-proto/live-tokens/src/...` |
| `unknown-token` | error | `var(--x)` that resolves to nothing |
| `color-literal` | error | hex, `rgb()`, `hsl()`, `oklch()` in page CSS |
| `reserved-route` | error | A page route under `/live-tokens/*` |
| `site-css-in-main` | error | `site.css` imported from `main.ts` |
| `dimension-literal` | warn | A raw px or rem outside a var fallback or media query |
| `hardcoded-columns` | warn | `repeat(<n>, 1fr)` instead of the page grid |
| `raw-text-axis` | warn | An absolute type value instead of a text-style bundle |
| `missing-source` | warn | A route entry with no `source`, so Page Source cannot open it |

Baseline on this repo: **0 errors, 22 warnings across 21 files** (19
`dimension-literal`, 3 `hardcoded-columns`).

Tuning that mattered, and that an audit should re-examine: `em` and unitless
values are excluded from `dimension-literal` (they are relative to inherited
type, not themeable); `var()` fallbacks are stripped before scanning; media-query
preludes are excluded; `raw-text-axis` fires only on absolute or named values;
`hardcoded-columns` requires the literal `, 1fr)` shape so a local two-up is not
flagged. Each of those is a judgement call about signal versus noise.

### `check-component` — extended (G2)

It already checked naming. It now also checks what a default *resolves to*, which
is the half that makes a component repaint:

| Added rule | Default |
| --- | --- |
| `unknown-token-ref` | error |
| `default-not-token` | warn |
| `dimension-literal` | warn |

`checkComponentDefaults(file)` was split out as the half that holds for every
component regardless of layout, so the value rules can run over the shipped
catalogue without the consumer-only structural rules.

### Severity and flags (G3)

Every rule has a default severity, overridable in this order, last wins:
`checks.rules` in `live-tokens.config.json`, then `--off=` / `--warn=` /
`--error=`, then `--strict` (promotes every warning). `--json` emits findings
with a stable `rule` id and line number. Exit code is 0 unless an error survives.

`--json` is the contract an agent iterates against: parse, fix one rule, re-run.

## The token model the checks encode

Three concepts that were sharing two names:

| | What it is | Where |
| --- | --- | --- |
| `--tint-*` | A wash **on** a surface that shifts its shade | hover, an active tab, a badge |
| `--scrim-*` | A translucent layer that dims what is **behind** it | behind a modal |
| `backdrop` | Not paint. What is behind a thing, and which way it leans | `@motion-proto/live-tokens/backdrop` |

`--overlay-*` became `--scrim-*`; `--hover-*` became `--tint-*` and gained
`tokens.css` baselines it never had. Five shipped usages moved from scrim to tint
because they wash a surface rather than dim behind it, which **restyles them**
(a 38% near-black wash becomes a 10% white one).

Two rules fall out, and both are now enforced:

- **A state is a segment of a property name, never a token.** `hover` belongs in
  `--button-outline-hover-surface`. `var(--hover)` names nothing, and two shipped
  components were reading it.
- **A component token names a semantic property; its default is the theme token
  that property reads.** That is what `default-not-token` and
  `unknown-token-ref` enforce.

Optional interactions are gated by a `-enabled` variable, never a state word:
`--card-hover-border-active` read as state-after-property and failed the very
contract the skill documented.

## Where the checks run

- **`npm test`** — 4272 tests, 106 files. Includes the fixtures below.
- **`npm run check:pages`** — `check-page` over the repo, in `prepublishOnly`
  between `check:component-defaults` and `check:production-is-default`.
- **`prepublishOnly`** — sixteen gates. `check:pages` is one of them.

### The fixtures

Two, both in `bin/check-component.test.ts`:

- **`the shipped catalogue satisfies the contract it documents`** — runs the full
  `check-component` over every id in `builtInRegistry` and requires zero errors.
  This is the load-bearing one. It exists because nothing previously connected
  the rule to the components it describes, so the rule could quietly become
  wrong — and had. See below.
- **`shipped components > every default resolves to a real token`** — the value
  half over every runtime file.

`bin/check-page.test.ts` holds `this repo's own pages carry no page errors`, plus
per-rule unit coverage on temp fixtures.

### What the fixture found immediately

`check-component` reported **109 errors across all 26 shipped components**. Almost
none were defects in the components:

- **74 unknown-suffix.** The checker's list had drifted narrower than the
  catalogue, rejecting `-accent`, `-title`, `-margin`, `-easing` and more. The
  editor's own `KIND_PATTERNS` already knew several of them; the two lists had
  diverged with nothing holding them together.
- **25 no-registration.** First-party components register by membership in
  `builtInRegistry`, not a `registerComponent` call.
- **10 genuine**, each fixed: two undeclared intrinsics (`--button-shimmer`,
  `--imagelightbox-tile-object-fit`), a phantom token the extractor read out of a
  **comment**, and CornerBadge's prefix (below).

The fix was structural, not a longer list: the vocabulary moved to `KIND_RULES`
in `src/editor/core/components/aliasKinds.ts`, and the picker, the `adjust` CLI,
`check-component`, and `check:skills` all read that one table.

## Skill wiring (G4)

**`live-tokens-create-component`** — verification was a closing checklist item.
It is now **step 6 of the recipe**, phrased as a gate: run
`check-component <id> --strict --json`, fix, re-run, do not report done until it
exits 0. Plus the instruction that only became honest once the catalogue passed:
*if a suffix is rejected, do not invent a name — find a shipped component that
paints the same role and use its name.*

**`live-tokens-build-page`** — the Verify section led with "change a colour and
look". It now leads with `check-page`, the same iterate-until-zero framing, and
documents `--strict`, `--json`, `--off=`, and the config block. The manual checks
remain, after, for what no static check can see.

**`check:skills`** gates the vocabulary in both directions: a suffix the checker
accepts must be documented, and a documented suffix must be accepted. It reads
`KIND_RULES` directly. It caught `-enabled`, `-tint`, and the whole reconciled
list during this work, and it is the reason the docs cannot silently drift.

## Traps worth knowing before changing any of this

Each cost real time; each is now recorded in the plan or in code comments.

1. **A component token's value is substituted at `:root`.** It can only name
   theme tokens or other component tokens, never a per-variant private `--_var`.
   A `:root` gate referencing one computes to guaranteed-invalid and silently
   drops the property — a black button on hover. Per-variant switching must be
   done by writing aliases, not by gating in CSS.
2. **`EditorState` is persisted whole to localStorage** and shallow-merged in
   `editorPersistence.hydrate`. Renaming a *state key* needs a normalizer there;
   renaming a *theme-file* key needs a migration. Theme files store flat
   `--name: value` maps; localStorage stores the slice shape. Getting this wrong
   throws out of the render path on load for anyone with a saved session.
3. **Shipped presets are complete documents.** Adding a component token means
   filling the eight preset themes **in the derived key order** —
   `presetThemes.test.ts` compares the ordered key list, not the set.
4. **`check:preset-themes` reads `dist-plugin`.** It reports stale schema
   versions until `build:plugin` runs. `prepublishOnly` orders this correctly;
   local runs do not.
5. **`sketchPartTokens.test.ts` skipped every `:global(:root)` block** because
   sass prepends `@charset` to the first rule and the selector filter dropped
   anything starting with `@`. The contract had been running without the
   declarations it most needed.

## Audit agenda

Each item asks whether a goal holds, not whether a mechanism exists. Ordered by
expected value.

### G4 first: does the loop actually close?

The weakest goal, because it is the only one with no mechanical enforcement. The
skills *say* run the check and iterate; nothing makes them.

- Run `live-tokens-create-component` end to end on a genuinely new component and
  watch whether the agent reaches step 6, parses `--json`, and iterates. Do the
  same for `live-tokens-build-page` with `check-page`.
- When the checker rejects a suffix, does the agent take the documented route
  (find a shipped component that paints the same role) or invent a name? That
  instruction is the difference between the gate improving naming and the gate
  teaching agents to route around it.
- Should the loop be mechanical rather than instructed? A hook, or a step the
  skill cannot skip, would make G4 hold by construction instead of by compliance.

### G2: is a semantic default actually required?

`default-not-token` is a warning. A component can ship with a default that has no
theme token behind it and fail nothing.

- Promote it to error and see what breaks. Today the answer is: SideNavigation's
  two rem literals, and nothing else in the catalogue.
- If it stays a warning, say why in the skill, because the skill currently reads
  as though the rule is absolute.
- `--strict` is the documented setting for a new component, which makes the
  distinction moot *for agents* and live *for the repo*. Is that the intended
  split, or an accident of sequencing?

### G1: what a page can do that no rule sees

The rules cover imports and `<style>` blocks. Beyond that a page is unchecked:

- Nothing checks a component is *used* correctly — valid props, valid variant
  names, required slots. A page can import `Card` from the catalogue and pass it
  a variant that does not exist.
- Nothing checks a page respects the column grid it declares, beyond the literal
  `repeat(<n>, 1fr)` shape.
- Nothing checks derived text contrast on the surfaces it actually lands on.
- Are these checkable statically, and which would have caught a real bug?

### Then: are the rules the right rules?

The ten page rules and fifteen component rules were chosen from what the
reference app and catalogue actually do. Worth challenging:

- **Are the warn/error splits right?** `dimension-literal` is a warning, so the
  19 in this repo never fail anything. Is that the correct call, or a backlog
  wearing a severity label? G3 makes this a project decision — but a decision
  nobody has made is just the default.
- **`unknown-token` is an error for any unknown name.** An earlier draft split it
  by whether the name looked like a contract family. That split was dropped as
  unnecessary; confirm that under a consumer's tokens.css, not just ours.

### False negatives: would we know if a goal stopped holding?

More valuable than false positives, and less visible. The parsers are regex over
CSS text:

- `check-page` reads `<style>` blocks by regex; a component using
  `style:` directives, inline `style=`, or a CSS-in-JS path is invisible to it.
- Custom properties set from script are collected by pattern
  (`setProperty('--x'`, `style:--x`). What forms are missed?
- `check-component` extracts tokens with `--<id>(?:-[a-z0-9]+)+` after stripping
  comments. SCSS interpolation (`--badge-#{$v}-surface`) is deliberately
  unreadable, which is why Badge keeps its token block flat — is anything else
  hiding behind interpolation?
- The `intrinsics` exemption is matched by parsing `variable:` out of the editor
  source. A computed or imported `variable` would silently exempt nothing, or the
  wrong thing.

### Does the fixture actually hold the line?

The catalogue fixture is the mechanism preventing the drift that caused 74 of the
109 errors. Verify it would actually fail: add a component with a bad suffix, a
default with no token, an unregistered id, and confirm each is caught. If any
slips through, the guarantee is weaker than it reads.

### Consumer reality

Everything was measured against this repo, where the package and the consumer are
the same tree. The vocabulary resolves `tokens.css` from the consumer root with a
package fallback, and reads `aliasKinds.ts` and `registry.ts` from the package.
That path is exercised by unit fixtures in temp directories but **not** by a real
consumer install. `check:smoke-install` and `check:smoke-create` exist; neither
runs the checkers. That is the most likely place for a latent break.

### The `-active` gate rename's blast radius

`--card-hover-border-active` and friends became `-enabled` with a component-config
migration. Consumer projects with saved themes carry the old keys. The migration
handles them on load; confirm that end to end rather than by reading it.

### Open decisions, not defects

- **CornerBadge** is registered `cornerbadge` and names its tokens
  `--corner-badge-*`. The checker accepts the hyphenated form because the config,
  themes, and editor all follow it. Either normalize the component or document
  the prefix rule as allowing both — currently one shipped component silently
  disagrees with the documented scheme.
- **The tint layer's off switch** clears each hover-surface override, so a
  customized hover surface returns to the shipped default rather than the user's
  value. Undo covers the immediate flip. Is a snapshot worth building?
- **Hover tint scope** covers six components. Card and CollapsibleSection have
  their own hover gates; Toggle and CodeSnippet were judged too small to pay for
  the control. Re-test that judgement.

## Unverified

Stated plainly, because a green suite is not evidence of these:

- **G4 has never been exercised.** No skill was run end to end against a new
  component or page during this work. The loop is designed, documented, and
  unproven.

- **No visual review has happened.** The five scrim-to-tint moves restyle TabBar's
  active tab, Button's slotted badge, and three inline-`code` backgrounds. The
  tint layer switch, its reveal of the tint colour row, and the tint painting over
  a base surface have all been verified by tests and by reading the cascade, not
  by looking at them.
- The editor was never opened during this work beyond the two screenshots the user
  supplied, both of which surfaced a real bug the tests had not.

## Running it

```bash
npm test                              # 4272 tests, includes both fixtures
npm run check                         # svelte-check, 678 files
npm run check:pages                   # check-page over this repo
npx live-tokens check-page --strict   # promote warnings, see the real backlog
npx live-tokens check-component <id> --strict --json
npm run build:plugin && npm run check:preset-themes   # order matters
```
