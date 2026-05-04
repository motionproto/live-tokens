# Live Tokens — Architecture & Developer Guide

This documentation set describes the architecture of Live Tokens — a design-token system
with an in-browser editor that drives CSS custom properties at runtime — and the developer
workflows for extending it.

The codebase ships two ways:

- **Starter** — clone, replace `Home.svelte`, edit tokens live.
- **Library** — `npm install @motion-proto/live-tokens`, mount the overlay + editor route in
  an existing Svelte 4 + Vite app.

Both modes are supported and documented together; differences are called out where they
matter.

## Reading order

| File | Audience | Topic |
|------|----------|-------|
| [01-overview.md](01-overview.md) | All | Purpose, shipping modes, the headline picture |
| [02-architecture.md](02-architecture.md) | All | System architecture, layers, data flow |
| [03-state-and-history.md](03-state-and-history.md) | Library / core devs | Editor store, scopes, undo/redo, persistence |
| [04-tokens-and-themes.md](04-tokens-and-themes.md) | All | `tokens.css`, palette derivation, theme files, schema migrations |
| [05-component-system.md](05-component-system.md) | Component authors | Component registry, alias vs config, scaffolding, sibling sharing |
| [06-dev-server-plugin.md](06-dev-server-plugin.md) | Plugin / API devs | `themeFileApi`, route table, versioned file resources |
| [07-overlay-and-routing.md](07-overlay-and-routing.md) | UI / page devs | LiveEditorOverlay, Columns overlay, router, iframe fan-out |
| [08-add-new-component.md](08-add-new-component.md) | Component authors | Step-by-step: author runtime + editor + register |
| [09-developer-recipes.md](09-developer-recipes.md) | All | Common tasks: add tokens, add migrations, run tests, publish |
| [10-conventions-and-invariants.md](10-conventions-and-invariants.md) | All | Encoded contracts: state model, parts vs states, sharing, fan-out |

If you're new to the codebase, read 01–02, then jump to whichever chapter matches your task.

## Companion documents

- `README.md` — install / quick-start (use first; this set picks up where it leaves off).
- `src/styles/CONVENTIONS.md` — token naming rules. The single source for the two-layer
  vocabulary; chapter 04 references it rather than duplicating.
- `c2audit/c2audit_01.md` — pre-architecture-lock C2 review (severity-ordered findings,
  most resolved by Wave 1–9 work). Useful as historical context for why the code is shaped
  the way it is.
