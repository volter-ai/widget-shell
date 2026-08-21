# API guide

Widget Shell currently publishes three tree-shakeable entry points:

- `@volter-ai-dev/widget-shell` — the complete DOM host and all core exports
- `@volter-ai-dev/widget-shell/core` — framework- and browser-global-free state, geometry, and protocol primitives
- `@volter-ai-dev/widget-shell/frame` — the guest-side bridge

APIs may change before `0.1.0`.

## Create an overlay

```ts
import { createOverlay } from "@volter-ai-dev/widget-shell";

const overlay = createOverlay({
  id: "acme",
  content: {
    kind: "iframe",
    src: browser.runtime.getURL("/app.html"),
    allowedOrigin: new URL(browser.runtime.getURL("/")).origin,
    title: "Acme",
  },
  launcher: { label: "Open Acme", icon: browser.runtime.getURL("/icon.svg") },
  viewport: "mobile-sm",
  behavior: {
    draggable: true,
    resizable: true,
    snap: true,
    coordination: "exclusive",
    persistence: extensionGeometryStore,
  },
});

overlay.mount();
```

`exclusive` coordination closes another exclusive overlay before opening this one. Use `independent` for tools that intentionally coexist; activating either still raises its layer.

## Persistence

Persistence is an injected capability because the correct store depends on delivery mode:

```ts
const extensionGeometryStore = {
  async load(id: string) {
    return (await browser.storage.local.get(`overlay:${id}`))[`overlay:${id}`];
  },
  async save(id: string, geometry: WindowGeometry) {
    await browser.storage.local.set({ [`overlay:${id}`]: geometry });
  },
};
```

For an ordinary owned-site embed, `createLocalStorageGeometryPersistence(localStorage)` is available. Do not use page `localStorage` from a general content script: that would couple extension state to each host origin.

Persisted geometry is always validated and constrained against the current host before use. A position saved on a large monitor therefore cannot strand the overlay outside a smaller window.

## Custom surfaces

The default behavioral controls stay intact while applications replace their visuals:

```ts
createOverlay({
  // content and launcher omitted
  theme: {
    accent: "#006f62",
    radius: "11px",
    shadow: "0 18px 55px rgba(0, 62, 53, .22)",
  },
  launcher: {
    label: "Open Acme",
    render: ({ open }) => open ? closeMark() : acmeMark(),
  },
  slots: {
    loading: () => loadingSurface(),
    error: ({ message, retry }) => errorSurface(message, retry),
  },
});
```

This preserves labeling, keyboard behavior, badges, geometry, and lifecycle even when the visual nodes are fully application-owned.

## Interaction and accessibility

The move and resize handles support pointer input and arrow keys. Hold Shift for larger keyboard steps. They disappear in sheet and full-screen modes, where manual floating geometry is retained and restored when the host grows again.

The controller exposes `geometry`, `mode`, `setGeometry()`, and `resetGeometry()` for host-level controls. Guest applications use `connectOverlayApp()` to request granted capabilities, close themselves, or update their launcher badge.

