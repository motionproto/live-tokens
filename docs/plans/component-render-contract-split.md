  # Split the component render contract into per-component tests

Status: ready to implement, 2026-08-18. Written to be executed by a Sonnet agent wave by wave.

Goal: turn the single 8 minute `component-render-contract` test into one test per component, then run those tests in parallel. The contract itself does not change. Every alias asserted today is still asserted afterwards.

## Why

`tests/e2e/component-render-contract.spec.ts` is one `test()` covering 25 components and 1237 aliases. From the v0.50.0 publish log:

```
Slow test file: component-render-contract.spec.ts (8.0m)
7 passed (8.4m)
```

The other seven e2e tests total roughly 24 seconds. This one test is the entire critical path of the release gate. Three consequences:

1. **Retries are unaffordable.** `playwright.config.ts` now sets `retries: 2` in CI. A flake inside this test costs up to 24 minutes, because a retry re-runs all 25 components.
2. **Failures do not name a component.** The assertion prints a list of variables, and the reader has to map them back to components by hand.
3. **Sharding cannot help.** Playwright distributes tests, not halves of one test. Any shard holding this test still runs 8 minutes.

Splitting fixes 1 and 2 on its own, at `workers: 1`. Parallelism (Wave 2) is what recovers wall clock.

## The measured fact that makes this safe

The accumulators in the current test (`covered`, `seen`, `unchanged`, `controlExercised`, lines 451 to 454) are keyed by **variable name only**, not by `component:variable`. Splitting per component is therefore semantics preserving only if no variable name is owned by two components. It is not:

```
components: 25
total aliases: 1237
CROSS-COMPONENT VARIABLE COLLISIONS: 0
```

Wave 0 re-verifies this before any edit. If it ever returns non-zero, the split changes what the suite asserts and this plan stops.

Alias counts are skewed, which matters for parallel scheduling: `sidenavigation` 152, `badge` 130, `button` 108, down to `panel` 7 and `image` 5.

## Invariants

These must hold at the end of every wave. A wave that cannot hold them stops and reports.

1. **Coverage is identical.** The union of aliases asserted across the per-component tests equals `aliasCases` from `discoverDefaultAliases()`. No alias is dropped.
2. **All four assertion classes survive** (lines 617 to 623): `notExposed`, `notReactive`, `notControlExercised`, and the count check. They become per component.
3. **No exception table.** The test is deliberately component agnostic. It discovers everything from `src/live-tokens/data/component-configs/*/default.json` and standard DOM semantics. Do not add a skip list, an allowlist, a per-component fixture, or a "known unresolved" set. This is the single most important invariant in the document.
4. **`LIVE_TOKENS_COMPONENT` still filters** (line 29), and `npm run test:e2e:components` still works.
5. **The data tree is restored.** Follow the recipe in `CLAUDE.md` after any run. `node scripts/check-production-is-default.mjs` must pass before you commit.
6. **`tokens.css` is never written.**

## Wave 0: measure, change nothing

No code edits in this wave. Record both answers in the wave report.

**0a. Re-verify zero collisions.**

```sh
node -e "
const fs=require('fs'),path=require('path');
const root='src/live-tokens/data/component-configs';
const owners=new Map();
for(const d of fs.readdirSync(root).sort()){
  const f=path.join(root,d,'default.json');
  if(!fs.existsSync(f))continue;
  const j=JSON.parse(fs.readFileSync(f,'utf8'));
  const comp=j.component??d;
  for(const v of Object.keys(j.aliases??{})){
    if(!owners.has(v))owners.set(v,new Set());
    owners.get(v).add(comp);
  }
}
const c=[...owners.entries()].filter(([,s])=>s.size>1);
console.log('collisions:',c.length);
c.forEach(([v,s])=>console.log(' ',v,'->',[...s].join(', ')));
"
```

**Stop condition:** if `collisions` is not 0, stop the plan and report. Do not proceed to Wave 1.

**0b. Determine what the spec writes to disk.** This decides whether Wave 2 is safe. The editor exposes `PUT .../component-configs/{comp}/working` (`vite-plugin/themeFileApi.ts:1859`) and a shared `PUT .../colors-and-type/working` (`themeFileApi.ts:1838`). Per component writes are parallel safe because each component writes its own file. A shared colors-and-type write is not.

