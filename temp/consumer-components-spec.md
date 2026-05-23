# Consumer-authored components: implementation spec

Status: design approved, ready to implement.
Task tracker: tasks #1 (this spec) through #8. Use `TaskList` to claim work in ID order.

## Goal

Let a consumer using `@motion-proto/live-tokens` author their own components and get the same real-time editing experience as the first-party set. The workflow mirrors `docs/08-add-new-component.md` exactly, just from the consumer's perspective: write the runtime `.svelte`, write the editor `.svelte`, call `registerComponent({...})`, and it appears in `/components` with full token editing, linked-block, and persistence.

The mode of use is Claude-as-author in a consumer project, not human-as-author. The skill (task #5) is the primary teaching artifact; the API just has to be ergonomic enough for Claude to use without footguns.

## Position shift

This walks back `feedback_components_first_party.md`. The new position: components are first-party *by default*, but the package supports consumer-authored extensions via a public `registerComponent()` API. First-party and consumer-authored components follow the same patterns (enforced by the skill, not by types).

Memory update is task #8.

## The two pillars (skill content, summarized here)

**Pillar 1: Token discipline.** Every editable property is a CSS var declared in `:global(:root)`. Defaults reference theme tokens (`var(--surface-primary)`), never raw values. Naming follows `--<comp>-<variant>-<part>[-state][-property]` per `src/system/styles/CONVENTIONS.md`. The token surface is *meaningful*: separate row per state, per part, per property. Verification is `component-configs/<id>/default.json` non-empty and fully identity-mapped after first dev-server save.

**Pillar 2: Editor patterns.** Use `ComponentEditorBase` as the page shell, `VariantGroup` per variant with a state map, dev-declared linked-block (`canBeLinked: true` + `groupKey` + `linkableContexts` + `siblings`), and the established state model (component states are default/selected/disabled, mutually exclusive, disabled terminal; interaction states are default/hover; selected-disabled and hovered-disabled are impossible). Parts are not states (Dialog's overlay/header/body/footer). Editor chrome stays greyscale (file-state indicators are the only color), pill buttons, no em-dashes in copy.

Both pillars get expanded in `.claude/skills/live-tokens-add-component/SKILL.md`. This spec only summarizes for orientation.

## API design

### `registerComponent`

```ts
// New export from src/editor/index.ts
export function registerComponent(entry: {
  id: string;
  label: string;
  icon: string;
  sourceFile: string;
  editorComponent: Component<any, any, any>;
  schema: Token[];
}): void;
```

Called from the consumer's `main.ts` before mount. Late registration is fine since `ComponentEditorPage` reads the merged registry at mount, not at module load.

**Collision rule.** If `entry.id` matches a built-in id: `console.warn`, custom wins. Lets a consumer fork our Button by registering `id: 'button'` with their own editor.

**Side effects.** Internally calls `registerComponentSchema(entry.id, entry.schema)` so the store's schema map knows about the new component for reset-to-default actions.

### `origin` tag

`RegistryEntry` gains:

```ts
origin: 'system' | 'custom';
```

Built-in entries get `'system'` (set in the frozen object literal). `registerComponent()` sets `'custom'` implicitly. This is the only invariant that powers future operations (scoped reset, upgrade messaging, "promote my component upstream"). Not exposed in any visible API; consumers don't pass it.

### `ComponentId` widening

Public-facing type becomes `string`. If anything internal narrows on the closed union (search the codebase), introduce a private `BuiltInComponentId` union for that use. Most code paths should not need to narrow.

### Merged registry

`componentRegistry`, `componentRegistryEntries`, `componentIds` become *getters* (or recomputed on access) over `[...builtIn, ...runtime]`. Sort within each origin group alphabetically by label. Iteration order: all system entries first, then all custom entries. The nav rail (task #4) inserts a divider between the two groups.

`validateRegistryAgainstServerScan` uses the merged set, so warnings only fire for genuinely orphaned disk entries.

## Public exports

Expand `src/editor/component-editor/index.ts` to export (in addition to the current four):

**Svelte components:**
- `ComponentEditorBase`
- `VariantGroup`
- `LinkedBlock`
- `TypeEditor`
- (`TokenLayout` already exported)

**Helpers:**
- `buildSiblings`
- `computeLinkedBlock`
- `withLinkedDisabled`
- `buildTypeGroupTokens`

**Types:**
- `Token`
- (`ComponentSection` already exported)

Expand `src/editor/index.ts` to export:
- `registerComponent` (new)
- `editorState`
- `setComponentAlias`
- `setComponentConfig`
- `registerComponentSchema`

**Do not expose in v1:** `LinkageChart`, `ShadowBackdrop`, `ShadowBackdropControls`, `RadialShapePad`, `AngleDial`. Narrow the API surface. Add later if a consumer hits the wall.

The smoke test (task #7) imports only from `@motion-proto/live-tokens` and `@motion-proto/live-tokens/component-editor`. If anything is missing, that surfaces here.

## File layout for consumers

Runtime AND editor co-located in `src/system/components/` in the consumer's project:

```
src/system/components/
  MyWidget.svelte          # runtime
  MyWidgetEditor.svelte    # editor
```

Plugin's `componentsSrcDir` already defaults to `src/system/components/`, so scanning and `default.json` seeding work out of the box. The scanner only looks at runtime files (no editor name pattern collision; editors don't declare `:global(:root)` so seeding ignores them naturally).

Registration in `src/main.ts`:

```ts
import { registerComponent } from '@motion-proto/live-tokens';
import MyWidgetEditor, { allTokens as myWidgetTokens } from './system/components/MyWidgetEditor.svelte';

registerComponent({
  id: 'mywidget',
  label: 'My Widget',
  icon: 'fas fa-magic',
  sourceFile: 'src/system/components/MyWidget.svelte',
  editorComponent: MyWidgetEditor,
  schema: myWidgetTokens,
});
```

The skill teaches this layout. Do not invent alternatives.

## Nav-rail divider

`ComponentEditorPage.svelte` builds nav items from `componentRegistryEntries`. Group by `origin`. Render system entries first (alphabetical), then a labeled divider, then custom entries (alphabetical). Skip the divider entirely when no custom entries are registered (no empty section). Label copy: probably `SYSTEM` / `CUSTOM` as small caps eyebrow per `feedback_editor_heading_scale.md`. Confirm exact treatment at implementation time against the existing chrome rules.

Same pattern in the overlay's components view if it has its own nav rail.

## Skill outline

`.claude/skills/live-tokens-add-component/SKILL.md` contents:

1. **Frontmatter / trigger.** Triggers on "add a component to a live-tokens project", "make X editable in the live-tokens editor", "extend the live-tokens system with...", "create a tokenized [Thing] component", etc.
2. **Pillar 1** (token discipline) with the rules from the section above, plus the full naming vocabulary copied from `src/system/styles/CONVENTIONS.md` so the skill is self-contained.
3. **Pillar 2** (editor patterns) with explicit "do this / not this" examples for: ComponentEditorBase shell, VariantGroup, dev-declared linking, state model, parts vs states.
4. **Project structure.** Where files go (co-located in `src/system/components/`), where registration happens (`main.ts`), what the plugin seeds automatically (`default.json`), what is hand-edited vs build-artifact.
5. **Public imports only.** Hard rule. Imports must come from `@motion-proto/live-tokens` or `@motion-proto/live-tokens/component-editor`. Never deep-import `node_modules/@motion-proto/live-tokens/src/...`. The skill lists the full set of legal imports.
6. **4-step recipe** mirroring `docs/08-add-new-component.md` but with consumer-relative paths and consumer-perspective framing.
7. **Worked example.** A small `Stat` component (number + label, two variants, default/hover states). Same one as the smoke test. Show runtime, editor, registration, and verification checklist.
8. **Verification checklist.** Same as `docs/08` step 4 but adapted: appears in nav rail under `CUSTOM` group; default.json seeded; aliases persist; reset works; boot validation clean.

Pull rules verbatim from these existing feedback memories where they apply:
- `feedback_sharing_is_dev_declared.md` (linking)
- `feedback_state_model.md` (state taxonomy)
- `feedback_parts_vs_states.md` (parts != states)
- `feedback_editor_button_and_dividers.md`, `feedback_editor_heading_scale.md`, `feedback_greyscale_editor.md` (editor chrome)
- `feedback_no_em_dashes.md` (copy style)
- `reference_text_token_naming.md` (text token naming)

## Skill bundling and activation

- Skill lives at `.claude/skills/live-tokens-add-component/SKILL.md` in this repo.
- Add `.claude/skills/` to the `files:` array in `package.json` so it rides along in the tarball.
- Verify with `npm pack --dry-run` that the SKILL.md is in the output.
- Document activation in README: one-line copy or symlink from `node_modules/@motion-proto/live-tokens/.claude/skills/live-tokens-add-component` into the consumer's `.claude/skills/`. No install hooks; opt-in.

## Smoke test (task #7)

Add a small `Stat` custom component to this repo's starter using ONLY public imports. Place runtime + editor in whatever this repo's equivalent of "consumer area" is (probably `src/app/` or a designated dir; check during implementation). Register via `registerComponent()` in this repo's `main.ts` (gate behind a flag or remove before shipping if it would clutter the production set).

Verify:
- Appears in `/components` nav rail under the `CUSTOM` group.
- Token rows render; color picker, radius selector, etc. work.
- Linked block works if Stat has linkable tokens across variants.
- Edits persist via the plugin; `component-configs/stat/default.json` is seeded; saving creates `_active.json` and named files.
- Reset works.
- Boot validation is clean (no warnings about disk-vs-registry drift).
- Imports in the runtime, editor, and main.ts use ONLY `@motion-proto/live-tokens` and `@motion-proto/live-tokens/component-editor`. Grep to confirm no `../../editor/...` or `../system/...` leaks.

If any public export is missing, add it as a v1 export. If anything else surfaces (e.g. a scaffolding module quietly imports a private path), fix the visibility before merging.

## Considered and rejected

- **Schema-only API** (consumer provides `{tokens: Token[]}`, we auto-generate the editor). Rejected: user wants full editor parity, and the authoring is AI-driven so ergonomics matter less than power.
- **Separate filesystem dir for custom components** (`custom-components/` vs `system/components/`). Rejected: too invasive for v1, runtime `origin` tag captures the same invariant.
- **Separate route or tab** for custom components in `/components`. Rejected: divider in the same nav rail gives ownership clarity without second-classing.
- **Collapsible sections** in the nav rail. Rejected: chrome cost not worth it for short lists.
- **Split editor file location** (runtime in `system/components/`, editor in `editor/` mirror dir). Rejected: co-located is simpler for the typical 1-3 consumer components.
- **`npx setup-skill` script** for skill activation. Rejected: bundle in package, document one-line manual activation. Less surface area to maintain.
- **Exposing `BuiltInComponentId` publicly** so consumers can narrow on built-ins. Rejected: private internal type only.

## On-the-fly decisions (already settled; do not re-ask)

- Collision behavior: `console.warn`, custom wins.
- Public `ComponentId` is `string`; private `BuiltInComponentId` union only if narrowing is needed internally.
- Plugin config: no changes.
- Don't expose `LinkageChart`, `ShadowBackdrop*`, `RadialShapePad`, `AngleDial` in v1.
- Origin tag is implementation detail, not exposed in `registerComponent()` signature.
- Skill is bundled in the tarball; activation is consumer opt-in via copy or symlink.
- File layout: co-located runtime + editor in consumer's `src/system/components/`.

## Implementation order

Per task dependencies in the tracker:

1. **Task #1** (this spec). Done when this file is written.
2. **Task #2** (open the registry). Foundation. Blocks #3 and #4.
3. **Task #3** (expand public exports). Required for the skill and smoke test to reference legal imports.
4. **Task #4** (nav-rail divider). UI side of #2; can run in parallel with #3.
5. **Task #5** (author the skill). Blocked by #3 because it lists public imports.
6. **Task #6** (bundle skill in package). Blocked by #5.
7. **Task #7** (smoke test). Blocked by #3 and #4. This is the proof that the public surface actually works end-to-end.
8. **Task #8** (memory + README). Blocked by #7. Last because the position-shift memory should match what actually shipped.
