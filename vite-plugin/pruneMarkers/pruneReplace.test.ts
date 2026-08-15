import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPruneReplace } from './pruneReplace';
import { _resetProductionConfigCache } from './loadProductionConfig';

/** A tree whose production theme carries `component` by value, with the
 *  component's own default.json deliberately empty so a read that falls back to
 *  it fails the assertion instead of passing by accident. */
function makeTempConfigsDir(
  component: string,
  aliases: Record<string, unknown>,
): { dir: string; opts: { componentConfigsDir: string; themesDir: string }; cleanup: () => void } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-test-'));
  const configsDir = path.join(tmp, 'component-configs');
  const themesDir = path.join(tmp, 'themes');
  fs.mkdirSync(path.join(configsDir, component), { recursive: true });
  fs.mkdirSync(themesDir, { recursive: true });
  fs.writeFileSync(
    path.join(configsDir, component, 'default.json'),
    JSON.stringify({ name: 'default', component, aliases: {} }),
  );
  fs.writeFileSync(path.join(themesDir, '_production.json'), JSON.stringify({ productionFile: 'mine' }));
  fs.writeFileSync(
    path.join(themesDir, 'mine.json'),
    JSON.stringify({
      name: 'Mine',
      schemaVersion: 3,
      colorsAndType: {},
      componentConfigs: { [component]: { name: 'mine', component, aliases } },
    }),
  );
  return {
    dir: configsDir,
    opts: { componentConfigsDir: configsDir, themesDir },
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
  };
}

function applyReplace(
  source: string,
  replacers: ReturnType<typeof buildPruneReplace>,
): string {
  let result = source;
  for (const [re, fn] of replacers) {
    result = result.replace(re, fn as (substring: string, ...args: unknown[]) => string);
  }
  return result;
}

