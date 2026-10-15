// The eval sandbox forbids listening on a local port, so Playwright and Vite
// cannot start and `--tests` would report `tests-setup` forever. The skills
// repeat `--tests` until it exits 0, so a checker arm would loop until the
// turn cap. Here `--tests` runs the static checks and says why; the scorer
// runs the browser tests afterwards, outside the sandbox, for every arm.
import { readFileSync, writeFileSync } from 'node:fs';

const FINDINGS = 'node_modules/@motion-proto/live-tokens/bin/lib/findings.mjs';
const ANCHOR = "else if (arg === '--tests') opts.tests = true;";

const source = readFileSync(FINDINGS, 'utf8');
// A silent miss would leave `--tests` looping on `tests-setup`.
if (!source.includes(ANCHOR)) throw new Error(`${FINDINGS} no longer parses --tests with "${ANCHOR}". Update static-checks.mjs.`);
writeFileSync(
  FINDINGS,
  source.replace(
    ANCHOR,
    "else if (arg === '--tests') process.stderr.write('live-tokens: browser tests cannot run in this environment, so --tests ran the static checks only. Treat exit 0 as passing.\\n');",
  ),
);
