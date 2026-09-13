// @vitest-environment happy-dom
//
// A controlled component moves nothing itself, so the browser suites watch a
// click land and see the preview unchanged. The callback it calls instead is
// observable only from a mounted fixture, which is what this suite drives.
// The setup module is what registers the project's components; without one the
// run covers the components the package registers itself.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { Component } from 'svelte';
import { getComponentRegistryEntries } from '../editor/component-editor/registry';
import {
  ContractViolation,
  isInapplicable,
  partLocator,
  type BehaviorCase,
  type ComponentContract,
} from './componentContract';
import { selectedContracts } from './contracts';

const REGISTRY_SETUP_ENV = 'LIVE_TOKENS_REGISTRY_SETUP';

const setupModule = process.env[REGISTRY_SETUP_ENV];
if (setupModule) await import(pathToFileURL(path.resolve(setupModule)).href);

/** `<package>/src/testing/` is this file's directory in the repository and in
 *  an installed copy alike, so the package root is two levels up. */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const consumerRoot = process.cwd();

const contracts = await selectedContracts();

function runtimeUrl(contract: ComponentContract): string {
  const entry = getComponentRegistryEntries().find((candidate) => candidate.id === contract.id);
  if (!entry) {
    throw new ContractViolation('contract-behavior', contract.id, 'no component is registered under this id');
  }
  const root = entry.origin === 'system' ? packageRoot : consumerRoot;
  return pathToFileURL(path.resolve(root, entry.sourceFile)).href;
}

async function loadRuntime(contract: ComponentContract): Promise<Component<Record<string, unknown>>> {
  const module = await import(/* @vite-ignore */ runtimeUrl(contract));
  return module.default as Component<Record<string, unknown>>;
}

function resolvePart(contract: ComponentContract, target: HTMLElement, key: string): HTMLElement {
  const locator = partLocator(contract, key);
  const scope: ParentNode = locator.portal ? document : target;
  const node = scope.querySelector<HTMLElement>(locator.selector);
  if (!node) {
    throw new ContractViolation('contract-behavior', contract.id, `no element matches part "${key}" (${locator.selector})`);
  }
  return node;
}

function dispatch(node: HTMLElement, action: NonNullable<BehaviorCase['action']>): void {
  if (action.kind === 'click') {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return;
  }
  if (action.kind === 'keydown') {
    node.dispatchEvent(new KeyboardEvent('keydown', { key: action.key ?? '', bubbles: true, cancelable: true }));
    return;
  }
  (node as HTMLInputElement).value = action.value ?? '';
  node.dispatchEvent(new Event('input', { bubbles: true }));
}

function describeValue(value: unknown): string {
  if (value instanceof Event) return `${value.constructor.name}(${value.type})`;
  return JSON.stringify(value) ?? String(value);
}

/** An expected object pins the keys it names and nothing else, so a case can
 *  ask for `{ type: 'click' }` of the event a DOM handler hands on. */
function matchesArg(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object' || Array.isArray(expected)) {
    return Object.is(actual, expected);
  }
  if (actual === null || typeof actual !== 'object') return false;
  return Object.entries(expected as Record<string, unknown>)
    .every(([key, value]) => matchesArg((actual as Record<string, unknown>)[key], value));
}

function sameArgs(actual: unknown[], expected: unknown[]): boolean {
  return actual.length === expected.length
    && expected.every((value, index) => matchesArg(actual[index], value));
}

async function runCase(contract: ComponentContract, testCase: BehaviorCase): Promise<void> {
  const runtime = await loadRuntime(contract);
  const target = document.createElement('div');
  document.body.appendChild(target);
  const fail = (message: string): never => {
    throw new ContractViolation('contract-behavior', contract.id, `${testCase.name}: ${message}`);
  };

  const expectation = testCase.expect;
  const callbackProp = expectation.kind === 'callback' || expectation.kind === 'no-callback'
    ? expectation.prop
    : null;
  const spy = callbackProp === null ? null : vi.fn();
  const props: Record<string, unknown> = {
    ...testCase.props,
    ...(callbackProp === null ? {} : { [callbackProp]: spy }),
  };

  const instance = mount(runtime, { target, props });
  flushSync();
  try {
    if (testCase.action) {
      dispatch(resolvePart(contract, target, testCase.action.part), testCase.action);
      flushSync();
    }
    if (expectation.kind === 'callback') {
      const calls = spy!.mock.calls;
      if (calls.length === 0) fail(`${expectation.prop} was not called`);
      if (!sameArgs(calls[0], expectation.args)) {
        fail(`${expectation.prop} was called with [${calls[0].map(describeValue).join(', ')}], expected ${describeValue(expectation.args)}`);
      }
      return;
    }
    if (expectation.kind === 'no-callback') {
      if (spy!.mock.calls.length > 0) {
        fail(`${expectation.prop} was called with [${spy!.mock.calls[0].map(describeValue).join(', ')}]`);
      }
      return;
    }
    const node = resolvePart(contract, target, expectation.part);
    if (expectation.kind === 'attribute') {
      const actual = node.getAttribute(expectation.name);
      if (actual !== expectation.value) {
        fail(`${expectation.part}[${expectation.name}] is ${describeValue(actual)}, expected ${describeValue(expectation.value)}`);
      }
      return;
    }
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text !== expectation.value) {
      fail(`${expectation.part} reads ${describeValue(text)}, expected ${describeValue(expectation.value)}`);
    }
  } finally {
    unmount(instance);
    target.remove();
  }
}

describe('component behavior contract', () => {
  describe.each(contracts.map((contract) => [contract.id, contract] as const))('%s', (_id, contract) => {
    const declared = contract.behavior;
    if (isInapplicable(declared)) {
      it('says why it declares no behavior', () => {
        if (declared.reason.trim() === '') {
          throw new ContractViolation('contract-behavior', contract.id, 'behavior is inapplicable with no reason');
        }
      });
      return;
    }
    // A contract written before `behavior` existed reaches here with the field
    // missing, which the types forbid but a consumer's upgrade produces.
    if (!declared || declared.cases.length === 0) {
      it('declares its behavior', () => {
        throw new ContractViolation(
          'contract-behavior',
          contract.id,
          'declare `behavior` with at least one case, or mark it { applicable: false, reason }',
        );
      });
      return;
    }
    it.each(declared.cases.map((testCase) => [testCase.name, testCase] as const))('%s', async (_name, testCase) => {
      await runCase(contract, testCase);
    });
  });
});
