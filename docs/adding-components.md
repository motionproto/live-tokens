# Adding components

Making a Svelte component editable means: someone using the editor
can change its colours, type, spacing, and other slots without
touching code. The editor needs a runtime component, an editor
component, and one `registerComponent()` call.

There are two paths. The Claude skill is the recommended one because
it encodes the conventions for you and runs the verification
checklist. The manual recipe below is the same content, in case you
are not using Claude.

## Path 1: The Claude skill (recommended)

A skill named `live-tokens-add-component` ships in the npm tarball at
`.claude/skills/live-tokens-add-component/SKILL.md`. After you
install the package, Claude Code can see it.

### What the skill does

When you ask Claude to add a component, the skill drives the work:

1. Writes `src/system/components/<Name>.svelte` (the runtime), with
   every editable slot declared in `:global(:root)` and pointing at
   theme tokens by default.
2. Writes `src/system/components/<Name>Editor.svelte` (the editor),
   with `allTokens` exported from `<script module>`, variant groups,
   linked-block context labels, and a working preview.
3. Adds the `registerComponent(...)` call to your `src/main.ts`.
4. Walks the verification checklist (does the nav show the
   component, does the alias map persist, do linked tokens
   broadcast, does the boot validation pass) and reports the result.

### Triggering it

The skill activates on phrases like:

- "Add a Toggle component to live-tokens"
- "Make this Svelte component editable in the live-tokens editor"
- "Create a tokenised Stat component"
- "Extend live-tokens with a new component"

Claude will either start the work or ask a clarifying question (what
variants, what states, what slots) and then proceed.

### A worked example

Asking *"Add a `Stat` component with a primary and subtle variant,
two interaction states (default and hover), and a value plus label
slot"* produces:

**`src/system/components/Stat.svelte`** declares one variable per
editable slot:

```svelte
<style>
  :global(:root) {
    --stat-primary-surface: var(--surface-primary);
    --stat-primary-border: var(--border-primary);
    --stat-primary-radius: var(--radius-md);
    --stat-primary-padding: var(--space-16);
    --stat-primary-value-text: var(--text-primary);
    --stat-primary-value-font-family: var(--font-display);
    --stat-primary-value-font-size: var(--font-size-2xl);
    --stat-primary-value-font-weight: var(--font-weight-bold);
    --stat-primary-label-text: var(--text-secondary);
    --stat-primary-label-font-family: var(--font-sans);
    --stat-primary-label-font-size: var(--font-size-sm);
    --stat-primary-hover-surface: var(--surface-primary-high);

    /* subtle variant mirrors the same structure with neutral tokens */
  }
</style>
```

**`src/system/components/StatEditor.svelte`** declares the editor's
token surface in `<script module>`:

```ts
export const component = 'stat';
const variants = ['primary', 'subtle'] as const;

export const allTokens: Token[] = variants.flatMap((v) => [
  { label: 'surface',     variable: `--stat-${v}-surface` },
  { label: 'border',      variable: `--stat-${v}-border` },
  { label: 'corner radius', variable: `--stat-${v}-radius`,
    canBeLinked: true, groupKey: 'radius' },
  { label: 'padding',     variable: `--stat-${v}-padding`,
    canBeLinked: true, groupKey: 'padding' },
  { label: 'value text',  variable: `--stat-${v}-value-text` },
  // ...
]);
```

**`src/main.ts`** gets one line added:

```ts
import { registerComponent } from '@motion-proto/live-tokens';
import StatEditor, { allTokens as statTokens } from './system/components/StatEditor.svelte';

registerComponent({
  id: 'stat',
  label: 'Stat',
  icon: 'fas fa-chart-simple',
  sourceFile: 'src/system/components/Stat.svelte',
  editorComponent: StatEditor,
  schema: statTokens,
});
```

Then the skill prompts you to open `/components` and verify:

- Stat appears in the nav under **CUSTOM**.
- Token rows render with the right pickers.
- Linked-block: `corner radius` and `padding` broadcast across
  variants.
