/*
 * Phase 0 benchmark — state clone + stringify cost.
 *
 * Builds an EditorState roughly the shape the refactor will use: loaded
 * Theme (palettes + cssVars + fonts) plus the shadow/overlay/column
 * domain state that currently lives in VariablesTab.svelte local `let`s.
 *
 * Measures:
 *   - structuredClone(state)    — one per mutate() call / transaction begin
 *   - JSON.stringify(state)     — one per debounced persist() write
 *   - JSON.parse(JSON.stringify) — deep-clone alternative baseline
 *
 * Budgets we care about:
 *   - clone p99 < 2 ms   → safe for any mutate() frequency
 *   - stringify p99 < 5 ms → safe with a 300 ms debounced persist
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

function loadTheme(name) {
  return JSON.parse(fs.readFileSync(path.join(REPO, 'themes', `${name}.json`), 'utf-8'));
}

// Simulate the additional domain state that doesn't exist in Theme today
// but will live in EditorState after the refactor.
function synthesiseExtras() {
  const shadowVariables = [
    '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl',
    '--shadow-app', '--shadow-focus', '--shadow-glow-green', '--shadow-card', '--shadow-overlay',
  ];
  return {
    shadows: {
      globals: {
        globalAngle: 90, globalOpacityMin: 0.15, globalOpacityMax: 0.15, opacityLocked: true,
        globalDistanceMin: 1, globalDistanceMax: 25,
        globalBlurMin: 2, globalBlurMax: 50, blurLocked: false,
        globalSizeMin: 0, globalSizeMax: 0, sizeLocked: true,
        globalHue: 0, globalSaturation: 0, globalLightness: 0,
      },
      tokens: shadowVariables.map((v) => ({
        variable: v, value: '0 0 0', x: 0, y: 0, blur: 0, spread: 0,
        opacity: 0.1, hue: 0, saturation: 0, lightness: 0, angle: 0, distance: 0,
      })),
      overrides: Object.fromEntries(
        shadowVariables.map((v) => [v, { angle: false, opacity: false, color: false, distance: false, blur: false, size: false }]),
      ),
    },
    overlays: {
      overlayTokens: [
        { variable: '--overlay-low', label: 'Low', r: 0, g: 0, b: 0, opacity: 0.05 },
        { variable: '--overlay', label: 'Base', r: 0, g: 0, b: 0, opacity: 0.5 },
        { variable: '--overlay-high', label: 'High', r: 0, g: 0, b: 0, opacity: 0.95 },
      ],
      hoverTokens: [
        { variable: '--hover-low', label: 'Low', r: 255, g: 255, b: 255, opacity: 0.05 },
        { variable: '--hover', label: 'Base', r: 255, g: 255, b: 255, opacity: 0.1 },
        { variable: '--hover-high', label: 'High', r: 255, g: 255, b: 255, opacity: 0.15 },
      ],
      globals: { overlayHue: 0, overlaySaturation: 0, overlayLightness: 0, overlayOpacityMin: 0.05, overlayOpacityMax: 0.95, hoverHue: 0, hoverSaturation: 0, hoverLightness: 100, hoverOpacityMin: 0.05, hoverOpacityMax: 0.15 },
    },
    columns: { count: 12, maxWidth: 1440, gutter: 16, margin: 0 },
  };
}

function buildEditorState(themeName) {
  const f = loadTheme(themeName);
  return {
    palettes: f.editorConfigs ?? {},
    fonts: { sources: f.fontSources ?? [], stacks: f.fontStacks ?? [] },
    cssVars: f.cssVariables ?? {},
    ...synthesiseExtras(),
  };
}

function stats(samples) {
  samples = samples.slice().sort((a, b) => a - b);
  const n = samples.length;
  const at = (p) => samples[Math.min(n - 1, Math.floor(p * n))];
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  return { n, mean, p50: at(0.5), p95: at(0.95), p99: at(0.99), max: samples[n - 1] };
}

function fmt(ms) { return `${ms.toFixed(3)} ms`; }

function bench(label, fn, iters) {
  // warmup
  for (let i = 0; i < 50; i++) fn();
  const samples = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    fn();
    samples[i] = performance.now() - t0;
  }
  const s = stats(samples);
  console.log(
    `${label.padEnd(32)} n=${s.n}  mean=${fmt(s.mean)}  p50=${fmt(s.p50)}  p95=${fmt(s.p95)}  p99=${fmt(s.p99)}  max=${fmt(s.max)}`,
  );
  return s;
}

const files = ['runegoblin', 'runegoblin-teal', 'default'];
const ITERS = 2000;

console.log(`Node ${process.version} — iterations per bench: ${ITERS}\n`);

for (const name of files) {
  const state = buildEditorState(name);
  const jsonSize = Buffer.byteLength(JSON.stringify(state), 'utf-8');
  console.log(`── ${name}.json → EditorState  (${(jsonSize / 1024).toFixed(1)} KB JSON)`);
  bench('  structuredClone', () => structuredClone(state), ITERS);
  bench('  JSON.stringify', () => JSON.stringify(state), ITERS);
  bench('  JSON.parse(stringify)', () => JSON.parse(JSON.stringify(state)), ITERS);
  console.log();
}

// Also measure at 10× palettes, to model future growth (more palettes / larger files).
const biggest = buildEditorState('runegoblin');
const scaled = {
  ...biggest,
  palettes: Object.fromEntries(
    Object.entries(biggest.palettes).flatMap(([label, cfg], i) =>
      Array.from({ length: 10 }, (_, k) => [`${label}_${i}_${k}`, cfg]),
    ),
  ),
};
const scaledSize = Buffer.byteLength(JSON.stringify(scaled), 'utf-8');
console.log(`── runegoblin ×10 palettes (stress)  (${(scaledSize / 1024).toFixed(1)} KB JSON)`);
bench('  structuredClone', () => structuredClone(scaled), ITERS);
bench('  JSON.stringify', () => JSON.stringify(scaled), ITERS);
