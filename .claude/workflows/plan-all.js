export const meta = {
  name: 'plan-all',
  description: 'Run the automatic waves of a docs/plans plan in order, stopping at the first wave that stops',
  whenToUse: 'Pass the plan, such as "contract" or "check-fix". Add "from <wave>" to resume. Waves that wait on the user run on their own with /plan-wave.',
  phases: [{ title: 'Preflight' }, { title: 'Waves' }],
}

const PLANS = {
  'type-scales': {
    order: ['1', '2', '3', '4', '5'],
    after: 'Run /plan-wave type-scales 6 for the visual pass. It opens the browser.',
  },
  'check-fix': {
    order: ['2', '3', '4', '5', '6', '7', '8a', '8b'],
    after: 'Approve the Release script audit table, then run /plan-wave check-fix 3b.',
  },
  contract: {
    order: ['0', '1', '2', '3'],
    after: 'Once the README holds a Wave 0 baseline, run /plan-wave contract 4.',
  },
  contrast: {
    order: ['0', '1', '2', '3', '4', '5', '6'],
    // Wave 0 builds the worktree and snapshots this checkout, so the run starts on top of the user's uncommitted work.
    worktree: true,
    after:
      'Read the Run log at the end of ../live-tokens-contrast/docs/plans/contrast-checker.md, then review the ' +
      'contrast-checker branch.',
  },
}

const CLEAN = {
  type: 'object',
  properties: {
    clean: { type: 'boolean' },
    changes: { type: 'array', items: { type: 'string' } },
  },
  required: ['clean', 'changes'],
}

const words = args && typeof args === 'object' ? [args.plan, 'from', args.from] : String(args ?? '').trim().split(/\s+/)
const planArg = words[0]
const plan = PLANS[planArg]
if (!plan) throw new Error(`Unknown plan "${planArg}". Pass one of: ${Object.keys(PLANS).join(', ')}`)
const from = words[1] === 'from' && words[2] ? String(words[2]) : plan.order[0]
const start = plan.order.indexOf(from)
if (start === -1) throw new Error(`Unknown wave "${from}". Start from one of: ${plan.order.join(', ')}`)

if (!plan.worktree) {
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
}

phase('Waves')
const results = []
for (const wave of plan.order.slice(start)) {
  log(`Wave ${wave}`)
  const result = await workflow('plan-wave', { plan: planArg, wave })
  results.push(result)
  if (!result || result.status === 'stopped') {
    log(`Stopped at Wave ${wave}. Resume with /plan-all ${planArg} from ${wave} after fixing what it reports.`)
    return { status: 'stopped', wave, results }
  }
}

log(`Every wave passed. ${plan.after}`)
return { status: 'complete', results }
