export {
  constrainViewport,
  type OverlayPlacement,
  type OverlayViewport,
  resolveViewport,
  VIEWPORT_PRESETS,
  type ViewportInput,
  type ViewportPreset,
} from "./core/geometry";
export {
  type GuestPhase,
  INITIAL_OVERLAY_STATE,
  type OverlayEvent,
  type OverlayPhase,
  type OverlayState,
  transitionOverlay,
} from "./core/lifecycle";
export {
  type BridgeEnvelope,
  bridgeEnvelope,
  isBridgeEnvelope,
  WIDGET_SHELL_PROTOCOL,
} from "./core/protocol";
