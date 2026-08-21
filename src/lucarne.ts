import type { OverlayPlacement } from "./core";

declare const __LUCARNE_RUNTIME_SOURCE__: string;

export interface LucarneInjectorInput {
  readonly ns: string;
  readonly html: string;
}

export interface LucarneDeliveryOptions {
  readonly id?: string;
  readonly title?: string;
  readonly launcherLabel: string;
  readonly launcherIcon?: string;
  readonly launcherHidden?: boolean;
  readonly initiallyOpen?: boolean;
  readonly viewport?: {
    readonly width?: number;
    readonly height?: number;
    readonly gutter?: number;
  };
  readonly placement?: OverlayPlacement;
  readonly theme?: {
    readonly accent?: string;
    readonly radius?: string;
  };
}

export type LucarneInjector = (input: LucarneInjectorInput) => string;

function revision(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${value.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/**
 * Build a Lucarne `WidgetHost.attach({ injector })` adapter. Lucarne keeps ownership of browser
 * attachment, state envelopes, and intent draining; Widget Shell owns only the injected launcher/window.
 */
export function createLucarneInjector(options: LucarneDeliveryOptions): LucarneInjector {
  if (!options.launcherLabel.trim()) throw new Error("Lucarne launcherLabel is required");

  return ({ ns, html }) => {
    const prefix = `__lw_${ns}`;
    const overlayId = options.id ?? `lucarne-${ns}`;
    const bootstrap = {
      ns,
      html,
      revision: revision(html),
      hostId: `${prefix}_host`,
      iframeGlobal: `${prefix}_iframe`,
      guardGlobal: `${prefix}_guard`,
      disposeGlobal: `${prefix}_dispose`,
      chromeKey: prefix,
      intentQueuePrefix: `${prefix}_intent_`,
      overlay: {
        id: overlayId,
        title: options.title ?? options.launcherLabel,
        launcherLabel: options.launcherLabel,
        ...(options.launcherIcon ? { launcherIcon: options.launcherIcon } : {}),
        launcherHidden: options.launcherHidden ?? false,
        initiallyOpen: options.initiallyOpen ?? false,
        width: options.viewport?.width ?? 390,
        height: options.viewport?.height ?? 667,
        gutter: options.viewport?.gutter ?? 16,
        placement: options.placement ?? "bottom-end",
        ...(options.theme?.accent ? { accent: options.theme.accent } : {}),
        ...(options.theme?.radius ? { radius: options.theme.radius } : {}),
      },
    };
    return `(function(){window.__widgetShellLucarneBootstrap__=${JSON.stringify(bootstrap)};${__LUCARNE_RUNTIME_SOURCE__}})()`;
  };
}