Measure **both** specs that Wave 2 would parallelize, separately, so each is classified on its own evidence:

```sh
for spec in component-render-contract component-alias-contract; do
  npm run prepare:e2e
  find .playwright-data -type f | sort | xargs shasum > /tmp/before.txt
  npx playwright test tests/e2e/$spec.spec.ts
  find .playwright-data -type f | sort | xargs shasum > /tmp/after.txt
  echo "=== $spec ==="; diff /tmp/before.txt /tmp/after.txt
done
```

Record in the report: the exact list of files that changed or appeared. Classify each as **per component** (path contains `component-configs/<id>/`) or **shared** (anything else, especially `colors-and-type/`, `themes/`, `tokens.generated.css`, `fonts.css`).

Restore the data tree afterwards per `CLAUDE.md`.

## Wave 1: one test per component

Single file: `tests/e2e/component-render-contract.spec.ts`. One commit.

Everything above line 448 stays exactly as it is. The module scope helpers (`exerciseVisibleTokenControls` 50, `exerciseVisibleSplitPaddingControls` 119, `exerciseVisibleCompositeControls` 145, `exerciseVisibleGradientControls` 186, `probeCurrentView` 234, `selectComponent` 437) are already pure over `(frame, ...)` and need no change.

The edit is to lines 448 to 624. Today:

```ts
test('every component property repaints its standardized runtime preview', async ({ page }) => {
  const frame = await openOverlayEditor(page, 'components');
  const covered = new Set<string>();
  // ... probe, traverseComponent ...
  for (const [component, aliases] of aliasesByComponent) {      // 596: pass 1
    await traverseComponent(component, aliases);
  }
  const firstPassUnresolved = aliasCases.filter(...);           // 604: pass 2
  for (const [component, aliases] of aliasesByComponent) { ... }
  expect(notExposed, ...).toEqual([]);                          // 617 to 623
});
```

After:

```ts
for (const [component, aliases] of aliasesByComponent) {
  test(`${component} repaints every property in its standardized runtime preview`, async ({ page }) => {
    test.setTimeout(600_000);
    const frame = await openOverlayEditor(page, 'components');
    const covered = new Set<string>();
    const seen = new Set<string>();
    const unchanged = new Set<string>();
    const controlExercised = new Set<string>();

    // `probe` and `traverseComponent` move here verbatim. They already close
    // over exactly these four Sets plus `frame`, and take (component, aliases,
    // forced) as arguments, so no signature changes.

    await traverseComponent(component, aliases);

    const unresolved = aliases.filter((variable) => !covered.has(variable));
    if (unresolved.length > 0) await traverseComponent(component, aliases, unresolved);

    const notExposed = aliases.filter((v) => !seen.has(v));
    const notReactive = aliases.filter((v) => seen.has(v) && !covered.has(v));
    const notControlExercised = aliases.filter((v) => !controlExercised.has(v));

    expect(notExposed, `Properties not exposed by a standardized component view:\n${notExposed.join('\n')}`)
      .toEqual([]);
    expect(notReactive, `Properties whose rendered preview did not change:\n${notReactive.join('\n')}`)
      .toEqual([]);
    expect(notControlExercised, `Properties not exercised through a rendered editor control:\n${notControlExercised.join('\n')}`)
      .toEqual([]);
    expect(covered.size).toBe(aliases.length);
  });
}
```

Notes on the transformation, each of which is a place a careless edit goes wrong:

- **The two-pass structure is preserved, scoped.** Pass 2 today computes `firstPassUnresolved` globally then filters it per component (line 605 to 609). Per component that filtering collapses into `aliases.filter(v => !covered.has(v))`. Same set, given zero collisions.
- **`test.setTimeout(600_000)` stays as is, per test.** It is a ceiling, not a cost. Do not try to scale it by alias count.
- **`unchanged` is declared but only written, never read** (declared 453, written 489; the identically named array inside `probeCurrentView` is a different value and is used). Keep it as is in this wave. Removing it is a separate cleanup and would muddy the diff a reviewer needs to read as mechanical.
- **Each test calls `openOverlayEditor` and boots its own editor.** This is why the suite gets *slower* in this wave, see below.
- **`aliasesByComponent` is built at module load**, so the tests exist at collection time and `--list` shows all 25. `LIVE_TOKENS_COMPONENT` narrows the loop and therefore the test list, which keeps invariant 4.

