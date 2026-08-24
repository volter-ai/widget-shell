import type { OverlayPlacement, OverlayViewport } from "./geometry";

export interface HostSize {
  readonly width: number;
  readonly height: number;
}

export interface WindowGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GeometryLimits {
  readonly gutter: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly launcherSpace: number;
}

export interface ResponsiveBreakpoints {
  readonly sheetWidth: number;
  readonly fullscreenWidth: number;
  readonly fullscreenHeight: number;
}

export type OverlayMode = "floating" | "sheet" | "fullscreen";
export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export const DEFAULT_GEOMETRY_LIMITS: GeometryLimits = {
  gutter: 16,
  minWidth: 280,
  minHeight: 320,
  launcherSpace: 66,
};

export const DEFAULT_RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoints = {
  sheetWidth: 720,
  fullscreenWidth: 430,
  fullscreenHeight: 560,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function responsiveMode(
  host: HostSize,
  breakpoints: ResponsiveBreakpoints = DEFAULT_RESPONSIVE_BREAKPOINTS,
): OverlayMode {
  if (host.width <= breakpoints.fullscreenWidth || host.height <= breakpoints.fullscreenHeight) {
    return "fullscreen";
  }
  return host.width <= breakpoints.sheetWidth ? "sheet" : "floating";
}

export function constrainGeometry(
  geometry: WindowGeometry,
  host: HostSize,
  limits: GeometryLimits = DEFAULT_GEOMETRY_LIMITS,
): WindowGeometry {
  const availableWidth = Math.max(0, host.width - limits.gutter * 2);
  const availableHeight = Math.max(0, host.height - limits.gutter * 2 - limits.launcherSpace);
  const minimumWidth = Math.min(limits.minWidth, availableWidth);
  const minimumHeight = Math.min(limits.minHeight, availableHeight);
  const width = clamp(geometry.width, minimumWidth, availableWidth);
  const height = clamp(geometry.height, minimumHeight, availableHeight);
  const maxX = host.width - limits.gutter - width;
  const maxY = host.height - limits.gutter - limits.launcherSpace - height;

  return {
    x: clamp(geometry.x, limits.gutter, maxX),
    y: clamp(geometry.y, limits.gutter, maxY),
    width,
    height,
  };
}

export function initialGeometry(
  viewport: OverlayViewport,
  host: HostSize,
  placement: OverlayPlacement,
  limits: GeometryLimits = { ...DEFAULT_GEOMETRY_LIMITS, gutter: viewport.gutter },
): WindowGeometry {
  const width = Math.min(viewport.width, Math.max(0, host.width - limits.gutter * 2));
  const height = Math.min(
    viewport.height,
    Math.max(0, host.height - limits.gutter * 2 - limits.launcherSpace),
  );
  const end = placement.endsWith("end");
  const bottom = placement.startsWith("bottom");

  return constrainGeometry(
    {
      x: end ? host.width - limits.gutter - width : limits.gutter,
      y: bottom ? host.height - limits.gutter - limits.launcherSpace - height : limits.gutter,
      width,
      height,
    },
    host,
    limits,
  );
}

export function moveGeometry(
  start: WindowGeometry,
  deltaX: number,
  deltaY: number,
  host: HostSize,
  limits: GeometryLimits = DEFAULT_GEOMETRY_LIMITS,
): WindowGeometry {
  return constrainGeometry({ ...start, x: start.x + deltaX, y: start.y + deltaY }, host, limits);
}

export function resizeGeometry(
  start: WindowGeometry,
  deltaWidth: number,
  deltaHeight: number,
  host: HostSize,
  limits: GeometryLimits = DEFAULT_GEOMETRY_LIMITS,
): WindowGeometry {
  return constrainGeometry(
    { ...start, width: start.width + deltaWidth, height: start.height + deltaHeight },
    host,
    limits,
  );
}

/** Resize from one corner while keeping the opposite corner stationary. */
export function resizeGeometryFromCorner(
  start: WindowGeometry,
  corner: ResizeCorner,
  deltaX: number,
  deltaY: number,
  host: HostSize,
  limits: GeometryLimits = DEFAULT_GEOMETRY_LIMITS,
): WindowGeometry {
  const base = constrainGeometry(start, host, limits);
  const west = corner.endsWith("w");
  const north = corner.startsWith("n");
  const fixedX = west ? base.x + base.width : base.x;
  const fixedY = north ? base.y + base.height : base.y;
  const maximumWidth = west ? fixedX - limits.gutter : host.width - limits.gutter - fixedX;
  const maximumHeight = north
    ? fixedY - limits.gutter
    : host.height - limits.gutter - limits.launcherSpace - fixedY;
  const width = clamp(
    base.width + (west ? -deltaX : deltaX),
    Math.min(limits.minWidth, maximumWidth),
    maximumWidth,
  );
  const height = clamp(
    base.height + (north ? -deltaY : deltaY),
    Math.min(limits.minHeight, maximumHeight),
    maximumHeight,
  );

  return constrainGeometry(
    {
      x: west ? fixedX - width : fixedX,
      y: north ? fixedY - height : fixedY,
      width,
      height,
    },
    host,
    limits,
  );
}

/** Resize an application-driven surface without making its configured corner visibly jump. */
export function resizeAnchoredGeometry(
  start: WindowGeometry,
  size: HostSize,
  host: HostSize,
  placement: OverlayPlacement,
  limits: GeometryLimits = DEFAULT_GEOMETRY_LIMITS,
): WindowGeometry {
  const end = placement.endsWith("end");
  const bottom = placement.startsWith("bottom");
  return constrainGeometry(
    {
      x: end ? start.x + start.width - size.width : start.x,
      y: bottom ? start.y + start.height - size.height : start.y,
      width: size.width,
      height: size.height,
    },
    host,
    limits,
  );
}

export function snapGeometry(
  geometry: WindowGeometry,
  host: HostSize,
  threshold = 24,
  limits: GeometryLimits = DEFAULT_GEOMETRY_LIMITS,
): WindowGeometry {
  const constrained = constrainGeometry(geometry, host, limits);
  const endX = host.width - limits.gutter - constrained.width;
  const endY = host.height - limits.gutter - limits.launcherSpace - constrained.height;
  const x =
    Math.abs(constrained.x - limits.gutter) <= threshold
      ? limits.gutter
      : Math.abs(constrained.x - endX) <= threshold
        ? endX
        : constrained.x;
  const y =
    Math.abs(constrained.y - limits.gutter) <= threshold
      ? limits.gutter
      : Math.abs(constrained.y - endY) <= threshold
        ? endY
        : constrained.y;

  return { ...constrained, x, y };
}

export function isWindowGeometry(value: unknown): value is WindowGeometry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every(
    (key) => typeof candidate[key] === "number" && Number.isFinite(candidate[key]),
  );
}
