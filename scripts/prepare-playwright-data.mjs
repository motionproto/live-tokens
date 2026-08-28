import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(repoRoot, 'src', 'live-tokens', 'data');
const e2eRoot = path.join(repoRoot, '.playwright-data');
const targetDir = path.join(e2eRoot, 'live-tokens');

// Keep the destructive target explicit and underneath the repository-owned
// Playwright directory. This fixture is disposable; the source design-system
// files are never served to an end-to-end run.
if (path.dirname(targetDir) !== e2eRoot) {
  throw new Error(`Refusing to prepare Playwright data outside ${e2eRoot}`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(e2eRoot, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

// Browser tests start from the DEFAULT document, saved, with nothing selected.
// Three kinds of file carry a developer's current session instead, and every
// one of them is gitignored or dev-written, so leaving them in the fixture
// makes the suite pass or fail on which theme the maintainer happens to have
// open. CI has none of them and runs against the default; a run here has to
// mean the same thing.
//
//   _working.json    an unsaved buffer, which reads as a dirty document and can
//                    raise a destructive confirmation dialog
//   _active.json     the theme the editor has open. One carrying a sketchstyle
//                    boots the suite with the sketch layer on, which paints
//                    every component's fill onto a pseudo-element and leaves
//                    the real background transparent, so any assertion about a
//                    rendered colour fails.
//   _production.json the theme baked into tokens.generated.css
//
// A missing pointer resolves to "default" at runtime, so removing them is the
// whole reset.
const SESSION_FILES = new Set(['_working.json', '_active.json', '_production.json']);
for (const entry of fs.readdirSync(targetDir, { recursive: true })) {
  if (SESSION_FILES.has(path.basename(entry))) {
    fs.rmSync(path.join(targetDir, entry), { force: true });
  }
}

console.log(`Prepared isolated Playwright data at ${targetDir}`);
