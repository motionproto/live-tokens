// Detection lives in bin/contractRunner.mjs: `runContractTests` for the
// component rules, `runPageTests` for the page rules. Fixed by design decisions
// 8 and 9 so `fix-findings` can map them; every one is an error, including the
// setup rules, which `--tests` treats as never-silenceable (see cli.mjs). A
// failed obligation is always authored: the component has to start behaving.

const tooling = {
  'tests-not-installed': { severity: 'error', fix: 'tooling', repair: 'authored' },
  'tests-setup': { severity: 'error', fix: 'tooling', repair: 'authored' },
  'tests-incomplete': { severity: 'error', fix: 'coverage', repair: 'authored' },
};

export const componentRules = {
  'contract-registry': { severity: 'error', fix: 'registration', repair: 'authored' },
  'contract-behavior': { severity: 'error', fix: 'runtime', repair: 'authored' },
  'contract-render': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-alias': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-persist': { severity: 'error', fix: 'runtime-defaults', repair: 'authored' },
  'contract-theme': { severity: 'error', fix: 'property-token', repair: 'authored' },
  'contract-states': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-interaction': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-listed': { severity: 'error', fix: 'registration', repair: 'authored' },
  'contract-sketch': { severity: 'error', fix: 'sketch', repair: 'authored' },
  'contract-missing': { severity: 'error', fix: 'coverage', repair: 'authored' },
  ...tooling,
};

export const pageRules = {
  'page-component-paint': { severity: 'error', fix: 'page-paint', repair: 'authored' },
  'page-text-style': { severity: 'error', fix: 'page-paint', repair: 'authored' },
  'page-contrast': { severity: 'error', fix: 'page-paint', repair: 'authored' },
  'page-grid': { severity: 'error', fix: 'page-layout', repair: 'authored' },
  'page-overflow': { severity: 'error', fix: 'page-layout', repair: 'authored' },
  ...tooling,
};
