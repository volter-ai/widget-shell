import {
  type CdpSessionLike,
  CdpSocket,
  isPageSocket,
  type PageChannel,
  resolveWebSocketUrl,
  sessionChannel,
} from "./cdp/connection";
import {
  PAGE_BOOTSTRAP_KEY,
  PAGE_REGISTRY_KEY,
  type PageConfig,
  type SerializableOverlayOptions,
} from "./cdp/page-config";
import type { CapabilityHandler } from "./dom/create-overlay";

export type { CdpListener, CdpSessionLike } from "./cdp/connection";
export type { SerializableOverlayOptions } from "./cdp/page-config";

declare const __WIDGET_SHELL_PAGE_RUNTIME__: string;

/**
 * Where to deliver the overlay:
 * - a CDP URL: `ws(s)://…/devtools/browser/…` covers every page of the browser, including tabs
 *   opened later; `ws(s)://…/devtools/page/…` covers that page; an `http(s)://` discovery root is
 *   resolved through `/json/version`;
 * - `{ url, headers }` when the endpoint needs request headers such as `authorization`;
 * - an already-connected page session (Playwright or Puppeteer `CDPSession`), which stays yours.
 */
export type CdpEndpoint =
  | string
  | { readonly url: string; readonly headers?: Readonly<Record<string, string>> }
  | CdpSessionLike;

export interface CdpOverlayOptions extends SerializableOverlayOptions {
  /**
   * Host capabilities granted to the guest. Handlers run in this process; the page reaches them
   * through a CDP binding. Payloads and results must be JSON-serializable.
   */
  readonly capabilities?: Readonly<Record<string, CapabilityHandler>>;
}

export interface InjectedOverlay {
  readonly id: string;
  /** Page targets currently carrying the overlay. */
  readonly pages: number;
  /** Removes the overlay from every page, stops covering new documents and releases the connection. */
  remove(): Promise<void>;
}

interface CoveredPage {
  readonly channel: PageChannel;
  readonly scriptId: string | undefined;
  readonly unsubscribe: () => void;
}

/**
 * Mounts an overlay into the pages behind a CDP endpoint. The script is registered to run before
 * page scripts in every new document and evaluated into the current one; the page's CSP is bypassed
 * where the endpoint supports it; an in-page guard re-mounts the overlay when the page removes it.
 */
