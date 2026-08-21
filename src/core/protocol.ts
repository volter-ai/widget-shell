export const WIDGET_SHELL_PROTOCOL = "widget-shell/v1" as const;

export interface BridgeEnvelope<T = unknown> {
  readonly protocol: typeof WIDGET_SHELL_PROTOCOL;
  readonly instanceId: string;
  readonly type: "INIT" | "READY" | "REQUEST" | "RESPONSE" | "EVENT";
  readonly requestId?: string;
  readonly capability?: string;
  readonly ok?: boolean;
  readonly payload?: T;
  readonly error?: string;
}

export function isBridgeEnvelope(value: unknown): value is BridgeEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.protocol === WIDGET_SHELL_PROTOCOL &&
    typeof candidate.instanceId === "string" &&
    ["INIT", "READY", "REQUEST", "RESPONSE", "EVENT"].includes(String(candidate.type)) &&
    (candidate.requestId === undefined || typeof candidate.requestId === "string") &&
    (candidate.capability === undefined || typeof candidate.capability === "string")
  );
}

export function bridgeEnvelope<T>(
  instanceId: string,
  type: BridgeEnvelope["type"],
  fields: Omit<BridgeEnvelope<T>, "protocol" | "instanceId" | "type"> = {},
): BridgeEnvelope<T> {
  return { protocol: WIDGET_SHELL_PROTOCOL, instanceId, type, ...fields };
}
