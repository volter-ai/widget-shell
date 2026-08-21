import { createOverlay } from "../../src";

const extensionOrigin = new URL(chrome.runtime.getURL("/")).origin;

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
}).mount();