describe('buildPruneReplace', () => {
  beforeEach(() => _resetProductionConfigCache());
  afterEach(() => _resetProductionConfigCache());

  it('emits markup raw when all variants pass', () => {
    // All three variants have eyebrow-display === 'block'; marker keeps when != none.
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'block',
      '--sectiondivider-md-eyebrow-display': 'block',
      '--sectiondivider-sm-eyebrow-display': 'block',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none--><span>e</span><!--END_PRUNE-->';
      expect(applyReplace(input, replacers)).toBe('<span>e</span>');
    } finally {
      cleanup();
    }
  });

  it('emits empty string when no variants pass', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'none',
      '--sectiondivider-md-eyebrow-display': 'none',
      '--sectiondivider-sm-eyebrow-display': 'none',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none--><span>e</span><!--END_PRUNE-->';
      expect(applyReplace(input, replacers)).toBe('');
    } finally {
      cleanup();
    }
  });

  it('emits {#if variant === ...} for mixed variants', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'block',
      '--sectiondivider-md-eyebrow-display': 'none',
      '--sectiondivider-sm-eyebrow-display': 'block',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none--><span>e</span><!--END_PRUNE-->';
      const out = applyReplace(input, replacers);
      expect(out).toContain('<span>e</span>');
      expect(out).toMatch(/\{#if /);
      expect(out).toContain("variant === 'lg'");
      expect(out).toContain("variant === 'sm'");
      expect(out).not.toContain("variant === 'md'");
      expect(out).toMatch(/\{\/if\}$/);
    } finally {
      cleanup();
    }
  });

  it('throws on unknown suffix (strict mode)', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider not-a-real-key == something--><x/><!--END_PRUNE-->';
      expect(() => applyReplace(input, replacers)).toThrow(/not-a-real-key/);
    } finally {
      cleanup();
    }
  });

  it('keeps block for variants missing the key (safe fallback)', () => {
    // Only lg sets eyebrow-display; md/sm fall back to "unknown" and are kept.
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'none',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none--><span>e</span><!--END_PRUNE-->';
      const out = applyReplace(input, replacers);
      // lg fails (== none), md/sm unknown → kept → guard on md, sm only.
      expect(out).toContain("variant === 'md'");
      expect(out).toContain("variant === 'sm'");
      expect(out).not.toContain("variant === 'lg'");
    } finally {
      cleanup();
    }
  });

  it('handles == operator', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-hairline': 'above-label',
      '--sectiondivider-md-hairline': 'below-label',
      '--sectiondivider-sm-hairline': 'above-label',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider hairline == above-label--><hr/><!--END_PRUNE-->';
      const out = applyReplace(input, replacers);
      expect(out).toContain("variant === 'lg'");
      expect(out).toContain("variant === 'sm'");
      expect(out).not.toContain("variant === 'md'");
    } finally {
      cleanup();
    }
  });

  it('handles in operator', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-hairline': 'above-label',
      '--sectiondivider-md-hairline': 'through-label',
      '--sectiondivider-sm-hairline': 'below-description',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider hairline in [above-label, through-label, below-label]--><hr/><!--END_PRUNE-->';
      const out = applyReplace(input, replacers);
      expect(out).toContain("variant === 'lg'");
      expect(out).toContain("variant === 'md'");
      expect(out).not.toContain("variant === 'sm'");
    } finally {
      cleanup();
    }
  });

  it('handles multiple markers in one file', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'block',
      '--sectiondivider-md-eyebrow-display': 'none',
      '--sectiondivider-sm-eyebrow-display': 'none',
      '--sectiondivider-lg-description-display': 'none',
      '--sectiondivider-md-description-display': 'flex',
      '--sectiondivider-sm-description-display': 'flex',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none--><span>e</span><!--END_PRUNE-->' +
        '<!--PRUNE_FOR sectiondivider description-display != none--><p>d</p><!--END_PRUNE-->';
      const out = applyReplace(input, replacers);
      // Two separate guards expected.
      expect((out.match(/\{#if /g) ?? []).length).toBe(2);
      expect(out).toContain('<span>e</span>');
      expect(out).toContain('<p>d</p>');
    } finally {
      cleanup();
    }
  });

  it('throws on missing production config dir', () => {
    const replacers = buildPruneReplace({ componentConfigsDir: '/nonexistent/path' });
    const input = '<!--PRUNE_FOR sectiondivider foo == bar--><x/><!--END_PRUNE-->';
    expect(() => applyReplace(input, replacers)).toThrow(/not found/);
  });

  it('uses default=<v> for variants missing the key', () => {
    // Only lg sets eyebrow-display=block; md/sm should fall back to default=none,
    // which means the != none check fails for them — they get stripped.
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'block',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none default=none--><span>e</span><!--END_PRUNE-->';
      const out = applyReplace(input, replacers);
      // lg is the only variant keeping the block; emit as a single-variant guard.
      expect(out).toContain("variant === 'lg'");
      expect(out).not.toContain("variant === 'md'");
      expect(out).not.toContain("variant === 'sm'");
      expect(out).toContain('<span>e</span>');
    } finally {
      cleanup();
    }
  });

  it('strips entirely when default matches and no variant overrides differently', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-hairline': 'below-description',
    });
    try {
      const replacers = buildPruneReplace(opts);
      // None of the variants hit "above-label" (lg=below-description, md/sm=default=none).
      const input =
        '<!--PRUNE_FOR sectiondivider hairline == above-label default=none--><hr/><!--END_PRUNE-->';
      expect(applyReplace(input, replacers)).toBe('');
    } finally {
      cleanup();
    }
  });

  it('resolves nested markers bottom-up', () => {
    // Outer keeps lg only (description-display != none, only lg=flex).
    // Inner is "hairline == through-description" — only md matches.
    // After resolution, the outer keeps {lg} but the inner inside it
    // produces a guard for {md}. Because md is not in the outer-keep set,
    // the inner block effectively contributes nothing to the lg path.
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-description-display': 'flex',
      '--sectiondivider-md-description-display': 'none',
      '--sectiondivider-sm-description-display': 'none',
      '--sectiondivider-lg-hairline': 'below-label',
      '--sectiondivider-md-hairline': 'through-description',
      '--sectiondivider-sm-hairline': 'below-label',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input = [
        '<!--PRUNE_FOR sectiondivider description-display != none-->',
        '  <div class="desc">',
        '    <!--PRUNE_FOR sectiondivider hairline == through-description-->',
        '    <hr/>',
        '    <!--END_PRUNE-->',
        '  </div>',
        '<!--END_PRUNE-->',
      ].join('\n');
      const out = applyReplace(input, replacers);
      // Outer becomes lg-only guard; inner becomes md-only guard.
      expect(out).toContain("variant === 'lg'");
      expect(out).toContain("variant === 'md'");
      expect(out).toContain('<hr/>');
      expect(out).toContain('<div class="desc">');
      expect(out).not.toContain('PRUNE_FOR');
      expect(out).not.toContain('END_PRUNE');
    } finally {
      cleanup();
    }
  });

  it('throws on unmatched END_PRUNE', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
    });
    try {
      const replacers = buildPruneReplace(opts);
      // PRUNE_FOR at the start so the trigger regex fires; inner END_PRUNE
      // is unmatched relative to its own scope.
      const input = '<!--PRUNE_FOR sectiondivider foo == x--><x/><!--END_PRUNE--><!--END_PRUNE-->';
      expect(() => applyReplace(input, replacers)).toThrow(/Unmatched/);
    } finally {
      cleanup();
    }
  });

  it('throws on unmatched PRUNE_FOR', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
    });
    try {
      const replacers = buildPruneReplace(opts);
      // Outer PRUNE_FOR never closed (only an inner END_PRUNE)
      const input =
        '<!--PRUNE_FOR sectiondivider foo == x--><a/>' +
        '<!--PRUNE_FOR sectiondivider foo == x--><b/><!--END_PRUNE-->';
      expect(() => applyReplace(input, replacers)).toThrow(/Unmatched/);
    } finally {
      cleanup();
    }
  });

  it('matches multi-line markup', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {
      '--sectiondivider-lg-foo': 'x',
      '--sectiondivider-md-foo': 'x',
      '--sectiondivider-sm-foo': 'x',
      '--sectiondivider-lg-eyebrow-display': 'block',
      '--sectiondivider-md-eyebrow-display': 'block',
      '--sectiondivider-sm-eyebrow-display': 'block',
    });
    try {
      const replacers = buildPruneReplace(opts);
      const input = [
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none-->',
        '<div>',
        '  <span>line1</span>',
        '  <span>line2</span>',
        '</div>',
        '<!--END_PRUNE-->',
      ].join('\n');
      const out = applyReplace(input, replacers);
      expect(out).toContain('<span>line1</span>');
      expect(out).toContain('<span>line2</span>');
      expect(out).not.toContain('PRUNE_FOR');
    } finally {
      cleanup();
    }
  });

  it('reads the component default when the production theme does not carry it', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {});
    try {
      fs.writeFileSync(
        path.join(opts.themesDir, 'mine.json'),
        JSON.stringify({ name: 'Mine', schemaVersion: 3, colorsAndType: {}, componentConfigs: {} }),
      );
      fs.writeFileSync(
        path.join(opts.componentConfigsDir, 'sectiondivider', 'default.json'),
        JSON.stringify({
          name: 'default',
          component: 'sectiondivider',
          aliases: { '--sectiondivider-lg-eyebrow-display': 'none' },
        }),
      );
      const replacers = buildPruneReplace(opts);
      const input =
        '<!--PRUNE_FOR sectiondivider eyebrow-display != none--><span>e</span><!--END_PRUNE-->';
      expect(applyReplace(input, replacers)).toBe('');
    } finally {
      cleanup();
    }
  });

  it('refuses a production theme that names the component by reference', () => {
    const { opts, cleanup } = makeTempConfigsDir('sectiondivider', {});
    try {
      fs.writeFileSync(
        path.join(opts.themesDir, 'mine.json'),
        JSON.stringify({ name: 'Mine', componentConfigs: { sectiondivider: 'some-config' } }),
      );
      const replacers = buildPruneReplace(opts);
      const input = '<!--PRUNE_FOR sectiondivider foo == x--><x/><!--END_PRUNE-->';
      expect(() => applyReplace(input, replacers)).toThrow(/by reference/);
    } finally {
      cleanup();
    }
  });
});
