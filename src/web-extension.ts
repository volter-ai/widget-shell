import type { IframeContent } from "./dom/create-overlay";
import type { GeometryPersistence } from "./dom/persistence";

export interface ExtensionRuntimeLike {
  getURL(path: string): string;
}

export interface ExtensionStorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface ExtensionIframeOptions {
  readonly title?: string;
  readonly sandbox?: readonly string[];
}

const EXTENSION_PROTOCOLS = new Set([
  "chrome-extension:",
  "moz-extension:",
  "safari-web-extension:",
]);

function serializedExtensionOrigin(value: string): string {
  const url = new URL(value);
  if (!EXTENSION_PROTOCOLS.has(url.protocol) || !url.host) {
    throw new Error(`Unsupported extension URL: ${url.href}`);
  }
  return `${url.protocol}//${url.host}`;
}

/**
 * Returns the serialized security origin used by extension frame messages.
 *
 * `URL#origin` returns `"null"` for extension schemes, so the origin must be
 * formed from the already trusted runtime URL instead.
 */
export function extensionOrigin(runtime: ExtensionRuntimeLike): string {
  return serializedExtensionOrigin(runtime.getURL("/"));
}

export function createExtensionIframeContent(
  runtime: ExtensionRuntimeLike,
  path: string,
  options: ExtensionIframeOptions = {},
): IframeContent {
  const src = runtime.getURL(path);
  // Chromium may give web-accessible resources a randomized host when the
  // manifest enables `use_dynamic_url`. The runtime-created URL remains the
  // authority; its serialized origin is the one frame messages actually use.
  const origin = serializedExtensionOrigin(src);
  return {
    kind: "iframe",
    src,
    allowedOrigin: origin,
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.sandbox === undefined ? {} : { sandbox: options.sandbox }),
  };
}

export function createExtensionGeometryPersistence(
  storageArea: ExtensionStorageAreaLike,
  prefix = "widget-shell:geometry:",
): GeometryPersistence {
  return {
    async load(id) {
      const key = `${prefix}${id}`;
      return (await storageArea.get(key))[key];
    },
    async save(id, geometry) {
      await storageArea.set({ [`${prefix}${id}`]: { version: 1, geometry } });
    },
    async remove(id) {
      await storageArea.remove(`${prefix}${id}`);
    },
  };
}
