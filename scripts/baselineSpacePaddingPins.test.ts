/**
 * Motion Proto's own five deliberate `--space-2` paddings (RJC 8,
 * docs/plans/theme-completeness.md Wave 5), pinned on the BASELINE
 * (`component-configs/<id>/default.json`), not on any preset: a preset shifts
 * them normally, and the baseline is what a component-default resync must not
 * move silently.
 *
 * `sync-component-defaults.mjs --check` only gates that the `.svelte` source
 * and this file agree with each other; it says nothing about whether
 * `--space-2` is the right value here, which is what this test pins.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const CONFIGS = path.join(process.cwd(), 'src/live-tokens/data/component-configs');
const aliasesOf = (comp: string) =>
  JSON.parse(fs.readFileSync(path.join(CONFIGS, comp, 'default.json'), 'utf-8')).aliases;

const PINS: [string, string][] = [
  ['sectiondivider', '--sectiondivider-lg-title-padding'],
  ['sectiondivider', '--sectiondivider-md-title-padding'],
  ['sectiondivider', '--sectiondivider-sm-title-padding'],
  ['segmentedcontrol', '--segmentedcontrol-bar-small-padding'],
  ['toggle', '--toggle-track-padding'],
];

describe('Motion Proto baseline padding pins', () => {
  it.each(PINS)('%s %s stays at --space-2', (comp, key) => {
    expect(aliasesOf(comp)[key]).toBe('--space-2');
  });
});
