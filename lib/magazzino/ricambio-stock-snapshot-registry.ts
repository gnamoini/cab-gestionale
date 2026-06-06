import { stockSnapshotFromRicambio, type StockSnapshot } from "@/lib/magazzino/ricambio-stock-crossing";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

/** Cap LRU — evita crescita illimitata in sessioni lunghe su magazzino. */
export const RICAMBIO_STOCK_SNAPSHOT_REGISTRY_MAX = 500;

const registry = new Map<string, StockSnapshot>();

export function getRicambioStockSnapshot(ricambioId: string): StockSnapshot | undefined {
  const id = ricambioId.trim();
  if (!id) return undefined;
  return registry.get(id);
}

export function setRicambioStockSnapshot(ricambioId: string, snapshot: StockSnapshot): void {
  const id = ricambioId.trim();
  if (!id) return;
  if (!registry.has(id) && registry.size >= RICAMBIO_STOCK_SNAPSHOT_REGISTRY_MAX) {
    const oldest = registry.keys().next().value;
    if (oldest) registry.delete(oldest);
  }
  registry.set(id, snapshot);
}

export function getRicambioStockSnapshotRegistrySize(): number {
  return registry.size;
}

export function seedRicambioStockSnapshotsFromRicambi(rows: readonly RicambioMagazzino[]): void {
  for (const row of rows) {
    setRicambioStockSnapshot(row.id, stockSnapshotFromRicambio(row));
  }
}

/** Solo per test. */
export function clearRicambioStockSnapshotRegistry(): void {
  registry.clear();
}
