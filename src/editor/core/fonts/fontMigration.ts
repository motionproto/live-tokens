import type { FontFamily, FontSource, FontStack, Theme } from '../themes/themeTypes';

// Google Fonts CDN URLs for the default font families. We used to ship local
// woff2 files and emit @font-face blocks pointing at them, but Vite's url()
// rewriting for @font-face refs from CSS bundled inside node_modules turned
// out to be brittle in consumer setups (paths leaked through unrewritten and
// resolved against the consumer's server root). Switching to Google Fonts
// CDN imports sidesteps the rewriting entirely.
const MANROPE_GFONTS_URL =
  'https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap';
const FRAUNCES_GFONTS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap';

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
 * Build the default fontSources. Used when a theme has no fontSources yet.
 */
export function defaultFontSources(): FontSource[] {
  const typekitId = 'src_typekit_jes8oow';
  const frauncesId = 'src_fraunces_gfonts';
  const manropeId = 'src_manrope_gfonts';

  return [
    {
      id: typekitId,
      kind: 'typekit',
      url: 'https://use.typekit.net/jes8oow.css',
      label: 'Adobe Typekit',
      families: [
        fam(typekitId, 'fira-code', '"fira-code"'),
      ],
    },
    {
      id: frauncesId,
      kind: 'google',
      url: FRAUNCES_GFONTS_URL,
      label: 'Google Fonts',
      families: [
        fam(frauncesId, 'Fraunces', '"Fraunces"', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
      ],
    },
    {
      id: manropeId,
      kind: 'google',
      url: MANROPE_GFONTS_URL,
      label: 'Google Fonts',
      families: [
        fam(manropeId, 'Manrope', '"Manrope"', [200, 300, 400, 500, 600, 700, 800]),
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
        ...pick('Fraunces'),
        { kind: 'generic', value: 'serif' },
      ],
    },
    {
      variable: '--font-sans',
      slots: [
        ...pick('Manrope'),
        { kind: 'system', preset: 'system-ui-sans' },
        { kind: 'generic', value: 'sans-serif' },
      ],
    },
    {
      variable: '--font-serif',
      slots: [
        ...pick('Fraunces'),
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

// Older themes have `kind: 'font-face'` sources with embedded cssText that
// references local woff2 files. The url() resolution for those embedded refs
// is fragile in consumers, so swap any font-face source whose cssText is for
// Manrope or Fraunces over to the Google Fonts URL equivalent. Source ids
// and family ids are preserved so downstream fontStacks keep working.
function migrateLegacyLocalFonts(src: FontSource): boolean {
  if (src.kind !== 'font-face' || !src.cssText) return false;
  if (/font-family:\s*["']Manrope["']/.test(src.cssText)) {
    (src as FontSource).kind = 'google';
    src.url = MANROPE_GFONTS_URL;
    src.label = 'Google Fonts';
    delete src.cssText;
    return true;
  }
  if (/font-family:\s*["']Fraunces["']/.test(src.cssText)) {
    (src as FontSource).kind = 'google';
    src.url = FRAUNCES_GFONTS_URL;
    src.label = 'Google Fonts';
    delete src.cssText;
    return true;
  }
  return false;
}

/**
 * Ensure the loaded Theme has fontSources and fontStacks. Mutates in place
 * only when missing; safe to call on already-migrated themes. Also strips any
 * stale --font-* entries from cssVariables since those are now derived, and
 * migrates legacy local-font sources to Google Fonts URL sources.
 */
export function migrateThemeFonts(theme: Theme): { migrated: boolean } {
  let migrated = false;
  if (!theme.fontSources || theme.fontSources.length === 0) {
    theme.fontSources = defaultFontSources();
    migrated = true;
  } else {
    for (const src of theme.fontSources) {
      if (migrateLegacyLocalFonts(src)) migrated = true;
    }
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
