// Relocate a node to <body> so a `position: fixed` overlay escapes any
// transformed / `isolation` / `contain` / scrolling ancestor that would
// otherwise clip it or trap its stacking order (the editor's `.content` pane
// is one such ancestor; consumer pages have countless others). Every shipped
// component that renders a fixed overlay uses this — see check-overlay-portal.
//
// `enabled` lets a component opt out per-instance (Dialog's `inline` preview
// stays in flow). Toggling `enabled` reactively moves the node out to <body>
// and back: an `anchor` comment marks the node's original slot so it can return.

export function portal(node: HTMLElement, enabled: boolean = true) {
  const anchor = document.createComment('portal');
  node.before(anchor);
  let moved = false;

  function apply(on: boolean) {
    if (on === moved) return;
    if (on) {
      document.body.appendChild(node);
    } else {
      anchor.before(node);
    }
    moved = on;
  }

  apply(enabled);

  return {
    update: apply,
    destroy() {
      if (moved) node.remove();
      anchor.remove();
    },
  };
}
