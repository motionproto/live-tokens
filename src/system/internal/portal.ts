// Relocate a node to <body> so a `position: fixed` overlay escapes any
// transformed / `isolation` / `contain` / scrolling ancestor that would
// otherwise clip it or trap its stacking order (the editor's `.content` pane
// is one such ancestor; consumer pages have countless others). Every shipped
// component that renders a fixed overlay uses this — see check-overlay-portal.
//
// `enabled` lets a component opt out per-instance (Dialog's `inline` preview
// stays in flow). When disabled the node is left exactly where Svelte put it.

export function portal(node: HTMLElement, enabled: boolean = true) {
  let moved = false;

  function apply(on: boolean) {
    if (on && !moved) {
      document.body.appendChild(node);
      moved = true;
    }
  }

  apply(enabled);

  return {
    update: apply,
    destroy() {
      if (moved) node.remove();
    },
  };
}
