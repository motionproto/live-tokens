export type ContractRule =
  | 'contract-listed'
  | 'contract-render'
  | 'contract-alias'
  | 'contract-persist'
  | 'contract-theme'
  | 'contract-preview'
  | 'contract-sketch'
  | 'contract-missing';

/**
 * A failed obligation, carrying the rule id the CLI reports it under. A defect
 * fixture names the rule it expects, and `check-component --tests` maps a
 * reporter error onto a finding.
 */
export class ContractViolation extends Error {
  constructor(
    readonly rule: ContractRule,
    readonly component: string,
    message: string,
  ) {
    super(`[${rule}] ${component}: ${message}`);
    this.name = 'ContractViolation';
  }
}

export interface Inapplicable {
  applicable: false;
  reason: string;
}

export function isInapplicable(value: unknown): value is Inapplicable {
  return typeof value === 'object' && value !== null && (value as Inapplicable).applicable === false;
}

export interface PartLocator {
  /** Resolved inside the preview stage unless `portal` is set. */
  selector: string;
  /** Read computed style from this pseudo-element of the part, e.g.
   *  `'::after'`. Chromium's `getComputedStyle` only tolerates the bare form
   *  (`'after'`) for `::before`/`::after`; use the full `::` syntax so a
   *  future pseudo-element (`::placeholder`, `::marker`, ...) works the same
   *  way without a silent fallback to the host element's own style. */
  pseudo?: string;
  /** Rendered outside the preview stage. Resolved against the document. */
  portal?: boolean;
}

export type PartDeclaration = string | PartLocator;

/**
 * An editor control the preview is gated behind: a canvas-toolbar checkbox, an
 * optional-content switch. `check` sets a checkbox to a state and is safe to
 * repeat; `value` picks a select option; neither clicks once.
 */
export interface ControlStep {
  kind: 'control';
  /** Selector inside the visible variant group. */
  selector: string;
  check?: boolean;
  value?: string;
}

export type SetupStep = InteractionAction | ControlStep;

/** Which VariantGroup, which state tab, and what has to happen first. */
export interface View {
  /** Variant tab label. Omitted when the editor renders one variant. */
  variant?: string;
  /** State tab label. Omitted when the editor renders no state strip. */
  state?: string;
  /** Run after the tabs are selected. Portaled and toolbar-gated parts exist
   *  only once these have run. */
  setup?: SetupStep[];
}

/** Part key -> CSS property -> the design token that must drive it. */
export type PaintMap = Record<string, Record<string, string>>;

export interface PropertyExpectation extends View {
  paints: PaintMap;
}

export interface StateExpectation extends View {
  state: string;
  /** Class the root part carries while the editor previews this state. */
  forceClass?: string;
  /** Part key -> attributes it must carry. A null value requires the absence. */
  attributes?: Record<string, Record<string, string | null>>;
  /** What the state repaints, as computed-value equality against its token. */
  paints?: PaintMap;
}

/**
 * `token` and `opacity` drive the token selector for `variable`. `gradient`
 * drives the gradient editor for `variable`. `literal` drives `control` and
 * reads `variable` back off the root, which is where an intrinsic lands: the
 * editors write those into the alias bucket. `config` drives `control` and
 * reads `configKey` out of the config bucket, which holds editor metadata that
 * never reaches `:root`.
 */
export type PersistenceShape = 'token' | 'literal' | 'opacity' | 'gradient' | 'config';

export interface PersistenceCase extends View {
  shape: PersistenceShape;
  /** The alias the value is read back from. Omitted for `config`. */
  variable?: string;
  /** Selector inside the visible variant group, for `literal` and `config`. */
  control?: string;
  /** The config-bucket key, for `config`. */
  configKey?: string;
  /** Where the persisted value must land once the page has reloaded. */
  observe: { part: string; css: string };
}

export interface PersistenceExpectation {
  cases: PersistenceCase[];
  /** The alias Reset must return to the value the server holds for it. It has
   *  to be one a case above moves, so the saved value and the value the
   *  component booted with are different and Reset can be seen to choose. */
  resetVariable: string;
}

