import { createOverlay } from "../../src";

const extensionOrigin = new URL(chrome.runtime.getURL("/")).origin;
const geometryKey = "widget-shell-example:geometry";

createOverlay({
  id: "widget-shell-example",
  content: {
    kind: "iframe",
    src: chrome.runtime.getURL("app.html"),
    allowedOrigin: extensionOrigin,
    title: "Widget Shell example application",
  },
  launcher: {
    label: "Open example application",
    badge: 2,
  },
  capabilities: {
    "page.url.read": () => window.location.href,
    "selection.read": () => window.getSelection()?.toString() ?? "",
  },
  behavior: {
    persistence: {
      async load() {
        return (await chrome.storage.local.get(geometryKey))[geometryKey];
      },
      async save(_id, geometry) {
        await chrome.storage.local.set({ [geometryKey]: geometry });
      },
      async remove() {
        await chrome.storage.local.remove(geometryKey);
      },
    },
  },
}).mount();
