import { describe, expect, it } from 'vitest';
import { adjustAliases, type AdjustReport, type ComponentReport } from './adjustAliases';
import type { AliasDiskValue, ComponentConfig } from '../themes/themeTypes';

const CREATED = '2026-01-01T00:00:00.000Z';
const NOW = '2026-08-12T00:00:00.000Z';

function config(component: string, aliases: Record<string, AliasDiskValue>): ComponentConfig {
  return { name: 'default', component, createdAt: CREATED, updatedAt: CREATED, aliases };
}

function fixture(): Record<string, ComponentConfig> {
  return {
    button: config('button', {
      '--button-primary-radius': '--radius-xl',
      '--button-primary-padding': '--space-8',
      '--button-primary-border-width': '--border-width-1',
      '--button-primary-text': '--text-primary',
      '--button-primary-text-font-size': '--font-size-lg',
      '--button-pill-radius': '--radius-full',
      '--button-tray-padding': '--space-8',
    }),
    card: config('card', {
      '--card-default-radius': '--radius-4xl',
      '--card-default-header-padding': '--space-12',
      '--card-default-header-padding-top': '--space-16',
      '--card-default-gap': '--space-0',
      '--card-tight-padding': '--space-2',
      '--card-tight-gap': '--space-2',
      '--card-tight-margin': '--space-2',
      '--card-hero-padding': '--space-40',
      '--card-hero-radius': 'clamp(4px, 1vw, 12px)',
      '--card-media-padding': '--space-full',
    }),
    table: config('table', {
      '--table-default-border-width': '--border-width-1',
      '--table-default-header-divider-width': '--border-width-1',
      '--table-default-row-divider-width': '--border-width-1',
      '--table-default-hairline-thickness': '--border-width-1',
      '--table-default-accent-width': '--border-width-3',
      '--table-default-tab-border-width': '--border-width-0',
    }),
  };
}

function reportFor(report: AdjustReport, component: string): ComponentReport {
  const entry = report.components.find((c) => c.component === component);
  if (!entry) throw new Error(`no report entry for ${component}`);
  return entry;
}

function skipReason(report: AdjustReport, component: string, variable: string): string | undefined {
  return reportFor(report, component).skips.find((s) => s.variable === variable)?.reason;
}

