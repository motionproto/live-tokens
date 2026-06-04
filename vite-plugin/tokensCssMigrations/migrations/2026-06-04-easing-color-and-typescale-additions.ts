import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-06-04): backfill the Layer-1 primitives that
 * pre-0.31 `tokens.css` files predate but the package now ships canonically —
 * the full `--ease-*` easing scale, the `--color-white/black` invariants, and
 * `--font-size-7xl`.
 *
 * These were added to the package's `tokens.css` *before* the tokens-css
 * migration system existed (2026-05-29), so no migration ever carried them to a
 * vendored copy. The 2026-05-29 typography migration seeded only `--ease-out-quart`
 * (the single step a component referenced then); 0.31's Image zoom now resolves
 * `transition: … var(--ease-out-cubic)`, which a forked `tokens.css` lacking the
 * scale drops on the floor — the zoom snaps with no ease. The other curves and
 * the color/type additions aren't referenced by a component today, but the
 * package defines them, so the editor's pickers should offer every step.
 *
 * Mirrors the "add the full canonical scale, not just the referenced step"
 * policy of the typography and transform-scale migrations. Idempotent by
 * presence: a consumer who already has (or has retuned) `--ease-out-quart` keeps
 * their value; only the absent steps are inserted. Per-breakpoint `@media`
 * overrides of `--font-size-7xl` are intentionally not authored here — `ensureScale`
 * only touches the top-level `:root`, leaving responsive refinement to the consumer.
 */
