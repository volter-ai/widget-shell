import {
  type BadgeTone,
  bridgeEnvelope,
  constrainGeometry,
  DEFAULT_GEOMETRY_LIMITS,
  DEFAULT_RESPONSIVE_BREAKPOINTS,
  type GeometryLimits,
  initialGeometry,
  isBridgeEnvelope,
  moveGeometry,
  type OverlayMode,
  type OverlayPlacement,
  type OverlayPresentation,
  type OverlayState,
  type PresentationAuthority,
  type PresentationConstraint,
  type PresentationSize,
  type PresentationSnapshot,
  preferredPresentationSize,
  type ResizeCorner,
  type ResponsiveBreakpoints,
  resizeAnchoredGeometry,
  resizeGeometryFromCorner,
  resolvePresentationSnapshot,
  resolveViewport,
  responsiveMode,
  snapGeometry,
  transitionOverlay,
  type ViewportInput,
  validatePresentation,
  type WindowGeometry,
} from "../core";
import { INITIAL_OVERLAY_STATE } from "../core/lifecycle";
import { SHELL_STYLES } from "../styles";
import { type GeometryPersistence, parsePersistedGeometry } from "./persistence";
import { type OverlayRegistryHandle, registerOverlay } from "./registry";

interface IframeContentBase {
  readonly kind: "iframe";
  readonly title?: string;
  readonly allowedOrigin?: string;
  readonly sandbox?: readonly string[];
  /**
   * `bridge` waits for the Widget Shell frame protocol (the default). `load` is for embedded apps
   * whose own transport already has a readiness protocol and only needs the browser load boundary.
   */
  readonly ready?: "bridge" | "load";
}

export type IframeContent = IframeContentBase &
  (
    | { readonly src: string; readonly srcdoc?: never }
    | { readonly src?: never; readonly srcdoc: string }
  );

export interface LauncherRenderContext {
  readonly open: boolean;
  readonly label: string;
  readonly icon: string | undefined;
}

export interface LauncherOptions {
  readonly label: string;
  readonly closeLabel?: string;
  readonly icon?: string;
  readonly badge?: string | number;
  /** `attention` is the default; use `neutral` for informational, non-actionable counts. */
  readonly badgeTone?: BadgeTone;
  readonly hidden?: boolean;
  readonly render?: (context: LauncherRenderContext) => Node;
  /**
   * An application-owned control rendered beside the launcher only while the overlay is open.
   * Use this for a single prominent companion action; the returned node owns its own semantics.
   */
  readonly companion?: () => Node;
}

export interface OverlayErrorRenderContext {
  readonly message: string;
  readonly retry: () => void;
}

export interface OverlaySlots {
  readonly loading?: () => Node;
  readonly error?: (context: OverlayErrorRenderContext) => Node;
}

export interface OverlayTheme {
  readonly accent?: string;
  readonly surface?: string;
  readonly surfaceMuted?: string;
  readonly text?: string;
  readonly textMuted?: string;
  readonly border?: string;
  readonly shadow?: string;
  readonly radius?: string;
}

export interface OverlayBehavior {
  readonly draggable?: boolean;
  readonly resizable?: boolean;
  readonly snap?: boolean;
  readonly coordination?: "exclusive" | "independent";
  readonly persistence?: GeometryPersistence;
  readonly limits?: Partial<GeometryLimits>;
  readonly breakpoints?: Partial<ResponsiveBreakpoints>;
}

export type CapabilityHandler = (payload: unknown) => unknown | Promise<unknown>;

export interface OverlayOptions {
  readonly id: string;
  readonly content: IframeContent;
  /** Direct presentation policy. Use `presentations` for guest-selectable named states. */
  readonly presentation?: OverlayPresentation;
  /** Presentation states the origin-validated guest may request by name. */
  readonly presentations?: Readonly<Record<string, OverlayPresentation>>;
  readonly initialPresentation?: string;
  /** @deprecated Prefer `presentation`; retained as the responsive compatibility path. */
  readonly viewport?: ViewportInput;
  readonly placement?: OverlayPlacement;
  readonly launcher: LauncherOptions;
  readonly capabilities?: Readonly<Record<string, CapabilityHandler>>;
  readonly target?: HTMLElement;
  readonly initiallyOpen?: boolean;
  readonly loadTimeoutMs?: number;
  readonly lazy?: boolean;
  readonly behavior?: OverlayBehavior;
  readonly slots?: OverlaySlots;
  readonly theme?: OverlayTheme;
  readonly onError?: (error: unknown) => void;
}