Add one guard test at the end of the file, because an empty discovery would otherwise produce zero tests and a green run:

```ts
test('component discovery covers every alias exactly once', () => {
  const perComponent = [...aliasesByComponent.values()].reduce((sum, a) => sum + a.length, 0);
  expect(aliasCases.length).toBeGreaterThan(0);
  expect(perComponent).toBe(aliasCases.length);
});
```

That is invariant 1 enforced in code rather than by inspection. It is not redundant with the per-component tests: they cannot detect their own absence.

**Verification for Wave 1:**

```sh
npx playwright test --list tests/e2e/component-render-contract.spec.ts   # expect 26 tests (25 + guard)
npm run test:e2e:components                                              # expect all pass
LIVE_TOKENS_COMPONENT=button npx playwright test tests/e2e/component-render-contract.spec.ts  # expect 2 tests
```

**Expect the wall clock to go up in this wave**, by roughly the cost of 24 extra editor boots (`page.goto('/demo')` plus iframe attach, a few seconds each). That is expected and is not a regression to fix here. Wave 2 is what pays it back. Record the measured before and after duration in the wave report.

**Stop condition:** if any per-component test fails that the combined test passed, stop and report. That means a component was relying on coverage credited by another component, which contradicts Wave 0a. Do not add a skip, a retry, or an exception entry to make it green.

## Wave 2: run the contract specs in parallel

Gated on Wave 0b. Read the classification first:

- **All writes per component, for both specs:** proceed as written below.
- **Only `component-render-contract` is clean:** proceed, but leave `component-alias-contract` in the stateful group.
- **Any shared write:** stop and report the file list. Parallel workers would race on it, and the fix is a per-worker data directory, which is a larger change than this plan covers.

The mechanism is **two separate Playwright invocations**, not Playwright projects.

```json
"test:e2e": "npm run test:e2e:contract && npm run test:e2e:stateful",
"test:e2e:contract": "playwright test tests/e2e/component-render-contract.spec.ts tests/e2e/component-alias-contract.spec.ts --workers=4",
"test:e2e:stateful": "playwright test tests/e2e/live-editing.spec.ts tests/e2e/theme-workflow.spec.ts --workers=1",
```

and in `playwright.config.ts`, inside the contract spec file only:

```ts
test.describe.configure({ mode: 'parallel' });
```

Why two invocations rather than Playwright projects with `dependencies`: `workers` is global config, so raising it to 4 for the contract project also lets `live-editing.spec.ts` and `theme-workflow.spec.ts` run concurrently with each other. Those two do save and adopt, and they share `.playwright-data/live-tokens`. Per project `fullyParallel: false` does not prevent file level parallelism across workers. Two sequential processes give the isolation by construction, at the cost of a second dev server boot of roughly 30 seconds. Take the 30 seconds.

Both invocations point at the same `LIVE_TOKENS_E2E_DATA_DIR`. Because they run sequentially this is safe, but do not reorder them into a single parallel command.

**Verification for Wave 2:**

```sh
npm run test:e2e     # expect all 26 + 3 tests pass, and total wall clock well under the Wave 1 number
```

Run it twice. A parallel suite that passes once and fails once is a race, not a pass. If the second run fails, stop and report which component pairs collided.

## Wave 3: wire CI

`.github/workflows/verify.yml` and `.github/workflows/publish.yml` both call `npm run test:e2e` in a step named `Test live editing in Chromium`. If Wave 2 kept `test:e2e` as the umbrella script, **neither workflow file changes**. Confirm that and say so in the report rather than editing the workflows for the sake of editing them.

The header comment in `verify.yml` states the invariant "If this is green on main, publish.yml will be too." Both must keep running the same script. Do not let them diverge.

## Rollback

Wave 1 and Wave 2 are each a single commit touching one spec file plus, for Wave 2, `package.json` scripts. `git revert` either one independently. Nothing in this plan touches runtime source, tokens, or the data tree.

## Reserved judgment calls

Escalate rather than decide:

- Any per-component test that fails after the split but passed before.
- Any nonzero result from the Wave 0a collision check.
- Any shared file write found in Wave 0b.
- Any temptation to add a skip list, an exception table, a per-component fixture, or a longer timeout for one component to get to green.
- Removing or repurposing the `unchanged` Set beyond leaving it as is.
