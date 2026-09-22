/** One arm of an eval: the same case run with or without the skills, and with or without the CLI. */
export interface EvalArm {
  skills: boolean;
  cli: boolean;
  rowsRight: string;
  turns: string;
  seconds: string;
  cost: string;
}

export interface EvalResult {
  cases: string[];
  date: string;
  packageVersion: string;
  runsPerArm: number;
  requirements: number;
  arms: EvalArm[];
}

// Recorded by hand from `npm run eval` in the live-tokens repository. The
// evals do not ship, so the page cannot read a result file at runtime.
export const pickComponentEval: EvalResult = {
  cases: ['outcome-pick-component', 'outcome-pick-component-no-cli'],
  date: '2026-09-22',
  packageVersion: '0.87.1',
  runsPerArm: 3,
  requirements: 12,
  arms: [
    {
      skills: true,
      cli: true,
      rowsRight: '12 of 12 in all 3 runs',
      turns: '9 to 10',
      seconds: '46 to 76',
      cost: '$0.41 to $0.46',
    },
    {
      skills: false,
      cli: true,
      rowsRight: '12 of 12 in all 3 runs; 2 of 3 found the CLI on their own',
      turns: '15 to 17',
      seconds: '65 to 102',
      cost: '$0.63 to $0.74',
    },
    {
      skills: true,
      cli: false,
      rowsRight: '12 of 12 in all 3 runs',
      turns: '14 to 20',
      seconds: '66 to 84',
      cost: '$0.73 to $0.91',
    },
    {
      skills: false,
      cli: false,
      rowsRight: '11 of 12 in one run, which missed requirement 12',
      turns: '17 to 20',
      seconds: '113 to 169',
      cost: '$1.02 to $1.14',
    },
  ],
};
