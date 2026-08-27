# Fixed overlays must portal to body

Any `position: fixed` layer (modal, lightbox, full-screen backdrop) is trapped, clipped or painted under other chrome, by a transformed / `isolation` / `contain` / `will-change` ancestor. Real consumer pages and the editor's own preview pane both have one, so this is the normal case rather than the edge.

Render the layer with `use:portal` from `src/system/internal/portal.ts` so it escapes to `<body>`. `use:portal={enabled}` keeps an in-flow preview variant where it is; `Dialog` is the worked example. `check:overlay-portal` fails the build when a component sets `position: fixed` without it. Anchored popovers are exempt: `Tooltip` is `position: absolute` against its trigger and belongs in the flow.

Moving to `<body>` costs two things:

- DOM events from the layer no longer bubble to a consumer ancestor, so pass component callbacks the way `Dialog` does.
- A subtree-scoped CSS-variable theme no longer reaches it. This library themes via `:root`, so nothing breaks here.

A modal also needs `role="dialog"` with `aria-modal`, focus moved in on open and restored on close, and `Tab` trapped inside. `ImageLightbox` is the worked example.
