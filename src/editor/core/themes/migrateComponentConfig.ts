/**
 * Component-config migration, disk-shape in and disk-shape out. Extracted
 * from `editorStore.ts` (Wave 1 of `docs/plans/theme-completeness.md`) so the
 * server (`normalizeTheme`) can run the same migration an embedded theme
 * config gets on the client, instead of reading it raw.
 */

import type { AliasDiskValue } from './themeTypes';
import { runMigrations } from './migrations';

/**
 * Migrate a disk-shape alias bag through the registered migration runner.
 *
 * The runner is string-typed by contract (most migrations only do
 * key/value string rewrites). Object-valued entries — currently just
 * inline `{ kind: 'gradient', value: ... }` payloads — pass through
 * untouched: we split the bag into string/object subsets, run the runner
 * on the string subset, then merge.
 *
 * For sectiondivider's legacy 7-flat-token gradients we run a synthesis
 * step BEFORE the migration runner that would strip those tokens. The
 * synthesized gradient object lands in the object subset and survives
 * the stripping pass.
 */
export function migrateComponentConfig(
  component: string,
  aliasesIn: Record<string, AliasDiskValue>,
  rawConfig: Record<string, unknown> | undefined,
  fileVersion: number,
): { aliases: Record<string, AliasDiskValue>; config: Record<string, unknown> } {
  const stringPart: Record<string, string> = {};
  const objectPart: Record<string, AliasDiskValue> = {};
  for (const [k, v] of Object.entries(aliasesIn)) {
    if (typeof v === 'string') stringPart[k] = v;
    else objectPart[k] = v;
  }
  // String-valued config entries join the migration input so a migration can
  // rename or relocate them. After migration the bag flows through
  // `splitAliasesAndConfig` which routes KNOWN keys back to config and the
  // rest to aliases — this is what lets a migration *move* a key from the
  // config bucket to the aliases bucket by also removing it from KNOWN.
  // Config wins over an aliases-bucket collision on the same key: the legacy
  // single-bucket → split-bucket move preserved "explicit config field beats
  // legacy alias-bucketed value", and that contract still holds.
  // Non-string config values (rare; reserved for future structured payloads)
  // pass through untouched.
  const configOut: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawConfig ?? {})) {
    if (typeof v === 'string') stringPart[k] = v;
    else configOut[k] = v;
  }
  if (component === 'sectiondivider') {
    synthesizeSectionDividerGradients(stringPart, objectPart);
  }
  const migratedString = runMigrations('component-config', fileVersion, stringPart, { component });
  const migratedObject = component === 'sectiondivider'
    ? renameSectionDividerObjectSlots(objectPart)
    : objectPart;
  return {
    aliases: { ...migratedString, ...migratedObject },
    config: configOut,
  };
}

/**
 * v8→v9 companion to `componentMigration_2026_05_20_sectiondividerSlimVariants`:
 * the structured background payload is reshaped from six color families →
 * three size variants (lg/md/sm). Canvas's gradient is taken as the canonical
 * seed and fanned across all three new variants; other families' gradients
 * are dropped. Idempotent — keys already at the final shape pass through.
 *
 * Sources accepted (in priority order, first-found wins for canvas's slot):
 *   --sectiondivider-canvas-background  (current/in-progress shape)
 *   --sectiondivider-canvas-gradient    (v7-era shape)
 *   --sectiondivider-color-canvas-background  (intermediate shape that landed
 *                                              briefly during the color-prop pivot)
 *
 * The migration runner only sees string keys, so this object-shape rename
 * has to live alongside the runner call.
 */
const FAMILIES = ['canvas', 'neutral', 'alternate', 'primary', 'accent', 'special'] as const;
const SIZE_VARIANTS = ['lg', 'md', 'sm'] as const;
function renameSectionDividerObjectSlots(
  objectPart: Record<string, AliasDiskValue>,
): Record<string, AliasDiskValue> {
  // Find canvas's gradient under any historical key shape.
  const canvasSourceKeys = [
    '--sectiondivider-canvas-background',
    '--sectiondivider-canvas-gradient',
    '--sectiondivider-color-canvas-background',
  ];
  let canvasGradient: AliasDiskValue | undefined;
  for (const key of canvasSourceKeys) {
    if (objectPart[key] !== undefined) {
      canvasGradient = objectPart[key];
      break;
    }
  }

  // If we found a canvas gradient (any era), fan it into the three new
  // per-variant background slots and drop every other family's gradient.
  // If no canvas gradient is found, pass through non-family keys verbatim
  // so non-migration data (theme tokens, other components) isn't touched.
  const out: Record<string, AliasDiskValue> = {};
  for (const [key, value] of Object.entries(objectPart)) {
    // Skip any sectiondivider per-family gradient; the canvas fan-out emits
    // the canonical set below.
    let isFamilyGradient = false;
    for (const f of FAMILIES) {
      if (
        key === `--sectiondivider-${f}-background`
        || key === `--sectiondivider-${f}-gradient`
        || key === `--sectiondivider-color-${f}-background`
      ) {
        isFamilyGradient = true;
        break;
      }
    }
    // Pass through anything that's already at the final lg/md/sm shape so
    // re-running the migration is idempotent.
    if (isFamilyGradient) continue;
    out[key] = value;
  }
  if (canvasGradient !== undefined) {
    for (const v of SIZE_VARIANTS) {
      out[`--sectiondivider-${v}-background`] = canvasGradient;
    }
  }
  return out;
}

