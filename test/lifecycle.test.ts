import { describe, expect, it } from "vitest";
import { INITIAL_OVERLAY_STATE, transitionOverlay } from "../src/core";

describe("overlay lifecycle", () => {
  it("preserves deterministic close and recovery behavior through interleaved guest events", () => {
    const mounted = transitionOverlay(INITIAL_OVERLAY_STATE, { type: "MOUNT" });
    const opening = transitionOverlay(mounted, { type: "OPEN" });
    const readyWhileOpening = transitionOverlay(opening, { type: "GUEST_READY" });
    const closing = transitionOverlay(readyWhileOpening, { type: "CLOSE" });
    const staleOpened = transitionOverlay(closing, { type: "OPENED" });
    const closed = transitionOverlay(staleOpened, { type: "CLOSED" });
    const reopened = transitionOverlay(closed, { type: "OPEN" });

    expect(opening).toEqual({ phase: "opening", guest: "loading" });
    expect(staleOpened).toBe(closing);
    expect(reopened).toEqual({ phase: "opening", guest: "ready" });

    const failed = transitionOverlay(reopened, { type: "FAIL", message: "frame timeout" });
    expect(transitionOverlay(failed, { type: "RETRY" })).toEqual({
      phase: "opening",
      guest: "loading",
    });
  });
});
