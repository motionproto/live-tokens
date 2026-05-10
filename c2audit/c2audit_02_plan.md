# C2 Audit 02 — Implementation Plan

**Companion to:** [`c2audit_02.md`](./c2audit_02.md)
**Drafted:** 2026-05-10
**Scope:** all 17 findings (2 Critical, 6 Major, 5 Minor, 4 Nits)
**Format:** wave-level outline + concrete API/type sketches for the non-trivial waves
**Audit baseline:** `npm run check` reports 4 errors / 26 warnings; tests at the documented 18-failure baseline. Target end-state after Wave 1: 0 errors, baseline tests; after all waves: 0 errors, ≤18 failures, ~14 warnings (the rest are CSS-property compatibility nits).

---

## Wave dependency graph

```
W1 (Criticals) ──┬─→ W3 (cleanup) ─────────────┐
                 │                              │
                 ├─→ W2 (API lock-in)           │
                 │                              ├─→ done
                 ├─→ W4 (VariablesTab decomp)   │
                 │                              │
                 └─→ W5 (PaletteEditor decomp + ── W6 (VisualsTab rename))
```

W1 unblocks every later wave by clearing the 4 TS errors and removing the misleading "derivation not yet in store" narrative. W2/W3/W4 are otherwise independent and can run in any order or in parallel. W5 chains into W6 because the VisualsTab rename only makes sense after `scrapeCssVariables` is gone.

---

## Wave 1 — Critical fixes (C1 + C2)

**Goal:** Clear all 4 TS errors, fix the silent DialogEditor runtime bug, delete the misleading Lava Flow in PaletteEditor + VisualsTab.
**Estimated effort:** half a day, single PR.
**Files touched:** 3 (`src/component-editor/DialogEditor.svelte`, `src/ui/PaletteEditor.svelte`, `src/ui/VisualsTab.svelte`).
**Success criteria:** `npm run check` returns 0 errors; existing test baseline holds; manual verification that dialogs render with the user-selected confirm/cancel variants and that palette edits update the live preview without flicker.

### W1.a — C2: DialogEditor writes to `config`, not `aliases`

Five-line edit in `src/component-editor/DialogEditor.svelte`:

```ts
// Replace import
import { editorState, setComponentConfig } from '../lib/editorStore';

// Replace reactive reads (line 83–85)
$: config = $editorState.components.dialog?.config ?? {};
$: confirmVariant = (BUTTON_VARIANTS.includes(config[CONFIRM_VAR] as ButtonVariant)
    ? config[CONFIRM_VAR] : DEFAULT_CONFIRM) as ButtonVariant;
$: cancelVariant = (BUTTON_VARIANTS.includes(config[CANCEL_VAR] as ButtonVariant)
    ? config[CANCEL_VAR] : DEFAULT_CANCEL) as ButtonVariant;

// Replace handlers (line 87–94)
function setConfirmVariant(e: Event) {
  setComponentConfig(component, CONFIRM_VAR, (e.target as HTMLSelectElement).value);
}
function setCancelVariant(e: Event) {
  setComponentConfig(component, CANCEL_VAR, (e.target as HTMLSelectElement).value);
}
```

**Verification:** `npm run check` should drop from 4 errors to 0. Manually confirm the Dialog editor's "Confirm button" / "Cancel button" dropdowns now drive the live preview (they currently do nothing).

**On-disk migration:** check `src/lib/componentConfigKeys.ts` to confirm `--dialog-confirm-variant` and `--dialog-cancel-variant` are in `KNOWN_COMPONENT_CONFIG_KEYS` so `splitAliasesAndConfig` reroutes any existing `dialog/*.json` files on next load. If they aren't there, add them and reload-test once.

### W1.b — C1: Delete redundant palette emission + scrape

**`src/ui/PaletteEditor.svelte`:**
- Delete lines 994–1064 (three `$:` emission blocks + `setCssVar` helper + `appliedCssVars` array).
- Delete lines ~970–992 (local `scaleToCssVar` redefinition — `paletteDerivation.scaleToCssVar` is the canonical version and the renderer already uses it).
- Delete the `setCssVar as setCssVarSync` import on line 11.
- Drop unused locals if any are only referenced by the deleted blocks (e.g. `mountComplete` if it has no other consumer — check before removing).

