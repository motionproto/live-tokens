// Shared logic for baking a component config's alias values into the first
// `:global(:root){…}` block of its `.svelte` source — the shipped default that
// consumers receive. Two callers:
//   • sync-component-defaults.mjs     default.json → .svelte (keep them in sync)
//   • collapse-manifest-to-default.mjs adopted config → .svelte (make it default)
// Kept in one place so the fragile gradient-format mirror can't drift.

// Mirror of src/editor/core/themes/slices/gradients.ts → formatGradientValue,
// so a baked default renders identically to what the editor produces.
function formatStopColor(s) {
  const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
  const op = s.opacity ?? 100;
  return op >= 100 ? base : `color-mix(in srgb, ${base} ${op}%, transparent)`;
}

function formatGradient(v) {
  if (v.type === 'none') return 'transparent';
  if (v.type === 'solid') return v.stops[0] ? formatStopColor(v.stops[0]) : 'transparent';
  const stops = v.stops.map((s) => `${formatStopColor(s)} ${s.position}%`).join(', ');
  if (v.type === 'linear') return `linear-gradient(${v.angle}deg, ${stops})`;
  const cx = v.centerX ?? 50;
  const ax = v.aspectX ?? 1, ay = v.aspectY ?? 1;
  const shape =
    ax === 1 && ay === 1
      ? v.radius > 0 ? `circle ${v.radius}px` : 'circle'
      : `ellipse ${((v.radius || 100) * ax).toFixed(2)}px ${((v.radius || 100) * ay).toFixed(2)}px`;
  return `radial-gradient(${shape} at ${cx}% 50%, ${stops})`;
}

export function aliasToCss(v) {
  let css;
  if (v && typeof v === 'object') {
    if (v.kind === 'gradient' && v.value) css = formatGradient(v.value);
    else return { skip: 'object:' + (v.kind ?? '?') };
  } else {
    const s = String(v).trim();
    css = s.startsWith('--') ? `var(${s})` : s; // alias→var(); color-mix/literal pass through
  }
  // A bare `transparent` (raw literal or a type:none gradient) must use the
  // design token — component tokens have to alias a Layer-1 token, never a raw
  // color primitive. Same rendered value, canonical form. See editorTokens.test.
  if (css === 'transparent') css = 'var(--color-transparent)';
  return css;
}

/** Rewrite value lines inside the first `:global(:root){…}` block. */
export function syncBlock(src, aliases) {
  const start = src.indexOf(':global(:root)');
  if (start === -1) return { src, changed: [], skipped: [] };
  const open = src.indexOf('{', start);
  let depth = 0,
    end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const before = src.slice(0, open + 1);
  const block = src.slice(open + 1, end);
  const after = src.slice(end);
  const changed = [];
  const skipped = [];
  const out = block.replace(
    /^([ \t]*)(--[\w-]+)([ \t]*:[ \t]*)([^;]+)(;.*)$/gm,
    (line, indent, token, sep, value, tail) => {
      if (!(token in aliases)) return line;
      const css = aliasToCss(aliases[token]);
      if (typeof css === 'object') {
        skipped.push(`${token} (${css.skip})`);
        return line;
      }
      if (value.trim() === css) return line;
      changed.push(`${token}: ${value.trim()} → ${css}`);
      return `${indent}${token}${sep}${css}${tail}`;
    },
  );
  return { src: before + out + after, changed, skipped };
}
