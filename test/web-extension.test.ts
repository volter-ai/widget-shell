import { describe, expect, it } from "vitest";
import {
  createExtensionGeometryPersistence,
  createExtensionIframeContent,
  extensionOrigin,
} from "../src/web-extension";

describe("WebExtension security and persistence boundary", () => {
  it("derives a strict extension origin and keeps geometry scoped by instance", async () => {
    const runtime = { getURL: (path: string) => `chrome-extension://trusted-id/${path}` };
    expect(new URL(runtime.getURL("/")).origin).toBe("null");
    expect(extensionOrigin(runtime)).toBe("chrome-extension://trusted-id");
    expect(createExtensionIframeContent(runtime, "app.html")).toMatchObject({
      src: "chrome-extension://trusted-id/app.html",
      allowedOrigin: "chrome-extension://trusted-id",
    });

    const values: Record<string, unknown> = {};
    const persistence = createExtensionGeometryPersistence({
      async get(key) {
        return { [key]: values[key] };
      },
      async set(items) {
        Object.assign(values, items);
      },
      async remove(key) {
        delete values[key];
      },
    });
    const geometry = { x: 20, y: 30, width: 390, height: 667 };
    await persistence.save("assistant", geometry);

    expect(await persistence.load("assistant")).toEqual({ version: 1, geometry });
    expect(await persistence.load("other")).toBeUndefined();
    await persistence.remove?.("assistant");
    expect(await persistence.load("assistant")).toBeUndefined();
  });
});
