#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

// The runner's own explanation of a pattern grader says only that it did not
// match. The grader file's body says what the row expects and why.
function graderBody(caseName, graderName) {
  const file = `.claude/evals/${caseName}/graders/${graderName}.md`;
  if (!existsSync(file)) return '';
  return readFileSync(file, 'utf8').replace(/^---[\s\S]*?---\s*/, '').replace(/\s+/g, ' ').trim();
}

function answeredLine(graderName, evidence) {
  const row = /^row-(\d+)$/.exec(graderName)?.[1];
  if (!row || typeof evidence !== 'string') return '';
  const line = new RegExp(`^\\s*${Number(row)}:.*$`, 'm').exec(evidence)?.[0];
  return line ? ` The reply gave "${line.trim()}".` : ' The reply had no line for this row.';
}

const result = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const lines = [];
for (const c of result.cases) {
  const { score, scoreWithout, delta } = c.aggregates;
  const without = scoreWithout === undefined ? '' : `, without skills ${scoreWithout.toFixed(2)}, difference ${delta.toFixed(2)}`;
  lines.push(`${c.name}: with skills ${score.toFixed(2)}${without}`);
  for (const [arm, runs] of Object.entries(c.arms)) {
    const failures = new Map();
    for (const [i, run] of runs.entries()) {
      if (run.error) { lines.push(`  ${arm} run ${i + 1}: did not finish, so it scores 0. ${run.error}`); continue; }
      for (const g of run.graders) {
        if (g.passed) continue;
        const seen = failures.get(g.name) ?? { runs: [], explanation: (graderBody(c.name, g.name) || g.explanation || '') + answeredLine(g.name, g.evidence) };
        seen.runs.push(i + 1);
        failures.set(g.name, seen);
      }
    }
    if (failures.size === 0) { lines.push(`  ${arm}: every grader passed in every run that finished`); continue; }
    for (const [name, f] of failures) lines.push(`  ${arm}: ${name} failed in run ${f.runs.join(', ')} of ${runs.length}. ${f.explanation ?? ''}`.trimEnd());
  }
}
console.log(lines.join('\n'));
