import {
  createExtensionGeometryPersistence,
  createExtensionIframeContent,
  createOverlay,
} from "../../src";

createOverlay({
  id: "widget-shell-example",
  content: createExtensionIframeContent(chrome.runtime, "app.html", {
    title: "Widget Shell example application",
  }),
  launcher: {
    label: "Open example application",
    badge: 2,
  },
  capabilities: {
    "page.url.read": () => window.location.href,
    "selection.read": () => window.getSelection()?.toString() ?? "",
  },
  behavior: {
    persistence: createExtensionGeometryPersistence(chrome.storage.local),
  },
}).mount();
