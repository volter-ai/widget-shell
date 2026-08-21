# Minimal WebExtension example

This example bundles Widget Shell into a Manifest V3 content script, loads an extension-local responsive app, and persists geometry through `chrome.storage.local`. It intentionally matches only `https://example.com/*`; broaden permissions only when the product actually requires them.

```sh
npm run example:build
```

Load `examples/web-extension/dist` as an unpacked extension, then visit `https://example.com/`.
