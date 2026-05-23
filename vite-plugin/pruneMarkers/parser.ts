/**
 * Parser for `<!--PRUNE_FOR ...-->...<!--END_PRUNE-->` markers.
 *
 * Form: `<!--PRUNE_FOR <component> <key> <op> <value> [default=<v>]-->`
 *
 * Operators:
 *   - `==`  literal-equal scalar
 *   - `!=`  literal-not-equal scalar
 *   - `in`  followed by `[a, b, c]` — value is in the set
 *
 * The optional `default=<v>` suffix tells the build what value to assume when
 * the variant doesn't set this key in its production config. Without it, the
 * preprocessor keeps the block for that variant (safe fallback — never strip
 * more than dev shows).
 *
 * Variant prop name is hard-coded to `variant` at the consumer site.
 */

export type PruneOp = 'eq' | 'neq' | 'in';

export interface PruneMarkerArgs {
  component: string;
  key: string;
  op: PruneOp;
  value: string | string[];
  /** Per-key fallback when a variant omits the key. Optional. */
  default?: string;
}

const SCALAR_OP = /^(==|!=)$/;

/**
 * Parse the arguments string from inside a `<!--PRUNE_FOR ...-->` marker.
 * Throws on malformed input — strict mode (decision 3 in the plan).
 */
export function parsePruneArgs(raw: string): PruneMarkerArgs {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('PRUNE_FOR marker has empty argument list');
  }

  const { rest: bodyTokens, default: defaultValue } = peelDefault(tokenize(trimmed));
  if (bodyTokens.length < 3) {
    throw new Error(`PRUNE_FOR expects "<component> <key> <op> <value>", got: ${trimmed}`);
  }

  const [component, key, opToken, ...rest] = bodyTokens;
  if (!component || !key) {
    throw new Error(`PRUNE_FOR missing component or key in: ${trimmed}`);
  }

  const base: Omit<PruneMarkerArgs, 'op' | 'value'> & { default?: string } = { component, key };
  if (defaultValue !== undefined) base.default = defaultValue;

  if (opToken === 'in') {
    const restJoined = rest.join(' ').trim();
    if (!restJoined.startsWith('[') || !restJoined.endsWith(']')) {
      throw new Error(`PRUNE_FOR "in" operator expects [a, b, c] list, got: ${restJoined}`);
    }
    const inner = restJoined.slice(1, -1).trim();
    if (inner === '') {
      throw new Error(`PRUNE_FOR "in" operator received empty list`);
    }
    const value = inner
      .split(',')
      .map((s) => unquote(s.trim()))
      .filter((s) => s !== '');
    if (value.length === 0) {
      throw new Error(`PRUNE_FOR "in" operator received empty list`);
    }
    return { ...base, op: 'in', value };
  }

  if (SCALAR_OP.test(opToken)) {
    if (rest.length !== 1) {
      throw new Error(`PRUNE_FOR "${opToken}" expects a single value, got: ${rest.join(' ')}`);
    }
    return {
      ...base,
      op: opToken === '==' ? 'eq' : 'neq',
      value: unquote(rest[0]),
    };
  }

  throw new Error(`PRUNE_FOR unknown operator "${opToken}" in: ${trimmed}`);
}

/** Pull a trailing `default=<v>` token off the token list. */
function peelDefault(tokens: string[]): { rest: string[]; default?: string } {
  const last = tokens[tokens.length - 1];
  if (last && last.startsWith('default=')) {
    return {
      rest: tokens.slice(0, -1),
      default: unquote(last.slice('default='.length)),
    };
  }
  return { rest: tokens };
}

function tokenize(s: string): string[] {
  // Split on whitespace; keep `[ ... ]` together so the "in" operator's list
  // arrives as one logical token group (caller joins back if needed).
  return s.split(/\s+/).filter((t) => t !== '');
}

function unquote(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Evaluate a parsed marker against a per-variant config value. Returns true
 * if the block should be kept for this variant.
 */
export function evaluatePruneMarker(args: PruneMarkerArgs, variantValue: string): boolean {
  if (args.op === 'eq') return variantValue === args.value;
  if (args.op === 'neq') return variantValue !== args.value;
  // 'in'
  return Array.isArray(args.value) && args.value.includes(variantValue);
}
