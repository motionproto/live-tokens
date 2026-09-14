export const meta = {
  name: 'check-fix-run-a',
  description: 'Check and fix plan, run A: Wave 2 splits the rules into modules, Wave 3 audits the release scripts',
  whenToUse: 'First run of docs/plans/check-and-fix-unification.md. Ends with the audit table for the user to approve.',
  phases: [
    { title: 'Wave 2' },
    { title: 'Wave 3' },
  ],
}

const results = []
for (const wave of ['2', '3']) {
  phase(`Wave ${wave}`)
  const result = await workflow('check-fix-wave', { wave })
  results.push(result)
  if (!result || result.status === 'stopped') {
    log(`Run A stopped at Wave ${wave}.`)
    break
  }
}
return results
