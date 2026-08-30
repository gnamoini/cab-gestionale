import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateTkbSnapshotCache } from "./cache/tkb-snapshot-cache.server";
import { publishDraftToDb, loadLatestPublishedSnapshot, type PublishDraftOpts } from "./tkb-repository.server";
import {
  getLatestMemorySnapshot,
  getMemorySnapshotByVersion,
  loadPublishedTkbSnapshot as loadMemorySnapshot,
  publishTkbDraft as publishMemoryDraft,
} from "./tkb-publish";
import type { PublishTkbResult, TkbDraftBundle, TkbPublishedSnapshot } from "./types";

const shouldUseTkbMemoryStore = () =>
  process.env.TKB_USE_MEMORY_STORE === "1" || process.env.NODE_ENV === "test";

export async function publishTkbDraftServer(
  supabase: SupabaseClient | null,
  bundle: TkbDraftBundle,
  opts?: PublishDraftOpts,
): Promise<PublishTkbResult> {
  if (shouldUseTkbMemoryStore() || !supabase) {
    return publishMemoryDraft(bundle, opts);
  }
  const result = await publishDraftToDb(supabase, bundle, opts);
  if (result.created) invalidateTkbSnapshotCache();
  return result;
}

export async function loadPublishedTkbSnapshotServer(
  supabase: SupabaseClient | null,
  kbVersion?: number,
): Promise<TkbPublishedSnapshot> {
  if (shouldUseTkbMemoryStore() || !supabase) {
    return loadMemorySnapshot(kbVersion);
  }
  const { getCachedPublishedSnapshot } = await import("./cache/tkb-snapshot-cache.server");
  const cached = await getCachedPublishedSnapshot(supabase, kbVersion);
  if (cached) return cached;
  throw new Error("Nessuno snapshot TKB published disponibile.");
}

export async function getLatestKbVersionServer(supabase: SupabaseClient | null): Promise<number | null> {
  if (shouldUseTkbMemoryStore() || !supabase) {
    return getLatestMemorySnapshot()?.kbVersion ?? null;
  }
  const latest = await loadLatestPublishedSnapshot(supabase);
  return latest?.snapshot.kbVersion ?? null;
}

export { getMemorySnapshotByVersion, getLatestMemorySnapshot };
