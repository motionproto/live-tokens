/** One arm of an eval: the same case run with the skills loaded, or without them. */
export interface EvalArm {
  label: string;
  score: number;
  rowsRight: string;
  ranCatalogue: string;
  turns: string;
  seconds: string;
}

export interface EvalResult {
  id: string;
  date: string;
  packageVersion: string;
  runsPerArm: number;
  requirements: number;
  arms: [withSkills: EvalArm, without: EvalArm];
}

// Recorded by hand from `npm run eval` in the live-tokens repository. The
// evals do not ship, so the page cannot read a result file at runtime.
export const pickComponentEval: EvalResult = {
  id: 'outcome-pick-component',
  date: '2026-09-20',
  packageVersion: '0.82.0, plus the unreleased catalogue entry',
  runsPerArm: 3,
  requirements: 12,
  arms: [
    {
      label: 'With the skills',
      score: 1,
      rowsRight: '12 of 12 in all 3 runs',
      ranCatalogue: '3 of 3 runs',
      turns: '9 to 10',
      seconds: '42 to 58',
    },
    {
      label: 'Without',
      score: 0.62,
      rowsRight: '12 of 12 in the 2 runs that finished',
      ranCatalogue: '0 of 3 runs',
      turns: '15 to 16',
      seconds: '70 to 72, and one run timed out at 300',
    },
  ],
};
