// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE } from '../storage/apiBase';

vi.mock('./themeDocumentSync', () => ({ hydrateAppliedTheme: vi.fn() }));

import { hydrateAppliedTheme } from './themeDocumentSync';
import { __resetForTests, init, LIVE_STATE_EVENT } from './liveStateStream';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners: Record<string, ((event: MessageEvent<string>) => void)[]> = {};
  closed = false;
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  emit(type: string, data: unknown) {
    for (const l of this.listeners[type] ?? []) l({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
  close() {
    this.closed = true;
  }
}

const STATE = {
  fileName: 'meadow',
  theme: { name: 'Meadow' },
  colorsAndType: { name: 'Meadow', _source: 'working' },
  componentConfigs: {},
};

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  __resetForTests();
  vi.unstubAllGlobals();
  vi.mocked(hydrateAppliedTheme).mockReset();
});

describe('liveStateStream', () => {
  it('subscribes to the events route once', () => {
    init();
    init();
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe(`${API_BASE}/events`);
  });

  it('hydrates this document from each live-state frame', () => {
    init();
    FakeEventSource.instances[0].emit(LIVE_STATE_EVENT, STATE);
    expect(hydrateAppliedTheme).toHaveBeenCalledWith('meadow', STATE);
  });

  it('does nothing where EventSource is absent', () => {
    vi.stubGlobal('EventSource', undefined);
    init();
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
