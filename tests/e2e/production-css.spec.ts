import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Page } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VITE = path.join(ROOT, 'node_modules/vite/bin/vite.js');
const OUT = path.join(ROOT, 'test-results/production-css');
const HOST = '127.0.0.1';

const ROUTES = ['/', '/demo', '/skills', '/testing-loops', '/playground/floating-tags'];
const WIDTHS = [1280, 768, 480];
const HEIGHT = 900;
const STATES_PAGE = '/tests/e2e/production-css/states.html';
const SHOWN = 25;

const APPS = {
  site: { config: 'vite.config.ts', page: '/' },
  states: { config: 'tests/e2e/production-css/vite.config.ts', page: STATES_PAGE },
} as const;
type App = keyof typeof APPS;
type Build = 'untransformed' | 'transformed';

function buildEnv(build: Build): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true',
    LIVE_TOKENS_PRODUCTION_CSS: build === 'untransformed' ? 'false' : '',
  };
  // A build reads the project's own data tree, as `npm run build` does, never the contract run's copy.
  delete env.LIVE_TOKENS_TEST_DATA_DIR;
  delete env.LIVE_TOKENS_DATA_DIR;
  return env;
}

const outDir = (app: App, build: Build) => path.join(OUT, `${app}-${build}`);

function viteBuild(app: App, build: Build): void {
  execFileSync(
    process.execPath,
    [VITE, 'build', '--config', APPS[app].config, '--outDir', outDir(app, build), '--emptyOutDir', '--logLevel', 'warn'],
    { cwd: ROOT, env: buildEnv(build), stdio: 'pipe' },
  );
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, HOST, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

const previews: ChildProcess[] = [];

async function vitePreview(app: App, build: Build): Promise<string> {
  const port = await freePort();
  previews.push(spawn(
    process.execPath,
    [VITE, 'preview', '--config', APPS[app].config, '--outDir', outDir(app, build), '--host', HOST, '--port', String(port), '--strictPort'],
    { cwd: ROOT, env: buildEnv(build), stdio: 'ignore' },
  ));
  const url = `http://${HOST}:${port}`;
  const deadline = Date.now() + 30_000;
  while (!(await fetch(url + APPS[app].page).then((response) => response.ok, () => false))) {
    if (Date.now() > deadline) throw new Error(`vite preview of the ${build} ${app} build never answered on ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return url;
}

interface Snapshot {
  properties: string[];
  elements: [string, string[]][];
}

/** Runs in the page: every element's and every rendered pseudo-element's standard computed properties. */
function snapshot(): Snapshot {
  const properties = Array.from(getComputedStyle(document.documentElement)).filter((name) => !name.startsWith('--'));
  const read = (style: CSSStyleDeclaration) => properties.map((name) => style.getPropertyValue(name));
  const segment = (el: Element) => {
    const classes = Array.from(el.classList).filter((name) => !name.startsWith('svelte-'));
    const index = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) + 1 : 1;
    return `${el.localName}${el.id ? `#${el.id}` : ''}${classes.map((name) => `.${name}`).join('')}:nth-child(${index})`;
  };
  const paths = new Map<Element, string>();
  const elements: [string, string[]][] = [];
  for (const el of document.querySelectorAll('*')) {
    const parent = el.parentElement ? paths.get(el.parentElement) : undefined;
    const elPath = parent ? `${parent} > ${segment(el)}` : segment(el);
    paths.set(el, elPath);
    elements.push([elPath, read(getComputedStyle(el))]);
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(el, pseudo);
      if (style.content === 'none' || style.content === 'normal') continue;
      elements.push([`${elPath}${pseudo}`, read(style)]);
    }
  }
  return { properties, elements };
}

/** Waits out fonts and images, then holds every animation and transition at a fixed point. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })),
    );
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // A finished step can start another transition, such as the blur that follows a Dialog's focus move.
    for (let round = 0; round < 20; round++) {
      await frames();
      const running = document.getAnimations().filter((animation) => animation.playState === 'running');
      if (!running.length) return;
      for (const animation of running) {
        if (animation.effect?.getComputedTiming().endTime === Infinity) {
          animation.pause();
          animation.currentTime = 0;
        } else {
          animation.finish();
        }
      }
    }
    throw new Error('animations kept starting after twenty rounds');
  });
}

async function open(browser: Browser, url: string, width: number): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height: HEIGHT } });
  // Remote fonts load in their own time; without them both builds render the same fallbacks.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === HOST ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await settle(page);
  return page;
}

function differences(untransformed: Snapshot, transformed: Snapshot): string[] {
  expect(transformed.properties).toEqual(untransformed.properties);
  const found: string[] = [];
  const count = Math.max(untransformed.elements.length, transformed.elements.length);
  for (let i = 0; i < count; i++) {
    const [before, beforeValues] = untransformed.elements[i] ?? ['no element', []];
    const [after, afterValues] = transformed.elements[i] ?? ['no element', []];
    if (before !== after) {
      found.push(`element ${i + 1}: untransformed ${before}, transformed ${after}`);
      break;
    }
    untransformed.properties.forEach((property, p) => {
      if (beforeValues[p] !== afterValues[p]) {
        found.push(`${before} { ${property} }: untransformed ${JSON.stringify(beforeValues[p])}, transformed ${JSON.stringify(afterValues[p])}`);
      }
    });
  }
  return found;
}

async function compare(pages: Record<Build, Page>, state: string, step?: (page: Page) => Promise<void>) {
  const snapshots = await Promise.all(
    [pages.untransformed, pages.transformed].map(async (page) => {
      if (step) {
        await step(page);
        await settle(page);
      }
      return page.evaluate(snapshot);
    }),
  );
  const found = differences(snapshots[0], snapshots[1]);
  expect(found.slice(0, SHOWN), `${found.length} computed values differ ${state}`).toEqual([]);
}

const servers: Record<App, Record<Build, string>> = {
  site: { untransformed: '', transformed: '' },
  states: { untransformed: '', transformed: '' },
};

test.beforeAll(async () => {
  test.setTimeout(180_000);
  for (const app of Object.keys(APPS) as App[]) {
    for (const build of ['untransformed', 'transformed'] as Build[]) {
      viteBuild(app, build);
      servers[app][build] = await vitePreview(app, build);
    }
  }
});

test.afterAll(() => {
  for (const preview of previews) preview.kill();
});

async function withBoth(
  browser: Browser,
  app: App,
  pathname: string,
  width: number,
  run: (pages: Record<Build, Page>) => Promise<void>,
): Promise<void> {
  const [untransformed, transformed] = await Promise.all(
    (['untransformed', 'transformed'] as Build[]).map((build) => open(browser, servers[app][build] + pathname, width)),
  );
  try {
    await run({ untransformed, transformed });
  } finally {
    await Promise.all([untransformed.context().close(), transformed.context().close()]);
  }
}

for (const width of WIDTHS) {
  for (const route of ROUTES) {
    test(`${route} computes the same styles at ${width}px wide`, async ({ browser }) => {
      test.setTimeout(120_000);
      await withBoth(browser, 'site', route, width, async (pages) => {
        await compare(pages, 'at rest');
        await compare(pages, 'on a light backdrop', (page) =>
          page.evaluate(() => document.documentElement.setAttribute('data-backdrop', 'light')),
        );
      });
    });
  }

  test(`backdrops, hover and an open Dialog compute the same styles at ${width}px wide`, async ({ browser }) => {
    test.setTimeout(120_000);
    await withBoth(browser, 'states', STATES_PAGE, width, async (pages) => {
      await compare(pages, 'at rest');
      await compare(pages, 'with a Card hovered', (page) => page.hover('[data-backdrop="light"] .card'));
      await compare(pages, 'with a Button hovered', (page) => page.hover('[data-backdrop="dark"] .button.primary'));
      await compare(pages, 'with the Dialog open', (page) => page.click('.open-dialog'));
    });
  });
}
