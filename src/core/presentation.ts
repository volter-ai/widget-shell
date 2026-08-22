import type { OverlayMode } from "./window-geometry";

export interface PresentationSize {
  readonly width: number;
  readonly height: number;
}

export interface FixedFootprint {
  readonly mode: "fixed";
  readonly width: number;
  readonly height: number;
}

export interface ResizableFootprint {
  readonly mode: "resizable";
  readonly preferred: PresentationSize;
}

export interface ContentFitFootprint {
  readonly mode: "content-fit";
  readonly preferred?: PresentationSize;
  readonly min?: Partial<PresentationSize>;
  readonly max?: Partial<PresentationSize>;
}

export type PresentationFootprint = FixedFootprint | ResizableFootprint | ContentFitFootprint;

export interface ResponsivePresentationViewport {
  readonly mode: "responsive";
}

export interface VirtualPresentationViewport {
  readonly mode: "virtual";
  readonly width: number;
  readonly height: number;
  readonly fit?: "contain";
  readonly allowUpscale?: boolean;
  /** Below this display scale, preserve readability and let the physical viewport scroll. */
  readonly minimumScale?: number;
}

export type PresentationViewport = ResponsivePresentationViewport | VirtualPresentationViewport;

export interface OverlayPresentation {
  readonly footprint: PresentationFootprint;
  readonly viewport: PresentationViewport;
  /** `auto` retains the shell's responsive floating → sheet → full-screen behavior. */
  readonly surface?: "auto" | OverlayMode;
}

export type PresentationAuthority = "default" | "guest" | "host" | "user";

export type PresentationConstraint =
  | "content-size-unavailable"
  | "footprint-min-width"
  | "footprint-min-height"
  | "footprint-max-width"
  | "footprint-max-height"
  | "available-width"
  | "available-height"
  | "minimum-width"
  | "minimum-height"
  | "minimum-scale"
  | "upscale-disabled"
  | "user-override";

export interface PresentationSnapshot {
  readonly name: string | null;
  readonly surface: OverlayMode;
  readonly footprint: PresentationFootprint["mode"];
  readonly viewport: PresentationViewport["mode"];
  readonly authority: PresentationAuthority;
  readonly requested: PresentationSize;
  readonly physical: PresentationSize;
  readonly logical: PresentationSize;
  readonly rendered: PresentationSize;
  readonly scale: number;
  readonly overflow: "none" | "scroll";
  readonly constrained: boolean;
  readonly constraints: readonly PresentationConstraint[];
}

export interface PreferredPresentationSize {
  readonly size: PresentationSize;
  readonly constraints: readonly PresentationConstraint[];
}

export interface PresentationSnapshotInput {
  readonly presentation: OverlayPresentation;
  readonly name?: string | null;
  readonly surface: OverlayMode;
  readonly authority: PresentationAuthority;
  readonly requested: PresentationSize;
  readonly physical: PresentationSize;
  readonly constraints?: readonly PresentationConstraint[];
}