describe('adjustAliases', () => {
  it('shifts matching aliases up their scale and leaves other kinds alone', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'radius', shift: 2 }], NOW);

    expect(configs.button.aliases['--button-primary-radius']).toBe('--radius-3xl');
    expect(configs.button.aliases['--button-primary-padding']).toBe('--space-8');
    expect(configs.button.aliases['--button-primary-border-width']).toBe('--border-width-1');
    expect(reportFor(report, 'button').changes).toContainEqual({
      variable: '--button-primary-radius',
      from: '--radius-xl',
      to: '--radius-3xl',
    });
  });

  it('shifts matching aliases down their scale', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'radius', shift: -1 }], NOW);

    expect(configs.button.aliases['--button-primary-radius']).toBe('--radius-lg');
    expect(configs.card.aliases['--card-default-radius']).toBe('--radius-3xl');
  });

  it('clamps at the top step and reports the alias as clamped', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'radius', shift: 1 }], NOW);

    expect(configs.card.aliases['--card-default-radius']).toBe('--radius-4xl');
    expect(skipReason(report, 'card', '--card-default-radius')).toBe('clamped');
  });

  it('clamps at the bottom step and reports the alias as clamped', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'gap', shift: -1 }], NOW);

    expect(configs.card.aliases['--card-default-gap']).toBe('--space-0');
    expect(skipReason(report, 'card', '--card-default-gap')).toBe('clamped');
  });

  it('preserves pill radii when the op does not opt into the full step', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'radius', shift: 1 }], NOW);

    expect(configs.button.aliases['--button-pill-radius']).toBe('--radius-full');
    expect(skipReason(report, 'button', '--button-pill-radius')).toBe('pill-preserved');
  });

  it('shifts into the full step when full is set', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'radius', shift: 1, full: true }], NOW);

    expect(configs.card.aliases['--card-default-radius']).toBe('--radius-full');
    expect(configs.button.aliases['--button-pill-radius']).toBe('--radius-full');
  });

  it('shifts out of the full step when full is set', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'radius', shift: -1, full: true }], NOW);

    expect(configs.button.aliases['--button-pill-radius']).toBe('--radius-4xl');
  });

  it('spends the shift reaching the first step past an off-subset space value', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'padding', shift: -1 }], NOW);

    expect(configs.card.aliases['--card-hero-padding']).toBe('--space-32');
  });

  it('lifts a below-floor padding one visible step, not two', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'padding', shift: 1 }], NOW);

    expect(configs.card.aliases['--card-tight-padding']).toBe('--space-4');
  });

  it('never shifts a padding below --space-4', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'padding', shift: -4 }], NOW);

    expect(configs.card.aliases['--card-default-header-padding']).toBe('--space-4');
    expect(configs.card.aliases['--card-tight-padding']).toBe('--space-2');
    expect(skipReason(report, 'card', '--card-tight-padding')).toBe('clamped');
  });

  it('never shifts a padding that holds text below --space-6', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'padding', shift: -4 }], NOW);

    expect(configs.button.aliases['--button-primary-padding']).toBe('--space-6');
    expect(configs.button.aliases['--button-tray-padding']).toBe('--space-4');
    expect(skipReason(report, 'button', '--button-primary-padding')).toBeUndefined();
  });

  it('reports a text padding already at its floor as clamped', () => {
    const tightened = adjustAliases(fixture(), [{ kind: 'padding', shift: -1 }], NOW).configs;
    const { configs, report } = adjustAliases(tightened, [{ kind: 'padding', shift: -1 }], NOW);

    expect(configs.button.aliases['--button-primary-padding']).toBe('--space-6');
    expect(skipReason(report, 'button', '--button-primary-padding')).toBe('clamped');
  });

  it('lifts a text padding sitting under its floor one visible step', () => {
    const squeezed = adjustAliases(
      fixture(),
      [{ target: 'button', kind: 'padding', set: '--space-2' }],
      NOW,
    ).configs;
    const { configs } = adjustAliases(squeezed, [{ kind: 'padding', shift: 1 }], NOW);

    expect(configs.button.aliases['--button-primary-padding']).toBe('--space-6');
  });

  it('leaves gaps free to go tighter than the inset floor', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'gap', shift: -1 }], NOW);

    expect(configs.card.aliases['--card-tight-gap']).toBe('--space-0');
  });

  it('leaves margins free to go tighter, though they shift with padding', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'padding', shift: -1 }], NOW);

    expect(configs.card.aliases['--card-tight-margin']).toBe('--space-0');
    expect(configs.card.aliases['--card-tight-padding']).toBe('--space-2');
  });

  it('still sets a below-floor padding by name', () => {
    const { configs } = adjustAliases(
      fixture(),
      [{ target: 'card', kind: 'padding', set: '--space-2' }],
      NOW,
    );

    expect(configs.card.aliases['--card-default-header-padding']).toBe('--space-2');
  });

  it('keeps --space-full off the scale', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'padding', shift: 1 }], NOW);

    expect(configs.card.aliases['--card-media-padding']).toBe('--space-full');
    expect(skipReason(report, 'card', '--card-media-padding')).toBe('off-scale');
  });

  it('skips aliases holding raw CSS', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'radius', shift: 1 }], NOW);

    expect(configs.card.aliases['--card-hero-radius']).toBe('clamp(4px, 1vw, 12px)');
    expect(skipReason(report, 'card', '--card-hero-radius')).toBe('raw-value');
  });

  it('shifts per-side paddings with their parent', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'padding', shift: 1 }], NOW);

    expect(configs.card.aliases['--card-default-header-padding']).toBe('--space-16');
    expect(configs.card.aliases['--card-default-header-padding-top']).toBe('--space-20');
  });

  it('moves each stroke role on its own kind', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'border-width', shift: 1 }], NOW);
    expect(configs.table.aliases['--table-default-border-width']).toBe('--border-width-2');
    expect(configs.table.aliases['--table-default-header-divider-width']).toBe('--border-width-1');
    expect(configs.table.aliases['--table-default-accent-width']).toBe('--border-width-3');

    const dividers = adjustAliases(fixture(), [{ kind: 'divider-width', shift: 1 }], NOW).configs;
    expect(dividers.table.aliases['--table-default-border-width']).toBe('--border-width-1');
    expect(dividers.table.aliases['--table-default-header-divider-width']).toBe('--border-width-2');
    expect(dividers.table.aliases['--table-default-row-divider-width']).toBe('--border-width-2');
    expect(dividers.table.aliases['--table-default-hairline-thickness']).toBe('--border-width-2');
    expect(dividers.table.aliases['--table-default-accent-width']).toBe('--border-width-3');

    const accents = adjustAliases(fixture(), [{ kind: 'accent-width', shift: -1 }], NOW).configs;
    expect(accents.table.aliases['--table-default-accent-width']).toBe('--border-width-2');
    expect(accents.table.aliases['--table-default-border-width']).toBe('--border-width-1');
  });

  it('never draws a line a shift did not ask for', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'border-width', shift: 2 }], NOW);
    expect(configs.table.aliases['--table-default-tab-border-width']).toBe('--border-width-0');
    expect(skipReason(report, 'table', '--table-default-tab-border-width')).toBe('none-preserved');
  });

  it('never shifts a stroke down to nothing', () => {
    const { configs, report } = adjustAliases(fixture(), [{ kind: 'border-width', shift: -1 }], NOW);
    expect(configs.table.aliases['--table-default-border-width']).toBe('--border-width-1');
    expect(skipReason(report, 'table', '--table-default-border-width')).toBe('clamped');
  });

  it('still sets a stroke to nothing by name', () => {
    const { configs } = adjustAliases(
      fixture(),
      [{ target: 'table', kind: 'border-width', set: '--border-width-0' }],
      NOW,
    );
    expect(configs.table.aliases['--table-default-border-width']).toBe('--border-width-0');
    expect(configs.table.aliases['--table-default-header-divider-width']).toBe('--border-width-1');
  });

  it('applies a targeted op to that component alone', () => {
    const input = fixture();
    const { configs } = adjustAliases(
      input,
      [{ target: 'button', kind: 'radius', set: '--radius-none' }],
      NOW,
    );

    expect(configs.button.aliases['--button-primary-radius']).toBe('--radius-none');
    expect(configs.card).toBe(input.card);
  });

  it('sets a pill radius without the full flag', () => {
    const { configs } = adjustAliases(fixture(), [{ kind: 'radius', set: '--radius-none' }], NOW);

    expect(configs.button.aliases['--button-pill-radius']).toBe('--radius-none');
  });

  it('leaves the input configs untouched', () => {
    const input = fixture();
    const { configs } = adjustAliases(input, [{ kind: 'radius', shift: 1 }], NOW);

    expect(input.button.aliases['--button-primary-radius']).toBe('--radius-xl');
    expect(input.button.updatedAt).toBe(CREATED);
    expect(configs.button).not.toBe(input.button);
  });

  it('stamps updatedAt on changed configs and keeps createdAt', () => {
    const { configs } = adjustAliases(
      fixture(),
      [{ target: 'button', kind: 'radius', shift: 1 }],
      NOW,
    );

    expect(configs.button.updatedAt).toBe(NOW);
    expect(configs.button.createdAt).toBe(CREATED);
    expect(configs.card.updatedAt).toBe(CREATED);
  });
});

