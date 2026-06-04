// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { navigate, setScrollReset } from './router';

describe('navigate scroll reset', () => {
  beforeEach(() => {
    setScrollReset(() => window.scrollTo(0, 0));
    history.replaceState(null, '', '/');
  });

  it('invokes the registered reset on a non-hash navigation', () => {
    const reset = vi.fn();
    setScrollReset(reset);
    navigate('/module/foo');
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('skips the reset when the target carries a hash (in-page anchor)', () => {
    const reset = vi.fn();
    setScrollReset(reset);
    navigate('/rules#combat');
    expect(reset).not.toHaveBeenCalled();
  });

  it('routes through the host provider instead of window.scrollTo', () => {
    const winScroll = vi.spyOn(window, 'scrollTo');
    const reset = vi.fn();
    setScrollReset(reset);
    navigate('/module/bar');
    expect(reset).toHaveBeenCalledTimes(1);
    expect(winScroll).not.toHaveBeenCalled();
  });
});
