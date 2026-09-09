export type ContractRule =
  | 'contract-listed'
  | 'contract-render'
  | 'contract-alias'
  | 'contract-persist'
  | 'contract-theme'
  | 'contract-preview'
  | 'contract-sketch';

/**
 * A failed obligation, carrying the rule id the CLI reports it under. Thrown
 * rather than asserted so a defect fixture can name the rule it expects and so
 * `check-component --tests` can map a reporter error onto a finding.
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
  /** Read computed style from this pseudo-element rather than from the node. */
  pseudo?: string;
  /** Rendered outside the preview stage. Resolved against the document. */
  portal?: boolean;
}

export type PartDeclaration = string | PartLocator;

/** Which VariantGroup and which state tab an obligation is observed in. */
export interface View {
  /** Variant tab label. Omitted when the editor renders one variant. */
  variant?: string;
  /** State tab label. Omitted when the editor renders no state strip. */
  state?: string;
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

export type PersistenceShape = 'token' | 'opacity' | 'gradient' | 'config';

export interface PersistenceCase extends View {
  shape: PersistenceShape;
  /** The alias whose control is driven. Omitted for `config`. */
  variable?: string;
  /** For `config`: the control's selector inside the visible variant group, and
   *  the config key it writes. */
  control?: string;
  configKey?: string;
  /** Where the persisted value must land once the page has reloaded. */
  observe: { part: string; css: string };
}

export interface PersistenceExpectation {
  cases: PersistenceCase[];
  /** The alias Reset must return to the value the server holds for it. */
  resetVariable: string;
}

export interface ThemeExpectation extends View {
  /** Theme slug shown in the Theme Picker, e.g. `ocean`. */
  theme: string;
  /** Variables whose root value the theme must move. */
  changed: string[];
  /** Variables the theme must leave exactly as they were. */
  unchanged: string[];
  /** Variables the theme's own component config aliases, and the design token
   *  each must resolve to under it. */
  aliasedTo: Record<string, string>;
  /** Where the theme's value must land in the rendered preview. */
  observe: { part: string; css: string; variable: string };
}

export interface AliasExpectation {
  /** Aliases whose computed root value must resolve, sampled across the parts
   *  the component paints. The alias contract covers fan-out for every alias;
   *  this covers resolution, which fan-out cannot see. */
  variables: string[];
}

export type InteractionAction =
  | { kind: 'press'; part: string; key: string }
  | { kind: 'click'; part: string }
  | { kind: 'dragTo'; part: string; along: string; fraction: number };

export type InteractionOutcome =
  | { kind: 'attribute'; part: string; name: string; value: string }
  | { kind: 'valueMoves'; part: string; direction: 'up' | 'down' }
  | { kind: 'valueHolds'; part: string };

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
  alias: AliasExpectation;
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
