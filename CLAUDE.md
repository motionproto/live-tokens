# Scratch files

Write throwaway files (theme briefs, test scripts, one-off outputs) to `scratch/` at the repo root. It is gitignored. `temp/` holds tracked worksheets; do not put disposable files there. Delete any temporary file you place outside `scratch/` before finishing.

# The data tree is live app state

The editor, the dev server, and `live-tokens generate-theme` write into `src/live-tokens/data/` and `src/system/styles/fonts.css`. Activating or promoting a theme flips every `_active.json` and `_production.json` pointer, rewrites `tokens.generated.css` and `fonts.css`, and creates per-theme component-config files.

When you exercise the generator or the editor as a test, restore that state before you finish. Skip the restore only when the data change is the deliverable.

```sh
git restore $(git diff --name-only | grep -E '(_active|_production)\.json$')
git restore src/live-tokens/data/tokens.generated.css src/system/styles/fonts.css
git status --short src/live-tokens/data   # then delete untracked per-theme files the run created
```

`node scripts/check-production-is-default.mjs` verifies the pointers afterward.
