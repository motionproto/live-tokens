# Accessibility view report

Run of `docs/plans/a11y-editor.md` on 2026-10-23, on local main from
`275b001`, unpushed and unreleased. Waves 1 to 5 ran in series, one session
each, and every wave's Verify commands passed. The last full contract run
passed 321 of 321 in 5.6 minutes.

## Built

| Wave | Result |
|---|---|
| 1. Runner | `check-component --tests --a11y` runs the accessibility scan and the keyboard cases alone, about 3 to 3.5 minutes for 29 components. `--open-theme` tests the open theme as saved. `--json` carries `theme`. |
| 2. Dev server | `POST /a11y/run` runs the CLI as a child, one run at a time; `GET /a11y/report`; an `a11y` event on the existing stream; the report persists in `test-results/live-tokens/a11y-report.json`. Axe contrast drops out in favour of the editor's contrast checker. |
| 3. Accessibility view | A fifth view with Run test, the run state, and the report grouped per component into "Fix with a property" and "Fix in the component's code", with check-by-eye results collapsed. Unsaved edits show "Save the changes you want to have checked." and start nothing. ThemePanel and the view share one `unsavedEdits` store. |
| 4. Markers and panels | A text-free "!" in all three copies of the component list. A panel under each affected component's title, whose "→" opens the tab holding the property and highlights its row. |
| 5. Docs | The accessibility chapter, CHANGELOG and README. |

A real run on royal-velvet found 27 issues across 10 components once axe
contrast dropped out.

## Fixes made along the way

- `check-*` JSON reports through a pipe stopped at 64 KB on macOS. They now
  arrive whole.
- The contract tests' own dev server read the project's report, so a test
  run depended on the developer's last Run test. Under test isolation the
  report now lives in the isolated copy.
- The skill checks read `--a11y` as `--a`. The flag patterns now accept
  digits.

## Needs a decision

1. **The skills leave out `--a11y` and `--open-theme`.** Wave 5 listed both
   in `OMITTED_FLAGS`: `--a11y` skips the static checks a skill needs for
   exit 0, and `--open-theme` ties a run to the editor's open theme. Naming
   them in the skills means a skill edit, the atlas and sources syncs, and
   an eval rehash.
2. **The contract harness changed for a report-driven failure.** Wave 4
   centres each gradient editor before its forced clicks in
   `src/testing/component-render.contract.ts`, which ships. The isolation
   fix removed the cause; the centring stays as harmless.

## Known limits

- A dev server under test isolation still points its CLI check at the
  project's data tree. Only the report moved.
- A tab reloaded during a run shows no markers until the run finishes.
- Components with check-by-eye results alone get no section, marker or
  panel.
- Focus and target-size issues carry no "!" on a property row. The colour
  row's live contrast readout is the only property mark.
- Commit `8946f44` does not typecheck alone; the next commit completes it.
