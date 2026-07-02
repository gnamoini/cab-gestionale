import {
  buildPublishedSnapshot,
  hashDraftBundle,
  hashPublishedSnapshot,
  validateTkbDraftBundle,
} from "./tkb-snapshot-builder";
import type { PublishTkbResult, TkbDraftBundle, TkbPublishedSnapshot } from "./types";

export type StoredPublishedSnapshot = TkbPublishedSnapshot & {
  draftHash: string;
  snapshotHash: string;
};

/** ponytail: in-memory store per test/dev; produzione usa DB via tkb-repository.server. */
const memorySnapshots: StoredPublishedSnapshot[] = [];

export function listMemorySnapshots(): readonly StoredPublishedSnapshot[] {
  return memorySnapshots;
}

export function resetMemorySnapshots(): void {
  memorySnapshots.length = 0;
}

export function getLatestMemorySnapshot(): StoredPublishedSnapshot | null {
  if (memorySnapshots.length === 0) return null;
  return memorySnapshots.reduce((a, b) => (a.kbVersion > b.kbVersion ? a : b));
}

export function getMemorySnapshotByVersion(kbVersion: number): StoredPublishedSnapshot | null {
  return memorySnapshots.find((s) => s.kbVersion === kbVersion) ?? null;
}

export function publishTkbDraft(
  bundle: TkbDraftBundle,
  opts?: { changeSummary?: string; publishedAt?: string; publishedBy?: string },
): PublishTkbResult {
  validateTkbDraftBundle(bundle);
  const draftHash = hashDraftBundle(bundle);
  const latest = getLatestMemorySnapshot();
  if (latest && latest.draftHash === draftHash) {
    return {
      kbVersion: latest.kbVersion,
      snapshotHash: latest.snapshotHash,
      draftHash,
      created: false,
      idempotent: true,
    };
  }

  const kbVersion = (latest?.kbVersion ?? 0) + 1;
  const publishedAt = opts?.publishedAt ?? new Date().toISOString();
  const snapshot = buildPublishedSnapshot(bundle, kbVersion, publishedAt);
  const snapshotHash = hashPublishedSnapshot(snapshot);

  memorySnapshots.push({
    ...snapshot,
    draftHash,
    snapshotHash,
  });

  return { kbVersion, snapshotHash, draftHash, created: true, idempotent: false };
}

export function loadPublishedTkbSnapshot(kbVersion?: number): TkbPublishedSnapshot {
  const snap = kbVersion != null ? getMemorySnapshotByVersion(kbVersion) : getLatestMemorySnapshot();
  if (!snap) {
    throw new Error("Nessuno snapshot TKB published disponibile.");
  }
  return {
    schemaVersion: snap.schemaVersion,
    kbVersion: snap.kbVersion,
    publishedAt: snap.publishedAt,
    componenti: snap.componenti,
    sintomi: snap.sintomi,
    categorie: snap.categorie,
    procedure: snap.procedure,
    interventi: snap.interventi,
    ricambiMap: snap.ricambiMap,
  };
}
