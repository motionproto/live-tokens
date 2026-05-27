# Releasing `@motion-proto/live-tokens`

Maintainer-only. Consumers should read `README.md` instead.

## Quick reference

```bash
# from a clean working tree on main:
1.  edit CHANGELOG.md          # move "## Unreleased" block under "## X.Y.Z — <title>"
2.  npm version X.Y.Z --no-git-tag-version  # bump package.json + package-lock.json
3.  npm pack --dry-run         # eyeball tarball contents (optional; CI runs this too)
4.  git commit -am "Release X.Y.Z"
5.  git tag vX.Y.Z && git push origin main vX.Y.Z
6.  watch CI                   # `gh run watch` or the Actions tab
```

That's it. **Do not run `npm publish` locally.** The npm package is configured
for OIDC Trusted Publishing, and the publish workflow (`.github/workflows/publish.yml`)
is the only thing that should ever push a tarball to the registry. If you publish
locally, CI's "refuse to republish" check trips on the next tag.

Read the rest before your first release.

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

CI (`.github/workflows/publish.yml`) runs the same `prepublishOnly` script chain
that local `npm publish` used to run, plus `npm test`, `npm run check`, and a
packaging dry-run (see `verify.yml`). So most of this is enforced for you. The
items below are the ones the workflow can't verify because they're about your
working tree at tag time.

Before pushing the tag:

- [ ] CHANGELOG entry written, version bumped to match.
- [ ] `git status` is clean. Stray files in the working tree end up in the
  tarball if they match `files:` in `package.json`.
- [ ] `themes/_backups/` and `src/system/styles/_backups/` are empty or
  gitignored. They're local-only working state; shipping them poisons every
  consumer's theme history.
- [ ] No `temp/` or scratch docs accidentally added to `files:`.
- [ ] Tag exactly matches `package.json#version` prefixed with `v`. CI rejects
  the publish otherwise (`Verify tag matches package.json version` step).

What CI enforces for you:

1. **`check:no-style-imports`** — no `@import` in any `.svelte <style>` block
   (those break consumers using `css: 'injected'`).
2. **`check:editor-font-isolation`** — editor chrome never references
   `--font-*` theme tokens.
3. **`build:plugin`** — rebuilds `dist-plugin/`. **The bundled artifact is what
   ships**, not `vite-plugin/` source.
4. **`check:smoke-install`** — packs the tarball, installs into a temp directory
   with a minimal `vite.config.ts`, and runs `vite build`. Catches missing
   exports, broken peer-dep declarations, and CSS isolation regressions.
5. **`npm pack --dry-run`** — verifies tarball contents before publish.
6. **`Refuse to republish an existing version`** — guards against an
   accidental local publish racing the CI publish.

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
- `.claude/skills/live-tokens-create-component/**` (Claude skill)
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

## Publishing (how it actually happens)

You don't run `npm publish`. CI does, via OIDC Trusted Publishing.

```bash
# from a clean working tree on main:
git commit -am "Release X.Y.Z"
git tag vX.Y.Z
git push origin main vX.Y.Z
gh run watch                   # follow the workflow run
```

Tag format is `vX.Y.Z` (matching the existing `v0.6.0`, `v0.9.0` tags).
The push of `vX.Y.Z` triggers `.github/workflows/publish.yml`, which:

1. Checks out the tagged commit.
2. Verifies the tag matches `package.json#version` (refuses to continue otherwise).
3. Refuses to republish a version that's already on the registry.
4. `npm ci`, runs the test suite, runs `npm pack --dry-run`.
5. `npm publish --provenance --access public` — authenticated via OIDC, no
   secret involved. The attached provenance attestation links the tarball
   back to this exact GitHub Actions run.

GitHub releases are optional but useful — paste the CHANGELOG section
verbatim. `gh release create vX.Y.Z --notes-from-tag` works once the tag is
pushed.

### Trusted Publisher configuration

One-time setup, already done for this package. For reference:

- npmjs.com → `@motion-proto/live-tokens` → Settings → Trusted Publishers
  is configured with: provider `GitHub Actions`, owner `motionproto`,
  repo `live-tokens`, workflow `publish.yml`.
- Publishing access is set to **"Require 2FA and disallow tokens"**. This
  forbids any classic automation token from publishing, so OIDC is the
  only path. If you ever need to rotate or re-add the trusted publisher,
  no workflow changes are needed; the npm-side config alone gates auth.

## What breaks, how to recover

**CI's "Refuse to republish an existing version" trips.**
You (or someone) published locally first. Don't. Bump the version, retag,
push. Local `npm publish` is no longer part of the flow.

**CI's "Verify tag matches package.json version" trips.**
The tag's `vX.Y.Z` and `package.json#version` are out of sync. Delete the
tag (`git tag -d vX.Y.Z && git push --delete origin vX.Y.Z`), fix
`package.json`, commit, retag, push. Both sides must match exactly.

**`prepublishOnly` fails the smoke install.**
The most common cause is a new export that the `files:` list doesn't cover,
or a `.svelte` file whose `<style>` block grew an `@import`. Open the failed
run in the Actions tab; each check is targeted enough to point at the file.

**Published a broken version.**
`npm deprecate @motion-proto/live-tokens@X.Y.Z "Broken; use X.Y.Z+1"` with
a clear pointer to the fix. Don't `npm unpublish` after the 72-hour
window. Consumers may already have the bad tarball in their lockfiles, and
yanking it from npm breaks their installs. Cut a patch release instead.

**Forgot to tag.**
Run `git tag vX.Y.Z <commit-of-release>` against the release commit and
push. The npm tarball is the source of truth for what shipped; git tags are
for browsing history.

**OIDC fails (`401` from npm during publish step).**
Confirm the Trusted Publisher entry on npmjs.com still names this repo and
this workflow filename. If `publish.yml` is renamed, the npm-side entry
must be updated to match. OIDC matches on the workflow path.

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
