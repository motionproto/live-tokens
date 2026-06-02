# Overview

Live Tokens is a design system for building Svelte microsites quickly. You
style your site by editing tokens and components in a live editor. When it looks right, you save the manifest and ship it.

## How it works

- The editor runs in your dev server, on top of your real pages. You style in
  context, not in a separate sandbox.
- Every change updates a CSS variable, so the page repaints instantly. No
  reload, no build step.
- Saving writes a small JSON file into your project. Shipping bakes your chosen
  theme into a plain CSS file that the build bundles.
- The editor is dev-only. Production ships plain CSS variables and the
  components you used, nothing else.

## What you can edit

- **Tokens**: the design-system primitives, colour palettes, type, spacing,
  radius, shadow, and gradients, that apply across your whole site.
- **Components**: the package ships about 25 editable components (Button, Card,
  Dialog, Table, and more).You style components by changing the tokens assigned to each property.

## Where to go next

- **[Getting started](getting-started.md)**: scaffold a project and make your
  first edit.
- **[Editing tokens](editing-tokens.md)**: a tour of the editor.
- **[Themes](themes-workflow.md)**: save, switch, and ship.
- **[Creating components](creating-components.md)**: make your own components
  editable.
