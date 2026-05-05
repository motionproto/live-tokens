# Architecture

## Layers

The system divides cleanly into four layers. Each owns its concerns; dependencies
flow downward.

```mermaid
flowchart TB
    subgraph L1["Layer 1 — Runtime CSS"]
        TokensCss[styles/tokens.css]
        FontsCss[styles/fonts.css]
        Components["components/*.svelte<br/><small>:global(:root) declarations</small>"]
    end

    subgraph L2["Layer 2 — State"]
        Core["editorCore<br/><small>writable + Scope</small>"]
        Slices["slices/*<br/><small>palettes, fonts, shadows, overlays,<br/>columns, components, gradients</small>"]
        Persist["editorPersistence<br/><small>debounced localStorage</small>"]
        Renderer["editorRenderer<br/><small>store.subscribe → setCssVar</small>"]
    end

    subgraph L3["Layer 3 — Persistence service"]
        ThemeSvc["themeService<br/><small>/api/themes client</small>"]
        CompSvc["componentConfigService<br/><small>/api/component-configs client</small>"]
        Migrations["migrations/<br/><small>schemaVersion runner</small>"]
    end

    subgraph L4["Layer 4 — Dev-server plugin"]
        Plugin["themeFileApi<br/><small>Vite middleware</small>"]
        Routes["routeTable<br/><small>method+pattern → handler</small>"]
        VFR["versionedFileResource<br/><small>active+production+backups</small>"]
        FS[("themes/<br/>component-configs/<br/>tokens.css")]
    end

    Components -. declared in :global(:root) .-> TokensCss
    Slices --> Core
    Renderer --> Core
    Renderer -- writes to :root --> TokensCss
    Persist --> Core
    ThemeSvc -- fetch --> Plugin
    CompSvc -- fetch --> Plugin
    Migrations -- run on load --> Slices
    Plugin --> Routes --> VFR --> FS
```

### Layer 1 — Runtime CSS (`src/styles/`, `src/components/`)

This is what production ships. `tokens.css` declares every theme token in `:root`.
`fonts.css` carries `@font-face` rules and the resolved `--font-*` stack values.
Components in `src/components/` use `var(--token)` references and declare their own
slot variables in their `<style>` block's `:global(:root)`. Those are the
**component tokens** that the alias editor lets users re-assign.

Production: import `tokens.css`, ship the CSS as-is, no JS state involved.

### Layer 2 — Editor state (`src/lib/editor*.ts`, `src/lib/slices/`)

In-memory editor state. The single funnel is the `EditorState` tree
(`editorTypes.ts`). Writes go through `mutate()` (or `transaction()` / scopes); the
renderer subscribes and writes derived CSS variables to `:root` via `cssVarSync`.
Persistence is debounced localStorage. Detail in chapter 03.

### Layer 3 — Persistence service (`src/lib/themeService.ts`, `componentConfigService.ts`, `migrations/`)

Client-side wrappers that talk to the dev-server plugin's `/api/*` routes. Both
services wrap a generic `versionedFileResource(baseUrl)` (defined in
`src/lib/files/`) so the list/load/save/delete + active/production + backups
vocabulary stays identical across both. Migrations run on load. Theme files and
component-config files each carry a `schemaVersion` stamp; the runner applies any
registered migrations whose `fromVersion >= file.schemaVersion`. Detail in chapter
04.

### Layer 4 — Dev-server plugin (`src/vite-plugin/`)

A Vite plugin (`themeFileApi`) that mounts under `/api/*`. Every endpoint is a
top-level handler in a route table; the dispatcher (`routeTable.ts`) does the
URL/method match and centralises the 500-on-throw catch. The plugin also seeds
default files on first start, auto-injects `__PROJECT_ROOT__` for the overlay's
"Page Source" links, and on hot-update of a `src/components/*.svelte` file it
regenerates that component's `default.json`. Detail in chapter 06.

## Data flow — read path

When a user opens the app, the chain that paints the page:

```mermaid
sequenceDiagram
    autonumber
    participant Boot as main.ts
    participant Init as themeInit
    participant API as /api/themes/active
    participant Store as editorStore
    participant Slices as slices/*
    participant Render as editorRenderer
    participant DOM as :root

    Boot->>Init: cssVarSync.init()<br/>router.init()<br/>columnsOverlay.init()<br/>editorStore.init()
    Boot->>Init: initializeTheme() (DEV only)
    Init->>API: GET /api/themes/active
    API-->>Init: theme JSON + _fileName
    Init->>Store: loadFromFile(theme)
    Store->>Slices: per-domain loadFromVars()
    Slices->>Store: typed state on `next`
    Store->>Render: subscriber receives EditorState
    Render->>Render: deriveCssVars(state)
    Render->>DOM: setProperty('--token', value)<br/>(self + parent doc)
```

