interface OverlayRegistration {
  readonly coordination: "exclusive" | "independent";
  readonly close: () => void;
  readonly setLayer: (layer: number) => void;
}

interface OverlayRegistry {
  readonly entries: Map<string, OverlayRegistration>;
  layer: number;
}

const REGISTRY_KEY = Symbol.for("@volter-ai-dev/widget-shell/registry/v1");

function registry(): OverlayRegistry {
  const root = globalThis as typeof globalThis & { [REGISTRY_KEY]?: OverlayRegistry };
  root[REGISTRY_KEY] ??= { entries: new Map(), layer: 2_147_000_000 };
  return root[REGISTRY_KEY];
}

export interface OverlayRegistryHandle {
  activate(exclusive: boolean): void;
  destroy(): void;
}

export function registerOverlay(
  id: string,
  registration: OverlayRegistration,
): OverlayRegistryHandle {
  const shared = registry();
  if (shared.entries.has(id)) throw new Error(`Overlay id is already registered: ${id}`);
  shared.entries.set(id, registration);

  return {
    activate(exclusive) {
      if (exclusive) {
        for (const [otherId, other] of shared.entries) {
          if (otherId !== id && other.coordination === "exclusive") other.close();
        }
      }
      shared.layer += 1;
      if (shared.layer > 2_147_483_000) shared.layer = 2_147_000_000;
      registration.setLayer(shared.layer);
    },
    destroy() {
      shared.entries.delete(id);
    },
  };
}
