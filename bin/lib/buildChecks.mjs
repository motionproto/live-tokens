// The design checks `vite build` runs through themeFileApi: both static
// checkers with no repairs, under the project's own severities. The same bar
// `check-page --no-fix` and `check-component --no-fix` hold.

import { COMPONENT_RULES, checkComponent, discoverComponents } from '../check-component.mjs';
import { PAGE_RULES, checkPages, discoverPages } from '../check-page.mjs';
import { checkTokensCssMigrations } from '../rules/tokens.mjs';
import { applySeverity, countBySeverity, formatFindings, readChecksConfig } from './findings.mjs';
import { loadVocabulary } from './tokenVocabulary.mjs';

export async function runBuildChecks({ root = process.cwd(), engine } = {}) {
  const config = readChecksConfig(root);
  const vocabulary = loadVocabulary({ root });
  const migration = await checkTokensCssMigrations({ root, apply: false, engine });
  const pages = checkPages(discoverPages(root), { root, vocabulary });
  const ids = discoverComponents(root);
  const components = ids.map((id) => checkComponent(id, root, { vocabulary }));

  const pageFindings = applySeverity([...migration.findings, ...pages.findings], PAGE_RULES, {}, config, { exclude: true });
  const componentFindings = applySeverity(components.flatMap((r) => r.findings), COMPONENT_RULES, {}, config);
  const page = countBySeverity(pageFindings);
  const component = countBySeverity(componentFindings);

  return {
    errors: page.errors + component.errors,
    warnings: page.warnings + component.warnings,
    report: [
      formatFindings(pageFindings, { label: 'check-page', checked: pages.checked }),
      formatFindings(componentFindings, { label: 'check-component', checked: ids.length }),
    ].join('\n'),
  };
}
