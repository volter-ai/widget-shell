import { bridgeEnvelope, isBridgeEnvelope } from "../core/protocol";

export interface GuestBridgeOptions {
  readonly allowedParentOrigins?: readonly string[];
  readonly requestTimeoutMs?: number;
}

export interface GuestBridge {
  readonly instanceId: string | undefined;
  request<T = unknown>(capability: string, payload?: unknown): Promise<T>;
  close(): void;
  setBadge(value: string | number | null): void;
  setLauncher(value: {
    readonly label?: string;
    readonly icon?: string | null;
    readonly hidden?: boolean;
    readonly badge?: string | number | null;
  }): void;
  onVisibility(listener: (visible: boolean) => void): () => void;
  destroy(): void;
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

function referrerOrigin(): string | undefined {
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // Extension frames can omit the referrer even when the browser exposes a trusted ancestor.
    }
  }
  const ancestor = window.location.ancestorOrigins?.item(0);
  return ancestor || undefined;
}

export function connectOverlayApp(options: GuestBridgeOptions = {}): GuestBridge {
  const inferredOrigin = referrerOrigin();
  const allowedOrigins = new Set(
    options.allowedParentOrigins ?? (inferredOrigin ? [inferredOrigin] : []),
  );
  if (allowedOrigins.size === 0) {
    throw new Error("An allowed parent origin is required when document.referrer has no origin");
  }

  let instanceId: string | undefined;
  let parentOrigin: string | undefined;
  let sequence = 0;
  let visible: boolean | undefined;
  const pending = new Map<string, PendingRequest>();
  const visibilityListeners = new Set<(visible: boolean) => void>();

  function onMessage(event: MessageEvent): void {
    if (
      event.source !== window.parent ||
      !allowedOrigins.has(event.origin) ||
      !isBridgeEnvelope(event.data)
    ) {
      return;
    }
    if (event.data.type === "INIT") {
      instanceId = event.data.instanceId;
      parentOrigin = event.origin;
      window.parent.postMessage(bridgeEnvelope(instanceId, "READY"), parentOrigin);
      return;
    }
    if (
      event.data.instanceId === instanceId &&
      event.data.type === "EVENT" &&
      event.data.capability === "shell.visibility" &&
      typeof event.data.payload === "boolean"
    ) {
      visible = event.data.payload;
      for (const listener of visibilityListeners) listener(visible);
      return;
    }
    if (
      event.data.instanceId !== instanceId ||
      event.data.type !== "RESPONSE" ||
      !event.data.requestId
    ) {
      return;
    }
    const request = pending.get(event.data.requestId);
    if (!request) return;
    clearTimeout(request.timeout);
    pending.delete(event.data.requestId);
    if (event.data.ok) request.resolve(event.data.payload);
    else request.reject(new Error(event.data.error ?? "Capability request failed"));
  }

  function sendEvent(capability: string, payload?: unknown): void {
    if (!instanceId || !parentOrigin) return;
    window.parent.postMessage(
      bridgeEnvelope(instanceId, "EVENT", { capability, payload }),
      parentOrigin,
    );
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") sendEvent("shell.close");
  }

  window.addEventListener("message", onMessage);
  document.addEventListener("keydown", onKeydown);

  return {
    get instanceId() {
      return instanceId;
    },
    request<T>(capability: string, payload?: unknown): Promise<T> {
      if (!instanceId || !parentOrigin)
        return Promise.reject(new Error("Overlay host is not ready"));
      const activeInstanceId = instanceId;
      const activeParentOrigin = parentOrigin;
      const requestId = `${activeInstanceId}:${++sequence}`;
      return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`Capability request timed out: ${capability}`));
        }, options.requestTimeoutMs ?? 10_000);
        pending.set(requestId, {
          resolve: (value) => resolve(value as T),
          reject,
          timeout,
        });
        window.parent.postMessage(
          bridgeEnvelope(activeInstanceId, "REQUEST", { requestId, capability, payload }),
          activeParentOrigin,
        );
      });
    },
    close() {
      sendEvent("shell.close");
    },
    setBadge(value) {
      sendEvent("launcher.badge.write", value);
    },
    setLauncher(value) {
      sendEvent("launcher.write", value);
    },
    onVisibility(listener) {
      visibilityListeners.add(listener);
      if (visible !== undefined) listener(visible);
      return () => visibilityListeners.delete(listener);
    },
    destroy() {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("keydown", onKeydown);
      for (const request of pending.values()) {
        clearTimeout(request.timeout);
        request.reject(new Error("Overlay bridge was destroyed"));
      }
      pending.clear();
      visibilityListeners.clear();
    },
  };
}
