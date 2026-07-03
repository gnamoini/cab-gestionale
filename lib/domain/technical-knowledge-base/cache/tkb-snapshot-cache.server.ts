import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLatestPublishedSnapshot, loadPublishedSnapshotByVersion } from "../tkb-repository.server";
import type { TkbPublishedSnapshot } from "../types";

type CacheEntry = { snapshot: TkbPublishedSnapshot; loadedAt: number };

const cache = new Map<number, CacheEntry>();
let latestVersion: number | null = null;
let latestLoadedAt = 0;

const DEFAULT_TTL_MS = Number(process.env.TKB_CACHE_TTL_MS ?? 300_000);

export async function getCachedPublishedSnapshot(
  supabase: SupabaseClient,
  kbVersion?: number,
): Promise<TkbPublishedSnapshot | null> {
  const now = Date.now();
  if (kbVersion != null) {
    const hit = cache.get(kbVersion);
    if (hit && now - hit.loadedAt < DEFAULT_TTL_MS) return hit.snapshot;
    const snap = await loadPublishedSnapshotByVersion(supabase, kbVersion);
    if (snap) {
      cache.set(kbVersion, { snapshot: snap, loadedAt: now });
      return snap;
    }
    return null;
  }

  if (latestVersion != null && now - latestLoadedAt < DEFAULT_TTL_MS) {
    const hit = cache.get(latestVersion);
    if (hit) return hit.snapshot;
  }

  const latest = await loadLatestPublishedSnapshot(supabase);
  if (!latest) return null;
  latestVersion = latest.snapshot.kbVersion;
  latestLoadedAt = now;
  cache.set(latest.snapshot.kbVersion, { snapshot: latest.snapshot, loadedAt: now });
  return latest.snapshot;
}

export function invalidateTkbSnapshotCache(kbVersion?: number): void {
  if (kbVersion != null) {
    cache.delete(kbVersion);
    if (latestVersion === kbVersion) latestVersion = null;
    return;
  }
  cache.clear();
  latestVersion = null;
  latestLoadedAt = 0;
}