export async function injectOverlay(
  endpoint: CdpEndpoint,
  options: CdpOverlayOptions,
): Promise<InjectedOverlay> {
  validate(options);
  const { capabilities: handlers = {}, ...overlay } = options;
  const binding = bindingName(overlay.id);
  const config: PageConfig = {
    revision: revision(JSON.stringify({ overlay, capabilities: Object.keys(handlers) })),
    binding,
    capabilities: Object.keys(handlers),
    overlay,
  };
  const source = `(function(){globalThis[Symbol.for(${JSON.stringify(PAGE_BOOTSTRAP_KEY)})]=${JSON.stringify(config)};${__WIDGET_SHELL_PAGE_RUNTIME__}})();`;
  const pageExpression = (member: string) =>
    `(function(){var r=globalThis[Symbol.for(${JSON.stringify(PAGE_REGISTRY_KEY)})];var e=r&&r.get(${JSON.stringify(overlay.id)});if(e)e.${member};})()`;

  const pages = new Map<string, Promise<CoveredPage | undefined>>();
  let removed = false;

  async function cover(channel: PageChannel): Promise<CoveredPage> {
    const unsubscribers: Array<() => void> = [];
    await channel.send("Page.enable").catch(() => undefined);
    if (config.capabilities.length) {
      await channel.send("Runtime.enable").catch(() => undefined);
      await channel.send("Runtime.addBinding", { name: binding });
      unsubscribers.push(
        channel.on(
          "Runtime.bindingCalled",
          (event: { name?: string; payload?: string; executionContextId?: number }) => {
            if (event.name !== binding || typeof event.payload !== "string") return;
            void answer(channel, event.payload, event.executionContextId);
          },
        ),
      );
    }
    // The bypass lives as long as this CDP session, which is why each page session is held open.
    await channel.send("Page.setBypassCSP", { enabled: true }).catch(() => undefined);
    const registered = await channel.send("Page.addScriptToEvaluateOnNewDocument", { source });
    await channel.send("Runtime.evaluate", { expression: source }).catch(() => undefined);
    return {
      channel,
      scriptId: typeof registered?.identifier === "string" ? registered.identifier : undefined,
      unsubscribe: () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      },
    };
  }

  async function answer(channel: PageChannel, payload: string, contextId: number | undefined) {
    let message: { overlay?: unknown; call?: unknown; capability?: unknown; payload?: unknown };
    try {
      message = JSON.parse(payload);
    } catch {
      return;
    }
    if (message.overlay !== overlay.id || typeof message.call !== "number") return;
    const handler =
      typeof message.capability === "string" && Object.hasOwn(handlers, message.capability)
        ? handlers[message.capability]
        : undefined;
    let ok = false;
    let value: unknown;
    try {
      if (!handler) throw new Error(`Capability not granted: ${String(message.capability)}`);
      value = await handler(message.payload);
      ok = true;
    } catch (error) {
      value = error instanceof Error ? error.message : String(error);
    }
    const settle = `settle(${message.call},${ok},${JSON.stringify(value ?? null)})`;
    await channel
      .send("Runtime.evaluate", {
        expression: pageExpression(settle),
        ...(contextId === undefined ? {} : { contextId }),
      })
      .catch(() => undefined);
  }

  async function uncover(page: CoveredPage): Promise<void> {
    page.unsubscribe();
    if (page.scriptId) {
      await page.channel
        .send("Page.removeScriptToEvaluateOnNewDocument", { identifier: page.scriptId })
        .catch(() => undefined);
    }
    await page.channel
      .send("Runtime.evaluate", { expression: pageExpression("dispose()") })
      .catch(() => undefined);
    await page.channel.send("Page.setBypassCSP", { enabled: false }).catch(() => undefined);
    await page.channel.release();
  }

  let socket: CdpSocket | undefined;
  const stopListening: Array<() => void> = [];

  if (isSession(endpoint)) {
    pages.set("session", cover(sessionChannel(endpoint)));
    await pages.get("session");
  } else {
    const url = typeof endpoint === "string" ? endpoint : endpoint.url;
    const headers = typeof endpoint === "string" ? undefined : endpoint.headers;
    const socketUrl = await resolveWebSocketUrl(url, headers);
    const connection = await CdpSocket.open(socketUrl, headers);
    socket = connection;
    try {
      if (isPageSocket(socketUrl)) {
        pages.set("page", cover(connection.channel(undefined)));
        await pages.get("page");
      } else {
        await coverBrowser(connection);
      }
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  async function coverBrowser(connection: CdpSocket): Promise<void> {
    const coverTarget = (targetId: string): Promise<CoveredPage | undefined> => {
      const existing = pages.get(targetId);
      if (existing) return existing;
      const covered = (async () => {
        const { sessionId } = await connection.send("Target.attachToTarget", {
          targetId,
          flatten: true,
        });
        const channel = connection.channel(sessionId);
        if (removed) {
          await channel.release();
          return undefined;
        }
        return cover(channel);
      })();
      pages.set(targetId, covered);
      covered.catch(() => {
        if (pages.get(targetId) === covered) pages.delete(targetId);
      });
      return covered;
    };

    const { targetInfos } = await connection.send("Target.getTargets");
    const initial = (targetInfos as TargetInfo[]).filter(isOverlayPage);
    const results = await Promise.allSettled(initial.map((target) => coverTarget(target.targetId)));
    const failure = results.find((result) => result.status === "rejected");
    if (initial.length && results.every((result) => result.status === "rejected") && failure) {
      throw (failure as PromiseRejectedResult).reason;
    }

    stopListening.push(
      connection.on("Target.targetCreated", ({ targetInfo }: { targetInfo?: TargetInfo }) => {
        if (removed || !targetInfo || !isOverlayPage(targetInfo)) return;
        void coverTarget(targetInfo.targetId).catch(() => undefined);
      }),
      connection.on("Target.targetDestroyed", ({ targetId }: { targetId?: string }) => {
        if (targetId) pages.delete(targetId);
      }),
    );
    await connection.send("Target.setDiscoverTargets", { discover: true });
  }

  return {
    id: overlay.id,
    get pages() {
      return removed ? 0 : pages.size;
    },
    async remove() {
      if (removed) return;
      removed = true;
      for (const stop of stopListening) stop();
      const covered = await Promise.allSettled(pages.values());
      pages.clear();
      await Promise.all(
        covered.map((result) =>
          result.status === "fulfilled" && result.value ? uncover(result.value) : undefined,
        ),
      );
      socket?.close();
    },
  };
}

interface TargetInfo {
  readonly targetId: string;
  readonly type: string;
  readonly url: string;
}

function isOverlayPage(target: TargetInfo): boolean {
  return target.type === "page" && !target.url.startsWith("devtools://");
}

function isSession(endpoint: CdpEndpoint): endpoint is CdpSessionLike {
  return typeof endpoint === "object" && typeof (endpoint as CdpSessionLike).send === "function";
}

function validate(options: CdpOverlayOptions): void {
  if (!options.id.trim()) throw new Error("An overlay id is required");
  if (!options.launcher.label.trim()) throw new Error("A launcher label is required");
  if (options.presentation && options.presentations) {
    throw new Error("Use either presentation or presentations, not both");
  }
  if (options.initialPresentation && !options.presentations) {
    throw new Error("initialPresentation requires named presentations");
  }
}

function bindingName(id: string): string {
  return `__widgetShell_${revision(id).replace(/-/g, "_")}`;
}

function revision(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${value.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}
