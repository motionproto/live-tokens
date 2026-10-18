// Loaded with --import into the browser gate's own checker runs. The gate
// arm's image applies static-checks.mjs, so the agent's --tests runs the static
// checks; the gate's runs read the package's original findings.mjs instead,
// kept at /opt/eval/findings.mjs, and --tests starts the browser for them alone.
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const ORIGINAL = readFileSync('/opt/eval/findings.mjs', 'utf8');

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    return url.endsWith('/@motion-proto/live-tokens/bin/lib/findings.mjs') ? { ...result, source: ORIGINAL } : result;
  },
});
