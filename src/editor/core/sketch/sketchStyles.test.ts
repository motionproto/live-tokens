import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DEFAULT_SKETCH_STYLE, SKETCH_STYLES } from './sketchStyles';

const SHIPPED = ['pencil', 'marker', 'whiteboard', 'hatched', 'dashed', 'napkin', 'dry'];
const DIR = 'src/live-tokens/data/sketch-styles';

describe('shipped sketchstyles', () => {
  it('are the seven the package distributes, in picker order', () => {
    expect(Object.keys(SKETCH_STYLES)).toEqual(SHIPPED);
  });

  it('each carry every dial, so nothing has to merge a default in', () => {
    const dials = Object.keys(SKETCH_STYLES[DEFAULT_SKETCH_STYLE]).sort();
    for (const id of SHIPPED) {
      expect(Object.keys(SKETCH_STYLES[id]).sort(), id).toEqual(dials);
    }
  });

  it('read the file the package ships, not a copy of it', () => {
    for (const id of SHIPPED) {
      const file = JSON.parse(fs.readFileSync(path.join(DIR, `${id}.json`), 'utf-8'));
      expect(SKETCH_STYLES[id], id).toEqual(file.settings);
      expect(file.name, id).toBe(SKETCH_STYLES[id].label);
    }
  });

  it('are all listed in the package files, so they reach the tarball', () => {
    const files: string[] = JSON.parse(fs.readFileSync('package.json', 'utf-8')).files;
    for (const id of SHIPPED) {
      expect(files, id).toContain(`${DIR}/${id}.json`);
    }
  });
});