In production, step 2 gets skipped. `tokens.css` is already on disk with the
production-promoted values, so the page renders correctly without any `/api` call.

## Data flow — write path

When the user moves a slider in the editor:

```mermaid
sequenceDiagram
    autonumber
    participant UI as Editor UI<br/>(VariablesTab / PaletteEditor / …)
    participant Slice as slice action<br/>(setPaletteConfig, setComponentAlias, …)
    participant Core as editorCore.mutate
    participant Store as Svelte writable
    participant Render as editorRenderer
    participant Sync as cssVarSync
    participant Self as self :root
    participant Parent as parent :root<br/>(the host page)
    participant Persist as schedulePersist

    UI->>Slice: setPaletteConfig('primary', cfg)
    Slice->>Core: mutate(label, draft => ...)
    Core->>Core: pushPast(snapshot)<br/>store.update(fn)
    Core-->>Persist: persistHook()  (debounced 300ms)
    Store-->>Render: subscribers fire
    Render->>Render: deriveCssVars(state)
    Render->>Sync: setCssVar(name, value)<br/>removeCssVar(stale)
    Sync->>Self: documentElement.style.setProperty(...)
    Sync->>Parent: parent.documentElement.style.setProperty(...)
```

Two things matter and aren't obvious:

1. **The renderer diffs.** It tracks the last-applied map and only writes the keys
   whose values changed (and removes ones that disappeared). Without this, every
   drag would set roughly 200 properties per frame. (`editorRenderer.ts:47–68`.)

2. **`cssVarSync` writes to *both* the self document and the parent.** When the
   editor sits in the iframe, the parent is the host app, so slider drags repaint
   the actual page. When the editor runs standalone (no iframe), the parent root
   resolves to null and writes go to one document only.
   (`cssVarSync.ts:23–40, 73–78`.)

## Module map (state)

```mermaid
flowchart LR
    subgraph Core["editorCore.ts"]
        Writable["writable&lt;EditorState&gt;"]
        History["past / future /<br/>savedAtIndex"]
        Scopes["Scope primitive<br/>collapseToOne ×<br/>clipUndoFloor"]
        Mutate["mutate / transaction /<br/>beginScope / commitScope /<br/>cancelScope / undo / redo"]
    end

    subgraph Slices["slices/*"]
        Palettes[palettes.ts]
        Fonts[fonts.ts]
        Shadows[shadows.ts]
        Overlays[overlays.ts]
        Columns[columns.ts]
        Components["components.ts<br/><small>aliases + config + sharing</small>"]
        Gradients[gradients.ts]
        DomainVars[domainVars.ts]
    end

    Renderer["editorRenderer.ts<br/><small>installRenderer()</small>"]
    Persistence["editorPersistence.ts<br/><small>schedulePersist /<br/>hydrate / ensureHydrated</small>"]
    Barrel["editorStore.ts<br/><small>barrel + loadFromFile<br/>+ toTheme +<br/>seedComponentsFromApi</small>"]

    Slices -- import mutate from --> Core
    Renderer -- subscribe --> Core
    Persistence -- store.set / get --> Core
    Barrel -- re-exports --> Core
    Barrel -- re-exports --> Slices
    Barrel -- installRenderer<br/>setPersistHook<br/>ensureHydrated --> Renderer
    Barrel --> Persistence
```

A few rules the diagram encodes:

- **Slices import `mutate` from `editorCore`, not from the barrel.** This keeps
  the slice → core dependency one-way and avoids the circular import that the
  renderer needs to handle carefully (see `editorStore.ts:404–409` for the
  renderer-install ordering note).

- **The barrel (`editorStore.ts`) is the only file that touches both core and
  every slice.** It owns boot wiring (`setPersistHook`, `ensureHydrated`,
  `installRenderer`) and the load/save orchestration that crosses every slice
  (`loadFromFile`, `toTheme`, `seedComponentsFromApi`).

- **The renderer is the only DOM consumer.** Slices never write to `:root`. If a
  slice needs to derive CSS, it exports an `xxxToVars(state)` pure function that
  the renderer calls.

## Module map (component editor)

