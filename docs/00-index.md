# Live Tokens architecture and developer guide

Live Tokens is a design-token system with an in-browser editor that drives
CSS custom properties at runtime. This guide covers the architecture and
the workflows for extending it.

The package ships two ways:

- **Starter.** Clone the repo, replace `Home.svelte`, edit tokens live.
- **Library.** `npm install @motion-proto/live-tokens` and mount the
  overlay plus the editor route inside an existing Svelte 5 + Vite app.

Both modes share one source tree. Chapters call out the difference where
it matters.

## Reading order

| File | Audience | Topic |
|------|----------|-------|
| [01-overview.md](01-overview.md) | All | Purpose, shipping modes, system overview |
| [02-architecture.md](02-architecture.md) | All | System layers, data flow, boot |
| [03-state-and-history.md](03-state-and-history.md) | Core devs | Editor store, scopes, undo/redo, persistence |
| [04-tokens-and-themes.md](04-tokens-and-themes.md) | All | `tokens.css`, palette derivation, theme files, migrations |
| [05-component-system.md](05-component-system.md) | Component authors | Registry, alias vs config, scaffolding, sibling linking |
| [06-dev-server-plugin.md](06-dev-server-plugin.md) | Plugin devs | `themeFileApi`, route table, versioned file resources |
| [07-overlay-and-routing.md](07-overlay-and-routing.md) | UI devs | LiveEditorOverlay, columns overlay, router, iframe fan-out |
| [08-add-new-component.md](08-add-new-component.md) | Component authors | Step-by-step: runtime, editor, registry |
| [09-developer-recipes.md](09-developer-recipes.md) | All | Add tokens, add migrations, run tests, publish |
| [10-conventions-and-invariants.md](10-conventions-and-invariants.md) | All | State model, parts vs states, linking, fan-out |

New readers: 01 and 02 first, then the chapter that matches your task.

## Companion documents

- `README.md`. Consumer-facing install and quick-start. Read first; the
  chapters here pick up where it leaves off.
- `RELEASING.md`. Maintainer-only. Versioning policy, pre-flight checks,
  tarball inspection, publish flow, recovery from a bad release.
- `CHANGELOG.md`. What changed and how to migrate. Breaking changes
  appear under a "Changed (breaking)" heading.
- `src/system/styles/CONVENTIONS.md`. Token naming rules. Chapter 04
  references it rather than duplicating it.
