# Contrast checker: shipped default pairs

Wave 5 of `docs/plans/contrast-checker.md` measured every declared contrast pair
in the shipped default theme (Motion Proto) on 2026-10-10, at `cb2b20e` on the
`contrast-checker` branch. A one-off Playwright script opened the components
editor in headless Chromium against an isolated data copy, imported
`allContrastPairs`, `measurePair` and `createDomResolver` through the dev server,
and measured each pair as the readout does. Ratios truncate to two decimals.
The run changed no default.

The registry holds 236 pairs. 30 active pairs in 12 components fall below
their floor, 175 active pairs pass, and 31 inactive pairs pass as exempt.

## Failing active pairs

The table sorts by ratio divided by floor, lowest first. A backdrop lists the
layers behind the foreground, top first, over the page background.

| Component | Foreground | Backdrop | Context | Role | Ratio | Floor |
|---|---|---|---|---|---|---|
| slider | `--slider-single-hover-thumb-surface` | `--slider-single-fill` over `--slider-single-track-surface` over page background | fill | non-text | 1.00:1 | 3:1 |
| slider | `--slider-range-hover-thumb-surface` | `--slider-range-fill` over `--slider-range-track-surface` over page background | fill | non-text | 1.00:1 | 3:1 |
| tabbar | `--tabbar-default-border` | `--tabbar-default-surface` over page background |  | non-text | 1.00:1 | 3:1 |
| tabbar | `--tabbar-hover-border` | `--tabbar-hover-tint-enabled` over `--tabbar-hover-surface` over page background |  | non-text | 1.00:1 | 3:1 |
| badge | `--badge-canvas-text` | `--badge-canvas-surface` over page background |  | text | 1.54:1 | 4.5:1 |
| cornerbadge | `--cornerbadge-canvas-text` | `--cornerbadge-canvas-surface` over page background |  | text | 1.54:1 | 4.5:1 |
| sectiondivider | `--sectiondivider-sm-hairline-color` | `--sectiondivider-sm-surface` over page background |  | non-text | 1.64:1 | 3:1 |
| badge | `--badge-danger-text` | `--badge-danger-surface` over page background |  | text | 3.30:1 | 4.5:1 |
| cornerbadge | `--cornerbadge-danger-text` | `--cornerbadge-danger-surface` over page background |  | text | 3.30:1 | 4.5:1 |
| notification | `--notification-danger-title` | `--notification-danger-surface` over page background |  | text | 3.30:1 | 4.5:1 |
| button | `--button-warning-hover-text` | `--button-hover-tint-enabled` over `--button-warning-hover-surface` over page background |  | text | 3.40:1 | 4.5:1 |
| slider | `--slider-single-thumb-surface` | `--slider-single-fill` over `--slider-single-track-surface` over page background | fill | non-text | 2.29:1 | 3:1 |
| slider | `--slider-range-thumb-surface` | `--slider-range-fill` over `--slider-range-track-surface` over page background | fill | non-text | 2.29:1 | 3:1 |
| inlineeditactions | `--inlineeditactions-cancel-hover-text` | `--inlineeditactions-cancel-hover-surface` over page background |  | non-text | 2.31:1 | 3:1 |
| radiobutton | `--radiobutton-default-dot-border-color` | page background |  | non-text | 2.42:1 | 3:1 |
| radiobutton | `--radiobutton-hover-dot-border-color` | page background |  | non-text | 2.42:1 | 3:1 |
| radiobutton | `--radiobutton-selected-dot-border-color` | page background |  | non-text | 2.42:1 | 3:1 |
| tabbar | `--tabbar-selected-border` | `--tabbar-selected-surface` over page background |  | non-text | 2.55:1 | 3:1 |
| badge | `--badge-brand-text` | `--badge-brand-surface` over page background |  | text | 3.87:1 | 4.5:1 |
| cornerbadge | `--cornerbadge-brand-text` | `--cornerbadge-brand-surface` over page background |  | text | 3.87:1 | 4.5:1 |
| button | `--button-success-hover-text` | `--button-hover-tint-enabled` over `--button-success-hover-surface` over page background |  | text | 3.96:1 | 4.5:1 |
| slidepager | `--slidepager-control-hover-icon` | `--slidepager-control-hover-surface` over page background | inline | non-text | 2.79:1 | 3:1 |
| slidepager | `--slidepager-control-hover-icon` | `--slidepager-control-hover-surface` over `--slidepager-scrim-surface` over page background | zoomed | non-text | 2.79:1 | 3:1 |
| button | `--button-secondary-hover-text` | `--button-hover-tint-enabled` over `--button-secondary-hover-surface` over page background |  | text | 4.22:1 | 4.5:1 |
| menuselect | `--menuselect-hover-text` | `--menuselect-hover-tint-enabled` over `--menuselect-hover-surface` over `--menuselect-menu-surface` over page background |  | text | 4.22:1 | 4.5:1 |
| slider | `--slider-single-fill` | `--slider-single-track-surface` over page background |  | non-text | 2.87:1 | 3:1 |
| slider | `--slider-single-hover-thumb-surface` | `--slider-single-track-surface` over page background | track | non-text | 2.87:1 | 3:1 |
| slider | `--slider-range-fill` | `--slider-range-track-surface` over page background |  | non-text | 2.87:1 | 3:1 |
| slider | `--slider-range-hover-thumb-surface` | `--slider-range-track-surface` over page background | track | non-text | 2.87:1 | 3:1 |
| toggle | `--toggle-thumb-surface` | `--toggle-track-surface` over page background |  | non-text | 2.93:1 | 3:1 |

## Passing pairs

- 175 of 205 active pairs meet their floor.
- 31 inactive pairs pass, because WCAG exempts disabled controls. 19 of them measure below the floor an active pair would carry.