export const tokensCssMigration_2026_06_04_easingColorAndTypescaleAdditions: TokensCssMigration = {
  id: '2026-06-04-easing-color-and-typescale-additions',
  kind: 'additive',
  description: 'Add the full --ease-* scale, --color-white/black, and --font-size-7xl',
  apply(css) {
    let out = css;

    // No sectionComment: these land directly after the existing easing tokens
    // (the 2026-05-29 migration's `--ease-out-quart` under its "Easing" header),
    // so the whole family stays under one comment rather than spawning a second.
    out = ensureScale(out, {
      anchorPrefixes: ['--ease-', '--transition-', '--duration-'],
      entries: [
        { name: '--ease-linear', value: 'linear' },
        { name: '--ease-in-sine', value: 'cubic-bezier(0.12, 0, 0.39, 0)' },
        { name: '--ease-out-sine', value: 'cubic-bezier(0.61, 1, 0.88, 1)' },
        { name: '--ease-in-out-sine', value: 'cubic-bezier(0.37, 0, 0.63, 1)' },
        { name: '--ease-in-quad', value: 'cubic-bezier(0.11, 0, 0.5, 0)' },
        { name: '--ease-out-quad', value: 'cubic-bezier(0.5, 1, 0.89, 1)' },
        { name: '--ease-in-out-quad', value: 'cubic-bezier(0.45, 0, 0.55, 1)' },
        { name: '--ease-in-cubic', value: 'cubic-bezier(0.32, 0, 0.67, 0)' },
        { name: '--ease-out-cubic', value: 'cubic-bezier(0.33, 1, 0.68, 1)' },
        { name: '--ease-in-out-cubic', value: 'cubic-bezier(0.65, 0, 0.35, 1)' },
        { name: '--ease-in-quart', value: 'cubic-bezier(0.5, 0, 0.75, 0)' },
        { name: '--ease-out-quart', value: 'cubic-bezier(0.25, 1, 0.5, 1)' },
        { name: '--ease-in-out-quart', value: 'cubic-bezier(0.76, 0, 0.24, 1)' },
        { name: '--ease-in-quint', value: 'cubic-bezier(0.64, 0, 0.78, 0)' },
        { name: '--ease-out-quint', value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { name: '--ease-in-out-quint', value: 'cubic-bezier(0.83, 0, 0.17, 1)' },
        { name: '--ease-in-expo', value: 'cubic-bezier(0.7, 0, 0.84, 0)' },
        { name: '--ease-out-expo', value: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        { name: '--ease-in-out-expo', value: 'cubic-bezier(0.87, 0, 0.13, 1)' },
        { name: '--ease-in-circ', value: 'cubic-bezier(0.55, 0, 1, 0.45)' },
        { name: '--ease-out-circ', value: 'cubic-bezier(0, 0.55, 0.45, 1)' },
        { name: '--ease-in-out-circ', value: 'cubic-bezier(0.85, 0, 0.15, 1)' },
        { name: '--ease-in-back', value: 'cubic-bezier(0.36, 0, 0.66, -0.56)' },
        { name: '--ease-out-back', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        { name: '--ease-in-out-back', value: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)' },
        {
          name: '--ease-in-elastic',
          value:
            'linear(0, 0.0007 8.1%, 0.0019 12.1%, 0.0027 13.7%, 0.0046 15.7%, -0.0046 18.7%, -0.0202 22.1%, -0.0234 23.6%, -0.0224 24.9%, -0.0156 26.7%, 0.0091 29.4%, 0.0666 33.4%, 0.0848 34.9%, 0.0916 36.4%, 0.0837 38.1%, 0.0581 40.1%, -0.0204 43.7%, -0.221 51.3%, -0.2825 53.6%, -0.317 55.4%, -0.3253 57.1%, -0.3071 58.8%, -0.2554 60.9%, -0.1295 63.7%, 0.4515 73.1%, 0.7257 78.4%, 0.834 81.2%, 0.9221 84.1%, 0.9817 87.1%, 1.0144 90.4%, 1.026 94.6%, 1)',
        },
        {
          name: '--ease-out-elastic',
          value:
            'linear(0, 0.974 4.6%, 1.026 5.4%, 1.018 6.9%, 0.952 12.9%, 0.876 15.9%, 0.751 18.8%, 0.557 22.4%, -0.451 36.3%, -0.722 42.9%, -0.832 46.6%, -0.918 51.3%, -0.916 54.8%, -0.832 59.4%, -0.665 64.6%, 0.221 78%, 0.317 81.2%, 0.317 84.4%, 0.281 87.6%, 0.232 91.1%, 0.058 100%)',
        },
        {
          name: '--ease-in-out-elastic',
          value:
            'linear(0, 0.0001 7.7%, -0.0048 12.7%, -0.0064 14.6%, -0.0064 16.5%, -0.0026 18.5%, 0.0179 21.4%, 0.0617 24.1%, 0.0617 26.5%, 0.0309 29%, -0.0589 32.7%, -0.3 38.1%, -0.4307 40.6%, -0.4844 43%, -0.4844 48%, -0.4307 50.4%, -0.3 52.9%, 0.3 60.5%, 0.4307 63%, 0.4844 65.4%, 0.4844 70.4%, 0.4307 72.8%, 0.3 75.3%, 0.0589 80.7%, -0.0309 84.4%, -0.0617 86.9%, -0.0617 89.3%, -0.0179 92%, 0.0026 94.9%, 0.0064 96.8%, 0.0064 98.7%, 0.0048 100%, 1)',
        },
        {
          name: '--ease-in-bounce',
          value:
            'linear(0, 0.005, 0.018, 0.039, 0.069, 0.108, 0.156, 0.213, 0.281, 0.36, 0.451, 0.555, 0.674, 0.81, 0.967, 0.881, 0.838, 0.838, 0.881, 0.97, 0.952, 0.95, 0.969, 0.999, 0.984, 0.982, 0.989, 1)',
        },
        {
          name: '--ease-out-bounce',
          value:
            'linear(0, 0.011, 0.031, 0.018, 0.05, 0.151, 0.301, 0.5, 0.747, 0.945, 0.997, 1, 0.969, 0.954, 0.969, 0.952, 0.952, 0.969, 1, 0.984, 0.982, 0.984, 0.997, 0.984, 0.989, 1)',
        },
        {
          name: '--ease-in-out-bounce',
          value:
            'linear(0, 0.003, 0.009, 0.019, 0.034, 0.054, 0.078, 0.107, 0.141, 0.18, 0.226, 0.278, 0.337, 0.405, 0.483, 0.471, 0.42, 0.419, 0.46, 0.494, 0.5, 0.506, 0.54, 0.581, 0.58, 0.529, 0.517, 0.595, 0.663, 0.722, 0.774, 0.819, 0.859, 0.893, 0.922, 0.946, 0.966, 0.981, 0.991, 0.997, 1)',
        },
      ],
    });

    out = ensureScale(out, {
      sectionComment: 'Invariants — never themed, not part of any ramp.',
      anchorPrefixes: ['--color-'],
      entries: [
        { name: '--color-white', value: '#ffffff' },
        { name: '--color-black', value: '#000000' },
      ],
    });

    out = ensureScale(out, {
      anchorPrefixes: ['--font-size-', '--font-'],
      entries: [{ name: '--font-size-7xl', value: '4.5rem' }],
    });

    return out;
  },
};
