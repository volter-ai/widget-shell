import { createOverlay } from "@volter-ai-dev/widget-shell";
import {
  createExtensionGeometryPersistence,
  createExtensionIframeContent,
} from "@volter-ai-dev/widget-shell/web-extension";
import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
  matches: ["https://example.com/*"],
  main(context) {
    const overlay = createOverlay({
      id: "widget-shell-wxt-example",
      content: createExtensionIframeContent(browser.runtime, "app.html", {
        title: "WXT overlay example",
      }),
      launcher: { label: "Open WXT example" },
      behavior: {
        persistence: createExtensionGeometryPersistence(browser.storage.local),
      },
      capabilities: {
        "page.url.read": () => window.location.href,
      },
    });

    overlay.mount();
    context.onInvalidated(() => overlay.destroy());
  },
});