describe('adjustAliases op validation', () => {
  it('rejects a set value that is not on the kind scale', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'radius', set: '--radius-huge' }], NOW))
      .toThrow(/not on the radius scale/);
  });

  it('rejects a set value from another token family', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'padding', set: '--radius-full' }], NOW))
      .toThrow(/not on the padding scale/);
  });

  it('rejects --space-full as a set value', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'gap', set: '--space-full' }], NOW))
      .toThrow(/not on the gap scale/);
  });

  it('rejects an off-subset space token as a set value', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'padding', set: '--space-64' }], NOW))
      .toThrow(/not on the padding scale/);
  });

  it('accepts --radius-full as a set value without the full flag', () => {
    const { configs } = adjustAliases(
      fixture(),
      [{ target: 'button', kind: 'radius', set: '--radius-full' }],
      NOW,
    );
    expect(configs.button.aliases['--button-primary-radius']).toBe('--radius-full');
  });

  it('rejects an op carrying both set and shift', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'radius', set: '--radius-md', shift: 1 }], NOW))
      .toThrow(/exactly one/);
  });

  it('rejects an op carrying neither set nor shift', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'radius' }], NOW)).toThrow(/exactly one/);
  });

  it('rejects full outside radius shifts', () => {
    expect(() => adjustAliases(fixture(), [{ kind: 'padding', shift: 1, full: true }], NOW))
      .toThrow(/"full" applies to radius shifts only/);
  });

  it('rejects an unknown target component', () => {
    expect(() => adjustAliases(fixture(), [{ target: 'buttons', kind: 'radius', shift: 1 }], NOW))
      .toThrow(/Unknown target component "buttons"/);
  });
});
