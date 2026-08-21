import { createOverlay, type OverlayController } from "@volter-ai-dev/widget-shell";
import {
  createExtensionGeometryPersistence,
  createExtensionIframeContent,
} from "@volter-ai-dev/widget-shell/web-extension";
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://example.com/*"],
};

const INSTANCE = Symbol.for("widget-shell:plasmo-example");
const scope = globalThis as typeof globalThis & {
  [INSTANCE]?: OverlayController;
};

scope[INSTANCE]?.destroy();

const overlay = createOverlay({
  id: "widget-shell-plasmo-example",
  content: createExtensionIframeContent(chrome.runtime, "tabs/app.html", {
    title: "Plasmo overlay example",
  }),
  launcher: { label: "Open Plasmo example" },
  behavior: {
    persistence: createExtensionGeometryPersistence(chrome.storage.local),
  },
  capabilities: {
    "page.url.read": () => window.location.href,
  },
});

overlay.mount();
scope[INSTANCE] = overlay;
window.addEventListener("pagehide", () => overlay.destroy(), { once: true });
