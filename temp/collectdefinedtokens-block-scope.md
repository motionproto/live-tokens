# Investigate: `collectDefinedTokens` is block-blind (deferred)

**Status.** Logged, not actioned. Decision (2026-05-29): **leave as-is.** This note records the finding, the evidence that it is currently harmless, and the precise trigger that should reopen it.

**Origin.** Surfaced while fixing the `findInsertionPoint` bug (the migration engine spliced token additions into a nested `@media { :root { … } }` block instead of the top-level `:root`, producing declarations that float directly inside `@media` — invalid CSS that lightningcss, Vite 8's default minifier, rejects with "Unexpected end of input"). That fix landed in `cssTokenOps.ts` (`findInsertionPoint` + new `findTopLevelRoot` helper at `cssTokenOps.ts:176`). This note is the *same root cause in a sibling function*, left unfixed on purpose.

---

## 1. The finding

`collectDefinedTokens` (`cssTokenOps.ts:22`) collects custom-property **names declared anywhere in the source** via a global regex (`DECL_RE`, `cssTokenOps.ts:18`). It does not distinguish a declaration in the top-level `:root` from one inside a nested at-rule such as a responsive

```css
@media (max-width: 480px) { :root { --font-size-6xl: 2.125rem; } }
```

So a token that exists **only** as a responsive override — present in an `@media` block but never defined as a base default in the top-level `:root` — is reported as "defined."

That is the same block-blindness that `findInsertionPoint` had: treating the flat token stream as if block nesting did not matter.

## 2. Why it is currently harmless

Audit of `runegoblin-site/src/system/styles/tokens.css` (the largest real consumer):

- 986 tokens total seen by `collectDefinedTokens`.
- 986 declared in the top-level `:root`.
- 20 declared inside `@media` overrides (the responsive `--font-size-*` / `--icon-size-*` ramp).
- **0 tokens exist only inside an `@media` block** — every override mirrors a base default.

So no presence check is currently fooled. The convention in practice ("a responsive override only ever narrows a token that already has a base value") keeps the blind spot dormant.

## 3. Where it would bite if that convention broke

Two call paths consume the presence set:

- **`ensureScale` idempotency** (`cssTokenOps.ts:61-62`). `missing = entries.filter(e => !defined.has(e.name))`. If a migration wants to *guarantee a base default* for `--foo`, and `--foo` happens to exist only as an `@media` override, `ensureScale` sees it as defined and **skips adding the base default**. The token then resolves to nothing outside the breakpoint.
- **`validateTokensCss`** (`index.ts:91`, using `collectDefinedTokens` at `index.ts:93-94, 101`). A token referenced by a component but defined *only* inside an `@media` override would be reported as **defined/OK**, masking a genuinely missing base default (the editor would render a blank slot at wider viewports).

Neither is observed today; both are real if a token ever lives only in an override.

## 4. Decision and trigger

**Decision: leave the global contract intact.** `collectDefinedTokens` is documented as "names declared … anywhere in the source" (`cssTokenOps.ts:21`), and `renameToken` (`cssTokenOps.ts:83`) legitimately wants the *anywhere* semantics — a rename must rewrite the override too. Narrowing the shared function would break that call site and is speculative generality (YAGNI) given §2.

**Reopen when** either is true:
- a `tokens.css` in the wild declares a token *only* inside an `@media`/`@supports`/`@container` block (i.e. the §2 audit returns a non-empty "only-nested" set), or
- a migration needs to assert a token is present *as a base default* specifically.

## 5. Fix shape if reopened (do not pre-build)

Add a **root-scoped variant** rather than changing the global one:

```ts
// presence specifically among direct children of the top-level :root
export function collectRootTokens(css: string): Set<string>
```

It can reuse `findTopLevelRoot` (`cssTokenOps.ts:176`) — slice the top-level `:root` span, run `DECL_RE` over the direct-child declarations only. Then:
- point `ensureScale`'s presence check (`cssTokenOps.ts:62`) at `collectRootTokens` (it is asserting a *base default* exists);
- leave `renameToken` and the broad `validateTokensCss` union on `collectDefinedTokens` unless §3's validate gap is the reason for reopening, in which case validate distinguishes "defined as base" from "defined only as override" and warns on the latter.

Add a regression fixture mirroring §3: a token present only in an `@media` override, asserting `ensureScale` still inserts the base default. Keep the existing `collectDefinedTokens` "anywhere" tests green.
