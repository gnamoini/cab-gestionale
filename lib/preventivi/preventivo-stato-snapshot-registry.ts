import type { PreventivoRecord } from "@/lib/preventivi/types";

export const PREVENTIVO_STATO_SNAPSHOT_REGISTRY_MAX = 500;

const registry = new Map<string, string>();

export function getPreventivoStatoSnapshot(preventivoId: string): string | undefined {
  const id = preventivoId.trim();
  if (!id) return undefined;
  return registry.get(id);
}

export function setPreventivoStatoSnapshot(preventivoId: string, stato: string): void {
  const id = preventivoId.trim();
  const s = stato.trim();
  if (!id || !s) return;
  if (!registry.has(id) && registry.size >= PREVENTIVO_STATO_SNAPSHOT_REGISTRY_MAX) {
    const oldest = registry.keys().next().value;
    if (oldest) registry.delete(oldest);
  }
  registry.set(id, s);
}

export function seedPreventivoStatoSnapshotsFromRecords(records: readonly PreventivoRecord[]): void {
  for (const p of records) {
    if (p.stato?.trim()) setPreventivoStatoSnapshot(p.id, p.stato);
  }
}

/** Solo per test. */
export function clearPreventivoStatoSnapshotRegistry(): void {
  registry.clear();
}