export interface OverlayController {
  readonly state: OverlayState;
  readonly geometry: WindowGeometry;
  readonly mode: OverlayMode;
  readonly presentation: PresentationSnapshot;
  /** The mounted content frame, once created. Read-only escape hatch for delivery adapters. */
  readonly frame: HTMLIFrameElement | undefined;
  mount(): void;
  open(): void;
  close(): void;
  toggle(): void;
  retry(): void;
  setBadge(value: string | number | null, tone?: BadgeTone): void;
  setLauncher(value: {
    readonly label?: string;
    readonly icon?: string | null;
    readonly hidden?: boolean;
  }): void;
  setGeometry(value: WindowGeometry): void;
  resetGeometry(): void;
  setPresentation(name: string): PresentationSnapshot;
  subscribe(listener: (state: OverlayState) => void): () => void;
  subscribePresentation(listener: (snapshot: PresentationSnapshot) => void): () => void;
  destroy(): void;
}

interface ActiveInteraction {
  readonly kind: "move" | "resize";
  readonly resizeCorner: ResizeCorner | undefined;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly geometry: WindowGeometry;
}

const DEFAULT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.75 3.5h8.5A2.25 2.25 0 0 1 16.5 5.75v1.75h1.75a2.25 2.25 0 0 1 2.25 2.25v8.5a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V16.5H5.75a2.25 2.25 0 0 1-2.25-2.25v-8.5A2.25 2.25 0 0 1 5.75 3.5Zm0 1.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75H7.5V9.75A2.25 2.25 0 0 1 9.75 7.5H15V5.75a.75.75 0 0 0-.75-.75h-8.5Zm4 4a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-8.5Z"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.47 5.41a.75.75 0 0 0-1.06 1.06L10.94 12l-5.53 5.53a.75.75 0 1 0 1.06 1.06L12 13.06l5.53 5.53a.75.75 0 1 0 1.06-1.06L13.06 12l5.53-5.53a.75.75 0 1 0-1.06-1.06L12 10.94 6.47 5.41Z"/></svg>`;

const THEME_PROPERTIES = {
  accent: "--ws-accent",
  surface: "--ws-surface",
  surfaceMuted: "--ws-surface-muted",
  text: "--ws-text",
  textMuted: "--ws-text-muted",
  border: "--ws-border",
  shadow: "--ws-shadow",
  radius: "--ws-radius",
} as const satisfies Record<keyof OverlayTheme, string>;

function expectedOrigin(content: IframeContent): string {
  if (content.allowedOrigin) return content.allowedOrigin;
  if (content.srcdoc !== undefined) {
    if (content.sandbox && !content.sandbox.includes("allow-same-origin")) {
      throw new Error("Sandboxed srcdoc with an opaque origin requires an explicit allowedOrigin");
    }
    return window.location.origin;
  }
  const origin = new URL(content.src, document.baseURI).origin;
  if (origin === "null") throw new Error("Opaque iframe origins require an explicit allowedOrigin");
  return origin;
}

function hostSize(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight };
}

function deepestActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

export function createOverlay(options: OverlayOptions): OverlayController {
  if (!options.id.trim()) throw new Error("Overlay id is required");
  if (!options.launcher.label.trim()) throw new Error("Launcher label is required");
  if (options.presentation && options.presentations) {
    throw new Error("Use either presentation or presentations, not both");
  }
  if (options.initialPresentation && !options.presentations) {
    throw new Error("initialPresentation requires named presentations");
  }
  if (options.initialPresentation !== undefined && !options.initialPresentation.trim()) {
    throw new Error("initialPresentation cannot be empty");
  }

  const viewport = resolveViewport(options.viewport);
  const compatibilityPresentation: OverlayPresentation = {
    footprint: {
      mode: "resizable",
      preferred: { width: viewport.width, height: viewport.height },
    },
    viewport: { mode: "responsive" },
    surface: "auto",
  };
  const namedPresentations = new Map<string, OverlayPresentation>();
  for (const [name, presentation] of Object.entries(options.presentations ?? {})) {
    if (!name.trim() || name.length > 100) {
      throw new Error("Presentation names must contain 1–100 characters");
    }
    validatePresentation(presentation);
    namedPresentations.set(name, presentation);
  }
  if (options.presentations && namedPresentations.size === 0) {
    throw new Error("presentations must declare at least one named presentation");
  }
  if (options.presentation) validatePresentation(options.presentation);
  let activePresentationName =
    options.initialPresentation ?? namedPresentations.keys().next().value;
  if (activePresentationName && !namedPresentations.has(activePresentationName)) {
    throw new Error(`Unknown initial presentation: ${activePresentationName}`);
  }
  let activePresentation = activePresentationName
    ? (namedPresentations.get(activePresentationName) as OverlayPresentation)
    : (options.presentation ?? compatibilityPresentation);
  const fallbackSize = { width: viewport.width, height: viewport.height };
  let contentSize: PresentationSize | undefined;
  let preferred = preferredPresentationSize(activePresentation, fallbackSize);
  let requestedSize = preferred.size;
  let presentationConstraints = preferred.constraints;
  let presentationAuthority: PresentationAuthority = "default";
  let automaticSizingSuspended = false;
  const placement = options.placement ?? "bottom-end";
  function presentationGeometryLimits(presentation: OverlayPresentation): GeometryLimits {
    const compact = presentation.footprint.mode !== "resizable";
    return {
      ...DEFAULT_GEOMETRY_LIMITS,
      gutter: viewport.gutter,
      ...(compact
        ? {
            minWidth:
              presentation.footprint.mode === "content-fit"
                ? (presentation.footprint.min?.width ?? 1)
                : 1,
            minHeight:
              presentation.footprint.mode === "content-fit"
                ? (presentation.footprint.min?.height ?? 1)
                : 1,
          }
        : {}),
      ...options.behavior?.limits,
    };
  }
  let limits = presentationGeometryLimits(activePresentation);
  const breakpoints: ResponsiveBreakpoints = {
    ...DEFAULT_RESPONSIVE_BREAKPOINTS,
    ...options.behavior?.breakpoints,
  };
  const origin = expectedOrigin(options.content);
  let launcherLabel = options.launcher.label;
  let launcherIcon = options.launcher.icon;
  let closeLabel = options.launcher.closeLabel ?? launcherLabel.replace(/^Open\s+/i, "Close ");
  let state: OverlayState = INITIAL_OVERLAY_STATE;
  let geometry = initialGeometry(
    { ...requestedSize, gutter: viewport.gutter },
    hostSize(),
    placement,
    limits,
  );
  let mode =
    activePresentation.surface && activePresentation.surface !== "auto"
      ? activePresentation.surface
      : responsiveMode(hostSize(), breakpoints);
  let presentationSnapshot = resolvePresentationSnapshot({
    presentation: activePresentation,
    name: activePresentationName ?? null,
    surface: mode,
    authority: presentationAuthority,
    requested: requestedSize,
    physical: { width: geometry.width, height: geometry.height },
    constraints: presentationConstraints,
  });
  let host: HTMLDivElement | undefined;
  let stage: HTMLDivElement | undefined;
  let anchor: HTMLDivElement | undefined;
  let panel: HTMLDivElement | undefined;
  let windowElement: HTMLDivElement | undefined;
  let viewportElement: HTMLDivElement | undefined;
  let frame: HTMLIFrameElement | undefined;
  let launcher: HTMLButtonElement | undefined;
  let launcherRow: HTMLDivElement | undefined;
  let launcherWrap: HTMLDivElement | undefined;
  let launcherCompanion: HTMLDivElement | undefined;
  let loadingElement: HTMLDivElement | undefined;
  let errorElement: HTMLDivElement | undefined;
  let badgeElement: HTMLSpanElement | undefined;
  let announcer: HTMLSpanElement | undefined;
  let dragHandle: HTMLButtonElement | undefined;
  let resizeHandles: HTMLButtonElement[] = [];
  let registry: OverlayRegistryHandle | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let previousFocus: Element | null = null;
  let interaction: ActiveInteraction | undefined;
  let geometryRevision = 0;
  let persistenceQueue = Promise.resolve();
  let destroyed = false;
  let renderedLauncherOpen: boolean | undefined;
  let renderedError: string | undefined;
  let guestReady = false;
  let lastGuestVisibility: boolean | undefined;
  const listeners = new Set<(next: OverlayState) => void>();
  const presentationListeners = new Set<(next: PresentationSnapshot) => void>();

  function reportError(error: unknown): void {
    try {
      options.onError?.(error);
    } catch {
      // Error reporting must never destabilize the host page.
    }
  }

  function geometryPersistenceId(): string {
    return activePresentationName === undefined
      ? options.id
      : `${options.id}:presentation:${encodeURIComponent(activePresentationName)}`;
  }

  function persistGeometry(): void {
    const persistence = options.behavior?.persistence;
    if (!persistence) return;
    const persistenceId = geometryPersistenceId();
    const snapshot = geometry;
    persistenceQueue = persistenceQueue
      .then(() => persistence.save(persistenceId, snapshot))
      .catch(reportError);
  }

  function announceGeometry(kind: ActiveInteraction["kind"]): void {
    if (!announcer) return;
    announcer.textContent =
      kind === "move"
        ? `Overlay moved to ${Math.round(geometry.x)} by ${Math.round(geometry.y)} pixels.`
        : `Overlay resized to ${Math.round(geometry.width)} by ${Math.round(geometry.height)} pixels.`;
  }

  function physicalPanelSize(): PresentationSize {
    const currentHost = hostSize();
    if (mode === "fullscreen") {
      return { width: Math.max(1, currentHost.width), height: Math.max(1, currentHost.height) };
    }
    if (mode === "sheet") {
      return {
        width: Math.max(1, currentHost.width - 16),
        height: Math.max(1, Math.min(geometry.height, currentHost.height - 82)),
      };
    }
    return { width: Math.max(1, geometry.width), height: Math.max(1, geometry.height) };
  }

  function syncPresentation(): void {
    const constraints: PresentationConstraint[] = [...presentationConstraints];
    if (automaticSizingSuspended && presentationAuthority === "user") {
      constraints.push("user-override");
    }
    const physical = physicalPanelSize();
    if (!automaticSizingSuspended && mode !== "fullscreen") {
      if (physical.width < requestedSize.width) constraints.push("available-width");
      else if (mode === "floating" && physical.width > requestedSize.width) {
        constraints.push("minimum-width");
      }
      if (physical.height < requestedSize.height) constraints.push("available-height");
      else if (mode === "floating" && physical.height > requestedSize.height) {
        constraints.push("minimum-height");
      }
    }
    const next = resolvePresentationSnapshot({
      presentation: activePresentation,
      name: activePresentationName ?? null,
      surface: mode,
      authority: presentationAuthority,
      requested: requestedSize,
      physical,
      constraints,
    });
    const changed = JSON.stringify(next) !== JSON.stringify(presentationSnapshot);
    presentationSnapshot = next;

    if (viewportElement && windowElement) {
      viewportElement.dataset.mode = next.viewport;
      viewportElement.dataset.overflow = next.overflow;
      windowElement.dataset.viewportOverflow = next.overflow;
      viewportElement.style.setProperty("--ws-logical-width", `${next.logical.width}px`);
      viewportElement.style.setProperty("--ws-logical-height", `${next.logical.height}px`);
      viewportElement.style.setProperty("--ws-rendered-width", `${next.rendered.width}px`);
      viewportElement.style.setProperty("--ws-rendered-height", `${next.rendered.height}px`);
      viewportElement.style.setProperty("--ws-display-scale", String(next.scale));
    }
    if (!changed) return;
    for (const listener of presentationListeners) listener(next);
    sendPresentationToGuest();
  }

  function sendPresentationToGuest(): void {
    if (!guestReady || !frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      bridgeEnvelope(options.id, "EVENT", {
        capability: "shell.presentation",
        payload: presentationSnapshot,
      }),
      origin,
    );
  }

  function applyPreferredGeometry(authority: PresentationAuthority): void {
    preferred = preferredPresentationSize(activePresentation, fallbackSize, contentSize);
    requestedSize = preferred.size;
    presentationConstraints = preferred.constraints;
    if (!automaticSizingSuspended) {
      presentationAuthority = authority;
      geometryRevision += 1;
      geometry = resizeAnchoredGeometry(geometry, requestedSize, hostSize(), placement, limits);
    }
    applyGeometry();
  }

  function activatePresentation(
    name: string,
    authority: PresentationAuthority,
  ): PresentationSnapshot {
    const next = namedPresentations.get(name);
    if (!next) throw new Error(`Unknown presentation: ${name}`);
    activePresentationName = name;
    activePresentation = next;
    limits = presentationGeometryLimits(activePresentation);
    contentSize = undefined;
    automaticSizingSuspended = false;
    applyPreferredGeometry(authority);
    restoreGeometry();
    return presentationSnapshot;
  }

  function applyGeometry(): void {
    geometry = constrainGeometry(geometry, hostSize(), limits);
    mode =
      activePresentation.surface && activePresentation.surface !== "auto"
        ? activePresentation.surface
        : responsiveMode(hostSize(), breakpoints);
    if (!anchor || !panel) {
      syncPresentation();
      return;
    }
    anchor.dataset.mode = mode;
    anchor.style.setProperty("--ws-x", `${geometry.x}px`);
    anchor.style.setProperty("--ws-y", `${geometry.y}px`);
    panel.style.setProperty("--ws-width", `${geometry.width}px`);
    panel.style.setProperty("--ws-height", `${geometry.height}px`);
    if (dragHandle) dragHandle.hidden = options.behavior?.draggable === false;
    for (const handle of resizeHandles) {
      handle.hidden =
        options.behavior?.resizable === false || activePresentation.footprint.mode === "fixed";
    }
    syncPresentation();
  }

  function restoreGeometry(): void {
    const persistence = options.behavior?.persistence;
    if (!persistence || activePresentation.footprint.mode === "fixed") return;
    const persistenceId = geometryPersistenceId();
    const revision = geometryRevision;
    void Promise.resolve()
      .then(() => persistence.load(persistenceId))
      .then((value) => {
        if (destroyed || !host?.isConnected || geometryRevision !== revision) return;
        const restored = parsePersistedGeometry(value);
        if (!restored) return;
        automaticSizingSuspended = true;
        presentationAuthority = "user";
        geometry = constrainGeometry(restored, hostSize(), limits);
        applyGeometry();
      })
      .catch(reportError);
  }

  function renderLauncher(open: boolean): void {
    if (!launcher || renderedLauncherOpen === open) return;
    renderedLauncherOpen = open;
    const label = open ? closeLabel : launcherLabel;
    launcher.title = label;
    launcher.setAttribute("aria-label", label);
    if (options.launcher.render) {
      launcher.replaceChildren(options.launcher.render({ open, label, icon: launcherIcon }));
    } else if (open) {
      launcher.innerHTML = CLOSE_ICON;
    } else if (launcherIcon) {
      const icon = document.createElement("img");
      icon.src = launcherIcon;
      icon.alt = "";
      launcher.replaceChildren(icon);
    } else {
      launcher.innerHTML = DEFAULT_ICON;
    }
  }

  function renderError(): void {
    if (!errorElement || state.phase !== "error") return;
    const message = state.error ?? "The application could not be loaded.";
    if (renderedError === message) return;
    renderedError = message;
    if (options.slots?.error) {
      errorElement.replaceChildren(
        options.slots.error({ message, retry: () => controller.retry() }),
      );
      return;
    }
    const errorMessage = document.createElement("span");
    errorMessage.textContent = message;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "ws-retry";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => controller.retry());
    errorElement.replaceChildren(errorMessage, retry);
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
    if (frame || !panel) return;
    dispatch({ type: "GUEST_LOADING" });
    frame = document.createElement("iframe");
    frame.className = "ws-frame";
    frame.title = options.content.title ?? options.launcher.label;
    if (options.content.srcdoc !== undefined) frame.srcdoc = options.content.srcdoc;
    else frame.src = options.content.src;
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    if (options.content.sandbox) frame.setAttribute("sandbox", options.content.sandbox.join(" "));
    frame.addEventListener("load", () => {
      if (options.content.ready === "load") {
        if (timeout) clearTimeout(timeout);
        dispatch({ type: "GUEST_READY" });
        return;
      }
      frame?.contentWindow?.postMessage(bridgeEnvelope(options.id, "INIT"), origin);
    });
    viewportElement?.prepend(frame);
    setLoadingTimeout();
  }

  function render(): void {
    if (!panel || !launcher || !loadingElement || !errorElement || !anchor) return;
    const visible = state.phase !== "closed" && state.phase !== "unmounted";
    panel.dataset.hidden = String(!visible);
    panel.setAttribute("aria-hidden", String(!visible));
    panel.dataset.phase = state.phase;
    anchor.dataset.open = String(visible);
    if (launcherCompanion) launcherCompanion.hidden = !visible || !options.launcher.companion;
    launcher.setAttribute("aria-expanded", String(visible));
    renderLauncher(visible);
    loadingElement.hidden = state.guest !== "loading";
    errorElement.hidden = state.phase !== "error";
    renderError();
    applyGeometry();
    if (guestReady && frame?.contentWindow && lastGuestVisibility !== visible) {
      lastGuestVisibility = visible;
      frame.contentWindow.postMessage(
        bridgeEnvelope(options.id, "EVENT", {
          capability: "shell.visibility",
          payload: visible,
        }),
        origin,
      );
    }
  }

  async function onMessage(event: MessageEvent): Promise<void> {
    if (!frame || event.source !== frame.contentWindow || event.origin !== origin) return;
    if (!isBridgeEnvelope(event.data) || event.data.instanceId !== options.id) return;

    if (event.data.type === "READY") {
      if (timeout) clearTimeout(timeout);
      guestReady = true;
      dispatch({ type: "GUEST_READY" });
      sendPresentationToGuest();
      return;
    }
    if (event.data.type === "EVENT" && event.data.capability === "shell.close") {
      closeInternal(true);
      return;
    }
    if (event.data.type === "EVENT" && event.data.capability === "launcher.badge.write") {
      const payload = event.data.payload;
      const candidate =
        typeof payload === "object" && payload !== null && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : null;
      const value = candidate ? candidate.value : payload;
      const tone = candidate?.tone;
      if (
        (value === null || typeof value === "string" || typeof value === "number") &&
        (tone === undefined || tone === "attention" || tone === "neutral")
      ) {
        controller.setBadge(value, tone as BadgeTone | undefined);
      }
      return;
    }
    if (event.data.type === "EVENT" && event.data.capability === "launcher.write") {
      const value = event.data.payload;
      if (typeof value !== "object" || value === null || Array.isArray(value)) return;
      const candidate = value as Record<string, unknown>;
      const label = candidate.label;
      const icon = candidate.icon;
      const hidden = candidate.hidden;
      const badge = candidate.badge;
      const badgeTone = candidate.badgeTone;
      if (
        (label !== undefined &&
          (typeof label !== "string" || !label.trim() || label.length > 200)) ||
        (icon !== undefined &&
          icon !== null &&
          (typeof icon !== "string" || !icon.startsWith("data:image/") || icon.length > 200_000)) ||
        (hidden !== undefined && typeof hidden !== "boolean") ||
        (badge !== undefined &&
          badge !== null &&
          typeof badge !== "string" &&
          typeof badge !== "number") ||
        (typeof badge === "string" && badge.length > 20) ||
        (typeof badge === "number" && !Number.isFinite(badge)) ||
        (badgeTone !== undefined && badgeTone !== "attention" && badgeTone !== "neutral")
      ) {
        return;
      }
      controller.setLauncher({
        ...(typeof label === "string" ? { label } : {}),
        ...(icon === null || typeof icon === "string" ? { icon } : {}),
        ...(typeof hidden === "boolean" ? { hidden } : {}),
      });
      if (badge !== undefined)
        controller.setBadge(badge as string | number | null, badgeTone as BadgeTone | undefined);
      return;
    }
    if (event.data.type !== "REQUEST" || !event.data.requestId || !event.data.capability) return;

    if (event.data.capability === "presentation.request") {
      const value = event.data.payload;
      const valid =
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        typeof (value as Record<string, unknown>).name === "string" &&
        ((value as Record<string, unknown>).name as string).length <= 100;
      try {
        if (!valid) throw new Error("Presentation request requires exactly one named state");
        const payload = activatePresentation((value as { name: string }).name, "guest");
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
            error: error instanceof Error ? error.message : "Presentation request failed",
          }),
          origin,
        );
      }
      return;
    }
    if (event.data.capability === "presentation.content-size") {
      const value = event.data.payload;
      const candidate =
        typeof value === "object" && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : undefined;
      const width = candidate?.width;
      const height = candidate?.height;
      const valid =
        candidate !== undefined &&
        Object.keys(candidate).length === 2 &&
        typeof width === "number" &&
        Number.isFinite(width) &&
        width > 0 &&
        width <= 20_000 &&
        typeof height === "number" &&
        Number.isFinite(height) &&
        height > 0 &&
        height <= 20_000;
      try {
        if (activePresentation.footprint.mode !== "content-fit") {
          throw new Error("The active presentation does not accept content sizing");
        }
        if (!valid) throw new Error("Content size requires finite positive width and height");
        if (
          !contentSize ||
          Math.abs(contentSize.width - width) > 1 ||
          Math.abs(contentSize.height - height) > 1
        ) {
          contentSize = { width, height };
          applyPreferredGeometry("guest");
        }
        frame.contentWindow?.postMessage(
          bridgeEnvelope(options.id, "RESPONSE", {
            requestId: event.data.requestId,
            ok: true,
            payload: presentationSnapshot,
          }),
          origin,
        );
      } catch (error) {
        frame.contentWindow?.postMessage(
          bridgeEnvelope(options.id, "RESPONSE", {
            requestId: event.data.requestId,
            ok: false,
            error: error instanceof Error ? error.message : "Content size request failed",
          }),
          origin,
        );
      }
      return;
    }

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

  function closeInternal(restoreFocus: boolean): void {
    if (!["opening", "open", "error"].includes(state.phase)) return;
    dispatch({ type: "CLOSE" });
    dispatch({ type: "CLOSED" });
    if (!restoreFocus) return;
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    else launcher?.focus();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && state.phase !== "closed") closeInternal(true);
  }

  function beginInteraction(
    kind: ActiveInteraction["kind"],
    event: PointerEvent,
    resizeCorner?: ResizeCorner,
  ): void {
    if (event.button !== 0 || mode !== "floating") return;
    if (kind === "move" && options.behavior?.draggable === false) return;
    if (kind === "resize" && options.behavior?.resizable === false) return;
    if (kind === "resize" && activePresentation.footprint.mode === "fixed") return;
    registry?.activate(false);
    interaction = {
      kind,
      resizeCorner,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      geometry,
    };
    geometryRevision += 1;
    if (kind === "resize") {
      automaticSizingSuspended = true;
      presentationAuthority = "user";
    }
    panel?.setAttribute("data-interacting", kind);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    const deltaX = event.clientX - interaction.startX;
    const deltaY = event.clientY - interaction.startY;
    geometry =
      interaction.kind === "move"
        ? moveGeometry(interaction.geometry, deltaX, deltaY, hostSize(), limits)
        : resizeGeometryFromCorner(
            interaction.geometry,
            interaction.resizeCorner ?? "se",
            deltaX,
            deltaY,
            hostSize(),
            limits,
          );
    applyGeometry();
    event.preventDefault();
  }

  function endInteraction(event: PointerEvent): void {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    const kind = interaction.kind;
    if (kind === "move" && options.behavior?.snap !== false) {
      geometry = snapGeometry(geometry, hostSize(), 24, limits);
    }
    interaction = undefined;
    panel?.removeAttribute("data-interacting");
    applyGeometry();
    persistGeometry();
    announceGeometry(kind);
  }

  function updateFromKeyboard(
    kind: ActiveInteraction["kind"],
    event: KeyboardEvent,
    resizeCorner?: ResizeCorner,
  ): void {
    if (
      mode !== "floating" ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      return;
    }
    if (kind === "resize" && activePresentation.footprint.mode === "fixed") return;
    const step = event.shiftKey ? 32 : 8;
    const horizontal = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const vertical = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    geometry =
      kind === "move"
        ? moveGeometry(geometry, horizontal, vertical, hostSize(), limits)
        : resizeGeometryFromCorner(
            geometry,
            resizeCorner ?? "se",
            horizontal,
            vertical,
            hostSize(),
            limits,
          );
    geometryRevision += 1;
    if (kind === "resize") {
      automaticSizingSuspended = true;
      presentationAuthority = "user";
    }
    applyGeometry();
    persistGeometry();
    announceGeometry(kind);
    event.preventDefault();
  }

  function onWindowResize(): void {
    applyGeometry();
  }

  const controller: OverlayController = {
    get state() {
      return state;
    },
    get geometry() {
      return geometry;
    },
    get mode() {
      return mode;
    },
    get presentation() {
      return presentationSnapshot;
    },
    get frame() {
      return frame;
    },
    mount() {
      if (destroyed) throw new Error("A destroyed overlay cannot be mounted again");
      if (host?.isConnected) return;
      const existing = document.querySelector<HTMLDivElement>(
        `[data-widget-shell-id="${CSS.escape(options.id)}"]`,
      );
      if (existing) throw new Error(`Overlay id is already mounted: ${options.id}`);

      host = document.createElement("div");
      host.dataset.widgetShellId = options.id;
      if (options.theme?.accent) host.dataset.wsAccent = "true";
      for (const [name, property] of Object.entries(THEME_PROPERTIES)) {
        const value = options.theme?.[name as keyof OverlayTheme];
        if (value) host.style.setProperty(property, value);
      }
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = SHELL_STYLES;
      shadow.append(style);

      stage = document.createElement("div");
      stage.className = "ws-stage";
      anchor = document.createElement("div");
      anchor.className = "ws-anchor";
      anchor.dataset.placement = placement;

      panel = document.createElement("div");
      panel.className = "ws-panel";
      windowElement = document.createElement("div");
      windowElement.className = "ws-window";
      windowElement.setAttribute("role", "dialog");
      windowElement.setAttribute("aria-label", options.content.title ?? options.launcher.label);

      viewportElement = document.createElement("div");
      viewportElement.className = "ws-viewport";

      loadingElement = document.createElement("div");
      loadingElement.className = "ws-loading";
      loadingElement.setAttribute("role", "status");
      loadingElement.setAttribute("aria-live", "polite");
      if (options.slots?.loading) loadingElement.append(options.slots.loading());
      else
        loadingElement.innerHTML =
          '<span class="ws-spinner"></span><span>Opening application…</span>';

      errorElement = document.createElement("div");
      errorElement.className = "ws-error";
      errorElement.setAttribute("role", "alert");
      errorElement.setAttribute("aria-live", "assertive");
      windowElement.append(viewportElement, loadingElement, errorElement);

      dragHandle = document.createElement("button");
      dragHandle.type = "button";
      dragHandle.className = "ws-drag-handle";
      dragHandle.setAttribute("aria-label", `Move ${options.content.title ?? "overlay"}`);
      dragHandle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
      dragHandle.hidden = options.behavior?.draggable === false;
      dragHandle.addEventListener("pointerdown", (event) => beginInteraction("move", event));
      dragHandle.addEventListener("keydown", (event) => updateFromKeyboard("move", event));

      resizeHandles = (["nw", "ne", "sw", "se"] as const).map((corner) => {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "ws-resize-handle";
        handle.dataset.corner = corner;
        handle.setAttribute(
          "aria-label",
          `Resize ${options.content.title ?? "overlay"} from ${corner} corner`,
        );
        handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
        handle.hidden = options.behavior?.resizable === false;
        handle.addEventListener("pointerdown", (event) =>
          beginInteraction("resize", event, corner),
        );
        handle.addEventListener("keydown", (event) => updateFromKeyboard("resize", event, corner));
        return handle;
      });
      announcer = document.createElement("span");
      announcer.className = "ws-announcer";
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "polite");
      panel.append(windowElement, dragHandle, ...resizeHandles, announcer);

      launcherRow = document.createElement("div");
      launcherRow.className = "ws-launcher-row";
      launcherRow.hidden = options.launcher.hidden ?? false;

      launcherCompanion = document.createElement("div");
      launcherCompanion.className = "ws-launcher-companion";
      launcherCompanion.hidden = true;
      if (options.launcher.companion) launcherCompanion.append(options.launcher.companion());

      launcherWrap = document.createElement("div");
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
      launcherRow.append(launcherCompanion, launcherWrap);
      anchor.append(panel, launcherRow);
      stage.append(anchor);
      shadow.append(stage);
      try {
        registry = registerOverlay(options.id, {
          coordination: options.behavior?.coordination ?? "exclusive",
          close: () => closeInternal(false),
          setLayer: (layer) => {
            if (stage) stage.style.zIndex = String(layer);
          },
        });
        (options.target ?? document.body).append(host);
      } catch (error) {
        registry?.destroy();
        registry = undefined;
        host.remove();
        host = undefined;
        stage = undefined;
        anchor = undefined;
        panel = undefined;
        windowElement = undefined;
        viewportElement = undefined;
        launcher = undefined;
        launcherRow = undefined;
        launcherWrap = undefined;
        launcherCompanion = undefined;
        loadingElement = undefined;
        errorElement = undefined;
        badgeElement = undefined;
        announcer = undefined;
        dragHandle = undefined;
        resizeHandles = [];
        throw error;
      }
      panel.addEventListener("pointerdown", () => registry?.activate(false));
      window.addEventListener("message", onMessage);
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endInteraction);
      window.addEventListener("pointercancel", endInteraction);
      document.addEventListener("keydown", onKeydown);
      dispatch({ type: "MOUNT" });
      controller.setBadge(options.launcher.badge ?? null, options.launcher.badgeTone);
      applyGeometry();
      restoreGeometry();
      if (options.lazy === false) ensureFrame();
      if (options.initiallyOpen) controller.open();
    },
    open() {
      if (state.phase === "unmounted") controller.mount();
      if (state.phase !== "closed" && state.phase !== "error") return;
      previousFocus = deepestActiveElement();
      registry?.activate(options.behavior?.coordination !== "independent");
      dispatch({ type: "OPEN" });
      ensureFrame();
      requestAnimationFrame(() => {
        dispatch({ type: "OPENED" });
        frame?.focus();
      });
    },
    close() {
      closeInternal(true);
    },
    toggle() {
      if (state.phase === "closed") controller.open();
      else closeInternal(true);
    },
    retry() {
      if (state.phase !== "error") return;
      frame?.remove();
      frame = undefined;
      guestReady = false;
      lastGuestVisibility = undefined;
      renderedError = undefined;
      dispatch({ type: "RETRY" });
      ensureFrame();
      requestAnimationFrame(() => dispatch({ type: "OPENED" }));
    },
    setBadge(value, tone = "attention") {
      if (!badgeElement) return;
      const empty = value === null || value === "" || value === 0;
      badgeElement.hidden = empty;
      badgeElement.textContent = empty ? "" : String(value);
      badgeElement.dataset.tone = tone;
    },
    setLauncher(value) {
      let rerender = false;
      if (value.label !== undefined) {
        if (!value.label.trim()) throw new Error("Launcher label is required");
        if (value.label !== launcherLabel) {
          launcherLabel = value.label;
          rerender = true;
          if (!options.launcher.closeLabel) {
            closeLabel = launcherLabel.replace(/^Open\s+/i, "Close ");
          }
        }
      }
      if (value.icon !== undefined && value.icon !== launcherIcon) {
        launcherIcon = value.icon ?? undefined;
        rerender = true;
      }
      if (value.hidden !== undefined && launcherRow) launcherRow.hidden = value.hidden;
      if (rerender) {
        renderedLauncherOpen = undefined;
        renderLauncher(state.phase !== "closed" && state.phase !== "unmounted");
      }
    },
    setGeometry(value) {
      geometryRevision += 1;
      automaticSizingSuspended = true;
      presentationAuthority = "host";
      geometry = constrainGeometry(value, hostSize(), limits);
      applyGeometry();
      persistGeometry();
    },
    resetGeometry() {
      geometryRevision += 1;
      automaticSizingSuspended = false;
      presentationAuthority = "default";
      preferred = preferredPresentationSize(activePresentation, fallbackSize, contentSize);
      requestedSize = preferred.size;
      presentationConstraints = preferred.constraints;
      geometry = initialGeometry(
        { ...requestedSize, gutter: viewport.gutter },
        hostSize(),
        placement,
        limits,
      );
      applyGeometry();
      const persistence = options.behavior?.persistence;
      if (persistence?.remove) {
        const persistenceId = geometryPersistenceId();
        persistenceQueue = persistenceQueue
          .then(() => persistence.remove?.(persistenceId))
          .catch(reportError);
      }
    },
    setPresentation(name) {
      return activatePresentation(name, "host");
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    subscribePresentation(listener) {
      presentationListeners.add(listener);
      listener(presentationSnapshot);
      return () => presentationListeners.delete(listener);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timeout) clearTimeout(timeout);
      registry?.destroy();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endInteraction);
      window.removeEventListener("pointercancel", endInteraction);
      document.removeEventListener("keydown", onKeydown);
      host?.remove();
      host = undefined;
      stage = undefined;
      anchor = undefined;
      panel = undefined;
      windowElement = undefined;
      viewportElement = undefined;
      frame = undefined;
      launcher = undefined;
      launcherRow = undefined;
      launcherWrap = undefined;
      launcherCompanion = undefined;
      loadingElement = undefined;
      errorElement = undefined;
      badgeElement = undefined;
      announcer = undefined;
      dragHandle = undefined;
      resizeHandles = [];
      dispatch({ type: "UNMOUNT" });
      listeners.clear();
      presentationListeners.clear();
    },
  };

  applyGeometry();
  return controller;
}
