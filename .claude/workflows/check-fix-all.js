export const meta = {
  name: 'check-fix-all',
  description: 'Run every wave of docs/plans/check-and-fix-unification.md in order, from Wave 2 to Wave 8b, stopping at the first wave that stops',
  whenToUse: 'One command for the whole plan. Pass "from <wave>" to resume. Wave 3b runs afterwards with /check-fix-wave 3b once the user approves the audit table.',
  phases: [
    { title: 'Preflight' },
    { title: 'Wave 2' },
    { title: 'Wave 3' },
    { title: 'Wave 4' },
    { title: 'Wave 5' },
    { title: 'Wave 6' },
    { title: 'Wave 7' },
    { title: 'Wave 8a' },
    { title: 'Wave 8b' },
  ],
}

const ORDER = ['2', '3', '4', '5', '6', '7', '8a', '8b']

const CLEAN = {
  type: 'object',
  properties: {
    clean: { type: 'boolean' },
    changes: { type: 'array', items: { type: 'string' } },
  },
  required: ['clean', 'changes'],
}

const from = args && typeof args === 'object' && args.from ? String(args.from) : '2'
const start = ORDER.indexOf(from)
if (start === -1) throw new Error(`Unknown wave "${from}". Start from one of: ${ORDER.join(', ')}`)

phase('Preflight')
const tree = await agent(
  'Run `git status --short` in the repository root. Edit nothing. Return clean true only when it prints nothing, ' +
    'and list every line it prints as changes.',
  { agentType: 'test-verifier', schema: CLEAN, label: 'preflight', phase: 'Preflight' },
)
if (!tree || !tree.clean) {
  log('The working tree has uncommitted changes. Commit or restore them, then run again.')
  return { status: 'stopped', stage: 'preflight', changes: tree ? tree.changes : ['the preflight returned nothing'] }
}

const results = []
for (const wave of ORDER.slice(start)) {
  phase(`Wave ${wave}`)
  const result = await workflow('check-fix-wave', { wave })
  results.push(result)
  if (!result || result.status === 'stopped') {
    log(`Stopped at Wave ${wave}. Resume with /check-fix-all from ${wave} after fixing what it reports.`)
    return { status: 'stopped', wave, results }
  }
}

log('Every wave passed. Approve the Release script audit table, then run /check-fix-wave 3b.')
return { status: 'complete', results }
