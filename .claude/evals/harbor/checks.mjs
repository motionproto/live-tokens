// What a billing run made and the full checkers' verdict on it, as the
// verifier counts them.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import process from 'node:process';

// The base image keeps the project's starting files here, outside /app.
export const BASE = '/opt/eval/base';
const CLI = 'node_modules/@motion-proto/live-tokens/bin/cli.mjs';
const BUFFER = 64 * 1024 * 1024;

export function newPages() {
  if (!existsSync('src/pages')) return [];
  const template = new Set(readdirSync(`${BASE}/src/pages`));
  return readdirSync('src/pages')
    .filter((name) => name.endsWith('.svelte') && !template.has(name))
    .map((name) => `src/pages/${name}`);
}

export function projectReport() {
  const out = spawnSync(process.execPath, [CLI, 'report', '--json'], { encoding: 'utf8', maxBuffer: BUFFER });
  return JSON.parse(out.stdout);
}

export function authoredIds(report) {
  return report.components.filter((c) => c.origin !== 'shipped').map((c) => c.id);
}

// Without an id, check-component --tests reruns every shipped component's
// suites, which no run can change, so each authored component is checked by id.
export function checkRun(pages, ids) {
  return [
    ...(pages.length > 0 ? [check(['check-page', ...pages])] : []),
    ...ids.map((id) => check(['check-component', id])),
  ];
}

function check(args) {
  const label = args.join(' ');
  const out = spawnSync(process.execPath, [CLI, ...args, '--tests', '--strict', '--json', '--no-fix'], { encoding: 'utf8', maxBuffer: BUFFER });
  try {
    return { label, ...JSON.parse(out.stdout) };
  } catch {
    return { label, errors: null, findings: [], note: (out.stderr || out.stdout).trim().split('\n').slice(0, 5).join('\n') };
  }
}
