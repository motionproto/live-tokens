// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { __resetForTests, receiveA11yReport } from '../../core/a11y/a11yReport';
import type { A11yFinding, A11yFinishedReport } from '../../core/a11y/a11yReportTypes';
import { openThemeSlug } from '../../core/store/editorConfigStore';
import { API_BASE } from '../../core/storage/apiBase';
import A11yByEye from './A11yByEye.svelte';

const review = (component: string, help: string): A11yFinding => ({
  rule: 'a11y-review',
  file: 'src/system/components/VideoFrame.svelte',
  line: 1,
  message: `${component}: ${help}`,
  component,
  details: { engineRule: 'video-caption', target: 'video', html: '<video>', help, helpUrl: 'https://example.test/' },
  severity: 'warn',
  repair: 'authored',
});

const CODE = review('codesnippet', 'Focus shadow sits over a gradient');
const VIDEO = review('videoframe', 'Video elements must have captions');
const LIGHTBOX = review('videolightbox', 'Video elements must have captions');

const report = (confirmed: string[]): A11yFinishedReport => ({
  state: 'finished',
  startedAt: '2026-10-29T14:00:00.000Z',
  finishedAt: '2026-10-29T14:03:00.000Z',
  theme: 'sunset',
  contrast: [],
  findings: [CODE, VIDEO, LIGHTBOX],
  ...(confirmed.length > 0 ? { confirmed } : {}),
});

let target: HTMLDivElement;
let view: ReturnType<typeof mount> | null = null;

function mountWith(confirmed: string[]) {
  receiveA11yReport(report(confirmed));
  view = mount(A11yByEye, { target });
  flushSync();
}

const texts = (selector: string) => [...target.querySelectorAll(selector)].map((el) => el.textContent?.replace(/\s+/g, ' ').trim());

beforeEach(() => {
  __resetForTests();
  openThemeSlug.set('sunset');
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (view) unmount(view);
  view = null;
  target.remove();
  openThemeSlug.set('default');
  vi.unstubAllGlobals();
});

describe('A11yByEye', () => {
  it('lists the unmarked results first, then the marked ones under Looks right, with the tally', () => {
    mountWith([VIDEO.message]);

    expect(texts('.a11y-byeye-tally')).toEqual(['2 to check, 1 look right']);
    expect(texts('.a11y-byeye-group')).toEqual(['Looks right 1']);
    const lists = target.querySelectorAll('.a11y-byeye-list');
    expect([...lists].map((list) => list.querySelectorAll('.a11y-issue').length)).toEqual([2, 1]);
    expect(lists[1].querySelector('.a11y-issue')?.classList.contains('confirmed')).toBe(true);
    expect(texts('.a11y-confirm button')).toEqual(['Looks right', 'Looks right', 'Looks right']);
    expect([...target.querySelectorAll('.a11y-confirm button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
  });

  it('keeps the marked results in a group that starts closed and opens from its summary', () => {
    mountWith([VIDEO.message]);

    const group = target.querySelector<HTMLDetailsElement>('details.a11y-byeye-done')!;
    expect(group.open).toBe(false);
    group.querySelector('summary')!.click();
    expect(group.open).toBe(true);
  });

  it('marks every unmarked result in one save', async () => {
    mountWith([VIDEO.message]);
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => report([CODE.message, VIDEO.message, LIGHTBOX.message]) }));
    vi.stubGlobal('fetch', fetch);

    const markAll = [...target.querySelectorAll('button')].find((b) => b.textContent?.includes('Mark all as looking right'))!;
    markAll.click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/a11y/confirmed`, expect.objectContaining({
      body: JSON.stringify({ theme: 'sunset', messages: [CODE.message, LIGHTBOX.message], confirmed: true }),
    }));
  });

  it('says every result looks right and offers no Mark all once all are marked', () => {
    mountWith([CODE.message, VIDEO.message, LIGHTBOX.message]);

    expect(target.querySelector('.a11y-byeye-clear')).not.toBeNull();
    expect(texts('button').some((t) => t?.includes('Mark all'))).toBe(false);
    expect(target.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('3');
  });

  it('moves focus to the toggle of the result that moves up once one is marked', async () => {
    mountWith([]);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => report([CODE.message]) })));

    target.querySelector<HTMLButtonElement>('.a11y-confirm button')!.click();
    await vi.waitFor(() => expect(texts('.a11y-byeye-tally')).toEqual(['2 to check, 1 look right']));
    await vi.waitFor(() => expect(document.activeElement?.closest('.a11y-issue')?.textContent).toContain('Video Frame'));
    expect(document.activeElement?.closest('.a11y-confirm')).not.toBeNull();
  });
});
