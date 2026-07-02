import {
  createTkbSeedDraft,
  getLatestMemorySnapshot,
  publishTkbDraft,
  resetMemorySnapshots,
} from "@/lib/domain/technical-knowledge-base";

export type TkbAdminPublishState = {
  kbVersion: number;
  idempotent: boolean;
  snapshotHash: string;
  draftHash: string;
};

/** Admin publish (client dev / future server RPC wrapper). */
export function adminPublishTkbFromSeed(): TkbAdminPublishState {
  resetMemorySnapshots();
  const result = publishTkbDraft(createTkbSeedDraft(), { changeSummary: "Admin publish from seed" });
  return {
    kbVersion: result.kbVersion,
    idempotent: result.idempotent,
    snapshotHash: result.snapshotHash,
    draftHash: result.draftHash,
  };
}

export function adminGetLatestKbVersion(): number | null {
  return getLatestMemorySnapshot()?.kbVersion ?? null;
}
