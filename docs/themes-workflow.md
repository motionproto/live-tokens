# Themes workflow

Save your work, switch between named themes, ship one to production.

## The three states of a theme

Three concepts you should keep straight:

- **Editor state.** What the page currently shows. Lives in
  localStorage. Updates on every drag, knob, toggle. Survives page
  reloads. Not a file.
- **Saved theme.** A JSON file in `src/live-tokens/data/themes/`. Named.
  Reloadable. You create these explicitly via *Save as*.
- **Active theme.** The saved theme the page loads at boot. Exactly
  one at a time. A pointer file (`_active.json`) names it.
- **Production theme.** The theme that ships. A separate pointer
  (`_production.json`). When you *promote*, the editor regenerates
  `tokens.generated.css` from this theme.

Editor state and saved themes are independent. You can have
unsaved local edits even when an active theme is selected; saving
flushes them to a named file.

## Saving a theme

In the editor header:

- **Save** writes to the current named theme. Disabled when the
  active theme is `default` (the seed; the editor never overwrites it).
- **Save as** prompts for a name, then writes a new file. Use this for
  the first save and for forking.

File names get sanitised: lowercase, alphanumerics, underscores. "My
Brand!" becomes `my_brand`. The pre-sanitised name shows in the
prompt so you can adjust before committing.

## Switching the active theme

The file menu lists every saved theme. Pick one to set it as active.
The page reloads with that theme's variables applied. Your in-memory
edits are flushed first (saved to the previously active theme), so
you do not lose work.

There's a built-in `default` theme. It cannot be deleted or
overwritten. Switching to `default` always gets you back to a clean
baseline.

## Promote to production

Promotion is the "ship it" step.

When you click **Promote to production** in the file menu:

1. The current theme becomes the *production* theme.
2. The dev plugin regenerates
   `src/system/styles/tokens.generated.css` from the production
   theme's variables, plus any component overrides whose production
   pointers don't match the seed.
3. `fonts.css` regenerates from the production theme's font sources.

Production builds (`npm run build`) bundle `tokens.css` plus
`tokens.generated.css`. The generated file uses `:root:root`
selectors so its overrides win over the developer-authored defaults
regardless of CSS chunk order.

**The editor never ships to production.** Production bundles contain
plain CSS variables and your component code. No JS state, no JSON
loader, no `/api/live-tokens/*` calls.

Editing the production theme directly keeps the generated file in
sync. So if you save while the production theme is active, the
generated CSS regenerates immediately. WYSIWYG, no separate
"promote again" step.

## Manifests: bundles of theme plus components

A **manifest** pins one theme plus one config file per component into
a single named bundle. Useful when you have different brands or
states that need consistent theme + component configurations.

```json
{
  "name": "My Brand",
  "theme": "my_brand_teal",
  "components": {
    "button": "my_brand_button",
    "dialog": "default"
  }
}
```

There are two slots:

- **Default manifest**: a protected baseline.
- **Active manifest**: the one currently applied.

Applying a manifest is atomic on the server: it validates every
referenced file, flips the theme plus each component's `_active.json`
pointer in one shot, and returns the resolved theme and configs.
Clients then reload to pick everything up.

## Where files live on disk

Default layout (configurable):

```
src/live-tokens/data/
├── themes/
│   ├── _active.json
│   ├── _production.json
│   ├── default.json
│   ├── my_brand_teal.json
│   └── ...
├── component-configs/
│   ├── button/
│   │   ├── _active.json
│   │   ├── _production.json
│   │   ├── default.json
│   │   └── my_brand_button.json
│   └── ...
└── manifests/
    ├── _active.json
    ├── default.json
    └── my_brand.json
```

`default.json` files are seeds. The editor will not overwrite them.
Your saves go to other names.

To relocate this whole tree, drop a `live-tokens.config.json` at your
project root with a `dataDir` key, or pass `dataDir` to the Vite
plugin. The dev-server-plugin reference chapter has the full
resolution order.

## Version control

The whole `src/live-tokens/data/` tree is plain JSON. Commit it.
Themes that diverge across branches show up as JSON diffs you can
read and review. The only domain that doesn't write to JSON on every
change is palettes (their *config* is persisted, the derived ramp is
computed from it at runtime) which keeps diffs small.

## Backups

There are no automatic backups. **Git is your safety net.** If you
make a destructive edit and saved over the file, recover from git.
The editor does not keep its own undo history across reload.

To safely experiment: save as a new name first, then edit. You can
always switch back to the previous theme via the file menu.

## Where to go next

- [Creating components](creating-components.md): make your own components
  editable in the same surface.
- [Token naming](token-naming.md): the naming pattern your custom
  components should follow.
- The dev-server plugin reference chapter has the full API surface
  (`/api/live-tokens/themes/*`, `/api/live-tokens/manifests/*`) if you
  want to script promotions from CI.
