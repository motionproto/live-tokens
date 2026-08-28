import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DEFAULT_SKETCH_STYLE, SHIPPED_SKETCH_SETTINGS } from './sketchStyles';

const SHIPPED = ['pencil', 'marker', 'whiteboard', 'hatched', 'dashed', 'napkin', 'dry'];
const DIR = 'src/live-tokens/data/sketch-styles';

describe('shipped sketchstyles', () => {
  it('are the seven the package distributes, in picker order', () => {
    expect(Object.keys(SHIPPED_SKETCH_SETTINGS)).toEqual(SHIPPED);
  });

  it('each carry every dial, so nothing has to merge a default in', () => {
    const dials = Object.keys(SHIPPED_SKETCH_SETTINGS[DEFAULT_SKETCH_STYLE]).sort();
    for (const id of SHIPPED) {
      expect(Object.keys(SHIPPED_SKETCH_SETTINGS[id]).sort(), id).toEqual(dials);
    }
  });

  it('read the file the package ships, not a copy of it', () => {
    for (const id of SHIPPED) {
      const file = JSON.parse(fs.readFileSync(path.join(DIR, `${id}.json`), 'utf-8'));
      expect(SHIPPED_SKETCH_SETTINGS[id], id).toEqual(file.settings);
      expect(file.name, id).toBe(SHIPPED_SKETCH_SETTINGS[id].label);
    }
  });

  it('carry the label and blurb the README prints for them', () => {
    const readme = fs.readFileSync('README.md', 'utf-8');
    for (const id of SHIPPED) {
      const { label, blurb } = SHIPPED_SKETCH_SETTINGS[id];
      expect(readme, id).toContain(`- **${label}.** ${blurb}`);
    }
  });

  it('are all listed in the package files, so they reach the tarball', () => {
    const files: string[] = JSON.parse(fs.readFileSync('package.json', 'utf-8')).files;
    for (const id of SHIPPED) {
      expect(files, id).toContain(`${DIR}/${id}.json`);
    }
  });
});
