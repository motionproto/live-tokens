import { describe, expect, it } from 'vitest';
import { gradientStops } from './resolveColor';

describe('gradientStops', () => {
  it('keeps a color-mix() stop whole', () => {
    expect(gradientStops('linear-gradient(90deg, color-mix(in oklch, red 40%, blue) 0%, white 100%)'))
      .toEqual(['color-mix(in oklch, red 40%, blue)', 'white']);
  });

  it('drops stop positions and color hints', () => {
    expect(gradientStops('linear-gradient(oklch(0.5 0.1 200) 0%, #123456 40% 60%, 70%, rgb(0 0 0 / 0.5) calc(100% - 4px))'))
      .toEqual(['oklch(0.5 0.1 200)', '#123456', 'rgb(0 0 0 / 0.5)']);
  });

  it('drops a direction argument', () => {
    expect(gradientStops('linear-gradient(to bottom right, #ffffff, #000000)')).toEqual(['#ffffff', '#000000']);
    expect(gradientStops('linear-gradient(in oklch 45deg, red, blue)')).toEqual(['red', 'blue']);
  });

  it('drops a radial shape and position', () => {
    expect(gradientStops('radial-gradient(ellipse 120.00px 80.00px at 30% 50%, oklch(0.6 0.1 200) 0%, transparent 100%)'))
      .toEqual(['oklch(0.6 0.1 200)', 'transparent']);
  });

  it('returns null for a plain color', () => {
    expect(gradientStops('oklch(0.5 0.1 200)')).toBeNull();
  });
});
