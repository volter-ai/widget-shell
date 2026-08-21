export interface OverlayViewport {
  readonly width: number;
  readonly height: number;
  readonly gutter: number;
}

export const VIEWPORT_PRESETS = {
  "mobile-sm": { width: 390, height: 667, gutter: 16 },
  "mobile-md": { width: 420, height: 780, gutter: 16 },
  messenger: { width: 380, height: 560, gutter: 16 },
} as const satisfies Record<string, OverlayViewport>;

export type ViewportPreset = keyof typeof VIEWPORT_PRESETS;
export type ViewportInput = ViewportPreset | OverlayViewport;

export type OverlayPlacement = "bottom-end" | "bottom-start" | "top-end" | "top-start";

export function resolveViewport(viewport: ViewportInput = "mobile-sm"): OverlayViewport {
  return typeof viewport === "string" ? VIEWPORT_PRESETS[viewport] : viewport;
}

export function constrainViewport(
  requested: OverlayViewport,
  availableWidth: number,
  availableHeight: number,
): OverlayViewport {
  const horizontalRoom = Math.max(0, availableWidth - requested.gutter * 2);
  const verticalRoom = Math.max(0, availableHeight - requested.gutter * 2);

  return {
    width: Math.min(requested.width, horizontalRoom),
    height: Math.min(requested.height, verticalRoom),
    gutter: requested.gutter,
  };
}
