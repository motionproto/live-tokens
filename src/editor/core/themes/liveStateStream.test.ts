// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE } from '../storage/apiBase';

vi.mock('./themeDocumentSync', () => ({ hydrateAppliedTheme: vi.fn() }));
vi.mock('../productionPulse', () => ({ refreshProductionTheme: vi.fn() }));
vi.mock('../a11y/a11yReport', () => ({ receiveA11yReport: vi.fn() }));

import { hydrateAppliedTheme } from './themeDocumentSync';
import { refreshProductionTheme } from '../productionPulse';
import { receiveA11yReport } from '../a11y/a11yReport';
import { A11Y_EVENT } from '../a11y/a11yReportTypes';
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
  vi.mocked(refreshProductionTheme).mockReset();
  vi.mocked(receiveA11yReport).mockReset();
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

  it('re-reads production on each live-state frame, since an outside save can move it past the bake', () => {
    init();
    FakeEventSource.instances[0].emit(LIVE_STATE_EVENT, STATE);
    expect(refreshProductionTheme).toHaveBeenCalledTimes(1);
  });

  it('hands each a11y frame to the report store on the same stream', () => {
    init();
    const report = { state: 'running', startedAt: '2026-10-23T14:00:00.000Z', contrast: [] };
    FakeEventSource.instances[0].emit(A11Y_EVENT, report);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(receiveA11yReport).toHaveBeenCalledWith(report);
    expect(hydrateAppliedTheme).not.toHaveBeenCalled();
  });

  it('does nothing where EventSource is absent', () => {
    vi.stubGlobal('EventSource', undefined);
    init();
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
