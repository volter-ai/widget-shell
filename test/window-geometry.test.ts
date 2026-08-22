import { describe, expect, it } from "vitest";
import {
  constrainGeometry,
  initialGeometry,
  moveGeometry,
  resizeAnchoredGeometry,
  resizeGeometry,
  snapGeometry,
} from "../src/core";

describe("window geometry", () => {
  it("keeps persisted and interactive geometry recoverable across radically smaller hosts", () => {
    const desktop = { width: 1440, height: 1000 };
    const initial = initialGeometry({ width: 390, height: 667, gutter: 16 }, desktop, "bottom-end");
    expect(initial).toEqual({ x: 1034, y: 251, width: 390, height: 667 });

    const moved = moveGeometry(initial, -1010, -230, desktop);
    expect(snapGeometry(moved, desktop)).toEqual({ x: 16, y: 16, width: 390, height: 667 });

    const resized = resizeGeometry(moved, 900, 900, desktop);
    expect(resized).toEqual({ x: 24, y: 16, width: 1290, height: 902 });

    const restoredOnSmallHost = constrainGeometry(resized, { width: 360, height: 520 });
    expect(restoredOnSmallHost).toEqual({ x: 16, y: 16, width: 328, height: 422 });

    const appDrivenResize = resizeAnchoredGeometry(
      initial,
      { width: 500, height: 400 },
      desktop,
      "bottom-end",
    );
    expect(appDrivenResize).toEqual({ x: 924, y: 518, width: 500, height: 400 });
  });
});
