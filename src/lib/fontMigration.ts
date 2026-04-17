import type { FontFamily, FontSource, FontStack, Theme } from './themeTypes';

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function familyId(sourceId: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${sourceId}:${slug}`;
}

function fam(sourceId: string, name: string, cssName?: string, weights?: number[]): FontFamily {
  return {
    id: familyId(sourceId, name),
    name,
    cssName: cssName ?? `"${name}"`,
    ...(weights ? { weights } : {}),
  };
}

/**
 * Build the default fontSources that match the hand-written src/styles/fonts.css.
 * Used when a theme has no fontSources yet.
 */
export function defaultFontSources(): FontSource[] {
  const typekitId = 'src_typekit_jes8oow';
  const googleId = 'src_google_default';
  const domineId = 'src_domine_local';

  return [
    {
      id: typekitId,
      kind: 'typekit',
      url: 'https://use.typekit.net/jes8oow.css',
      label: 'Adobe Typekit',
      families: [
        fam(typekitId, 'astounder-squared-bb', '"astounder-squared-bb"'),
        fam(typekitId, 'astounder-squared-lc-bb', '"astounder-squared-lc-bb"'),
        fam(typekitId, 'gravita-hum-variable', '"gravita-hum-variable"'),
        fam(typekitId, 'fira-code', '"fira-code"'),
      ],
    },
    {
      id: googleId,
      kind: 'google',
      url: 'https://fonts.googleapis.com/css2?family=Faculty+Glyphic&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap',
      label: 'Google Fonts',
      families: [
        fam(googleId, 'Faculty Glyphic'),
        fam(googleId, 'Montserrat', '"Montserrat"', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
      ],
    },
    {
      id: domineId,
      kind: 'font-face',
      cssText: `@font-face {\n  font-family: "Domine";\n  src: url('./fonts/Domine/Domine-VariableFont_wght.ttf') format('truetype-variations');\n  font-weight: 400 700;\n  font-style: normal;\n  font-display: swap;\n}`,
      label: 'Local',
      families: [
        fam(domineId, 'Domine', '"Domine"', [400, 500, 600, 700]),
      ],
    },
  ];
}

/**
 * Build the default fontStacks matching the previous hard-coded display in
 * VariablesTab.svelte plus tokens.css. Each stack references families from
 * defaultFontSources() by id.
 */
export function defaultFontStacks(sources: FontSource[]): FontStack[] {
  const byName = new Map<string, string>();
  for (const src of sources) {
    for (const f of src.families) byName.set(f.name.toLowerCase(), f.id);
  }
  const p = (name: string): { kind: 'project'; familyId: string } | null => {
    const id = byName.get(name.toLowerCase());
    return id ? { kind: 'project', familyId: id } : null;
  };
  const pick = (...names: string[]) => names.map(p).filter((x): x is { kind: 'project'; familyId: string } => !!x);

  return [
    {
      variable: '--font-display',
      slots: [
        ...pick('astounder-squared-bb', 'astounder-squared-lc-bb'),
        { kind: 'generic', value: 'sans-serif' },
      ],
    },
    {
      variable: '--font-sans',
      slots: [
        ...pick('Montserrat'),
        { kind: 'system', preset: 'system-ui-sans' },
        { kind: 'generic', value: 'sans-serif' },
      ],
    },
    {
      variable: '--font-serif',
      slots: [
        ...pick('Faculty Glyphic', 'Domine'),
        { kind: 'generic', value: 'serif' },
      ],
    },
    {
      variable: '--font-mono',
      slots: [
        ...pick('fira-code'),
        { kind: 'system', preset: 'system-ui-mono' },
        { kind: 'generic', value: 'monospace' },
      ],
    },
  ];
}

/**
 * Ensure the loaded Theme has fontSources and fontStacks. Mutates in place
 * only when missing; safe to call on already-migrated themes. Also strips any
 * stale --font-* entries from cssVariables since those are now derived.
 */
export function migrateThemeFonts(theme: Theme): { migrated: boolean } {
  let migrated = false;
  if (!theme.fontSources || theme.fontSources.length === 0) {
    theme.fontSources = defaultFontSources();
    migrated = true;
  }
  if (!theme.fontStacks || theme.fontStacks.length === 0) {
    theme.fontStacks = defaultFontStacks(theme.fontSources);
    migrated = true;
  }
  if (theme.cssVariables) {
    for (const key of ['--font-display', '--font-sans', '--font-serif', '--font-mono']) {
      if (key in theme.cssVariables) {
        delete theme.cssVariables[key];
        migrated = true;
      }
    }
  }
  return { migrated };
}

export { makeId };
