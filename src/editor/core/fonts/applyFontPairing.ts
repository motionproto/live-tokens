import type {
  ColorsAndType,
  FontFamily,
  FontSource,
  FontStack,
  FontStackVariable,
} from '../themes/themeTypes';
import { parseGoogleFontsUrl } from './fontParse';
import { familyIndex, resolvedFaceName } from './fontPairing';

export type PairingSlot = 'display' | 'body' | 'serif' | 'mono' | 'editorial';

export interface PairingFace {
  name: string;
  url: string;
  weights?: number[];
  italics?: boolean;
}

export type FontPairing = Partial<Record<PairingSlot, PairingFace>>;

export interface PairingChange {
  slot: PairingSlot;
  variable: FontStackVariable;
  from: string | null;
  to: string;
}

export interface DroppedSource {
  id: string;
  names: string[];
}

export interface FontPairingReport {
  changes: PairingChange[];
  dropped: DroppedSource[];
  changed: boolean;
}

export interface FontPairingResult {
  colorsAndType: ColorsAndType;
  report: FontPairingReport;
}

/** Slot order is also the order stamped sources land in `fontSources`;
 *  `check:preset-themes` reads the preset pair back out positionally. */
export const SLOT_ORDER: PairingSlot[] = ['display', 'body', 'serif', 'mono', 'editorial'];

export const SLOT_VARIABLES: Record<PairingSlot, FontStackVariable> = {
  display: '--font-display',
  body: '--font-sans',
  serif: '--font-serif',
  mono: '--font-mono',
  editorial: '--font-editorial',
};

export function slugifyFamily(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function weightsFor(face: PairingFace): Pick<FontFamily, 'weights' | 'italics'> {
  if (face.weights) {
    return { weights: face.weights, ...(face.italics ? { italics: true } : {}) };
  }
  const parsed = parseGoogleFontsUrl(face.url)?.[0];
  return {
    ...(parsed?.weights ? { weights: parsed.weights } : {}),
    ...(face.italics || parsed?.italics ? { italics: true } : {}),
  };
}

function sourceFor(face: PairingFace, idPrefix: string): FontSource {
  const id = `${idPrefix}${slugifyFamily(face.name)}`;
  return {
    id,
    kind: 'google',
    url: face.url,
    label: 'Google Fonts',
    families: [
      {
        id: `${id}:${slugifyFamily(face.name)}`,
        name: face.name,
        cssName: `"${face.name}"`,
        ...weightsFor(face),
      },
    ],
  };
}

function rewriteStack(stacks: FontStack[], variable: FontStackVariable, familyId: string): FontStack[] {
  const stack = stacks.find((s) => s.variable === variable);
  if (!stack) throw new Error(`colors and type have no ${variable} stack to rewrite`);
  return stacks.map((s) =>
    s === stack
      ? { ...s, slots: [{ kind: 'project' as const, familyId }, ...s.slots.filter((slot) => slot.kind !== 'project')] }
      : s,
  );
}

export interface ApplyFontPairingOptions {
  /** `src_preset_` for the shipped presets, so `check:preset-themes` can still
   *  tell a stamped source from one the user added. */
  idPrefix?: string;
}

/**
 * Bind each named slot to a Google Fonts family: stamp the source, put that
 * family at the head of the slot's stack, and keep every fallback behind it.
 * Slots the pairing omits are left exactly as they are.
 */
export function applyFontPairing(
  colorsAndType: ColorsAndType,
  pairing: FontPairing,
  { idPrefix = 'src_google_' }: ApplyFontPairingOptions = {},
): FontPairingResult {
  const slots = SLOT_ORDER.filter((slot) => pairing[slot]);
  if (slots.length === 0) throw new Error('pairing names no slot to change');

  const before = colorsAndType.fontStacks ?? [];
  const beforeSources = colorsAndType.fontSources ?? [];
  const beforeIndex = familyIndex(beforeSources);

  const stamped = slots.map((slot) => ({ slot, source: sourceFor(pairing[slot]!, idPrefix) }));
  const stampedIds = new Set(stamped.map((s) => s.source.id));

  let stacks = before;
  const changes: PairingChange[] = [];
  for (const { slot, source } of stamped) {
    const variable = SLOT_VARIABLES[slot];
    const from = resolvedFaceName(before.find((s) => s.variable === variable), beforeIndex);
    stacks = rewriteStack(stacks, variable, source.families[0].id);
    changes.push({ slot, variable, from, to: source.families[0].name });
  }

  // A source displaced from a rewritten stack would still ship as a
  // render-blocking @import in every consumer's fonts.css, so drop any source
  // no remaining stack references.
  const referenced = new Set(
    stacks
      .flatMap((s) => s.slots)
      .filter((s) => s.kind === 'project')
      .map((s) => s.familyId),
  );
  const kept = [...beforeSources.filter((s) => !stampedIds.has(s.id)), ...stamped.map((s) => s.source)];
  const sources = kept.filter((s) => s.families.some((f) => referenced.has(f.id)));
  const dropped = kept
    .filter((s) => !sources.includes(s))
    .map((s) => ({ id: s.id, names: s.families.map((f) => f.name) }));

  const next: ColorsAndType = { ...colorsAndType, fontSources: sources, fontStacks: stacks };
  const changed =
    JSON.stringify([beforeSources, before]) !== JSON.stringify([sources, stacks]);

  return {
    colorsAndType: next,
    report: { changes: changes.filter((c) => c.from !== c.to), dropped, changed },
  };
}