```mermaid
flowchart TB
    Registry["component-editor/registry.ts<br/><small>componentRegistry { id → entry }<br/>id, label, icon, sourceFile,<br/>editorComponent, schema</small>"]

    subgraph Editors["component-editor/*Editor.svelte"]
        ButtonEd[StandardButtonsEditor]
        DialogEd[DialogEditor]
        Etc[…14 total]
    end

    subgraph Scaffolding["component-editor/scaffolding/"]
        Base[ComponentEditorBase]
        VG[VariantGroup]
        SB[StateBlock]
        TL[TokenLayout]
        Shared[SharedBlock]
        Tokens["buildTypeGroupTokens<br/>siblings.ts<br/>sharedBlock.ts"]
    end

    Page[ComponentEditorPage.svelte]
    Tab[ComponentsTab]
    Service["componentConfigService<br/><small>/api/component-configs/*</small>"]
    Slice[slices/components.ts]

    Registry -- componentRegistryEntries --> Tab
    Registry -- editorComponent --> Page
    Registry -- schema --> Slice
    Editors -- import --> Scaffolding
    Editors -- mount via --> Base
    Page -- uses --> Tab
    Page -- on boot --> Service
    Service -- seed --> Slice
```

The **registry** is the single source of truth. Adding a component means authoring
its runtime and editor, then adding *one* entry there. Display order in the nav
rail follows the registry's `Object.values` order. See chapter 05.

## Module map (dev-server plugin)

```mermaid
flowchart LR
    Vite["Vite middleware<br/><small>configureServer</small>"]
    Dispatch["routeTable.dispatch<br/><small>method × URL → handler<br/>centralised 500 catch</small>"]

    subgraph Handlers["Route handlers"]
        Themes["themes/* CRUD"]
        Active["themes/active GET PUT"]
        Production["themes/production GET PUT"]
        Backups["backups list / restore / get"]
        CurrentCss["current-css GET"]
        Comps["component-configs/:comp/* CRUD"]
    end

    subgraph Helpers["File helpers"]
        ThemeRes["versionedFileResourceServer<br/><small>themes/</small>"]
        CompRes["versionedFileResourceServer<br/><small>component-configs/&lt;id&gt;/</small>"]
        Sync["syncTokensToCss /<br/>syncFontsToCss /<br/>syncComponentsToCss"]
    end

    FS[("themes/*.json<br/>component-configs/*/<br/>src/styles/tokens.css<br/>src/styles/fonts.css")]
    HotUpdate["handleHotUpdate<br/><small>regenerate default.json on<br/>component .svelte change</small>"]

    Vite --> Dispatch --> Handlers
    Handlers --> Helpers
    Helpers --> FS
    Production --> Sync
    Sync --> FS
    Vite --> HotUpdate --> FS
```

`versionedFileResource` is parameterized; `themesResource` and per-component
resources share the same active/production/backups vocabulary. See chapter 06.

## Boot orchestration

`src/main.ts` is the single boot orchestration point. Its job is to call each
module's idempotent `init()` once before the Svelte app mounts:

```ts
async function boot() {
  cssVarSync.init();      // resolves self + parent document roots
  router.init();          // seeds route store from window.location, wires popstate
  columnsOverlay.init();  // subscribe-then-persist for the columns toggle
  editorStore.init();     // ensures hydrate has run

  if (import.meta.env.DEV) {
    await initializeTheme();   // GET /api/themes/active, loadFromFile
  }
  new App({ target: document.getElementById('app')! });
}
```

Every one of these modules used to have side effects on import. Library consumers
booting in non-default order silently got the wrong storage prefix or a router
that never noticed `popstate`. Splitting boot into separate `init()` calls fixes
that. Library consumers replicate this orchestration inside their own `main.ts`
(see README "Use as a library").

## Cross-cutting contracts

These contracts span layers and are the parts most likely to surprise you:

- **CSS-var fan-out.** `cssVarSync` writes to *both* the editor's iframe document
  and the parent's. Anything touching `:root` style must go through `cssVarSync`
  or the editor stops repainting the host page. (Chapter 07.)

- **State model.** Components have *component states* (default / selected /
  disabled, mutually exclusive) and *interaction states* (default / hover, in
  selects). Disabled is terminal; selected-disabled is impossible. *Parts* (Dialog
  overlay/header/body/footer, Tooltip arrow) are not states. (Chapter 10.)

- **Sharing is dev-declared.** `canBeShared` and `groupKey` live in the editor's
  token list, registered via `registerComponentSchema`. Users toggle whether
  siblings are *currently* linked, but they don't define what *can* be linked.
  (Chapter 05.)

- **Theme files and component-config files have independent schema versions.**
  Adding a theme migration steps the theme version; component-config migrations
  step the component-config version. They never share a version axis. (Chapter
  04.)

- **Themes and components are orthogonal.** `loadFromFile` (loading a theme)
  preserves `state.components`. Component slices live in their own files under
  `component-configs/<id>/`. (Chapter 04.)
