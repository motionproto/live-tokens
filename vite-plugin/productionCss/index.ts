import { analyze } from './analyze';
import { rewrite, staticValues } from './rewrite';

export interface ProductionCssOptions {
  /** default: true. With false the build removes unreached properties only and keeps every `var()`. */
  substitute?: boolean;
  /** Names a script sets or reads under a name it assembles at runtime. */
  keep?: string[];
}

/** The fields of a Rollup or Rolldown output file that the transform reads and writes. */
export type BundleFile =
  | { type: 'asset'; fileName: string; source: string | Uint8Array }
  | { type: 'chunk'; fileName: string; code: string };

export interface ProductionCssReport {
  propertiesBefore: number;
  propertiesAfter: number;
  bytesSaved: number;
}

type AssetFile = Extract<BundleFile, { type: 'asset' }>;

const text = (source: string | Uint8Array) =>
  typeof source === 'string' ? source : new TextDecoder().decode(source);

/** Rewrites every CSS asset in the bundle in place. Returns null when the bundle holds no CSS. */
export function rewriteBundle(
  bundle: Record<string, BundleFile>,
  { substitute = true, keep = [] }: ProductionCssOptions,
): ProductionCssReport | null {
  const files = Object.values(bundle);
  const assets = files.filter((f): f is AssetFile => f.type === 'asset');
  const sheets = assets.filter((f) => f.fileName.endsWith('.css'));
  if (sheets.length === 0) return null;

  const css = sheets.map((f) => text(f.source));
  const js = [
    ...files.flatMap((f) => (f.type === 'chunk' ? [f.code] : [])),
    ...assets.filter((f) => /\.[cm]?js$/.test(f.fileName)).map((f) => text(f.source)),
  ];
  const html = assets.filter((f) => f.fileName.endsWith('.html')).map((f) => text(f.source));
  const analysis = analyze({ css, js, html, keep });
  const values = substitute ? staticValues(analysis) : null;

  let bytesSaved = 0;
  sheets.forEach((sheet, i) => {
    const rewritten = rewrite(css[i], i, analysis, { substitute }, values);
    bytesSaved += Buffer.byteLength(css[i]) - Buffer.byteLength(rewritten);
    sheet.source = rewritten;
  });
  let propertiesAfter = 0;
  for (const property of analysis.values()) {
    if (property.reached && (property.dynamic || !substitute)) propertiesAfter += 1;
  }
  return { propertiesBefore: analysis.size, propertiesAfter, bytesSaved };
}

export function formatReport({ propertiesBefore, propertiesAfter, bytesSaved }: ProductionCssReport): string {
  const kB = (Math.abs(bytesSaved) / 1000).toFixed(1);
  return (
    `live-tokens: the production CSS declares ${propertiesAfter.toLocaleString('en-US')} of ` +
    `${propertiesBefore.toLocaleString('en-US')} custom properties and is ${kB} kB ` +
    `${bytesSaved >= 0 ? 'smaller' : 'larger'}.`
  );
}