- Save creates `component-configs/stat/default_01.json`.
- Reset returns each row to its default.
- Boot validation is clean.

If anything fails, the skill helps you fix it before declaring done.

### Conventions the skill enforces

Two of these you should be aware of even if you never write a token
by hand:

- **Naming**: `--<componentId>-<part>[-<state>][-<element>]-<property>`.
  State comes *before* the property. No abbreviations. See
  [Token naming](token-naming.md) for details.
- **Public imports only**: imports come from
  `@motion-proto/live-tokens` and
  `@motion-proto/live-tokens/component-editor`. Deep-imports into
  `node_modules/@motion-proto/live-tokens/src/...` are not supported.

### Where the skill file lives

```
your-project/
└── node_modules/@motion-proto/live-tokens/
    └── .claude/skills/live-tokens-add-component/
        └── SKILL.md
```

If you want to read the full skill instructions (token suffix
vocabulary, state-model rules, the verification checklist verbatim),
that file is the source of truth.

## Path 2: The manual recipe

For when Claude isn't in the room.

### Step 1: Runtime component

Create `src/system/components/<Name>.svelte`. Declare every editable
slot in `:global(:root)` inside the `<style>` block. Default each one
to a theme token, not a raw value:

```svelte
<style>
  :global(:root) {
    --toggle-brand-track: var(--surface-neutral);
    --toggle-brand-radius: var(--radius-full);
    /* etc. */
  }
  .toggle { background: var(--toggle-brand-track); }
</style>
```

Variables not declared in `:global(:root)` will not be editable. The
dev plugin parses this block to seed the component's `default.json`.

### Step 2: Editor component

Create `src/system/components/<Name>Editor.svelte`. Two scripts:

- `<script module>` exports `component` (the lowercase id) and
  `allTokens` (the Token[] list). Declare which tokens can link
  with `canBeLinked: true` plus a `groupKey`.
- `<script>` imports the runtime component, scaffolding components
  from `@motion-proto/live-tokens/component-editor`, and mounts
  `ComponentEditorBase` with one `VariantGroup` per variant.

The component system reference chapter shows the full pattern with a
worked example.

### Step 3: Register

In `src/main.ts`, before `mount(App, ...)`:

```ts
import { registerComponent } from '@motion-proto/live-tokens';
import MyEditor, { allTokens as myTokens } from './system/components/MyEditor.svelte';

registerComponent({
  id: 'my',
  label: 'My Widget',
  icon: 'fas fa-magic',
  sourceFile: 'src/system/components/My.svelte',
  editorComponent: MyEditor,
  schema: myTokens,
});
```

### Step 4: Verify

```bash
npm run dev
```

Visit `/components`. The new component appears in the nav rail under
**CUSTOM** (the system group is for first-party components shipped in
the package). Save creates `component-configs/<id>/default_01.json`.

If the alias map is empty, your `:global(:root)` declarations are
either missing the `:global(...)` wrapping or the parser hit SCSS
interpolation it cannot pre-compile (see the component-system
reference chapter for the `Notification.svelte` workaround).

## State model: parts vs states

Two things often get confused:

- **Component states**: `default`, `selected`, `disabled`. Mutually
  exclusive. *Disabled is terminal* (no hover on a disabled
  element).
- **Parts**: the structural sub-regions of a component (a Dialog has
  `overlay`, `header`, `body`, `footer`). All present at the same
  time. Not states.

Author tokens accordingly. `--dialog-header-surface` is a part token;
`--button-primary-hover-surface` is a state token.

The skill enforces this. If you write manually, the conventions
chapter has the full rules.

## Where to go next

- [Token naming](token-naming.md): the naming pattern in one page.
- The component-system reference chapter has the full scaffolding API,
  linked-block internals, and helper functions.
- The developer-recipes reference chapter covers adjacent extensions
  (adding a new token category, adding a schema migration).