export interface ThemeExpectation extends View {
  /** Theme slug shown in the Theme Picker, e.g. `ocean`. */
  theme: string;
  /** Variables whose root value the theme must move. */
  changed: string[];
  /**
   * Variables the theme must leave exactly as they were. Two theme JSON files
   * can name the identical design token (e.g. both `--border-neutral`) and
   * still resolve to different rendered colors, because many color primitives
   * are computed per theme from a palette/seed even when the alias string is
   * unchanged — comparing the two files' alias *names* does not establish
   * invariance. Pick `unchanged` candidates from token families a theme never
   * recolors: `--shadow-*`, `--icon-size-*`, `--font-size-*`,
   * `--line-height-*`, `--font-family`/`--font-mono`, and the spacing/radius/
   * border-width scale steps (`--space-*`, `--radius-*`, `--border-width-*`)
   * are all fixed constants, not palette-derived — verify a candidate's
   * *resolved* value is identical between the two theme files before trusting
   * it, not just that the alias name matches.
   */
  unchanged: string[];
  /** Variables the theme's own component config aliases, and the design token
   *  each must resolve to under it. */
  aliasedTo: Record<string, string>;
  /** Where the theme's value must land in the rendered preview. */
  observe: { part: string; css: string; variable: string };
}

export type InteractionAction =
  | { kind: 'press'; part: string; key: string }
  | { kind: 'click'; part: string }
  | { kind: 'type'; part: string; text: string }
  | { kind: 'dragTo'; part: string; along: string; fraction: number };

export type InteractionOutcome =
  | { kind: 'attribute'; part: string; name: string; value: string }
  | { kind: 'valueMoves'; part: string; direction: 'up' | 'down' }
  | { kind: 'valueBecomes'; part: string; value: string }
  | { kind: 'valueChanges'; part: string }
  | { kind: 'valueHolds'; part: string }
  /** Whether the part takes focus. The only outcome a button with no state
   *  attribute has: a disabled one refuses it and an enabled one takes it. */
  | { kind: 'focused'; part: string; value: boolean };

export interface InteractionCase extends View {
  name: string;
  action: InteractionAction;
  expect: InteractionOutcome;
}

export interface InteractionExpectation {
  /** The part carrying the interactive role. */
  part: string;
  role: string;
  cases: InteractionCase[];
}

export interface SketchPartExpectation {
  part: string;
  /** The design token `--sketch-fill` must resolve to on this part. */
  fill?: string;
  /** The design token `--sketch-stroke` must resolve to on this part. */
  stroke?: string;
}

export interface SketchExpectation extends View {
  /** Sketchstyle id the paint is asserted under. */
  style: string;
  parts: SketchPartExpectation[];
}

export interface ComponentContract {
  id: string;
  origin: 'system' | 'custom';
  parts: Record<string, PartDeclaration>;
  /** Part key of the component's own root element in the preview. */
  root: string;
  /** The view every obligation opens with. */
  view?: View;
  states: StateExpectation[] | Inapplicable;
  properties: PropertyExpectation[];
  /**
   * Aliases no paint map can pin, each with the reason. A token consumed
   * inside `calc()` or handed to a gradient function never appears verbatim in
   * a computed style, so the probe cannot read it back — that is the only
   * class this belongs to. A token a sibling alias merely happens to carry
   * the same rendered value through (a base padding token behind four
   * per-side overrides, say) is not in this class: the per-side entries pin
   * their own aliases, not the base one, and a paint map that drives the base
   * token directly and observes the per-side CSS property can pin it too. Put
   * that here and Wave 4's coverage JSON records the base token as covered
   * when nothing asserts the link between it and what actually painted.
   */
  uncovered?: Record<string, string>;
  persistence: PersistenceExpectation;
  theme: ThemeExpectation;
  interaction: InteractionExpectation | Inapplicable;
  sketch: SketchExpectation | Inapplicable;
}

/** Roles whose components must declare interaction cases. */
const INTERACTIVE_ROLES = new Set([
  'button', 'switch', 'checkbox', 'radio', 'slider', 'spinbutton', 'textbox',
  'combobox', 'listbox', 'menuitem', 'tab', 'link', 'searchbox', 'option',
]);

export function requiresInteraction(role: string | null): boolean {
  return role !== null && INTERACTIVE_ROLES.has(role);
}

export function partLocator(contract: ComponentContract, key: string): PartLocator {
  const declared = contract.parts[key];
  if (declared === undefined) {
    throw new ContractViolation('contract-render', contract.id, `no part named "${key}" is declared`);
  }
  return typeof declared === 'string' ? { selector: declared } : declared;
}
