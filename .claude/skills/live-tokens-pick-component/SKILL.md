---
name: live-tokens-pick-component
description: Recommend which shipped @motion-proto/live-tokens component fits a UX need, by reading each component's catalogue entry. Called by live-tokens-create-page when more than one component could fit, and by live-tokens-create-component before it authors anything. Use when the user asks which component to use, or what the difference between two components is. Use when the user asks how to show or capture a UX outcome. Edits no file. For size, emphasis, or placement, read live-tokens-create-page. When the catalogue lacks a component with chrome, read live-tokens-create-component.
---

# Picking a live-tokens component

When more than one component could fit, read the catalogue entries. Each entry states the condition that makes the component right and the conditions that rule it out.

## Procedure

1. Run `npx live-tokens components --json`. The list carries the catalogue entry of every shipped component and of each of the project's own components.
2. Read each plausible candidate's `whenToUse`, `whenNotToUse`, and `constraints`.
3. Drop a candidate whose `whenNotToUse` names a condition the requirement meets.
4. When a dropped row names a `use`, weigh that component the same way.
5. Choose the surviving candidate whose `whenToUse` condition the requirement meets.
6. When no candidate fits, follow "Nothing fits".

## Nothing fits

A native element with no chrome of its own needs no component: an `<input type="file">` behind a Button, a `<canvas>`, an `<img>` inside a stage. When nothing in the catalogue fits a piece with chrome, such as a `DatePicker`, a search-filtered list, or a `Stepper`, author the component with **live-tokens-create-component**. No shipped component filters a list by typing, so a searchable picker takes this same route. Size, emphasis, and placement are **live-tokens-create-page**'s.

`npx live-tokens components <id>` prints one component's catalogue entry, its declared props, and the values each union accepts. `--json` returns the same as data.
