import { describe, expect, it } from "vitest";
import {
  type OverlayPresentation,
  preferredPresentationSize,
  resolvePresentationSnapshot,
} from "../src/core";

describe("presentation geometry", () => {
  it("keeps content fitting and virtual scaling bounded without changing the logical viewport", () => {
    const contentFit: OverlayPresentation = {
      footprint: {
        mode: "content-fit",
        min: { width: 280, height: 180 },
        max: { width: 720, height: 800 },
      },
      viewport: { mode: "responsive" },
    };
    expect(
      preferredPresentationSize(
        contentFit,
        { width: 390, height: 667 },
        {
          width: 900,
          height: 1_000,
        },
      ),
    ).toEqual({
      size: { width: 720, height: 800 },
      constraints: ["footprint-max-width", "footprint-max-height"],
    });

    const virtual: OverlayPresentation = {
      footprint: { mode: "resizable", preferred: { width: 280, height: 360 } },
      viewport: {
        mode: "virtual",
        width: 390,
        height: 844,
        fit: "contain",
        minimumScale: 0.75,
      },
    };
    const snapshot = resolvePresentationSnapshot({
      presentation: virtual,
      surface: "floating",
      authority: "default",
      requested: { width: 280, height: 360 },
      physical: { width: 280, height: 360 },
    });
    expect(snapshot.logical).toEqual({ width: 390, height: 844 });
    expect(snapshot.scale).toBe(0.75);
    expect(snapshot.rendered).toEqual({ width: 292.5, height: 633 });
    expect(snapshot.overflow).toBe("scroll");
    expect(snapshot.constraints).toEqual(["minimum-scale"]);
  });
});
