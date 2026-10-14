import { describe, expect, it } from 'vitest';
import { analyze, type AnalyzeInput, type Property } from './analyze';

function run(input: Partial<AnalyzeInput> & Pick<AnalyzeInput, 'css'>): Map<string, Property> {
  return analyze({ js: [], html: [], keep: [], ...input });
}

function property(analysis: Map<string, Property>, name: string): Property {
  const found = analysis.get(name);
  if (!found) throw new Error(`analysis has no ${name}`);
  return found;
}

describe('analyze', () => {
  it('classes a property declared only on :root as static and reached', () => {
    const gap = property(run({ css: [':root{--gap:4px}.box{margin:var(--gap)}'] }), '--gap');
    expect(gap).toMatchObject({ reached: true, dynamic: false, reasons: [] });
    expect(gap.declarations).toEqual([
      expect.objectContaining({ selector: ':root', atRules: [], root: true, bare: true }),
    ]);
    expect(gap.winner?.value).toBe('4px');
  });

  it('classes a property redeclared in @media as dynamic', () => {
    const gap = property(
      run({ css: [':root{--gap:4px}@media (max-width:600px){:root{--gap:2px}}.box{margin:var(--gap)}'] }),
      '--gap',
    );
    expect(gap).toMatchObject({ dynamic: true, reasons: ['scoped'] });
    expect(gap.declarations[1]).toMatchObject({ atRules: ['@media (max-width:600px)'], root: true, bare: false });
    expect(gap.winner?.value).toBe('4px');
  });

  it('classes a property declared under a class as dynamic', () => {
    const ink = property(run({ css: [':root{--ink:black}.dark{--ink:white}p{color:var(--ink)}'] }), '--ink');
    expect(ink).toMatchObject({ dynamic: true, reasons: ['scoped'] });
    expect(ink.declarations[1]).toMatchObject({ selector: '.dark', root: false, bare: false });
  });

  it('classes a property named in a JS string as dynamic and reached', () => {
    const tint = property(
      run({ css: [':root{--tint:red}'], js: ['n.style.setProperty("--tint","blue");for(;i;--i);'] }),
      '--tint',
    );
    expect(tint).toMatchObject({ reached: true, dynamic: true, reasons: ['script'] });
  });

  it('classes a property named in a style() container query as dynamic and reached', () => {
    const hairline = property(
      run({ css: [':root{--hairline:on}@container sd style(--hairline: on){.rule{border-top:1px solid}}'] }),
      '--hairline',
    );
    expect(hairline).toMatchObject({ reached: true, dynamic: true, reasons: ['prelude'] });
  });

  it('classes a property that @property registers as dynamic', () => {
    const angle = property(
      run({
        css: [
          '@property --angle{syntax:"<angle>";inherits:true;initial-value:0deg}:root{--angle:45deg}.dial{rotate:var(--angle)}',
        ],
      }),
      '--angle',
    );
    expect(angle.dynamic).toBe(true);
    expect(angle.reasons).toContain('registered');
  });

  it('classes a property listed in keep as dynamic and reached', () => {
    const brand = property(run({ css: [':root{--brand:teal}'], keep: ['--brand'] }), '--brand');
    expect(brand).toMatchObject({ reached: true, dynamic: true, reasons: ['keep'] });
  });

  it('classes a root property that references a dynamic one as dynamic', () => {
    const border = property(
      run({ css: [':root{--ink:black;--border:1px solid var(--ink)}.dark{--ink:white}.box{border:var(--border)}'] }),
      '--border',
    );
    expect(border).toMatchObject({ dynamic: true, reasons: ['reference'], references: ['--ink'] });
  });

  it('reports a property no regular declaration reaches as unreached', () => {
    const analysis = run({ css: [':root{--unused:1px;--gap:4px}.box{margin:var(--gap)}'] });
    expect(property(analysis, '--unused')).toMatchObject({ reached: false, dynamic: false });
    expect(property(analysis, '--gap').reached).toBe(true);
  });

  it('lets :root:root beat a later :root, and :root beat a later :where(:root)', () => {
    const analysis = run({
      css: [
        ':root:root{--surface:navy}:root{--surface:white}:where(:root){--surface:grey}' +
          ':root{--line:black}:where(:root){--line:silver}',
      ],
    });
    expect(property(analysis, '--surface')).toMatchObject({ dynamic: false, winner: { value: 'navy' } });
    expect(property(analysis, '--line').winner?.value).toBe('black');
  });

  it('reaches every link of a chain of three static properties', () => {
    const analysis = run({
      css: [':root{--base:4px;--double:calc(var(--base) * 2);--gap:var(--double)}.box{margin:var(--gap)}'],
    });
    for (const name of ['--base', '--double', '--gap']) {
      expect(property(analysis, name)).toMatchObject({ reached: true, dynamic: false });
    }
    expect(property(analysis, '--gap').references).toEqual(['--double']);
  });

  it('breaks a specificity tie by source order across assets', () => {
    const gap = property(run({ css: [':root{--gap:4px}', ':root{--gap:4px}.box{margin:var(--gap)}'] }), '--gap');
    expect(gap).toMatchObject({ dynamic: false, winner: { asset: 1 } });
  });

  it('lets an !important declaration beat a more specific one', () => {
    const gap = property(run({ css: [':root:root{--gap:4px}:root{--gap:8px!important}'] }), '--gap');
    expect(gap.winner).toMatchObject({ value: '8px', important: true });
  });

  it('classes a property whose :root values differ between assets as dynamic', () => {
    const gap = property(run({ css: [':root{--gap:4px}', ':root{--gap:8px}'] }), '--gap');
    expect(gap).toMatchObject({ dynamic: true, reasons: ['assets'] });
  });

  it('classes a property whose winning value is a CSS-wide keyword as dynamic', () => {
    const width = property(run({ css: [':root{--width:initial}.box{width:var(--width,10px)}'] }), '--width');
    expect(width).toMatchObject({ dynamic: true, reasons: ['keyword'] });
  });

  it('classes every property that reaches a var() loop as dynamic', () => {
    const analysis = run({ css: [':root{--a:var(--b);--b:var(--a);--c:var(--a)}.x{width:var(--c)}'] });
    for (const name of ['--a', '--b', '--c']) {
      expect(property(analysis, name).reasons).toContain('cycle');
    }
  });

  it('classes a root property that reads an undeclared name the JS sets as dynamic', () => {
    const width = property(
      run({
        css: [':root{--card-width:var(--slot-width,10rem)}.card{width:var(--card-width)}'],
        js: ['n.style.setProperty("--slot-width","4rem")'],
      }),
      '--card-width',
    );
    expect(width).toMatchObject({ dynamic: true, reasons: ['reference'] });
  });

  it('classes a declaration under a selector list that mixes :root with another selector as scoped', () => {
    const font = property(run({ css: [':host,:root{--fa-font:solid}'] }), '--fa-font');
    expect(font).toMatchObject({ dynamic: true, reasons: ['scoped'], winner: null });
  });
});
