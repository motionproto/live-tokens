export const meta = {
  name: 'check-fix-run-b',
  description: 'Check and fix plan, run B: Wave 3b applies approved script changes, Wave 4 adds guidance, Wave 5 gives the create skills one loop',
  whenToUse: 'Second run of docs/plans/check-and-fix-unification.md, after the user marks the Approved column of the audit table.',
  phases: [
    { title: 'Wave 3b' },
    { title: 'Wave 4' },
    { title: 'Wave 5' },
  ],
}

const results = []
for (const wave of ['3b', '4', '5']) {
  phase(`Wave ${wave}`)
  const result = await workflow('check-fix-wave', { wave })
  results.push(result)
  if (!result || result.status === 'stopped') {
    log(`Run B stopped at Wave ${wave}.`)
    break
  }
}
return results
