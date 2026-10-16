/**
 * Svelte action: pin a `position: fixed` popover under its trigger so no
 * scrolling or clipping ancestor can cut it off. It aligns to the trigger's
 * left edge, flips above when the space below runs out, and clamps to the
 * viewport. It re-places on scroll, resize, and content reflow.
 */

const GAP = 4;
const MARGIN = 8;

export function anchorToTrigger(node: HTMLElement, trigger: HTMLElement) {
  let anchor = trigger;
  let pendingFrame: number | null = null;

  function place(): void {
    // A container-type or transformed ancestor moves the fixed containing
    // block off the viewport origin. Measuring at 0,0 reads that offset.
    node.style.left = '0px';
    node.style.top = '0px';
    const origin = node.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(MARGIN, Math.min(a.left, vw - MARGIN - origin.width));
    let top = a.bottom + GAP;
    if (top + origin.height > vh - MARGIN) {
      const above = a.top - GAP - origin.height;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - MARGIN - origin.height);
    }

    node.style.left = `${left - origin.left}px`;
    node.style.top = `${top - origin.top}px`;
  }

  function schedule(): void {
    if (pendingFrame !== null) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      place();
    });
  }

  place();

  const ro = new ResizeObserver(schedule);
  ro.observe(node);
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);

  return {
    update(next: HTMLElement) {
      anchor = next;
      schedule();
    },
    destroy() {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    },
  };
}
