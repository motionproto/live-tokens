# Releasing `@motion-proto/live-tokens`

Maintainer-only. Consumers should read `README.md` instead.

## Quick reference

```bash
# from a clean working tree on main:
1.  edit CHANGELOG.md          # move "## Unreleased" block under "## X.Y.Z — <title>"
2.  npm version X.Y.Z --no-git-tag-version  # bump package.json + package-lock.json
3.  npm pack --dry-run         # eyeball tarball contents
4.  npm publish                # prepublishOnly runs check + build + smoke
5.  git commit -am "Release X.Y.Z"
6.  git tag vX.Y.Z && git push origin main vX.Y.Z
```

That's the happy path. Read the rest before your first release.

## Versioning policy

Semver. While we're on `0.x`, breaking changes can land in a minor bump — but
the CHANGELOG must call them out clearly under a **"Changed (breaking)"**
heading so consumers know to read it before upgrading.

| Change | Bump |
|---|---|
| New optional plugin option, new component, new editor surface | minor |
| Bug fix, doc tweak, dependency bump within range | patch |
| Required-option removed, default behaviour changed, API path moved | minor *with breaking heading* |
| `1.0.0`+ would be major | major |

If a release ships only a CHANGELOG/README change, prefer a patch over no
release — published docs are the only docs consumers see on npmjs.com.

## Pre-flight checklist

`prepublishOnly` runs four scripts in order — they all have to pass or npm
won't publish:

1. `check:no-style-imports` — no `@import` in any `.svelte <style>` block
   (those break consumers using `css: 'injected'`).
2. `check:editor-font-isolation` — editor chrome never references
   `--font-*` theme tokens.
3. `build:plugin` — rebuilds `dist-plugin/`. **The bundled artifact is what
   ships**, not `vite-plugin/` source.
4. `check:smoke-install` — packs the tarball, installs into a temp directory
   with a minimal `vite.config.ts`, and runs `vite build`. Catches missing
   exports, broken peer-dep declarations, and CSS isolation regressions.

Things `prepublishOnly` does NOT check, so do these by hand:

- [ ] `npm test` — 2000+ tests pass.
- [ ] `npm run check` — svelte-check is clean (one pre-existing a11y warning
  in `UITokenSelector.svelte` is OK).
- [ ] `git status` is clean. Stray files in the working tree end up in the
  tarball if they match `files:` in `package.json`.
- [ ] `themes/_backups/` and `src/system/styles/_backups/` are empty or
  gitignored. They're local-only working state; shipping them poisons every
  consumer's theme history.
- [ ] CHANGELOG entry written, version bumped to match.
- [ ] No `temp/` or scratch docs accidentally added to `files:`.

## CHANGELOG curation

Every release moves the `## Unreleased` block to a versioned heading.

```diff
-## Unreleased — Plugin acts like a dev tool, not a co-tenant
+## 0.10.0 — Plugin acts like a dev tool, not a co-tenant
```

Don't leave an empty `## Unreleased` heading behind unless there's already a
WIP entry being built up — empty headings imply "stuff is coming," which
isn't usually true between releases.

Keep entries grouped under headings — usually **Changed (breaking)**,
**Added**, **Removed**, **Fixed**, **Migration** — same convention the
existing log uses. Concrete examples (file paths, before/after snippets)
beat narrative; consumers grep this file when their build breaks.

## Verifying tarball contents

```bash
npm pack --dry-run 2>&1 | grep -E "^npm notice"
```

What should be in the tarball:
- `src/editor/**` (editor source)
- `src/system/**` (token components and `tokens.css`)
- `src/app/site.css` (optional starter typography)
- `dist-plugin/**` (built vite plugin)
- `.claude/skills/live-tokens-add-component/**` (Claude skill)
- `package.json`, `README.md`, `LICENSE*`, `CHANGELOG.md`

What should NEVER be in the tarball:
- `src/live-tokens/data/**` — that's consumer data, not source
- `themes/`, `manifests/`, `component-configs/` — same
- `temp/`, scratch markdown, `*.test.ts`, `__tests__/**`
- `Stat.svelte` / `StatEditor.svelte` — gated by `package.json#files`
  exclusion patterns (they're internal scaffolding)
- `.git/`, `node_modules/`, `dist/`, `dist-ssr/`

If something unexpected appears, fix `package.json#files` rather than
deleting from a built tarball — `npm pack` will regenerate it next time.

## Publishing

```bash
# Auth check (one-time):
npm whoami                     # expect: motionproto
npm access list packages       # expect: @motion-proto/live-tokens read-write

# Publish:
npm publish                    # public scope is configured in package.json
```

`npm publish` runs `prepublishOnly` automatically. If any check fails the
publish aborts before anything hits npm. You can rerun safely.

## Git tagging

```bash
git commit -am "Release X.Y.Z"
git tag vX.Y.Z
git push origin main vX.Y.Z
```

Tag format is `vX.Y.Z` (matching the existing `v0.6.0`, `v0.9.0` tags).
GitHub releases are optional but useful — paste the CHANGELOG section
verbatim.

## What breaks, how to recover

**`prepublishOnly` fails the smoke install.**
The most common cause is a new export that the `files:` list doesn't cover,
or a `.svelte` file whose `<style>` block grew an `@import`. Read the
specific check's output — they're all targeted enough to point at the file.

**Published a broken version.**
`npm deprecate @motion-proto/live-tokens@X.Y.Z "Broken; use X.Y.Z+1"` with
a clear pointer to the fix. Don't `npm unpublish` after the 72-hour
window — consumers may already have the bad tarball in their lockfiles, and
yanking it from npm breaks their installs. Cut a patch release instead.

**Forgot to bump the version.**
`npm publish` rejects republishing the same version. Bump and try again —
nothing landed on npm if the publish errored.

**Forgot to tag.**
Run `git tag vX.Y.Z <commit-of-release>` against the release commit and
push. The npm tarball is the source of truth for what shipped; git tags are
for browsing history.

## Pre-1.0 invariants

Things that must keep working until 1.0 — break these and the tarball
should not ship:

- `npm install @motion-proto/live-tokens` + `vite build` works with zero
  consumer config (no `optimizeDeps.exclude`, no `css: 'injected'`).
  Enforced by `check:smoke-install`.
- `import Editor from '@motion-proto/live-tokens/editor'` mounts the
  editor with only `tokens.css` imported. Enforced by `check:smoke-install`.
- The dev-server plugin only writes inside `<dataDir>/` and the
  `tokensCssPath`-sibling CSS files. Anything that breaks this invariant is
  a release blocker, not a normal change.
