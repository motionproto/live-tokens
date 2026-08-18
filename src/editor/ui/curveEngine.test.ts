import { describe, expect, it } from 'vitest';
import {
  curveTemplates,
  lightnessCurveConfig,
  saturationCurveConfig,
  hueCurveConfig,
  svgToY,
  CURVE_H,
} from './curveEngine';

function template(name: string) {
  const t = curveTemplates.find((t) => t.name === name);
  if (!t) throw new Error(`template ${name} not found`);
  return t;
}

// Expectations transcribed from the pre-Wave-2 templates (git show 310871c),
// which computed off `cfg.yMax` alone. Both configs have yMin = 0, so the
// normalized `range = yMax - yMin` form must reproduce them exactly.
describe('curveTemplates preserve pre-existing behavior for yMin = 0 configs', () => {
  it('Flat', () => {
    expect(template('Flat').anchors(lightnessCurveConfig)).toEqual([
      { x: 0, y: 50, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
      { x: 100, y: 50, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
    ]);
    expect(template('Flat').anchors(saturationCurveConfig)).toEqual([
      { x: 0, y: 100, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
      { x: 100, y: 100, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
    ]);
  });

  it('Peak', () => {
    expect(template('Peak').anchors(lightnessCurveConfig)).toEqual([
      { x: 0, y: 0, inDx: 0, inDy: 0, outDx: 15, outDy: 0 },
      { x: 50, y: 50, inDx: -15, inDy: 0, outDx: 15, outDy: 0 },
      { x: 100, y: 0, inDx: -15, inDy: 0, outDx: 0, outDy: 0 },
    ]);
    expect(template('Peak').anchors(saturationCurveConfig)).toEqual([
      { x: 0, y: 0, inDx: 0, inDy: 0, outDx: 15, outDy: 0 },
      { x: 50, y: 100, inDx: -15, inDy: 0, outDx: 15, outDy: 0 },
      { x: 100, y: 0, inDx: -15, inDy: 0, outDx: 0, outDy: 0 },
    ]);
  });

  it('Ramp up', () => {
    expect(template('Ramp up').anchors(lightnessCurveConfig)).toEqual([
      { x: 0, y: 10, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
      { x: 100, y: 90, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
    ]);
    expect(template('Ramp up').anchors(saturationCurveConfig)).toEqual([
      { x: 0, y: 20, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
      { x: 100, y: 180, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
    ]);
  });

  it('Ramp down', () => {
    expect(template('Ramp down').anchors(lightnessCurveConfig)).toEqual([
      { x: 0, y: 90, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
      { x: 100, y: 10, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
    ]);
    expect(template('Ramp down').anchors(saturationCurveConfig)).toEqual([
      { x: 0, y: 180, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
      { x: 100, y: 20, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
    ]);
  });
});

describe('curveTemplates against hueCurveConfig (signed axis)', () => {
  it('Flat gives 0 to 0', () => {
    const anchors = template('Flat').anchors(hueCurveConfig);
    expect(anchors[0].y).toBe(0);
    expect(anchors[1].y).toBe(0);
  });

  it('Ramp up gives -24 to +24', () => {
    const anchors = template('Ramp up').anchors(hueCurveConfig);
    expect(anchors[0].y).toBe(-24);
    expect(anchors[1].y).toBe(24);
  });

  it('Ramp down gives +24 to -24', () => {
    const anchors = template('Ramp down').anchors(hueCurveConfig);
    expect(anchors[0].y).toBe(24);
    expect(anchors[1].y).toBe(-24);
  });

  it('Peak gives -30 to 0 to -30', () => {
    const anchors = template('Peak').anchors(hueCurveConfig);
    expect(anchors[0].y).toBe(-30);
    expect(anchors[1].y).toBe(0);
    expect(anchors[2].y).toBe(-30);
  });

  it('every produced y sits within the axis bounds', () => {
    for (const t of curveTemplates) {
      for (const a of t.anchors(hueCurveConfig)) {
        expect(a.y).toBeGreaterThanOrEqual(hueCurveConfig.yMin);
        expect(a.y).toBeLessThanOrEqual(hueCurveConfig.yMax);
      }
    }
  });
});

describe('svgToY clamps to a signed axis', () => {
  it('clamps a pixel above the chart to yMax', () => {
    expect(svgToY(-1000, hueCurveConfig)).toBe(30);
  });

  it('clamps a pixel below the chart to yMin', () => {
    expect(svgToY(CURVE_H + 1000, hueCurveConfig)).toBe(-30);
  });
});
