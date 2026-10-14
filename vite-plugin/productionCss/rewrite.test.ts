import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { droppedDeclarations, rewrite, staticValues, substituteValue } from './rewrite';

const run = (css: string[], js: string[] = []) => analyze({ css, js, html: [], keep: [], entries: css.map((_, i) => i) });
const lookup = (values: Record<string, string>) => (name: string) => values[name];

describe('substituteValue', () => {
  it('replaces a resolved var() with its token stream and drops the reference fallback', () => {
    expect(substituteValue('calc(var(--gap, 2px)*2) var( --ink )', lookup({ '--gap': '4px', '--ink': 'red' }))).toBe(
      'calc(4px*2) red',
    );
  });

  it('keeps a var() it cannot resolve and substitutes inside its fallback', () => {
    expect(substituteValue('var(--slot,var(--gap))', lookup({ '--gap': '4px' }))).toBe('var(--slot,4px)');
  });

  it('copies light-dark(), color-mix() and calc() without evaluating them', () => {
    const value = 'light-dark(var(--a),color-mix(in oklch,var(--b) 50%,white))';
    expect(substituteValue(value, lookup({ '--a': 'calc(1px + 2px)', '--b': 'oklch(0.5 0.1 200)' }))).toBe(
      'light-dark(calc(1px + 2px),color-mix(in oklch,oklch(0.5 0.1 200) 50%,white))',
    );
  });

  it('leaves var() text inside strings, comments and url() alone', () => {
    const value = '"var(--gap)" url(var(--gap)) url("a.svg") /* var(--gap) */ var(--gap)';
    expect(substituteValue(value, lookup({ '--gap': '4px' }))).toBe(
      '"var(--gap)" url(var(--gap)) url("a.svg") /* var(--gap) */ 4px',
    );
  });

  it('leaves a function whose name ends in var alone', () => {
    expect(substituteValue('-var(--gap) myvar(--gap)', lookup({ '--gap': '4px' }))).toBe('-var(--gap) myvar(--gap)');
  });

  it('separates tokens that would merge with an empty comment', () => {
    const valueOf = lookup({ '--n': '1', '--m': '2', '--e': '' });
    expect(substituteValue('var(--n)px', valueOf)).toBe('1/**/px');
    expect(substituteValue('var(--n)var(--m)', valueOf)).toBe('1/**/2');
    expect(substituteValue('-var(--n)', valueOf)).toBe('-var(--n)');
    expect(substituteValue('a/var(--e)*b', valueOf)).toBe('a//**/*b');
  });
});

describe('staticValues', () => {
  it('expands a chain of three static properties into one token stream', () => {
    const values = staticValues(
      run([':root{--base:4px;--double:calc(var(--base) * 2);--gap:var(--double)}.box{margin:var(--gap)}']),
    );
    expect(values.get('--gap')).toBe('calc(4px * 2)');
    expect(values.get('--double')).toBe('calc(4px * 2)');
  });

  it('takes the :root:root winner over the default it overrides', () => {
    expect(staticValues(run([':root{--gap:4px}:root:root{--gap:8px}.box{margin:var(--gap)}'])).get('--gap')).toBe('8px');
  });

  it('holds no dynamic or unreached property', () => {
    const values = staticValues(run([':root{--unused:1px;--ink:black}.dark{--ink:white}p{color:var(--ink)}']));
    expect([...values.keys()]).toEqual([]);
  });
});

describe('droppedDeclarations', () => {
  const css = ':root{--unused:1px;--gap:4px;--ink:black}.dark{--ink:white}:root:root{--ink:navy}.box{margin:var(--gap);color:var(--ink)}';

  it('drops unreached and static declarations and each losing bare :root declaration', () => {
    expect([...droppedDeclarations(run([css]), 0, { substitute: true })].sort()).toEqual([0, 1, 2]);
  });

  it('keeps static declarations without substitution', () => {
    expect([...droppedDeclarations(run([css]), 0, { substitute: false })].sort()).toEqual([0, 2]);
  });

  it('keeps a declaration redeclared in @media', () => {
    const analysis = run([':root{--size:2rem}@media (max-width:600px){:root{--size:1rem}}h1{font-size:var(--size)}']);
    expect(droppedDeclarations(analysis, 0, { substitute: true }).size).toBe(0);
  });

  it('keeps each asset its own winner, since a lazy asset loads its CSS alone', () => {
    const analysis = run([':root{--ink:black}.dark{--ink:white}', ':root{--ink:black}p{color:var(--ink)}']);
    expect(droppedDeclarations(analysis, 0, { substitute: true }).size).toBe(0);
    expect(droppedDeclarations(analysis, 1, { substitute: true }).size).toBe(0);
  });
});

describe('rewrite', () => {
  it('removes, substitutes and merges in one pass', () => {
    const css =
      ':root{--unused:1px;--gap:4px;--ink:black;--line:1px solid var(--ink)}.dark{--ink:var(--gap)}' +
      '.box{margin:var(--gap);border:var(--line)}:root:root{--ink:#111}';
    expect(rewrite(css, 0, run([css]), { substitute: true })).toBe(
      ':root{--line:1px solid var(--ink)}.dark{--ink:4px}.box{margin:4px;border:var(--line)}:root:root{--ink:#111}',
    );
  });

  it('removes a rule and an @media block that the removal empties', () => {
    const css = ':root{--gap:4px}@media (max-width:600px){:root{--unused:1px}}.box{margin:var(--gap)}';
    expect(rewrite(css, 0, run([css]), { substitute: true })).toBe('.box{margin:4px}');
  });

  it('keeps an empty @layer block, whose position orders the layers', () => {
    const css = '@layer base{:root{--unused:1px}}@layer base{p{color:red}}';
    expect(rewrite(css, 0, run([css]), { substitute: true })).toBe('@layer base{}@layer base{p{color:red}}');
  });

  it('removes only unreached properties without substitution', () => {
    const css = ':root{--unused:1px;--gap:4px}:root:root{--gap:8px}.box{margin:var(--gap)}';
    expect(rewrite(css, 0, run([css]), { substitute: false })).toBe(':root:root{--gap:8px}.box{margin:var(--gap)}');
  });

  it('keeps a property the JS names and substitutes the static ones it reads', () => {
    const css = ':root{--grey:#333;--card-border:1px solid var(--grey)}.card{border:var(--card-border)}';
    const analysis = run([css], ['el.style.setProperty("--card-border","none")']);
    expect(rewrite(css, 0, analysis, { substitute: true })).toBe(
      ':root{--card-border:1px solid #333}.card{border:var(--card-border)}',
    );
  });

  it('leaves var() in @font-face and @property descriptors unsubstituted', () => {
    const css =
      ':root{--face:Inter;--gap:4px}@font-face{font-family:var(--face);src:url(a.woff2)}' +
      '@property --size{syntax:"<length>";inherits:false;initial-value:var(--gap)}.box{margin:var(--gap)}';
    expect(rewrite(css, 0, run([css]), { substitute: true })).toBe(
      '@font-face{font-family:var(--face);src:url(a.woff2)}' +
        '@property --size{syntax:"<length>";inherits:false;initial-value:var(--gap)}.box{margin:4px}',
    );
  });

  it('rewrites each asset against the analysis of all of them', () => {
    const assets = [':root{--gap:4px}', '.box{margin:var(--gap)}'];
    const analysis = run(assets);
    expect(assets.map((css, i) => rewrite(css, i, analysis, { substitute: true }))).toEqual(['', '.box{margin:4px}']);
  });
});
