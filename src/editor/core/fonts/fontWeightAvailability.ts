import type { FontFamily, FontSource, FontStack } from '../themes/themeTypes';

export interface FontWeightAvailability {
  familyName: string;
  weights: ReadonlySet<number>;
}

/** Typography tokens consistently pair `-font-weight` with `-font-family`. */
export function inferFontFamilyVariable(weightVariable: string): string | null {
  return weightVariable.endsWith('-font-weight')
    ? `${weightVariable.slice(0, -'-font-weight'.length)}-font-family`
    : null;
}

function normalizeFamilyName(value: string): string {
  let name = value.trim();
  // Imported font metadata sometimes retains more than one layer of wrapping
  // quotes (for example `"Comfortaa"`). Peel all balanced wrappers so it can
  // still be compared with a computed font-family value.
  while (
    name.length >= 2
    && ((name.startsWith('"') && name.endsWith('"'))
      || (name.startsWith("'") && name.endsWith("'")))
  ) {
    name = name.slice(1, -1).trim();
  }
  return name.toLocaleLowerCase();
}

function firstFamily(value: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === quote && value[i - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ',') return value.slice(0, i);
  }
  return value;
}

function familyMap(sources: FontSource[]): Map<string, FontFamily> {
  const families = new Map<string, FontFamily>();
  for (const source of sources) {
    for (const family of source.families) {
      families.set(normalizeFamilyName(family.cssName), family);
      families.set(normalizeFamilyName(family.name), family);
    }
  }
  return families;
}

function knownAvailability(family: FontFamily | undefined): FontWeightAvailability | null {
  if (!family?.weights?.length) return null;
  return {
    familyName: family.name,
    weights: new Set(family.weights),
  };
}

/**
 * Find the declared weights for the primary face in a CSS font-family value.
 * Returns null for system fonts and sources whose available weights are not
 * known, so the editor never disables an option on incomplete metadata.
 */
export function fontWeightAvailability(
  fontFamilyValue: string,
  sources: FontSource[],
  stacks: FontStack[],
): FontWeightAvailability | null {
  const families = familyMap(sources);
  const stackRef = fontFamilyValue.match(/^\s*var\(\s*(--font-(?:display|sans|serif|mono))\b/);

  if (stackRef) {
    const stack = stacks.find((candidate) => candidate.variable === stackRef[1]);
    for (const slot of stack?.slots ?? []) {
      if (slot.kind === 'project') {
        const family = sources.flatMap((source) => source.families)
          .find((candidate) => candidate.id === slot.familyId);
        if (!family) continue;
        return knownAvailability(family);
      }
      // A system or generic slot is a real primary face, but has no reliable
      // per-weight metadata. Do not make assumptions from later fallbacks.
      return null;
    }
    return null;
  }

  const name = normalizeFamilyName(firstFamily(fontFamilyValue));
  return knownAvailability(families.get(name));
}
