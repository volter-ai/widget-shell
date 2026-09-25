// A dependency-free CDP client over the standard `fetch` and `WebSocket` globals, so the CDP
// delivery runs anywhere those exist: Node 22+, Deno, Bun, a browser, or a worker.

// biome-ignore lint/suspicious/noExplicitAny: CDP results are protocol-shaped JSON.
export type CdpResult = any;
// biome-ignore lint/suspicious/noExplicitAny: CDP event parameters are protocol-shaped JSON.
export type CdpListener = (params: any) => void;

/**
 * An already-connected CDP session for one page, such as Playwright's `CDPSession` or Puppeteer's
 * `CDPSession`. The caller keeps ownership of the connection; Widget Shell never closes it.
 */
export interface CdpSessionLike {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  on(event: string, listener: CdpListener): unknown;
  off?(event: string, listener: CdpListener): unknown;
}

/** One page's command channel, whichever way it was reached. */
export interface PageChannel {
  send(method: string, params?: Record<string, unknown>): Promise<CdpResult>;
  on(event: string, listener: CdpListener): () => void;
  /** Releases the channel. Never closes a caller-owned session. */
  release(): Promise<void>;
}

interface Pending {
  readonly resolve: (value: CdpResult) => void;
  readonly reject: (reason: Error) => void;
}

type WebSocketWithHeaders = new (
  url: string,
  init?: { headers?: Readonly<Record<string, string>> },
) => WebSocket;

export class CdpSocket {
  private nextId = 0;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Map<string, Set<CdpListener>>();
  private closed = false;

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => this.receive(String(event.data)));
    socket.addEventListener("close", () => this.shutdown(new Error("CDP connection closed")));
  }

  static open(url: string, headers?: Readonly<Record<string, string>>): Promise<CdpSocket> {
    const Socket = globalThis.WebSocket as unknown as WebSocketWithHeaders | undefined;
    if (!Socket) throw new Error("CDP delivery requires a global WebSocket (Node.js 22 or later)");
    // Node's WebSocket accepts request headers as a non-standard init member; browsers ignore it.
    const socket = headers ? new Socket(url, { headers }) : new Socket(url);
    return new Promise((resolve, reject) => {
      const fail = () => reject(new Error(`Could not open CDP WebSocket ${redact(url)}`));
      socket.addEventListener("error", fail, { once: true });
      socket.addEventListener(
        "open",
        () => {
          socket.removeEventListener("error", fail);
          resolve(new CdpSocket(socket));
        },
        { once: true },
      );
    });
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<CdpResult> {
    if (this.closed) return Promise.reject(new Error("CDP connection closed"));
    this.nextId += 1;
    const id = this.nextId;
    const message = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(message));
    });
  }

  on(event: string, listener: CdpListener, sessionId?: string): () => void {
    const key = `${sessionId ?? ""}:${event}`;
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  close(): void {
    if (this.closed) return;
    this.socket.close();
    this.shutdown(new Error("CDP connection closed"));
  }

  /** A channel for one flattened target session (`Target.attachToTarget` with `flatten: true`). */
  channel(sessionId: string | undefined): PageChannel {
    return {
      send: (method, params) => this.send(method, params, sessionId),
      on: (event, listener) => this.on(event, listener, sessionId),
      release: async () => {
        if (sessionId) {
          await this.send("Target.detachFromTarget", { sessionId }).catch(() => undefined);
        }
      },
    };
  }

  private receive(data: string): void {
    let message: {
      id?: number;
      method?: string;
      params?: unknown;
      result?: unknown;
      error?: { message?: string };
      sessionId?: string;
    };
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    if (typeof message.id === "number") {
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message ?? "CDP command failed"));
      else request.resolve(message.result ?? {});
      return;
    }
    if (!message.method) return;
    const set = this.listeners.get(`${message.sessionId ?? ""}:${message.method}`);
    if (set) for (const listener of [...set]) listener(message.params ?? {});
  }

  private shutdown(reason: Error): void {
    if (this.closed) return;
    this.closed = true;
    for (const request of this.pending.values()) request.reject(reason);
    this.pending.clear();
    this.listeners.clear();
  }
}

/** Adapts a caller-owned page session to a channel. */
export function sessionChannel(session: CdpSessionLike): PageChannel {
  return {
    send: (method, params) => session.send(method, params) as Promise<CdpResult>,
    on(event, listener) {
      session.on(event, listener);
      return () => {
        session.off?.(event, listener);
      };
    },
    release: async () => undefined,
  };
}

/**
 * Resolves a CDP endpoint to its WebSocket URL. An HTTP(S) endpoint is a discovery root
 * (`<root>/json/version`); its query string (for example an access token) is carried onto the
 * discovered WebSocket URL when that URL has none of its own.
 */
export async function resolveWebSocketUrl(
  endpoint: string,
  headers?: Readonly<Record<string, string>>,
): Promise<string> {
  const url = new URL(endpoint);
  if (url.protocol === "ws:" || url.protocol === "wss:") return url.href;
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported CDP endpoint protocol: ${url.protocol}`);
  }
  const discovery = new URL(url.href);
  discovery.pathname = `${discovery.pathname.replace(/\/$/, "")}/json/version`;
  const response = await fetch(discovery, headers ? { headers } : {});
  if (!response.ok) {
    throw new Error(
      `CDP discovery failed with HTTP ${response.status} at ${redact(discovery.href)}`,
    );
  }
  const info = (await response.json()) as { webSocketDebuggerUrl?: unknown };
  if (typeof info.webSocketDebuggerUrl !== "string") {
    throw new Error(`CDP discovery returned no webSocketDebuggerUrl at ${redact(discovery.href)}`);
  }
  const socketUrl = new URL(info.webSocketDebuggerUrl);
  if (!socketUrl.search && url.search) socketUrl.search = url.search;
  return socketUrl.href;
}

/** True when the WebSocket URL addresses one page rather than the browser. */
export function isPageSocket(url: string): boolean {
  return /\/devtools\/page\//.test(new URL(url).pathname);
}

function redact(url: string): string {
  const parsed = new URL(url);
  parsed.search = parsed.search ? "?…" : "";
  return parsed.href;
}
