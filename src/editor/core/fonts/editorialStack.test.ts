import { describe, expect, it } from 'vitest';
import type { ColorsAndType, FontSource } from '../themes/themeTypes';
import { migrateColorsAndTypeFonts } from './fontMigration';

const sources: FontSource[] = [
  {
    id: 'src_1',
    kind: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Karla',
    families: [{ id: 'fam_karla', name: 'Karla', cssName: '"Karla"' }],
  },
];

function colorsAndType(stacks: ColorsAndType['fontStacks']): ColorsAndType {
  return { fontSources: sources, fontStacks: stacks } as ColorsAndType;
}

describe('editorial font stack', () => {
  it('seeds itself from the body stack on a file written before the role existed', () => {
    const ct = colorsAndType([
      { variable: '--font-display', slots: [{ kind: 'generic', value: 'serif' }] },
      {
        variable: '--font-sans',
        slots: [
          { kind: 'project', familyId: 'fam_karla' },
          { kind: 'system', preset: 'system-ui-sans' },
          { kind: 'generic', value: 'sans-serif' },
        ],
      },
    ]);

    expect(migrateColorsAndTypeFonts(ct).migrated).toBe(true);

    const editorial = ct.fontStacks!.find((s) => s.variable === '--font-editorial');
    expect(editorial?.slots).toEqual([
      { kind: 'project', familyId: 'fam_karla' },
      { kind: 'system', preset: 'system-ui-sans' },
      { kind: 'generic', value: 'sans-serif' },
    ]);
  });

  it('clones the body slots rather than aliasing them, so repointing one leaves the other', () => {
    const ct = colorsAndType([
      { variable: '--font-sans', slots: [{ kind: 'project', familyId: 'fam_karla' }] },
    ]);
    migrateColorsAndTypeFonts(ct);

    const editorial = ct.fontStacks!.find((s) => s.variable === '--font-editorial')!;
    editorial.slots[0] = { kind: 'generic', value: 'serif' };

    const sans = ct.fontStacks!.find((s) => s.variable === '--font-sans')!;
    expect(sans.slots[0]).toEqual({ kind: 'project', familyId: 'fam_karla' });
  });

  it('leaves an already-repointed editorial stack alone', () => {
    const ct = colorsAndType([
      { variable: '--font-sans', slots: [{ kind: 'project', familyId: 'fam_karla' }] },
      { variable: '--font-editorial', slots: [{ kind: 'generic', value: 'serif' }] },
    ]);

    expect(migrateColorsAndTypeFonts(ct).migrated).toBe(false);
    const editorial = ct.fontStacks!.find((s) => s.variable === '--font-editorial')!;
    expect(editorial.slots).toEqual([{ kind: 'generic', value: 'serif' }]);
  });

  it('strips a stale --font-editorial from cssVariables, which is derived from the stack', () => {
    const ct = colorsAndType([
      { variable: '--font-sans', slots: [{ kind: 'project', familyId: 'fam_karla' }] },
    ]);
    ct.cssVariables = { '--font-editorial': '"Stale", serif' };

    migrateColorsAndTypeFonts(ct);
    expect(ct.cssVariables).not.toHaveProperty('--font-editorial');
  });
});
