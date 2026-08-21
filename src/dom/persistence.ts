import { isWindowGeometry, type WindowGeometry } from "../core";

export interface GeometryPersistence {
  load(id: string): unknown | Promise<unknown>;
  save(id: string, geometry: WindowGeometry): void | Promise<void>;
  remove?(id: string): void | Promise<void>;
}

interface PersistedGeometry {
  readonly version: 1;
  readonly geometry: WindowGeometry;
}

export function parsePersistedGeometry(value: unknown): WindowGeometry | undefined {
  if (isWindowGeometry(value)) return value;
  if (typeof value === "object" && value !== null) {
    const candidate = value as Partial<PersistedGeometry>;
    if (candidate.version === 1 && isWindowGeometry(candidate.geometry)) return candidate.geometry;
  }
  if (typeof value === "string") {
    try {
      return parsePersistedGeometry(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function createLocalStorageGeometryPersistence(
  storage: Storage,
  prefix = "widget-shell:geometry:",
): GeometryPersistence {
  return {
    load(id) {
      return storage.getItem(`${prefix}${id}`);
    },
    save(id, geometry) {
      storage.setItem(`${prefix}${id}`, JSON.stringify({ version: 1, geometry }));
    },
    remove(id) {
      storage.removeItem(`${prefix}${id}`);
    },
  };
}
