export const meta = {
  name: 'check-fix-run-c',
  description: 'Check and fix plan, run C: check-compliance fixes the project, fix-findings is deleted, then the Skill Atlas and the Testing loops page',
  whenToUse: 'Third run of docs/plans/check-and-fix-unification.md. Wave 8a starts the dev server and opens Chrome.',
  phases: [
    { title: 'Wave 6' },
    { title: 'Wave 7' },
    { title: 'Wave 8a' },
    { title: 'Wave 8b' },
  ],
}

const results = []
for (const wave of ['6', '7', '8a', '8b']) {
  phase(`Wave ${wave}`)
  const result = await workflow('check-fix-wave', { wave })
  results.push(result)
  if (!result || result.status === 'stopped') {
    log(`Run C stopped at Wave ${wave}.`)
    break
  }
}
return results
