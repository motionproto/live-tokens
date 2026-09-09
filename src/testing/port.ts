import { execFileSync } from 'node:child_process';

export const PORT_ENV = 'LIVE_TOKENS_TEST_PORT';

const PREFERRED_PORT = 4173;

/** Bind the preferred port, fall back to whatever the OS hands out, print the
 *  answer. A Playwright config is evaluated synchronously, so the check runs in
 *  a child rather than on a listener callback. */
const PROBE = `
const net = require('net');
const listen = (port) => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(port, '127.0.0.1', () => {
    const { port: bound } = server.address();
    server.close(() => resolve(bound));
  });
});
// process.stdout.write, not console.log: the parent's FORCE_COLOR makes
// console.log wrap a number in ANSI escapes.
listen(Number(process.argv[1])).catch(() => listen(0)).then((port) => process.stdout.write(String(port)));
`;

/**
 * The port the dev server and `baseURL` share. Cached in the environment so
 * every Playwright worker, which loads the config again in its own process,
 * reads the port the main process settled on.
 */
export function resolvePort(preferred?: number): number {
  const cached = process.env[PORT_ENV];
  if (cached) return Number(cached);

  const port = preferred
    ?? Number(execFileSync(process.execPath, ['-e', PROBE, String(PREFERRED_PORT)], {
      encoding: 'utf-8',
    }).trim());
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Could not settle on a dev-server port (read ${port})`);
  }
  process.env[PORT_ENV] = String(port);
  return port;
}
