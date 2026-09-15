import { basename, relative } from 'node:path';
import { deepImportRepair } from '../lib/catalogue.mjs';
import { lineOf } from '../lib/findings.mjs';

const shared = {
  'deep-import': {
    severity: 'error',
    repair: 'auto',
    guidance:
      'A run without --no-fix rewrites a /src/system/components/<Name>.svelte specifier to the public /components/<Name>.svelte. Import any other deep specifier from a public subpath, which `details.exports` lists.',
  },
};

export const pageRules = {
  'reserved-route': {
    severity: 'error',
    repair: 'authored',
    guidance: 'Move the route out of /live-tokens/*.',
  },
  'site-css-in-main': {
    severity: 'error',
    repair: 'authored',
    guidance:
      "Delete the import from main.ts, and add it to each page's <script>. Page CSS then stays off the editor routes.",
  },
  'missing-source': {
    severity: 'warn',
    repair: 'authored',
    guidance: "Add source: 'src/...' to the route entry.",
  },
  ...shared,
};

export const componentRules = {
  ...shared,
};

// Deep imports into the package internals are not a supported API.
const DEEP_IMPORT_PATTERNS = [
  /^@motion-proto\/live-tokens\/src\//,
  /node_modules\/@motion-proto\/live-tokens/,
];

/** `deep-import` for one import statement in a page. */
export function checkPageImport({ index, specifier }, add) {
  for (const pattern of DEEP_IMPORT_PATTERNS) {
    if (pattern.test(specifier)) {
      add('deep-import', index, `deep import into package internals: ${specifier}`, deepImportRepair(specifier));
    }
  }
}

/** `reserved-route`, then `missing-source`, then `site-css-in-main`, over a page's script and markup. */
export function checkRoutes({ file, code }, add) {
  for (const m of code.matchAll(/['"](\/live-tokens[^'"]*)['"]\s*:/g)) {
    add('reserved-route', m.index, `route '${m[1]}' is inside the reserved /live-tokens/* namespace`);
  }

  for (const m of code.matchAll(/\blazy\s*:/g)) {
    const entry = enclosingObject(code, m.index);
    if (entry && !/\bsource\s*:/.test(entry)) {
      add('missing-source', m.index, `route entry has no 'source', so Page Source cannot open it`);
    }
  }

  if (/^main\.(ts|js)$/.test(basename(file))) {
    for (const m of code.matchAll(/import\s+['"]([^'"]*site\.css)['"]/g)) {
      add(
        'site-css-in-main',
        m.index,
        `site.css imported from main; import it from each page's <script> so it cannot leak into editor routes`,
      );
    }
  }
}

/** The object literal enclosing `index`, found by balancing braces outward. */
function enclosingObject(text, index) {
  let depth = 0;
  let start = -1;
  for (let i = index; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractImports(source) {
  const out = [];
  const re = /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push({ specifier: m[1], index: m.index + m[0].length - 1 - m[1].length });
  }
  return out;
}

/**
 * `deep-import` for each `[path, text]` pair a component owns: its runtime,
 * its editor, or the file that registers it. Each line resolves against that
 * file's own text.
 */
export function checkComponentImports(root, files, recordAt) {
  for (const [path, text] of files) {
    for (const { specifier, index } of extractImports(text)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(specifier)) {
          recordAt(
            'deep-import',
            `${relative(root, path)}: deep import not supported: ${specifier}`,
            relative(root, path),
            lineOf(text, index),
            deepImportRepair(specifier),
          );
        }
      }
    }
  }
}