/** SectionDivider variants that ship gradient aliases. */
const SECTIONDIVIDER_VARIANTS = ['canvas', 'neutral', 'alternate', 'primary', 'accent', 'special'] as const;

/**
 * Collapse legacy 7-flat-token gradients (`{angle, stop-{1,2,3}-{color,position}}`)
 * for each sectiondivider variant into one structured gradient alias at
 * `--sectiondivider-{v}-gradient`. The flat tokens stay in `stringPart`
 * for the migration runner to strip; the structured payload joins
 * `objectPart` so the merge produces the new shape.
 *
 * Skips variants that already declare a gradient alias (object form) so
 * round-tripping doesn't overwrite user edits.
 */
function synthesizeSectionDividerGradients(
  stringPart: Record<string, string>,
  objectPart: Record<string, AliasDiskValue>,
): void {
  const GRADIENT_ANGLE_TOKENS: Record<string, number> = {
    '--gradient-angle-horizontal': 90,
    '--gradient-angle-vertical': 180,
    '--gradient-angle-diagonal': 135,
    '--gradient-angle-counter-diagonal': 45,
  };
  const GRADIENT_STOP_POSITIONS: Record<string, number> = {
    '--gradient-stop-start': 0,
    '--gradient-stop-mid': 50,
    '--gradient-stop-end': 100,
  };
  const parseAngle = (raw: string | undefined): number => {
    if (!raw) return 135;
    if (raw.startsWith('--')) return GRADIENT_ANGLE_TOKENS[raw] ?? 135;
    const m = raw.match(/^(-?\d+(?:\.\d+)?)\s*deg$/i);
    return m ? parseFloat(m[1]) : 135;
  };
  const parsePosition = (raw: string | undefined, fallback: number): number => {
    if (!raw) return fallback;
    if (raw.startsWith('--')) return GRADIENT_STOP_POSITIONS[raw] ?? fallback;
    const m = raw.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
    return m ? parseFloat(m[1]) : fallback;
  };
  const parseStopColor = (raw: string | undefined): { color: string; opacity?: number } | null => {
    if (!raw) return null;
    if (raw.startsWith('--')) return { color: raw };
    const mix = raw.match(/^color-mix\(\s*in\s+srgb\s*,\s*var\((--[a-z0-9-]+)\)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i);
    if (mix) return { color: mix[1], opacity: parseFloat(mix[2]) };
    return null;
  };
  for (const v of SECTIONDIVIDER_VARIANTS) {
    const slot = `--sectiondivider-${v}-gradient`;
    if (slot in objectPart) continue;
    const angleKey = `${slot}-angle`;
    const has1 = stringPart[`${slot}-stop-1-color`] !== undefined;
    const has2 = stringPart[`${slot}-stop-2-color`] !== undefined;
    const has3 = stringPart[`${slot}-stop-3-color`] !== undefined;
    if (!has1 && !has2 && !has3) continue;
    const stops: { position: number; color: string; opacity?: number }[] = [];
    const positionDefaults = [0, 50, 100];
    for (let i = 1; i <= 3; i++) {
      const c = parseStopColor(stringPart[`${slot}-stop-${i}-color`]);
      if (!c) continue;
      const pos = parsePosition(stringPart[`${slot}-stop-${i}-position`], positionDefaults[i - 1]);
      stops.push({ position: pos, color: c.color, ...(c.opacity !== undefined ? { opacity: c.opacity } : {}) });
    }
    if (stops.length < 2) continue;
    objectPart[slot] = {
      kind: 'gradient',
      value: {
        type: 'linear',
        angle: parseAngle(stringPart[angleKey]),
        stops,
      },
    };
  }
}
