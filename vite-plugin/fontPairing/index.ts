// tsup entry: bundles the font-pairing engine into dist-plugin/fontPairing so
// `bin/set-type.mjs` imports compiled JS, never the TS sources — the
// bin/set-geometry.mjs precedent.

export {
  applyFontPairing,
  SLOT_ORDER,
  SLOT_VARIABLES,
  slugifyFamily,
  type ApplyFontPairingOptions,
  type DroppedSource,
  type FontPairing,
  type FontPairingReport,
  type FontPairingResult,
  type PairingChange,
  type PairingFace,
  type PairingSlot,
} from '../../src/editor/core/fonts/applyFontPairing';
export {
  discoveryUrl,
  persistUrlFor,
  resolveGoogleFont,
  type CssFetcher,
  type CssResponse,
  type ResolvedGoogleFont,
} from '../../src/editor/core/fonts/googleFontsUrl';
export {
  requiredWeights,
  weightCoverage,
  type CoveredFace,
  type FaceCoverage,
  type WeightRequirement,
} from '../../src/editor/core/fonts/weightCoverage';
export { fontPairingLabel } from '../../src/editor/core/fonts/fontPairing';
export { readLiveTokensConfig, resolveDataDirs } from '../files/dataPaths';
