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

// Browser tests start from saved documents. Working buffers would make a copy
// of a developer's current session appear dirty and could trigger destructive
// confirmation dialogs even though the test data itself is isolated.
for (const entry of fs.readdirSync(targetDir, { recursive: true })) {
  if (path.basename(entry) === '_working.json') {
    fs.rmSync(path.join(targetDir, entry), { force: true });
  }
}

console.log(`Prepared isolated Playwright data at ${targetDir}`);
