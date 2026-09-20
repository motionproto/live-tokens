export const meta = {
  name: 'plan-wave',
  description: 'Run one wave of a docs/plans plan: execute, verify, review, with one fix round each',
  whenToUse: 'Pass the plan and the wave id, such as "contract 1" or "check-fix 3b". plan-all calls this in order.',
  phases: [
    { title: 'Prepare' },
    { title: 'Execute' },
    { title: 'Verify' },
    { title: 'Review' },
  ],
}

const EXEC = {
  type: 'object',
  properties: {
    units: {
      type: 'array',
      items: {
        type: 'object',
        properties: { hash: { type: 'string' }, subject: { type: 'string' } },
        required: ['hash', 'subject'],
      },
    },
    gates: { type: 'string', enum: ['pass', 'fail'] },
    skipped: { type: 'boolean' },
    oddities: { type: 'array', items: { type: 'string' } },
    resumePoint: { type: 'string' },
  },
  required: ['units', 'gates', 'oddities', 'resumePoint'],
}

const VERIFY = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    failures: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'failures'],
}

const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'BLOCK'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'string' },
          invariant: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['severity', 'file', 'detail'],
      },
    },
  },
  required: ['verdict', 'findings'],
}

const SCRIPTS = {
  type: 'object',
  properties: {
    scripts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          command: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          checks: { type: 'string' },
        },
        required: ['name', 'command', 'files', 'checks'],
      },
    },
  },
  required: ['scripts'],
}

const CARDS = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          title: { type: 'string' },
          problems: { type: 'array', items: { type: 'string' } },
        },
        required: ['skill', 'title', 'problems'],
      },
    },
  },
  required: ['cards'],
}

const EXECUTOR_CONTRACT =
  'Return units (each commit hash and subject), gates ("pass" only when the wave\'s Verify commands pass), ' +
  'skipped (true only when the wave has nothing to do), oddities (judgment calls you flagged and did not resolve), ' +
  'and resumePoint (the exact next step, or "done").'

const CHECK_FIX_WAVES = {
  '2': { executor: 'wave-executor', verify: true },
  '3': {
    executor: 'wave-executor',
    verify: false,
    prepare: {
      agentType: 'census',
      schema: SCRIPTS,
      prompt:
        'Inventory every "check:*" script in package.json. For each, give its name, its command, the files it runs ' +
        'or reads, and one sentence on the fact it checks. Read the script source to learn what it checks. Edit nothing.',
    },
    extra: (prepared) =>
      'The census of the release scripts is below. Use it as a starting point and read each script yourself before ' +
      'writing its row. Give the table an Approved column and leave it blank for the user.\n' +
      JSON.stringify(prepared, null, 2),
  },
  '3b': {
    executor: 'wave-executor',
    verify: true,
    extra: () =>
      'Apply only rows the user marked in the Approved column whose disposition is other than keep. When no row in ' +
      'the Approved column is filled in, return gates "fail" with resumePoint "the user approves the Release script ' +
      'audit table". When rows are marked but every marked row is keep, return skipped true.',
  },
  '4': { executor: 'wave-executor', verify: true },
  '5': { executor: 'wave-executor', verify: true },
  '6': { executor: 'wave-executor', verify: true },
  '7': { executor: 'wave-executor', verify: true },
  '8a': {
    executor: 'wave-executor',
    verify: true,
    prepare: {
      agentType: 'visual-qa',
      schema: CARDS,
      prompt:
        'Start the dev server, open /live-tokens/docs, and read the Skill Atlas cards for live-tokens-create-page, ' +
        'live-tokens-create-component, and live-tokens-check-compliance. For each card, compare its title, chips, ' +
        'and edge labels against that skill\'s SKILL.md and list every contradiction. Edit no file. Stop the dev ' +
        'server when done, and restore src/live-tokens/data as CLAUDE.md describes.',
    },
    extra: (prepared) =>
      'The visual report of the rendered cards is below. Fix each listed problem in the atlas trees. When no card ' +
      'lists a problem, return skipped true.\n' + JSON.stringify(prepared, null, 2),
  },
  '8b': { executor: 'svelte:svelte-file-editor', verify: true },
}

const CONTRACT_WAVES = {
  '0': {
    executor: 'wave-executor',
    verify: false,
    reviewModel: 'sonnet',
    extra: () =>
      'A refusal from `claude plugin eval` is an outcome to record in the README with its date. It leaves gates "pass".',
  },
  '1': { executor: 'wave-executor', verify: true },
  '2': { executor: 'wave-executor', verify: true },
  '3': { executor: 'wave-executor', verify: true, reviewModel: 'sonnet' },
  '3b': {
    executor: 'wave-executor',
    verify: true,
    extra: () =>
      'Read "Revision of 2026-09-20" first: decisions 8 and 9, the invariants as this wave leaves them, and its Ground truth list of sites.',
  },
  '4': { executor: 'wave-executor', verify: false, reviewModel: 'sonnet' },
}

const EVAL_SCAFFOLD_WAVES = {
  '1': { executor: 'wave-executor', verify: true, reviewModel: 'sonnet' },
  '2': { executor: 'wave-executor', verify: true },
  '3': {
    executor: 'wave-executor',
    verify: false,
    reviewModel: 'sonnet',
    extra: () =>
      'Push nothing and dispatch nothing. Check the `claude plugin eval` flags against `claude plugin eval --help` before writing them into the job.',
  },
}

