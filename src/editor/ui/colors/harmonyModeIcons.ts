import type { HarmonyMode } from '../../core/palettes/colorHarmony';

import monochromaticSvg from './harmony-icons/monochromatic.svg?raw';
import analogousSvg from './harmony-icons/analogous.svg?raw';
import complementarySvg from './harmony-icons/complementary.svg?raw';
import splitComplementarySvg from './harmony-icons/split-complementary.svg?raw';
import triadicSvg from './harmony-icons/triadic.svg?raw';
import tetradicSvg from './harmony-icons/tetradic.svg?raw';
import squareSvg from './harmony-icons/square.svg?raw';
import compoundSvg from './harmony-icons/compound.svg?raw';
import customSvg from './harmony-icons/custom.svg?raw';

export const HARMONY_MODE_BUTTONS: { mode: HarmonyMode; label: string; svg: string }[] = [
  { mode: 'monochromatic', label: 'Monochromatic', svg: monochromaticSvg },
  { mode: 'analogous', label: 'Analogous', svg: analogousSvg },
  { mode: 'complementary', label: 'Complementary', svg: complementarySvg },
  { mode: 'split-complementary', label: 'Split complementary', svg: splitComplementarySvg },
  { mode: 'triadic', label: 'Triadic', svg: triadicSvg },
  { mode: 'tetradic', label: 'Tetradic', svg: tetradicSvg },
  { mode: 'square', label: 'Square', svg: squareSvg },
  { mode: 'compound', label: 'Compound', svg: compoundSvg },
  { mode: 'custom', label: 'Custom', svg: customSvg },
];
