import { describe, expect, it } from "vitest";
import { bridgeEnvelope, isBridgeEnvelope } from "../src/core";

describe("bridge protocol", () => {
  it("accepts only complete versioned envelopes before origin and source validation", () => {
    const valid = bridgeEnvelope("support", "REQUEST", {
      requestId: "support:1",
      capability: "selection.read",
      payload: { format: "text" },
    });

    expect(isBridgeEnvelope(valid)).toBe(true);
    expect(isBridgeEnvelope({ ...valid, protocol: "widget-shell/v2" })).toBe(false);
    expect(isBridgeEnvelope({ ...valid, instanceId: 42 })).toBe(false);
    expect(isBridgeEnvelope({ ...valid, requestId: {} })).toBe(false);
    expect(isBridgeEnvelope(null)).toBe(false);
  });
});