// executeModel and escalateModel override the agent definition's model. A plan without them runs each agent as defined.
const PLANS = {
  'check-fix': {
    file: 'docs/plans/check-and-fix-unification.md',
    prefix: 'Check-fix',
    waves: CHECK_FIX_WAVES,
  },
  contract: {
    file: 'docs/plans/component-contract.md',
    prefix: 'Contract',
    waves: CONTRACT_WAVES,
    executeModel: 'sonnet',
    escalateModel: 'fable',
  },
  'eval-scaffold': {
    file: 'docs/plans/eval-outcome-scaffold.md',
    prefix: 'Eval-scaffold',
    waves: EVAL_SCAFFOLD_WAVES,
    executeModel: 'sonnet',
    escalateModel: 'fable',
  },
}

const [planArg, waveArg] =
  args && typeof args === 'object' ? [args.plan, args.wave] : String(args ?? '').trim().split(/\s+/)
const plan = PLANS[planArg]
if (!plan) throw new Error(`Unknown plan "${planArg}". Pass one of: ${Object.keys(PLANS).join(', ')}`)
const wave = String(waveArg)
const cfg = plan.waves[wave]
if (!cfg) throw new Error(`Unknown wave "${wave}" of ${planArg}. Pass one of: ${Object.keys(plan.waves).join(', ')}`)

const PLAN = plan.file
const prefix = `${plan.prefix} W${wave}:`
const heading = `## Wave ${wave}:`
const oddities = []
let escalated = false

function stop(stage, detail) {
  return { plan: planArg, wave, status: 'stopped', stage, detail, escalated, oddities }
}

async function execute(prompt, label) {
  const model = escalated ? plan.escalateModel : plan.executeModel
  const result = await agent(prompt, {
    agentType: cfg.executor,
    schema: EXEC,
    label: model ? `${label} (${model})` : label,
    phase: 'Execute',
    ...(model ? { model } : {}),
  })
  if (result) oddities.push(...result.oddities)
  return result
}

function escalate(reason) {
  if (!plan.escalateModel || escalated) return false
  escalated = true
  log(`Wave ${wave}: ${reason}. The remaining execute and review steps run on ${plan.escalateModel}.`)
  return true
}

let prepared
if (cfg.prepare) {
  prepared = await agent(cfg.prepare.prompt, {
    agentType: cfg.prepare.agentType,
    schema: cfg.prepare.schema,
    label: `W${wave} ${cfg.prepare.agentType}`,
    phase: 'Prepare',
  })
  if (!prepared) return stop('prepare', `${cfg.prepare.agentType} returned nothing`)
}

const basePrompt =
  `Execute exactly the section headed "${heading}" in ${PLAN}. Read the plan's Invariants and Out of scope ` +
  `sections first. Commit each unit with the subject prefix "${prefix}". ` +
  (cfg.extra ? cfg.extra(prepared) + ' ' : '') +
  EXECUTOR_CONTRACT

let exec = await execute(basePrompt, `W${wave} execute`)
if ((!exec || exec.gates === 'fail') && escalate('the first executor stopped short')) {
  exec = await execute(
    `${basePrompt} An earlier executor stopped at: ${exec ? exec.resumePoint : 'no report'}. Read ` +
      `git log --grep "${prefix}" and git status, keep the finished units, and continue from there.`,
    `W${wave} resume`,
  )
}
if (!exec) return stop('execute', 'the executor returned nothing')
if (exec.gates === 'fail') return stop('execute', exec.resumePoint)
if (exec.skipped) return { plan: planArg, wave, status: 'skipped', oddities }

const fixPrompt = (scope) =>
  `Wave ${wave} of ${PLAN} needs a fix before it passes. Fix only the scope below, commit with the subject prefix ` +
  `"${prefix}", and rerun the Verify commands under "${heading}". ${EXECUTOR_CONTRACT}\n` +
  JSON.stringify(scope, null, 2)

let verifyFixes = 0
let reviewFixes = 0
while (true) {
  if (cfg.verify) {
    const verified = await agent(
      `Run every command under **Verify** and every check under **Done when** in the section headed "${heading}" ` +
        `of ${PLAN}. Edit nothing. Return pass true only when every command succeeds and every check holds. List ` +
        `each failure with its decisive output line.`,
      { agentType: 'test-verifier', schema: VERIFY, label: `W${wave} verify`, phase: 'Verify' },
    )
    if (!verified || !verified.pass) {
      const failures = verified ? verified.failures : ['the verifier returned nothing']
      if (verifyFixes >= 1) return stop('verify', failures)
      verifyFixes += 1
      escalate('verify failed')
      exec = await execute(fixPrompt({ failures }), `W${wave} fix verify`)
      if (!exec || exec.gates === 'fail') return stop('execute', exec ? exec.resumePoint : 'the executor returned nothing')
      continue
    }
  }

  const review = await agent(
    `Review Wave ${wave} of ${PLAN}, the section headed "${heading}". Find its commits with ` +
      `git log --grep "${prefix}". The executor flagged these oddities: ${JSON.stringify(oddities)}. BLOCK when an ` +
      `oddity needs the user's decision.`,
    {
      agentType: 'wave-reviewer',
      schema: REVIEW,
      label: `W${wave} review`,
      phase: 'Review',
      ...(cfg.reviewModel && !escalated ? { model: cfg.reviewModel } : {}),
    },
  )
  if (review && review.verdict === 'APPROVE') {
    return { plan: planArg, wave, status: 'approved', escalated, review: review.findings, oddities }
  }
  const findings = review ? review.findings : [{ severity: 'high', file: PLAN, detail: 'the reviewer returned nothing' }]
  if (reviewFixes >= 1) return stop('review', findings)
  reviewFixes += 1
  escalate('the reviewer blocked')
  exec = await execute(fixPrompt({ findings }), `W${wave} fix review`)
  if (!exec || exec.gates === 'fail') return stop('execute', exec ? exec.resumePoint : 'the executor returned nothing')
}
