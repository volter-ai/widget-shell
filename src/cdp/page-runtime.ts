// Page-context entry point for CDP delivery. It is bundled into a self-contained script, registered
// with `Page.addScriptToEvaluateOnNewDocument` and evaluated into the current document, so it runs at
// document start on every navigation and again whenever the controller re-applies it. Every run is
// idempotent: an identical revision keeps the live overlay, a different revision replaces it.
import { createOverlay, type OverlayController } from "../dom/create-overlay";
import { PAGE_BOOTSTRAP_KEY, PAGE_REGISTRY_KEY, type PageConfig } from "./page-config";

interface PageEntry {
  readonly revision: string;
  dispose(): void;
  settle(call: number, ok: boolean, value: unknown): void;
}

type Registry = Map<string, PageEntry>;
type PageGlobals = Record<PropertyKey, unknown>;

const page = globalThis as unknown as PageGlobals;
const bootstrapKey = Symbol.for(PAGE_BOOTSTRAP_KEY);
const config = page[bootstrapKey] as PageConfig | undefined;
delete page[bootstrapKey];

if (config && isTopFrame()) install(config);

function isTopFrame(): boolean {
  try {
    return window.top === window.self;
  } catch {
    return false;
  }
}

function registry(): Registry {
  const key = Symbol.for(PAGE_REGISTRY_KEY);
  let value = page[key] as Registry | undefined;
  if (!value) {
    value = new Map();
    Object.defineProperty(page, key, { value, configurable: true });
  }
  return value;
}

function install(config: PageConfig): void {
  const entries = registry();
  const current = entries.get(config.overlay.id);
  if (current?.revision === config.revision) return;
  current?.dispose();

  let controller: OverlayController | undefined;
  let guard: MutationObserver | undefined;
  let disposed = false;
  let nextCall = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >();

  const capabilities = Object.fromEntries(
    config.capabilities.map((name) => [
      name,
      (payload: unknown) =>
        new Promise((resolve, reject) => {
          const binding = page[config.binding];
          if (typeof binding !== "function") {
            reject(new Error(`Capability is not connected: ${name}`));
            return;
          }
          nextCall += 1;
          const call = nextCall;
          pending.set(call, { resolve, reject });
          try {
            (binding as (message: string) => void)(
              JSON.stringify({ overlay: config.overlay.id, call, capability: name, payload }),
            );
          } catch (error) {
            pending.delete(call);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }),
    ]),
  );

  function hostConnected(): boolean {
    return Boolean(
      document.querySelector(`[data-widget-shell-id="${CSS.escape(config.overlay.id)}"]`),
    );
  }

  function ensureMounted(): void {
    if (disposed || !document.body) return;
    if (controller && hostConnected()) return;
    controller?.destroy();
    controller = createOverlay({ ...config.overlay, capabilities });
    controller.mount();
  }

  const entry: PageEntry = {
    revision: config.revision,
    dispose() {
      if (disposed) return;
      disposed = true;
      guard?.disconnect();
      controller?.destroy();
      controller = undefined;
      for (const { reject } of pending.values()) reject(new Error("The overlay was removed"));
      pending.clear();
      if (entries.get(config.overlay.id) === entry) entries.delete(config.overlay.id);
    },
    settle(call, ok, value) {
      const request = pending.get(call);
      if (!request) return;
      pending.delete(call);
      if (ok) request.resolve(value);
      else request.reject(new Error(typeof value === "string" ? value : "Capability failed"));
    },
  };
  entries.set(config.overlay.id, entry);

  // At document start there is no body yet, and single-page applications may replace it later. The
  // guard observes the document node itself, so it works before the root element exists.
  guard = new MutationObserver(ensureMounted);
  guard.observe(document, { childList: true, subtree: true });
  ensureMounted();
}
