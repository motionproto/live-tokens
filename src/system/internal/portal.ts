// Move a `position: fixed` overlay to <body> so it escapes any transformed /
// `isolation` / `contain` / scrolling ancestor that would otherwise clip it or
// trap its stacking order (the editor's `.content` pane is one such ancestor;
// consumer pages have countless others). Every shipped component that renders a
// fixed overlay uses this — see check-overlay-portal.
//
// `enabled` is read once, at mount: pass `false` to leave the node in flow
// (Dialog's `inline` preview). It is intentionally not reactive — every consumer
// sets it statically, so there is no move-it-back path to get wrong.

export function portal(node: HTMLElement, enabled = true) {
  if (enabled) document.body.appendChild(node);
  return {
    destroy() {
      if (enabled) node.remove();
    },
  };
}
