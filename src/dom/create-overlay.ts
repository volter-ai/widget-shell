import {
  bridgeEnvelope,
  isBridgeEnvelope,
  type OverlayPlacement,
  type OverlayState,
  resolveViewport,
  transitionOverlay,
  type ViewportInput,
} from "../core";
import { INITIAL_OVERLAY_STATE } from "../core/lifecycle";
import { SHELL_STYLES } from "../styles";

export interface IframeContent {
  readonly kind: "iframe";
  readonly src: string;
  readonly title?: string;
  readonly allowedOrigin?: string;
  readonly sandbox?: readonly string[];
}

export interface LauncherOptions {
  readonly label: string;
  readonly closeLabel?: string;
  readonly icon?: string;
  readonly badge?: string | number;
}

export type CapabilityHandler = (payload: unknown) => unknown | Promise<unknown>;

export interface OverlayOptions {
  readonly id: string;
  readonly content: IframeContent;
  readonly viewport?: ViewportInput;
  readonly placement?: OverlayPlacement;
  readonly launcher: LauncherOptions;
  readonly capabilities?: Readonly<Record<string, CapabilityHandler>>;
  readonly target?: HTMLElement;
  readonly initiallyOpen?: boolean;
  readonly loadTimeoutMs?: number;
  readonly lazy?: boolean;
}

export interface OverlayController {
  readonly state: OverlayState;
  mount(): void;
  open(): void;
  close(): void;
  toggle(): void;
  retry(): void;
  setBadge(value: string | number | null): void;
  subscribe(listener: (state: OverlayState) => void): () => void;
  destroy(): void;
}