export function isPresentationSnapshot(value: unknown): value is PresentationSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const size = (input: unknown): input is PresentationSize => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
    const dimensions = input as Record<string, unknown>;
    return (
      typeof dimensions.width === "number" &&
      Number.isFinite(dimensions.width) &&
      dimensions.width > 0 &&
      typeof dimensions.height === "number" &&
      Number.isFinite(dimensions.height) &&
      dimensions.height > 0
    );
  };
  return (
    (candidate.name === null || typeof candidate.name === "string") &&
    ["floating", "sheet", "fullscreen"].includes(String(candidate.surface)) &&
    ["fixed", "resizable", "content-fit"].includes(String(candidate.footprint)) &&
    ["responsive", "virtual"].includes(String(candidate.viewport)) &&
    ["default", "guest", "host", "user"].includes(String(candidate.authority)) &&
    size(candidate.requested) &&
    size(candidate.physical) &&
    size(candidate.logical) &&
    size(candidate.rendered) &&
    typeof candidate.scale === "number" &&
    Number.isFinite(candidate.scale) &&
    candidate.scale > 0 &&
    ["none", "scroll"].includes(String(candidate.overflow)) &&
    typeof candidate.constrained === "boolean" &&
    Array.isArray(candidate.constraints) &&
    candidate.constraints.every((constraint) => typeof constraint === "string")
  );
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number`);
  }
  return value;
}

function clampDimension(
  value: number,
  minimum: number | undefined,
  maximum: number | undefined,
  minimumConstraint: PresentationConstraint,
  maximumConstraint: PresentationConstraint,
  constraints: PresentationConstraint[],
): number {
  let result = value;
  if (minimum !== undefined && result < minimum) {
    result = minimum;
    constraints.push(minimumConstraint);
  }
  if (maximum !== undefined && result > maximum) {
    result = maximum;
    constraints.push(maximumConstraint);
  }
  return result;
}

export function validatePresentation(presentation: OverlayPresentation): void {
  if (
    presentation.surface !== undefined &&
    !["auto", "floating", "sheet", "fullscreen"].includes(String(presentation.surface))
  ) {
    throw new Error("Unsupported presentation surface mode");
  }
  const footprint = presentation.footprint;
  if (footprint.mode === "fixed") {
    finitePositive(footprint.width, "Fixed footprint width");
    finitePositive(footprint.height, "Fixed footprint height");
  } else if (footprint.mode === "resizable") {
    finitePositive(footprint.preferred.width, "Resizable footprint width");
    finitePositive(footprint.preferred.height, "Resizable footprint height");
  } else if (footprint.mode === "content-fit") {
    if (footprint.preferred) {
      finitePositive(footprint.preferred.width, "Content-fit preferred width");
      finitePositive(footprint.preferred.height, "Content-fit preferred height");
    }
    for (const [label, value] of [
      ["Content-fit minimum width", footprint.min?.width],
      ["Content-fit minimum height", footprint.min?.height],
      ["Content-fit maximum width", footprint.max?.width],
      ["Content-fit maximum height", footprint.max?.height],
    ] as const) {
      if (value !== undefined) finitePositive(value, label);
    }
    if (
      footprint.min?.width !== undefined &&
      footprint.max?.width !== undefined &&
      footprint.min.width > footprint.max.width
    ) {
      throw new Error("Content-fit minimum width cannot exceed its maximum width");
    }
    if (
      footprint.min?.height !== undefined &&
      footprint.max?.height !== undefined &&
      footprint.min.height > footprint.max.height
    ) {
      throw new Error("Content-fit minimum height cannot exceed its maximum height");
    }
  } else {
    throw new Error("Unsupported presentation footprint mode");
  }

  if (presentation.viewport.mode === "virtual") {
    finitePositive(presentation.viewport.width, "Virtual viewport width");
    finitePositive(presentation.viewport.height, "Virtual viewport height");
    if (presentation.viewport.fit !== undefined && presentation.viewport.fit !== "contain") {
      throw new Error("Unsupported virtual viewport fit policy");
    }
    if (
      presentation.viewport.allowUpscale !== undefined &&
      typeof presentation.viewport.allowUpscale !== "boolean"
    ) {
      throw new Error("Virtual viewport allowUpscale must be a boolean");
    }
    if (presentation.viewport.minimumScale !== undefined) {
      finitePositive(presentation.viewport.minimumScale, "Virtual viewport minimum scale");
      if (presentation.viewport.minimumScale > 1) {
        throw new Error("Virtual viewport minimum scale cannot exceed 1");
      }
    }
  } else if (presentation.viewport.mode !== "responsive") {
    throw new Error("Unsupported presentation viewport mode");
  }
}

export function preferredPresentationSize(
  presentation: OverlayPresentation,
  fallback: PresentationSize,
  contentSize?: PresentationSize,
): PreferredPresentationSize {
  validatePresentation(presentation);
  finitePositive(fallback.width, "Fallback width");
  finitePositive(fallback.height, "Fallback height");
  const footprint = presentation.footprint;
  if (footprint.mode === "fixed") {
    return { size: { width: footprint.width, height: footprint.height }, constraints: [] };
  }
  if (footprint.mode === "resizable") {
    return { size: { ...footprint.preferred }, constraints: [] };
  }

  const constraints: PresentationConstraint[] = [];
  const source = contentSize ?? footprint.preferred ?? fallback;
  if (!contentSize) constraints.push("content-size-unavailable");
  if (contentSize) {
    finitePositive(contentSize.width, "Content width");
    finitePositive(contentSize.height, "Content height");
  }
  return {
    size: {
      width: clampDimension(
        source.width,
        footprint.min?.width,
        footprint.max?.width,
        "footprint-min-width",
        "footprint-max-width",
        constraints,
      ),
      height: clampDimension(
        source.height,
        footprint.min?.height,
        footprint.max?.height,
        "footprint-min-height",
        "footprint-max-height",
        constraints,
      ),
    },
    constraints,
  };
}

export function resolvePresentationSnapshot(
  input: PresentationSnapshotInput,
): PresentationSnapshot {
  validatePresentation(input.presentation);
  finitePositive(input.requested.width, "Requested width");
  finitePositive(input.requested.height, "Requested height");
  finitePositive(input.physical.width, "Physical width");
  finitePositive(input.physical.height, "Physical height");

  const constraints = [...(input.constraints ?? [])];

  let logical = input.physical;
  let rendered = input.physical;
  let scale = 1;
  let overflow: PresentationSnapshot["overflow"] = "none";
  const viewport = input.presentation.viewport;
  if (viewport.mode === "virtual") {
    logical = { width: viewport.width, height: viewport.height };
    const availableScale = Math.min(
      input.physical.width / viewport.width,
      input.physical.height / viewport.height,
    );
    scale = viewport.allowUpscale === true ? availableScale : Math.min(1, availableScale);
    if (viewport.allowUpscale !== true && availableScale > 1) constraints.push("upscale-disabled");
    if (viewport.minimumScale !== undefined && scale < viewport.minimumScale) {
      scale = viewport.minimumScale;
      overflow = "scroll";
      constraints.push("minimum-scale");
    }
    rendered = { width: viewport.width * scale, height: viewport.height * scale };
  }

  return Object.freeze({
    name: input.name ?? null,
    surface: input.surface,
    footprint: input.presentation.footprint.mode,
    viewport: input.presentation.viewport.mode,
    authority: input.authority,
    requested: Object.freeze({ ...input.requested }),
    physical: Object.freeze({ ...input.physical }),
    logical: Object.freeze({ ...logical }),
    rendered: Object.freeze({ ...rendered }),
    scale,
    overflow,
    constrained: constraints.length > 0,
    constraints: Object.freeze([...new Set(constraints)]),
  });
}
