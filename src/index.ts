export * from "./core";
export {
  type CapabilityHandler,
  createOverlay,
  type IframeContent,
  type LauncherOptions,
  type LauncherRenderContext,
  type OverlayBehavior,
  type OverlayController,
  type OverlayErrorRenderContext,
  type OverlayOptions,
  type OverlaySlots,
  type OverlayTheme,
} from "./dom/create-overlay";
export {
  createLocalStorageGeometryPersistence,
  type GeometryPersistence,
  parsePersistedGeometry,
} from "./dom/persistence";
export {
  createExtensionGeometryPersistence,
  createExtensionIframeContent,
  type ExtensionIframeOptions,
  type ExtensionRuntimeLike,
  type ExtensionStorageAreaLike,
  extensionOrigin,
} from "./web-extension";
