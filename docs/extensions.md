# Extension integration

Widget Shell complements extension frameworks; it does not replace their manifests, entry-point discovery, development servers, or store packaging. Every integration follows the same split:

```text
content script     extension page
shell + grants  ⇄  responsive guest + bridge
```

The content script is privileged and bundled with the extension. The extension page is exposed as a web-accessible resource and receives only named capabilities through Widget Shell's origin-checked bridge.

## Shared adapter

`createExtensionIframeContent(runtime, path)` converts a trusted runtime URL into iframe configuration. The frame may load from Chromium's randomized `use_dynamic_url` host, but its document keeps the extension's own origin, so with `runtime.id` present (`chrome.runtime`) the allowed origin is `chrome-extension://<id>`; otherwise it is the resource URL's strict serialized extension origin. `createExtensionGeometryPersistence(storageArea)` stores versioned geometry in extension storage, scoped by overlay identifier. These utilities accept the structural WebExtension APIs used by `chrome`, `browser`, WXT, and Plasmo without importing any framework.

Grant the smallest possible host matches, permissions, web-accessible resources, and capabilities. Never point the privileged host at arbitrary or remotely selected frame URLs.

## Raw Manifest V3

[`examples/web-extension`](../examples/web-extension) is the minimal implementation. Its build has no extension framework and is part of the merge performance gate.

## WXT

[`examples/wxt`](../examples/wxt) is a complete Chrome and Firefox project. It uses WXT's content-script invalidation context to destroy the overlay exactly during development reloads. Auto-imports are disabled in the example so WXT cannot rewrite identifiers inside prebuilt dependencies.

The extension-local HTML entry point is emitted as `app.html` and explicitly declared as a web-accessible resource. No Shadow Root UI wrapper is needed because Widget Shell owns an isolated Shadow DOM host already.

## Plasmo

[`examples/plasmo`](../examples/plasmo) uses a plain content script rather than CSUI. Adding Plasmo's CSUI host would create a second isolation and lifecycle layer without improving security. A global singleton guard destroys the prior instance during development reinjection; `pagehide` handles normal teardown.

The responsive guest is an ordinary Plasmo tab page exposed only to the example's narrow host match. Plasmo's build chain is development-only; the example's production dependency audit remains clean. Because its legacy Parcel tree resolves differently across npm 10 platforms, install it from the pinned manifest without rewriting the committed lock; cross-platform `npm ci` reproducibility is not something upstream provides.

## Compatibility evidence

`npm run check` builds the framework-free package and raw extension in under one minute. The WXT example (Chrome and Firefox) and the Plasmo example (Chrome) build from the package's actual public entry points with their own `npm run build`, run when a change touches an integration.
