import { describe, expect, it } from 'vitest';
import { checkBeforeBuild, type BuildCheckResult } from './buildChecks';

function logger() {
  const lines: Array<[string, string]> = [];
  return {
    lines,
    info: (msg: string) => lines.push(['info', msg]),
    warn: (msg: string) => lines.push(['warn', msg]),
    error: (msg: string) => lines.push(['error', msg]),
  };
}
const returning = (result: BuildCheckResult) => async () => result;

describe('checkBeforeBuild', () => {
  it('stops the build on an error and logs the report as an error', async () => {
    const log = logger();
    const failure = await checkBeforeBuild({ root: '/app', logger: log, run: returning({ errors: 2, warnings: 1, report: 'REPORT' }) });
    expect(failure).toContain('2 error(s)');
    expect(log.lines).toEqual([['error', 'REPORT']]);
  });

  it('lets the build continue on warnings and logs the report as a warning', async () => {
    const log = logger();
    const failure = await checkBeforeBuild({ root: '/app', logger: log, run: returning({ errors: 0, warnings: 3, report: 'REPORT' }) });
    expect(failure).toBeNull();
    expect(log.lines).toEqual([['warn', 'REPORT']]);
  });

  it('logs a clean report as info', async () => {
    const log = logger();
    const failure = await checkBeforeBuild({ root: '/app', logger: log, run: returning({ errors: 0, warnings: 0, report: 'CLEAN' }) });
    expect(failure).toBeNull();
    expect(log.lines).toEqual([['info', 'CLEAN']]);
  });

  it('checks the root it is given', async () => {
    let seen = '';
    await checkBeforeBuild({
      root: '/project/root',
      logger: logger(),
      run: async (root) => {
        seen = root;
        return { errors: 0, warnings: 0, report: '' };
      },
    });
    expect(seen).toBe('/project/root');
  });
});
