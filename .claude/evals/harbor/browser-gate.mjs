// The browser-gate arm's Stop hook. Each time the agent stops, it runs the
// full checkers with --tests on the run's new page and components, as the
// verifier will, and blocks the stop while either reports an error. After
// three blocks it lets the run end, so a finding the agent cannot fix ends the
// run instead of holding it to the turn cap.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { authoredIds, checkRun, newPages, projectReport } from './checks.mjs';

const MAX_BLOCKS = 3;
// In /tmp, outside the files the verifier collects.
const COUNT = '/tmp/browser-gate-blocks';
// Harbor downloads the agent's log folder, so the report can read each block.
const LOG = '/logs/agent/browser-gate.jsonl';

process.chdir('/app');
const blocks = existsSync(COUNT) ? Number(readFileSync(COUNT, 'utf8')) : 0;

function record(entry) {
  if (existsSync('/logs/agent')) appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

if (blocks >= MAX_BLOCKS) {
  record({ blocked: false, blocks, capped: true });
  process.exit(0);
}

const pages = newPages();
const ids = authoredIds(projectReport());
const checks = checkRun(pages, ids, ['--import', '/opt/eval/browser-tests.mjs']);
const failing = checks.filter((c) => c.errors !== 0);
if (failing.length === 0) {
  record({ blocked: false, blocks, checks: checks.map((c) => c.label) });
  process.exit(0);
}

const findingLine = (f) => {
  const where = f.file ? ` ${f.file}${f.line ? `:${f.line}` : ''}` : '';
  const message = (f.message ?? '').split('\n')[0];
  return `- ${f.rule}${where}: ${message}${f.guidance ? ` Guidance: ${f.guidance}` : ''}`;
};
const reason = failing.map((c) => [
  c.errors === null
    ? `${c.label} --tests printed no report:\n${c.note}`
    : `${c.label} --tests reports ${c.errors} error${c.errors === 1 ? '' : 's'}:`,
  ...c.findings.map(findingLine),
].join('\n')).join('\n\n');

writeFileSync(COUNT, String(blocks + 1));
record({
  blocked: true,
  blocks: blocks + 1,
  checks: failing.map((c) => ({ label: c.label, errors: c.errors, rules: [...new Set(c.findings.map((f) => f.rule))] })),
});
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: `The browser tests found errors in what this run made. Fix each from its guidance, then finish.\n\n${reason}`,
}));
