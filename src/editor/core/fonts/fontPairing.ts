import type { FontFamily, FontSource, FontStack, FontStackVariable } from '../themes/themeTypes';

/**
 * The two faces a theme is recognised by, for the read-only identity line:
 * headings then body, named as the user named them rather than as a CSS
 * cascade. The first slot that resolves is the face the page actually shows.
 */

const PAIRING: FontStackVariable[] = ['--font-display', '--font-sans'];

function slotLabel(
  stack: FontStack | undefined,
  familyById: Map<string, FontFamily>,
): string | null {
  for (const slot of stack?.slots ?? []) {
    if (slot.kind === 'project') {
      const family = familyById.get(slot.familyId);
      if (family) return family.name;
      continue;
    }
    if (slot.kind === 'system') return 'System';
    return slot.value;
  }
  return null;
}

export function fontPairingLabel(stacks: FontStack[], sources: FontSource[]): string {
  const familyById = new Map<string, FontFamily>();
  for (const source of sources) {
    for (const family of source.families) familyById.set(family.id, family);
  }
  return PAIRING.map((variable) => slotLabel(stacks.find((s) => s.variable === variable), familyById))
    .filter((label): label is string => label !== null)
    .join(' / ');
}
