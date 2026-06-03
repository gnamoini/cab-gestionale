import { stockSnapshotFromRicambio, type StockSnapshot } from "@/lib/magazzino/ricambio-stock-crossing";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const registry = new Map<string, StockSnapshot>();

export function getRicambioStockSnapshot(ricambioId: string): StockSnapshot | undefined {
  const id = ricambioId.trim();
  if (!id) return undefined;
  return registry.get(id);
}

export function setRicambioStockSnapshot(ricambioId: string, snapshot: StockSnapshot): void {
  const id = ricambioId.trim();
  if (!id) return;
  registry.set(id, snapshot);
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
