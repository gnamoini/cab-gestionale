import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export const LAVORAZIONE_STATO_SNAPSHOT_REGISTRY_MAX = 500;

const registry = new Map<string, string>();

export function getLavorazioneStatoSnapshot(lavorazioneId: string): string | undefined {
  const id = lavorazioneId.trim();
  if (!id) return undefined;
  return registry.get(id);
}

export function setLavorazioneStatoSnapshot(lavorazioneId: string, stato: string): void {
  const id = lavorazioneId.trim();
  const s = stato.trim();
  if (!id || !s) return;
  if (!registry.has(id) && registry.size >= LAVORAZIONE_STATO_SNAPSHOT_REGISTRY_MAX) {
    const oldest = registry.keys().next().value;
    if (oldest) registry.delete(oldest);
  }
  registry.set(id, s);
}

export function seedLavorazioneStatoSnapshotsFromRows(rows: readonly LavorazioneListRow[]): void {
  for (const row of rows) {
    if (row.stato?.trim()) setLavorazioneStatoSnapshot(row.id, row.stato);
  }
}

/** Solo per test. */
export function clearLavorazioneStatoSnapshotRegistry(): void {
  registry.clear();
}
