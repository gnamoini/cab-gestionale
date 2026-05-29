import { createHash } from "node:crypto";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";
import { EMPTY_SERVER_AUTH_SNAPSHOT } from "@/src/lib/auth/server-auth-types";

const TTL_MS = 45_000;

type CacheEntry = {
  expiresAt: number;
  snapshot: ServerAuthSnapshot;
};

const snapshotCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ServerAuthSnapshot>>();

export function cookieFingerprintFromList(cookies: { name: string; value: string }[]): string {
  const parts = cookies
    .map((c) => `${c.name}=${c.value}`)
    .sort((a, b) => a.localeCompare(b));
  return createHash("sha256").update(parts.join(";")).digest("hex").slice(0, 32);
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of snapshotCache) {
    if (entry.expiresAt <= now) snapshotCache.delete(key);
  }
}

export function readCachedServerAuthSnapshot(fingerprint: string): ServerAuthSnapshot | null {
  pruneExpired();
  const hit = snapshotCache.get(fingerprint);
  if (!hit || hit.expiresAt <= Date.now()) return null;
  return hit.snapshot;
}

export function writeCachedServerAuthSnapshot(fingerprint: string, snapshot: ServerAuthSnapshot): void {
  snapshotCache.set(fingerprint, {
    expiresAt: Date.now() + TTL_MS,
    snapshot,
  });
}

export async function dedupeServerAuthFetch(
  fingerprint: string,
  fetcher: () => Promise<ServerAuthSnapshot>,
): Promise<ServerAuthSnapshot> {
  const cached = readCachedServerAuthSnapshot(fingerprint);
  if (cached) return cached;

  const pending = inflight.get(fingerprint);
  if (pending) return pending;

  const promise = fetcher()
    .then((snapshot) => {
      writeCachedServerAuthSnapshot(fingerprint, snapshot);
      return snapshot;
    })
    .finally(() => {
      inflight.delete(fingerprint);
    });

  inflight.set(fingerprint, promise);
  return promise;
}

export function emptyAuthSnapshot(configurationError: string | null = null): ServerAuthSnapshot {
  return {
    ...EMPTY_SERVER_AUTH_SNAPSHOT,
    configurationError,
  };
}

/** Svuota cache snapshot auth server (dopo cambio ruolo/permessi/pilot). */
export function clearServerAuthSnapshotCache(): void {
  snapshotCache.clear();
  inflight.clear();
}

/** Rimuove entry cache per utente (best-effort: match su user id nello snapshot). */
export function clearServerAuthSnapshotCacheForUser(userId: string): void {
  if (!userId.trim()) return;
  for (const [key, entry] of snapshotCache) {
    if (entry.snapshot.user?.id === userId) snapshotCache.delete(key);
  }
}