const DEFAULT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.75 3.5h8.5A2.25 2.25 0 0 1 16.5 5.75v1.75h1.75a2.25 2.25 0 0 1 2.25 2.25v8.5a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V16.5H5.75a2.25 2.25 0 0 1-2.25-2.25v-8.5A2.25 2.25 0 0 1 5.75 3.5Zm0 1.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75H7.5V9.75A2.25 2.25 0 0 1 9.75 7.5H15V5.75a.75.75 0 0 0-.75-.75h-8.5Zm4 4a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-8.5Z"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.47 5.41a.75.75 0 0 0-1.06 1.06L10.94 12l-5.53 5.53a.75.75 0 1 0 1.06 1.06L12 13.06l5.53 5.53a.75.75 0 1 0 1.06-1.06L13.06 12l5.53-5.53a.75.75 0 1 0-1.06-1.06L12 10.94 6.47 5.41Z"/></svg>`;

function expectedOrigin(content: IframeContent): string {
  if (content.allowedOrigin) return content.allowedOrigin;
  const origin = new URL(content.src, document.baseURI).origin;
  if (origin === "null") {
    throw new Error("Opaque iframe origins require an explicit allowedOrigin");
  }
  return origin;
}

export function createOverlay(options: OverlayOptions): OverlayController {
  if (!options.id.trim()) throw new Error("Overlay id is required");
  if (!options.launcher.label.trim()) throw new Error("Launcher label is required");

  let state: OverlayState = INITIAL_OVERLAY_STATE;
  let host: HTMLDivElement | undefined;
  let shadow: ShadowRoot | undefined;
  let frame: HTMLIFrameElement | undefined;
  let launcher: HTMLButtonElement | undefined;
  let windowElement: HTMLDivElement | undefined;
  let loadingElement: HTMLDivElement | undefined;
  let errorElement: HTMLDivElement | undefined;
  let badgeElement: HTMLSpanElement | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let previousFocus: Element | null = null;
  const listeners = new Set<(next: OverlayState) => void>();
  const origin = expectedOrigin(options.content);
  const closeLabel =
    options.launcher.closeLabel ?? options.launcher.label.replace(/^Open\s+/i, "Close ");

  function renderLauncher(visible: boolean): void {
    if (!launcher) return;
    const label = visible ? closeLabel : options.launcher.label;
    launcher.title = label;
    launcher.setAttribute("aria-label", label);
    if (visible) {
      launcher.innerHTML = CLOSE_ICON;
    } else if (options.launcher.icon) {
      const icon = document.createElement("img");
      icon.src = options.launcher.icon;
      icon.alt = "";
      launcher.replaceChildren(icon);
    } else {
      launcher.innerHTML = DEFAULT_ICON;
    }
  }

  function dispatch(event: Parameters<typeof transitionOverlay>[1]): void {
    const next = transitionOverlay(state, event);
    if (next === state) return;
    state = next;
    render();
    for (const listener of listeners) listener(state);
  }

  function setLoadingTimeout(): void {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      dispatch({ type: "FAIL", message: "The application did not become ready." });
    }, options.loadTimeoutMs ?? 15_000);
  }

  function ensureFrame(): void {
    if (frame || !windowElement) return;
    dispatch({ type: "GUEST_LOADING" });
    frame = document.createElement("iframe");
    frame.className = "ws-frame";
    frame.title = options.content.title ?? options.launcher.label;
    frame.src = options.content.src;
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    if (options.content.sandbox) frame.setAttribute("sandbox", options.content.sandbox.join(" "));
    frame.addEventListener("load", () => {
      frame?.contentWindow?.postMessage(bridgeEnvelope(options.id, "INIT"), origin);
    });
    windowElement.prepend(frame);
    setLoadingTimeout();
  }

  function render(): void {
    if (!windowElement || !launcher || !loadingElement || !errorElement) return;
    const visible = state.phase !== "closed" && state.phase !== "unmounted";
    windowElement.hidden = !visible;
    windowElement.dataset.phase = state.phase;
    launcher.setAttribute("aria-expanded", String(visible));
    renderLauncher(visible);
    loadingElement.hidden = state.guest !== "loading";
    errorElement.hidden = state.phase !== "error";
    const errorText = errorElement.querySelector<HTMLElement>("[data-error-message]");
    if (errorText) errorText.textContent = state.error ?? "The application could not be loaded.";
  }

  async function onMessage(event: MessageEvent): Promise<void> {
    if (!frame || event.source !== frame.contentWindow || event.origin !== origin) return;
    if (!isBridgeEnvelope(event.data) || event.data.instanceId !== options.id) return;

    if (event.data.type === "READY") {
      if (timeout) clearTimeout(timeout);
      dispatch({ type: "GUEST_READY" });
      return;
    }

    if (event.data.type === "EVENT" && event.data.capability === "shell.close") {
      controller.close();
      return;
    }

    if (event.data.type === "EVENT" && event.data.capability === "launcher.badge.write") {
      const value = event.data.payload;
      if (value === null || typeof value === "string" || typeof value === "number") {
        controller.setBadge(value);
      }
      return;
    }

    if (event.data.type !== "REQUEST" || !event.data.requestId || !event.data.capability) return;
    const handler = options.capabilities?.[event.data.capability];
    if (!handler) {
      frame.contentWindow?.postMessage(
        bridgeEnvelope(options.id, "RESPONSE", {
          requestId: event.data.requestId,
          ok: false,
          error: `Capability not granted: ${event.data.capability}`,
        }),
        origin,
      );
      return;
    }

    try {
      const payload = await handler(event.data.payload);
      frame.contentWindow?.postMessage(
        bridgeEnvelope(options.id, "RESPONSE", {
          requestId: event.data.requestId,
          ok: true,
          payload,
        }),
        origin,
      );
    } catch (error) {
      frame.contentWindow?.postMessage(
        bridgeEnvelope(options.id, "RESPONSE", {
          requestId: event.data.requestId,
          ok: false,
          error: error instanceof Error ? error.message : "Capability failed",
        }),
        origin,
      );
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && state.phase !== "closed") controller.close();
  }

  const controller: OverlayController = {
    get state() {
      return state;
    },
    mount() {
      if (host?.isConnected) return;
      const existing = document.querySelector<HTMLDivElement>(
        `[data-widget-shell-id="${CSS.escape(options.id)}"]`,
      );
      if (existing) throw new Error(`Overlay id is already mounted: ${options.id}`);

      const viewport = resolveViewport(options.viewport);
      host = document.createElement("div");
      host.dataset.widgetShellId = options.id;
      shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = SHELL_STYLES;
      shadow.append(style);

      const stage = document.createElement("div");
      stage.className = "ws-stage";
      const anchor = document.createElement("div");
      anchor.className = "ws-anchor";
      anchor.dataset.placement = options.placement ?? "bottom-end";
      anchor.style.setProperty("--ws-width", `${viewport.width}px`);
      anchor.style.setProperty("--ws-height", `${viewport.height}px`);
      anchor.style.setProperty("--ws-gutter", `${viewport.gutter}px`);

      windowElement = document.createElement("div");
      windowElement.className = "ws-window";
      windowElement.setAttribute("role", "dialog");
      windowElement.setAttribute("aria-label", options.content.title ?? options.launcher.label);

      loadingElement = document.createElement("div");
      loadingElement.className = "ws-loading";
      loadingElement.innerHTML =
        '<span class="ws-spinner"></span><span>Opening application…</span>';

      errorElement = document.createElement("div");
      errorElement.className = "ws-error";
      const errorMessage = document.createElement("span");
      errorMessage.dataset.errorMessage = "";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "ws-retry";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => controller.retry());
      errorElement.append(errorMessage, retry);
      windowElement.append(loadingElement, errorElement);

      const launcherWrap = document.createElement("div");
      launcherWrap.className = "ws-launcher-wrap";
      launcher = document.createElement("button");
      launcher.type = "button";
      launcher.className = "ws-launcher";
      launcher.setAttribute("aria-haspopup", "dialog");
      launcher.addEventListener("click", () => controller.toggle());
      renderLauncher(false);

      badgeElement = document.createElement("span");
      badgeElement.className = "ws-badge";
      badgeElement.setAttribute("aria-hidden", "true");
      launcherWrap.append(launcher, badgeElement);
      anchor.append(windowElement, launcherWrap);
      stage.append(anchor);
      shadow.append(stage);
      (options.target ?? document.body).append(host);
      window.addEventListener("message", onMessage);
      document.addEventListener("keydown", onKeydown);
      dispatch({ type: "MOUNT" });
      controller.setBadge(options.launcher.badge ?? null);
      if (options.lazy === false) ensureFrame();
      if (options.initiallyOpen) controller.open();
    },
    open() {
      if (state.phase === "unmounted") controller.mount();
      if (state.phase !== "closed" && state.phase !== "error") return;
      previousFocus = document.activeElement;
      dispatch({ type: "OPEN" });
      ensureFrame();
      requestAnimationFrame(() => {
        dispatch({ type: "OPENED" });
        frame?.focus();
      });
    },
    close() {
      if (!["opening", "open", "error"].includes(state.phase)) return;
      dispatch({ type: "CLOSE" });
      dispatch({ type: "CLOSED" });
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
      else launcher?.focus();
    },
    toggle() {
      if (state.phase === "closed") controller.open();
      else controller.close();
    },
    retry() {
      if (state.phase !== "error") return;
      frame?.remove();
      frame = undefined;
      dispatch({ type: "RETRY" });
      ensureFrame();
      requestAnimationFrame(() => dispatch({ type: "OPENED" }));
    },
    setBadge(value) {
      if (!badgeElement) return;
      const empty = value === null || value === "" || value === 0;
      badgeElement.hidden = empty;
      badgeElement.textContent = empty ? "" : String(value);
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("keydown", onKeydown);
      host?.remove();
      host = undefined;
      shadow = undefined;
      frame = undefined;
      launcher = undefined;
      windowElement = undefined;
      loadingElement = undefined;
      errorElement = undefined;
      badgeElement = undefined;
      dispatch({ type: "UNMOUNT" });
      listeners.clear();
    },
  };

  return controller;
}
