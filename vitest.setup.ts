/* happy-dom ships no Web Animations API, and Svelte 5 runs every transition
   through element.animate(). Without this, mounting a component that reveals a
   transitioned block throws `element.animate is not a function`. The stub
   finishes on the next microtask, so transitions resolve instantly under test
   instead of holding a timer open. */
if (typeof Element !== 'undefined' && typeof Element.prototype.animate !== 'function') {
  Element.prototype.animate = function stubAnimate() {
    const animation = {
      currentTime: 0,
      playState: 'finished',
      effect: null,
      onfinish: null as null | (() => void),
      cancel() {},
      finished: Promise.resolve(),
    };
    queueMicrotask(() => animation.onfinish?.());
    return animation as unknown as Animation;
  } as Element['animate'];
}
