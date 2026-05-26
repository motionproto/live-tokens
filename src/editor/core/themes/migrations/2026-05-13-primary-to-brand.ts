import type { Migration } from './index';

// Match list is explicit so the neutral `--text-primary` ramp (different namespace) isn't clobbered.

const PALETTE_STEPS = ['100','200','300','400','500','600','700','800','850','900','950'] as const;
const SURFACE_SUFFIXES = ['lowest','lower','low','high','higher','highest'] as const;
const BORDER_SUFFIXES = ['faint','subtle','medium','strong'] as const;
const TEXT_SUFFIXES = ['secondary','tertiary','muted','disabled'] as const;

const RENAME_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const step of PALETTE_STEPS) m[`--color-primary-${step}`] = `--color-brand-${step}`;
  m['--surface-primary'] = '--surface-brand';
  for (const suf of SURFACE_SUFFIXES) m[`--surface-primary-${suf}`] = `--surface-brand-${suf}`;
  m['--border-primary'] = '--border-brand';
  for (const suf of BORDER_SUFFIXES) m[`--border-primary-${suf}`] = `--border-brand-${suf}`;
  m['--text-primary-color'] = '--text-brand';
  for (const suf of TEXT_SUFFIXES) m[`--text-primary-${suf}`] = `--text-brand-${suf}`;
  return m;
})();

function renameToken(name: string): string {
  return RENAME_MAP[name] ?? name;
}

function renameKeys(rawVars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawVars)) {
    out[renameToken(k)] = v;
  }
  return out;
}

function renameKeysAndValues(rawVars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawVars)) {
    out[renameToken(k)] = renameToken(v);
  }
  return out;
}

export const themeMigration_2026_05_13_primaryToBrand: Migration = {
  id: '2026-05-13-primary-to-brand-theme',
  fromVersion: 1,
  toVersion: 2,
  appliesTo: 'theme',
  apply: renameKeys,
};

export const componentMigration_2026_05_13_primaryToBrand: Migration = {
  id: '2026-05-13-primary-to-brand-component',
  fromVersion: 5,
  toVersion: 6,
  appliesTo: 'component-config',
  apply: renameKeysAndValues,
};

// Lives outside the migration framework because its contract is Record<string, string>; editorConfigs is structured.
export function renamePrimaryPaletteKey<T>(editorConfigs: Record<string, T>): Record<string, T> {
  if (!('Primary' in editorConfigs) || 'Brand' in editorConfigs) return editorConfigs;
  const { Primary, ...rest } = editorConfigs;
  return { ...rest, Brand: Primary };
}
