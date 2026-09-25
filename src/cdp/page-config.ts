import type { OverlayOptions } from "../dom/create-overlay";

/** `Symbol.for` key under which the injected script hands its configuration to the page runtime. */
export const PAGE_BOOTSTRAP_KEY = "@volter-ai-dev/widget-shell/cdp:bootstrap";
/** `Symbol.for` key of the per-document registry of injected overlays, keyed by overlay id. */
export const PAGE_REGISTRY_KEY = "@volter-ai-dev/widget-shell/cdp:overlays";

/** The serializable subset of `OverlayOptions` that can cross into a page as data. */
export type SerializableOverlayOptions = Omit<
  OverlayOptions,
  "launcher" | "capabilities" | "target" | "slots" | "onError" | "behavior"
> & {
  readonly launcher: Omit<OverlayOptions["launcher"], "render" | "companion">;
  readonly behavior?: Omit<NonNullable<OverlayOptions["behavior"]>, "persistence">;
};

export interface PageConfig {
  readonly revision: string;
  /** Name of the CDP binding (`Runtime.addBinding`) that carries capability requests out of the page. */
  readonly binding: string;
  readonly capabilities: readonly string[];
  readonly overlay: SerializableOverlayOptions;
}
