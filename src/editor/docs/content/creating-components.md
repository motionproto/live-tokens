# Creating components

The package ships about 25 editable components. When you need one it doesn't
have, you can make your own Svelte component editable, so anyone using the
editor can re-point its colours, type, and spacing without touching code.

The simplest way is to ask Claude. The package bundles a Claude Code skill that
knows the conventions, writes the files, and checks the result for you.

## Install the skills

```bash
npx @motion-proto/live-tokens setup-claude
```

This copies the bundled skills into your project's `.claude/skills/`. Once
they're there, Claude Code picks them up automatically.

## Ask for a component

Describe what you want in plain English. Phrases like these trigger the skill:

- "Add a Toggle component to live-tokens"
- "Make this Svelte component editable in the live-tokens editor"
- "Create a Stat component with a value and a label"

Claude asks any clarifying questions it needs (which variants, which states,
which parts), then writes the component, registers it with the editor, and runs
its verification checklist. When it finishes, open `/components` to see your new
component in the editor and confirm everything works.

## What you get

- A runtime component whose editable properties default to your theme tokens.
- An editor entry that appears under **Custom** in the `/components` view.
- The naming and wiring handled for you, so the component fits the system.

Advanced authors who want to write a component by hand can read the naming and
state-model conventions shipped in the package
(`src/system/styles/CONVENTIONS.md` and the skill's own `SKILL.md`).