**`src/ui/VisualsTab.svelte`:**
- In `handleSave` (lines ~49–75): replace the `scrapeCssVariables`/denylist/merge block with `const theme = toTheme(state, { name: displayName })` direct-to-`saveTheme(...)`. Delete the multi-line comment at lines 57–63.
- In `handleLoad` (lines ~77–105): drop the `applyCssVariables(theme.cssVariables)` line and the comment block at lines 82–87. `loadEditorState(theme)` already drives the renderer subscription.
- Drop the `scrapeCssVariables`, `clearAllCssVarOverrides`, `applyCssVariables`, and `DOMAIN_VAR_NAMES` imports if they have no remaining users in the file.

**Verification:** load the editor, edit a base palette colour, observe the live preview tracks. Save, reload, confirm round-trip. Check `git diff --stat` shows ~80–100 lines deleted across the two files. Run `PaletteEditor.test.ts` and `editorStore.test.ts` to confirm no regression.

**Risk:** if any other consumer of `scrapeCssVariables` exists outside VisualsTab, leave the export in `themeService` alone. Grep first: `git grep "scrapeCssVariables\|applyCssVariables"` — if VisualsTab is the sole non-export caller, the function bodies can stay (they're still used by the boat-anchor in m1) and only the call sites disappear.

---

## Wave 2 — Component public API lock-in (M6)

**Goal:** Settle the public API of `Notification`, `Dialog`, and `Button` before alpha. Collapse the per-action boolean+string+callback flag-args into a single `actions` config object that won't keep growing.
**Estimated effort:** 2 days. Touches runtime components, their editors, the component-config disk shape, and a load-time migration.
**Why now:** post-alpha, consumers lock against these prop shapes. Adding a fifth action position later is a breaking change; settling the shape now lets the API mature pre-1.0 without churn.

### W2.a — Type sketch (the new shape)

Define in `src/components/types.ts` (new file or extend an existing one):

```ts
import type { ButtonVariant } from './Button.svelte';

/** A clickable action surfaced inside a component's chrome (header pill, inline button, footer-left, footer-right). */
export interface ActionSpec {
  /** Visible text. Required for non-icon-only positions. */
  label?: string;
  /** Font Awesome icon class (without 'fas '). When set with no label, renders icon-only. */
  icon?: string;
  /** Click handler. Component does NOT call dispatch('action') — caller wires this directly. */
  onClick: () => void;
  /** Visual style. Defaults vary by position (e.g. footer-right defaults to 'primary'). */
  variant?: ButtonVariant;
  /** Disabled flag, in case the consumer wants to show-but-block. */
  disabled?: boolean;
}

/** Notification's four action positions. Each is independent; any subset may be present. */
export interface NotificationActions {
  header?: ActionSpec;   // top-right pill
  inline?: ActionSpec;   // beside the message text
  left?: ActionSpec;     // footer left (e.g. "Dismiss")
  right?: ActionSpec;    // footer right (e.g. "Confirm")
}

/** Dialog footer button spec. Confirm and cancel are symmetric; either may be undefined to hide. */
export interface DialogButtonSpec {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick: () => void;
}
```

### W2.b — `Notification.svelte` migration

**Before** (16 props):
```ts
export let title: string = '';
export let description: string = '';
export let variant: 'info' | 'success' | 'warning' | 'danger' = 'info';
export let size: 'sm' | 'md' | 'lg' = 'md';
export let icon: string | undefined = undefined;
export let dismissible: boolean = false;
export let emphasis: 'low' | 'medium' | 'high' = 'medium';
export let actionText: string = '';
export let actionIcon: string | undefined = undefined;
export let onAction: (() => void) | undefined = undefined;
export let actionInline: boolean = false;
export let actionHeader: boolean = false;
export let actionRightVariant: ButtonVariant = 'primary';
export let actionRightLabel: string = '';
export let onActionRight: (() => void) | undefined = undefined;
export let actionLeftVariant: ButtonVariant = 'outline';
export let actionLeftLabel: string = '';
export let onActionLeft: (() => void) | undefined = undefined;
```

**After** (8 props):
```ts
export let title: string = '';
export let description: string = '';
export let variant: 'info' | 'success' | 'warning' | 'danger' = 'info';
export let size: 'sm' | 'md' | 'lg' = 'md';
export let icon: string | undefined = undefined;
export let dismissible: boolean = false;
export let emphasis: 'low' | 'medium' | 'high' = 'medium';
export let actions: NotificationActions = {};
```

**Render path:** `{#if actions.header}` etc., each branch reads `actions.header.label / icon / onClick / variant`. Position-default variants (e.g. `actions.right?.variant ?? 'primary'`) live in the render block, not as separate props.

### W2.c — `Dialog.svelte` migration

**Before** (13 props): `show / title / confirmLabel / cancelLabel / showConfirm / showCancel / confirmDisabled / width / confirmVariant / cancelVariant / inline / onConfirm / onCancel`.

**After** (6 props):
```ts
export let show: boolean = false;
export let title: string = '';
export let width: string = '500px';
export let inline: boolean = false;
/** Right footer button. Undefined hides it. The `--dialog-confirm-variant` config still
 *  drives the variant when `confirm.variant` is unset (back-compat with the editor). */
export let confirm: DialogButtonSpec | undefined = undefined;
/** Left footer button. Undefined hides it. */
export let cancel: DialogButtonSpec | undefined = undefined;
```

`onConfirm` / `onCancel` become `confirm.onClick` / `cancel.onClick`. The `showConfirm` / `showCancel` flags collapse into "is the spec defined." `confirmDisabled` → `confirm.disabled`. The `--dialog-confirm-variant` / `--dialog-cancel-variant` config bucket entries (Dialog.svelte:27–29 from W1) still drive the variant when the caller leaves `confirm.variant` unset.

### W2.d — `Button.svelte`

Audit first: of the 10 props, identify which are truly orthogonal (variant / size / disabled / type / fullWidth / loading / etc.) vs. which are flag-args. Button is a leaf primitive; `actions` doesn't apply. Likely outcome: drop 1–2 truly redundant flags (e.g. `iconOnly` if it can be derived from `label === ''` + `icon != null`), keep the rest. **Defer to W2 sub-task** — read the file before deciding.

### W2.e — Editor controls + on-disk migration

`NotificationEditor.svelte`'s instance-config controls currently render one toggle per flag (header/inline/left/right). After W2.b they render four collapsible "Action" rows; each row toggles presence and, when present, exposes label/icon/variant. Saved instance configs need a load-time migration that reshapes
```json
{ "actionHeader": true, "actionText": "Foo", "actionIcon": "..." }
```
into
```json
{ "actions": { "header": { "label": "Foo", "icon": "..." } } }
```
Add this as a dated migration under `src/lib/migrations/2026-05-NN-notification-actions-shape.ts` keyed `appliesTo: 'component-config'`, `componentId: 'notification'`. Same shape for Dialog if any on-disk configs carry the old prop names. Bump `CURRENT_COMPONENT_SCHEMA_VERSION`.

### W2.f — Verification

- `npm run check` stays at 0 errors.
- New unit test: load a pre-migration on-disk Notification config, run migrations, assert the new shape.
- Manual: every Notification variant + action position renders correctly in the demo page; dialogs honour `confirm.disabled` and `cancel` undefined.

---

## Wave 3 — Mechanical cleanup (M3 + minors + nits)

**Goal:** clear the entire long tail of mechanical findings in one focused PR.
**Estimated effort:** 1 day.
**Touches:** `src/ui/UI*Selector.svelte` family, `src/lib/themeService.ts`, `src/lib/index.ts`, `src/ui/PaletteEditor.svelte` (constants), `src/ui/VariablesTab.svelte` (constants + shadow helpers), `src/ui/UITokenSelector.svelte`, `src/ui/UIVariantSelector.svelte`, `src/lib/componentConfigKeys.ts` (status only), `src/pages/Editor.svelte`, `src/components/Notification.svelte` (one cross-ref comment).

### W3.a — M3: Selector parallel hierarchy → single registry

**New file:** `src/ui/variantScales.ts`:

```ts
import type { ComponentType } from 'svelte';
import UIOptionItem from './UIOptionItem.svelte';

export interface VariantScaleEntry<TKey extends string = string> {
  varPrefix: string;
  options: ReadonlyArray<{ key: TKey; label: string; value?: string }>;
  /** Optional override of the default UIOptionItem rendering, for scales like
   *  line-height that want to render a sample preview. Receives `{opt, active, select}`. */
  optionRender?: ComponentType;
}

export const BLUR: VariantScaleEntry = {
  varPrefix: '--blur-',
  options: [
    { key: 'none', label: 'None', value: '0' },
    { key: 'sm', label: 'Small', value: '4px' },
    /* ... */
  ],
};

export const BORDER_WIDTH: VariantScaleEntry = { /* ... */ };
export const DOT_SIZE: VariantScaleEntry = { /* ... */ };
export const RADIUS: VariantScaleEntry = { /* ... */ };
export const SHADOW: VariantScaleEntry = { /* ... */ };
export const FONT_WEIGHT: VariantScaleEntry = { /* ... */ };
export const DIVIDER_HEIGHT: VariantScaleEntry = { /* ... */ };
// LINE_HEIGHT keeps its preview slot; entry includes optionRender pointing at LineHeightOptionItem.svelte.
export const LINE_HEIGHT: VariantScaleEntry = { /* ..., optionRender: LineHeightOptionItem */ };
```

**Consumer pattern** (replaces `<UIBlurSelector {variable} {component} {canBeLinked} />` etc.):

```svelte
<UIVariantSelector {variable} {component} {canBeLinked} {...BLUR} />
```

**Deletions:** `UIBlurSelector.svelte`, `UIBorderWeightSelector.svelte`, `UIDotSizeSelector.svelte`, `UIRadiusSelector.svelte`, `UIShadowSelector.svelte`, `UIFontWeightSelector.svelte`, `UIDividerHeightSelector.svelte`. Keep `UIPaletteSelector.svelte` (token-based, different shape), `UIFontFamilySelector.svelte` (different), `UIPaddingSelector.svelte` (different), `UILineHeightSelector.svelte` IF it has unique preview chrome (or fold into the `optionRender` slot).

**Update:** `src/ui/index.ts` exports — remove the deleted ones, add the registry. Update every consumer in `VariablesTab.svelte` and the component editors (search for `UIBlurSelector` / `UIBorderWeightSelector` etc., replace with `<UIVariantSelector {...BLUR}>`).

### W3.b — m1: `applyCssVariables` boat anchor

`git grep "from '.*themeService'" | grep -E "(applyCssVariables|clearAllCssVarOverrides|scrapeCssVariables)"` → if W1 has already deleted the only consumer (VisualsTab), then drop the `themeService.ts:130–132` re-export AND the `index.ts:9–15` direct exports that no consumer needs. Pick one canonical path; document with a one-line comment.

### W3.c — m2: Magic colors / durations

- `src/ui/PaletteEditor.svelte`: extract `const GRADIENT_ENDPOINTS = { light: '#ffffff', dark: '#000000' } as const` and `const GRAY_FALLBACK = '#808080'` at module scope; replace 4 inline literals.
- `src/ui/VariablesTab.svelte:133`: extract `const COPIED_FLASH_MS = 1000` at module scope.
- Inline `320ms` / `cubic-bezier(...)` in CSS rules: prefer `var(--ui-transition-fast)` consistently. Only flag the obvious ones; full token sweep is out of scope.

### W3.d — m3: UITokenSelector / UIVariantSelector typed events

```ts
const dispatch = createEventDispatcher<{
  reset: void;
  change: void;
  'var-change': void;
}>();
```

Consumers don't need updating (no payloads). Type-checker enforces consistent event names going forward.

### W3.e — m4: componentConfigKeys.ts TODO marker

No code change. Mark the audit-02 finding `[deferred]` with a one-line note: "Acceptable transient until W4 schemaVersion-per-component lands; no action needed."

### W3.f — m5: VariablesTab shadow handler boilerplate

Extract `updateShadowToken(idx: number, patch: Partial<ShadowToken>)` once at the top of `<script>`. Replace the five `setTokenField` / `setTokenColor` handlers with one-line callers. Diff: ~60 lines deleted.

### W3.g — Nits

- `src/lib/editorStore.ts`: leave `splitAliasesAndConfig` migration alone; the file is now a barrel (audit-01 M3 noted this as a Wave-4 concern).
- `src/components/Notification.svelte:107–113`: add a one-line note pointing at `src/lib/parsers/globalRootBlock.ts` (the parser that constrains the flat `:global(:root)` shape). One-liner in `globalRootBlock.ts` references back: "`Notification.svelte:107–113` documents the consumer-facing implication."
- `src/pages/Editor.svelte:75`: empty `.bar-right` ruleset — delete it, or commit to a feature and put one control there. Prefer delete.
- `src/ui/VariablesTab.svelte:2000`: add the standard `appearance: textfield` alongside `-moz-appearance: textfield`. svelte-check warning gone.

### W3.h — Verification

- `npm run check` 0 errors, ≤14 warnings.
- Visual: open every selector type in the editor; confirm rendering matches pre-W3.
- Manual: open every UIVariantSelector consumer (component editors + VariablesTab); confirm no broken bindings.

---

## Wave 4 — VariablesTab decomposition (M2)

**Goal:** Break `VariablesTab.svelte` (2480 lines, ~75 top-level decls, 4 orthogonal state machines) into cohesive sub-components.
**Estimated effort:** 1–2 days.
**Order:** independent of W2/W3/W5; can run in parallel.
**Risk:** moderate — many consumers; svelte reactivity needs care across component boundaries.

### W4.a — Decomposition target

Split into:

- **`src/ui/sections/ShadowsSection.svelte`** (~400 lines): owns globals (5 `setGlobal*` functions), per-token dial drag + sliders, override flags, bg-picker for the preview canvas, `editingShadow` state. Imports `shadowsToVars` only for read-back; all mutations go through the store via existing slice actions.
- **`src/ui/sections/OverlaysSection.svelte`** (~150 lines): the existing overlay channel UI lifted out.
- **`src/ui/sections/GradientsSection.svelte`** (~100 lines): gradient-tokens UI lifted out.
- **`src/ui/sections/ColumnsSection.svelte`** (~80 lines): the four `setColumns*` handlers + UI.
- **`src/ui/sections/TokenScaleTable.svelte`** (one component, parameterised): replaces the 7 hand-listed tables (spacing, border-width, radius, font-size, font-weight, line-height, icon-size). Props: `vars: readonly string[]`, `label: string`, `unitFormatter?: (raw: string) => string`. Renders a row per var with current resolved value + reset button. Consumed seven times in `VariablesTab.svelte`.
- **`VariablesTab.svelte`** (parent, ~200 lines): vertical layout, scroll-into-view nav handling, font-stack + project-fonts sections (those are already cohesive enough to stay inline or pull into one `FontsSection.svelte` if the parent gets unwieldy).

### W4.b — Migration tactic

Do one section per commit, in this order:
1. `ColumnsSection` — smallest, isolated, easy verify.
2. `TokenScaleTable` (×7 conversions) — most lines deleted, mechanical.
3. `OverlaysSection` — small.
4. `GradientsSection` — small.
5. `ShadowsSection` — largest, last, most complex.

After each commit run `npm run check` + manual editor open, before moving on.

### W4.c — Verification

- Final `VariablesTab.svelte` should be ≤300 lines.
- Editor renders identically; all sliders/handlers work; nav scroll-into-view honours every section.
- No new test failures.

---

## Wave 5 — PaletteEditor decomposition + state-machine fold (M1 + M4)

**Goal:** Break `PaletteEditor.svelte` (2597 lines after W1's deletions take it to ~2500) into sub-components, and fold the eight scattered editing-state `let` decls into one discriminated union.
**Estimated effort:** 2 days.
**Order:** after W1 (which trims the file by ~80 lines) and ideally after W3 (selector registry simplifies the curve-editor markup).

### W5.a — Decomposition target

```
src/ui/palette/
├─ PaletteEditor.svelte          (parent shell, ~300 lines)
├─ PaletteBase.svelte            (base color picker + mode toggle + tint hue/chroma; ~300 lines)
├─ ScaleCurveEditor.svelte       (one curve editor; props: kind, scale, channel; ~400 lines)
├─ GradientStopEditor.svelte     (the bar + drag/click handlers; ~350 lines)
├─ OverridesPanel.svelte         (per-step override map; ~150 lines)
└─ paletteEditorState.ts         (the EditingState union + helpers)
```

Parent owns the layout, slice subscription, and the editing-state machine; subs are pure presentational components driven by props + dispatch.

### W5.b — EditingState union (M4)

```ts
// src/ui/palette/paletteEditorState.ts
export type EditingState =
  | { kind: 'idle' }
  | {
      kind: 'editingBase';
      paletteLabel: string;
      snapshotHue: number;
      snapshotChroma: number;
      draftHex: string;
    }
  | {
      kind: 'editingScale';
      paletteLabel: string;
      scale: 'palette' | 'gray';
      channel: 'lightness' | 'saturation';
      lockedIdx: number | null;
      injected: boolean;
    }
  | {
      kind: 'editingStop';
      paletteLabel: string;
      stopIndex: number;
      draggingFrom: number | null;
      selectedStopIndex: number;
    }
  | {
      kind: 'editingOverride';
      paletteLabel: string;
      stepKey: string;
      snapshot: string;
      draft: string;
    };

export function isIdle(s: EditingState): s is { kind: 'idle' } {
  return s.kind === 'idle';
}

/** Type-narrowed accessor for the current paletteLabel, or null when idle. */
export function activeLabel(s: EditingState): string | null {
  return s.kind === 'idle' ? null : s.paletteLabel;
}
```

Parent state: `let editing: EditingState = { kind: 'idle' };` plus `let paletteEditScope: Scope | null = null` (the single existing valid pattern from audit-01 M6's scope primitive — keep this; it composes cleanly).

`confirmEdit()` and `cancelEdit()` dispatch on `editing.kind`. Sub-components receive `editing` as a prop and render conditionally; the type-checker enforces field validity per kind. Eight `let` decls collapse into one.

### W5.c — Migration tactic

Sub-component per commit:
1. Extract `OverridesPanel` first — least entangled with editing-state.
2. Extract `GradientStopEditor` — its drag handlers are self-contained.
3. Extract `ScaleCurveEditor` — instantiated 6× (3 scales × 2 channels) instead of 6 inline blocks.
4. Extract `PaletteBase`.
5. Introduce `EditingState` union; convert handlers to dispatch on `editing.kind`.

After each commit: `npm run check` + visual verify in editor.

### W5.d — Verification

- `PaletteEditor.svelte` shrinks from ~2500 (post-W1) to ≤300 lines.
- All five sub-components ≤400 lines.
- Eight `let` editing-state decls collapsed to one `editing: EditingState`.
- `PaletteEditor.test.ts` passes.

---

## Wave 6 — VisualsTab rename + extract orchestration (M5)

**Goal:** Rename `VisualsTab.svelte` to reflect its role, and extract the theme save/load orchestration into `themeService` so the file becomes a thin tab.
**Estimated effort:** half a day.
**Depends on:** W1 (which removes `scrapeCssVariables` from the orchestration).

### W6.a — Rename

`src/ui/VisualsTab.svelte` → `src/ui/EditorShell.svelte` or `src/pages/EditorShell.svelte` (likely the latter — it's a page-level shell, not a tab). Update `src/pages/Editor.svelte:3` import.

### W6.b — Extract orchestration

After W1, `handleSave` is essentially `toTheme(state) → saveTheme → setActiveFile → markSaved`. Move into `themeService`:

```ts
// src/lib/themeService.ts
export async function persistTheme(
  state: EditorState,
  fileName: string,
  displayName: string,
): Promise<void> {
  await tick();
  const theme = toTheme(state, { name: displayName });
  await saveTheme(fileName, theme);
  await setActiveFile(fileName);
  markSaved();
}

export async function hydrateTheme(fileName: string): Promise<void> {
  const theme = await loadTheme(fileName);
  migrateThemeFonts(theme);
  loadEditorState(theme);
  if (theme.fontSources?.length) applyFontSources(theme.fontSources);
  if (theme.fontStacks?.length) applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
}
```

`EditorShell.handleSave` / `handleLoad` become 5-line wrappers that handle UI-level state (`saveStatus = 'saving'`, error flash, etc.) and delegate to the service.

### W6.c — Verification

- Save/load round-trip works on every existing theme file.
- File rename caught by editor; import paths updated.
- `npm run check` 0 errors.

---

## Cross-cutting verification

After each wave:
- `npm run check` — track error/warning count; W1 should drop to 0 errors, later waves should hold.
- `npm run test` — track pass/fail count; baseline is 18 failures; no wave should add to that count.
- Manual editor open: load every component editor, edit a token, save, reload, confirm round-trip. After W1+W6 specifically, confirm palette gradient stops still round-trip (the test most sensitive to the `scrapeCssVariables` removal).

After all waves:
- `git log --oneline c2/audit-02-*` should show the wave commits in dependency order.
- audit-02.md updated with `[done] **Resolution (YYYY-MM-DD):** ...` notes under each finding's bullet block (don't move findings — severity remains the organising axis).
- `c2audit_02_plan.md` (this file) can be deleted or archived once every wave is `[done]`.

---

## Suggested execution model

This plan is structured for **fresh-orchestrator execution per memory's "Separate plan-writing from orchestration" guideline**. Recommended:

1. `/clear` the current session.
2. Start a fresh session: "Execute Wave 1 from `c2audit/c2audit_02_plan.md`. The audit findings are in `c2audit/c2audit_02.md` for reference. Land it as one PR with a single commit per sub-task (W1.a, W1.b)."
3. After W1 lands, repeat for W2 (or W3, W4 in parallel branches if you want — they're independent).
4. W5 and W6 can chain after W1 in a single longer session if W4 has shipped, since they touch the same files.

Each wave is sized to one Claude Code session at most. The API/type sketches above are the parts a fresh session can't easily re-derive; everything else falls out of reading the cited files.
