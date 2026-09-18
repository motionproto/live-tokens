---
name: live-tokens-pick-component
description: Recommend which shipped @motion-proto/live-tokens component fits a UX need, with a decision test for each confusable family. Called by live-tokens-create-page when more than one component could fit, and by live-tokens-create-component before it authors anything. Use when the user asks which component to use, or what the difference between two components is. Use when the user asks how to show or capture a UX outcome. Edits no file. For size, emphasis, or placement, read live-tokens-create-page. When the catalogue lacks a component with chrome, read live-tokens-create-component.
---

# Picking a live-tokens component

When more than one shipped component could fit, find the family below that names the candidates. Run its command and read each one's catalogue entry.

## Procedure

1. Name the family the need falls into, from the seven below.
2. Run that family's command. Weigh a custom component by the same reading.
3. Read each candidate's `useFor`, `alternatives`, and `constraints`.
4. Choose the candidate whose condition the requirement meets. When none does, follow "Nothing fits".

## Action family

The need is a control the reader presses to run an action.

`npx live-tokens components --family action --json`

## Single-selection family

The need is one option chosen from a set.

`npx live-tokens components --family single-selection --json`

## Text entry

The need is a value the reader supplies.

`npx live-tokens components --family text-entry --json`

## On and off

The need is a setting or a choice with exactly two states.

`npx live-tokens components --family on-off --json`

## Container family

The need is a block of content held apart from the rest of the page.

`npx live-tokens components --family container --json`

## Messaging family

The need is a message the page shows the reader.

`npx live-tokens components --family messaging --json`

## Display family

The need is a block the reader views or acts on.

`npx live-tokens components --family display --json`

## Nothing fits

A native element with no chrome of its own needs no component: an `<input type="file">` behind a Button, a `<canvas>`, an `<img>` inside a stage. When nothing in the catalogue fits a piece with chrome, such as a `DatePicker`, a search-filtered list, or a `Stepper`, author the component with **live-tokens-create-component**. No shipped component filters a list by typing, so a searchable picker takes this same route. Size, emphasis, and placement are **live-tokens-create-page**'s.

`npx live-tokens components <id>` prints one component's catalogue entry, its declared props, and the values each union accepts. `--json` returns the same as data.
