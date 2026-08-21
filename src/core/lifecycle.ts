export type OverlayPhase = "unmounted" | "closed" | "opening" | "open" | "closing" | "error";

export type GuestPhase = "idle" | "loading" | "ready" | "error";

export interface OverlayState {
  readonly phase: OverlayPhase;
  readonly guest: GuestPhase;
  readonly error?: string;
}

export type OverlayEvent =
  | { readonly type: "MOUNT" }
  | { readonly type: "OPEN" }
  | { readonly type: "OPENED" }
  | { readonly type: "CLOSE" }
  | { readonly type: "CLOSED" }
  | { readonly type: "GUEST_LOADING" }
  | { readonly type: "GUEST_READY" }
  | { readonly type: "FAIL"; readonly message: string }
  | { readonly type: "RETRY" }
  | { readonly type: "UNMOUNT" };

export const INITIAL_OVERLAY_STATE: OverlayState = {
  phase: "unmounted",
  guest: "idle",
};

export function transitionOverlay(state: OverlayState, event: OverlayEvent): OverlayState {
  switch (event.type) {
    case "MOUNT":
      return state.phase === "unmounted" ? { phase: "closed", guest: "idle" } : state;
    case "OPEN":
      return state.phase === "closed" || state.phase === "error"
        ? { phase: "opening", guest: state.guest === "ready" ? "ready" : "loading" }
        : state;
    case "OPENED":
      return state.phase === "opening" ? { ...state, phase: "open" } : state;
    case "CLOSE":
      return state.phase === "opening" || state.phase === "open" || state.phase === "error"
        ? { ...state, phase: "closing" }
        : state;
    case "CLOSED":
      return state.phase === "closing" ? { ...state, phase: "closed" } : state;
    case "GUEST_LOADING":
      return state.phase !== "unmounted" ? { phase: state.phase, guest: "loading" } : state;
    case "GUEST_READY":
      return state.phase !== "unmounted" ? { phase: state.phase, guest: "ready" } : state;
    case "FAIL":
      return state.phase !== "unmounted"
        ? { phase: "error", guest: "error", error: event.message }
        : state;
    case "RETRY":
      return state.phase === "error" ? { phase: "opening", guest: "loading" } : state;
    case "UNMOUNT":
      return INITIAL_OVERLAY_STATE;
  }
}
