# API guide

Widget Shell currently publishes five tree-shakeable entry points:

- `@volter-ai-dev/widget-shell` — the complete DOM host and all core exports
- `@volter-ai-dev/widget-shell/core` — framework- and browser-global-free state, geometry, and protocol primitives
- `@volter-ai-dev/widget-shell/frame` — the guest-side bridge
- `@volter-ai-dev/widget-shell/web-extension` — validated extension-origin and storage adapters
- `@volter-ai-dev/widget-shell/lucarne` — a serialized delivery adapter for Lucarne-controlled browsers

The `0.x` contracts are usable, but may evolve between minor releases.

## Lucarne adapter

Lucarne owns the browser session, durable injection, state envelope, and intent queues. Widget Shell
owns only the launcher, stable viewport, responsive geometry, and visual lifecycle:

```ts
import { createLucarneInjector } from "@volter-ai-dev/widget-shell/lucarne";
import { WidgetHost } from "lucarne/widget/host";

const injector = createLucarneInjector({
  launcherLabel: "Open Acme",
  launcherIcon: iconDataUrl,
  presentation: {
    footprint: { mode: "resizable", preferred: { width: 320, height: 600 } },
    viewport: { mode: "virtual", width: 390, height: 844 },
  },
});

await WidgetHost.attach(session, { ns: "acme", html, injector });
```

The guest uses Lucarne's transport-only runtime, so the app is rendered once inside Widget Shell's
viewport rather than nesting Lucarne's legacy pill/panel chrome inside another overlay. The adapter
preloads the guest because Lucarne must be able to deliver live patches while the overlay is closed.
It accepts the same direct or named presentation policies as `createOverlay`; configuration changes
participate in its revision identity, so Lucarne replaces stale shell geometry as well as stale HTML.

## WebExtension adapter

Do not derive an extension message origin with `new URL(runtime.getURL("/")).origin`: standard URL implementations serialize extension schemes as `"null"`. The adapter constructs and validates the current extension origin and keeps persisted geometry scoped by overlay identifier:

```ts
import {
  createExtensionGeometryPersistence,
  createExtensionIframeContent,
} from "@volter-ai-dev/widget-shell/web-extension";

const content = createExtensionIframeContent(browser.runtime, "app.html", {
  title: "Acme",
});
const persistence = createExtensionGeometryPersistence(browser.storage.local);
```

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

## Presentation geometry

`viewport` remains the concise compatibility API for a stable responsive surface. Presentation policies are the explicit form when an application needs content fitting, a simulated logical viewport, or named states:

```ts
const overlay = createOverlay({
  // content and launcher omitted
  presentation: {
    footprint: {
      mode: "resizable",
      preferred: { width: 320, height: 600 },
    },
    viewport: {
      mode: "virtual",
      width: 390,
      height: 844,
      fit: "contain",
      minimumScale: 0.75,
    },
  },
});
```

The iframe still lays out at exactly `390 × 844` CSS pixels. The shell scales that logical viewport into its physical footprint. When `contain` would fall below `minimumScale`, the shell preserves the readable scale and scrolls instead. `allowUpscale` defaults to false.

Content fitting is opt-in and bounded:

```ts
presentation: {
  footprint: {
    mode: "content-fit",
    preferred: { width: 360, height: 240 },
    min: { width: 280, height: 180 },
    max: { width: 720, height: 800 },
  },
  viewport: { mode: "responsive" },
}
```

An origin-validated guest reports a deliberate measurement through the frame SDK:

```ts
const shell = connectOverlayApp();
await shell.reportContentSize({ width: 420, height: 310 });
```

The measurement is advisory. The host rejects malformed or excessive values, ignores changes of one pixel or less, clamps the result, and stops automatic fitting after the user manually resizes. `overlay.resetGeometry()` returns authority to the declared policy. Widget Shell never inspects cross-origin content and does not automatically follow document or transcript height.

### Named presentation states

The host can declare the complete set of shapes an application may request:

```ts
const overlay = createOverlay({
  // content and launcher omitted
  presentations: {
    peek: {
      footprint: {
        mode: "content-fit",
        preferred: { width: 340, height: 180 },
        max: { height: 240 },
      },
      viewport: { mode: "responsive" },
    },
    panel: {
      footprint: {
        mode: "resizable",
        preferred: { width: 390, height: 667 },
      },
      viewport: { mode: "responsive" },
    },
    phone: {
      footprint: {
        mode: "resizable",
        preferred: { width: 320, height: 600 },
      },
      viewport: {
        mode: "virtual",
        width: 390,
        height: 844,
        minimumScale: 0.75,
      },
    },
    focus: {
      footprint: { mode: "fixed", width: 390, height: 667 },
      viewport: { mode: "responsive" },
      surface: "fullscreen",
    },
  },
  initialPresentation: "panel",
});
```

Host code uses `overlay.setPresentation("phone")`; guest code uses `await shell.requestPresentation("phone")`. A guest can select only a state declared by its host. Both calls return the resolved snapshot.

### Resolved presentation state

`overlay.presentation` and `overlay.subscribePresentation()` expose the shell's resolved truth:

```ts
const stop = overlay.subscribePresentation((snapshot) => {
  console.log({
    state: snapshot.name,
    authority: snapshot.authority,
    physical: snapshot.physical,
    logical: snapshot.logical,
    rendered: snapshot.rendered,
    scale: snapshot.scale,
    overflow: snapshot.overflow,
    constraints: snapshot.constraints,
  });
});
```

The guest receives the same snapshots with `shell.onPresentation()`. `surface` reports the actual floating, sheet, or full-screen mode; `authority` explains whether the default policy, guest, host, or user produced the current result. The Storybook **Presentation Geometry Lab** exposes these values while dimensions and policies are changed interactively.

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

The collapsed launcher is transparent by default. Supplying `theme.accent` opts into a filled launcher while the default behavioral controls stay intact; applications can also replace the visual node entirely:

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

The controller exposes `geometry`, `mode`, `setGeometry()`, and `resetGeometry()` for host-level controls. Guest applications use `connectOverlayApp()` to request granted capabilities, close themselves, publish launcher identity, or react to outer-shell visibility without inspecting their embedding DOM:

```ts
const shell = connectOverlayApp();
shell.setLauncher({ label: "Open Acme", icon: iconDataUrl, badge: 2, hidden: false });
const stopVisibility = shell.onVisibility((visible) => app.setActive(visible));
```

Launcher updates are confined to the guest's own source- and origin-validated overlay. Visibility is emitted only after the guest completes the bridge handshake.

For an inline application that already owns its host protocol, pass `srcdoc` instead of `src` and set
`ready: "load"`. Bridge readiness remains the default; load readiness must be selected explicitly.
