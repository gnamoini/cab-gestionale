import type { GestionaleActionSource } from "@/lib/sync/gestionale-sync-dispatch";
import {
  clearPersistedGestionaleDirty,
  persistGestionaleDirtyEntry,
  readPersistedGestionaleDirtyEntries,
  removePersistedGestionaleDirtyKeys,
} from "@/lib/sync/gestionale-dirty-persist";
import type { OperationalTableVersions } from "@/lib/sync/operational-data-version";
import type {
  GestionaleSyncDomain,
  GestionaleSyncScopeRegistration,
} from "@/lib/sync/gestionale-sync-scope";
import { getGestionaleSyncScopeGeneration, subscribeGestionaleSyncScopes } from "@/lib/sync/gestionale-sync-scope";

export type DirtyEntryType = "create" | "update" | "delete";

export type DirtyEntry = {
  domain: GestionaleSyncDomain;
  table: string;
  entityId: string | null;
  type: DirtyEntryType;
  timestamp: number;
  source: GestionaleActionSource;
  remoteVersion?: number | string;
};

export type DirtySnapshot = {
  entries: ReadonlyMap<string, DirtyEntry>;
  changeCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
};

export type ClearGestionaleDirtyScope = {
  domain?: GestionaleSyncDomain;
  table?: string;
  entityId?: string;
};

const dirtyListeners = new Set<() => void>();

let snapshot: DirtySnapshot = {
  entries: new Map(),
  changeCount: 0,
  firstSeenAt: 0,
  lastSeenAt: 0,
};

export function dirtyEntryKey(table: string, entityId: string | null): string {
  return `${table}:${entityId ?? "*"}`;
}

function notifyDirtyListeners(): void {
  for (const fn of dirtyListeners) {
    try {
      fn();
    } catch (e) {
      console.warn("[gestionale-dirty-state] listener error", e);
    }
  }
}

export function getGestionaleDirtySnapshot(): DirtySnapshot {
  return snapshot;
}

export function markGestionaleDirty(entry: DirtyEntry): void {
  const now = entry.timestamp || Date.now();
  const key = dirtyEntryKey(entry.table, entry.entityId);
  const nextEntries = new Map(snapshot.entries);
  nextEntries.set(key, { ...entry, timestamp: now });

  snapshot = {
    entries: nextEntries,
    changeCount: snapshot.changeCount + 1,
    firstSeenAt: snapshot.firstSeenAt || now,
    lastSeenAt: now,
  };
  persistGestionaleDirtyEntry({ ...entry, timestamp: now });
  notifyDirtyListeners();
}

export function clearGestionaleDirty(scope?: ClearGestionaleDirtyScope): void {
  if (!scope) {
    snapshot = { entries: new Map(), changeCount: 0, firstSeenAt: 0, lastSeenAt: 0 };
    clearPersistedGestionaleDirty();
    notifyDirtyListeners();
    return;
  }

  const nextEntries = new Map(snapshot.entries);
  for (const [key, entry] of snapshot.entries) {
    if (scope.domain && entry.domain !== scope.domain) continue;
    if (scope.table && entry.table !== scope.table) continue;
    if (scope.entityId && entry.entityId !== scope.entityId) continue;
    nextEntries.delete(key);
  }

  if (nextEntries.size === snapshot.entries.size) return;

  snapshot = {
    ...snapshot,
    entries: nextEntries,
    lastSeenAt: Date.now(),
  };
  if (nextEntries.size === 0) {
    snapshot = { entries: new Map(), changeCount: 0, firstSeenAt: 0, lastSeenAt: 0 };
  }
  notifyDirtyListeners();
}

export function subscribeGestionaleDirty(fn: () => void): () => void {
  dirtyListeners.add(fn);
  return () => {
    dirtyListeners.delete(fn);
  };
}

export function isDirtyRelevantForScope(
  entry: DirtyEntry,
  scope: GestionaleSyncScopeRegistration,
): boolean {
  if (!scope.tables.includes(entry.table)) return false;
  if (entry.domain !== scope.domain) return false;

  const visible = scope.visibleEntities ?? [];
  if (visible.length === 0) {
    return true;
  }

  if (!entry.entityId) return false;

  return visible.some((v) => v.table === entry.table && v.entityId === entry.entityId);
}

export function getDirtyForScope(scope: GestionaleSyncScopeRegistration): DirtyEntry[] {
  const out: DirtyEntry[] = [];
  for (const entry of snapshot.entries.values()) {
    if (isDirtyRelevantForScope(entry, scope)) out.push(entry);
  }
  return out;
}

export function getDirtyForActiveScopes(
  scopes: readonly GestionaleSyncScopeRegistration[],
): DirtyEntry[] {
  const seen = new Set<string>();
  const out: DirtyEntry[] = [];
  for (const scope of scopes) {
    for (const entry of getDirtyForScope(scope)) {
      const key = dirtyEntryKey(entry.table, entry.entityId);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

let cachedActiveScopesKey = "";
let cachedActiveScopesEntries: DirtyEntry[] = [];

function activeScopesCacheKey(scopes: readonly GestionaleSyncScopeRegistration[]): string {
  const scopeKey = scopes
    .map((scope) => scope.scopeId)
    .sort()
    .join(",");
  return `${snapshot.changeCount}|${getGestionaleSyncScopeGeneration()}|${scopeKey}`;
}

/** Revisione combinata dirty + scope — per `useSyncExternalStore`. */
export function getGestionaleSyncStoreRevision(): string {
  return `${snapshot.changeCount}|${getGestionaleSyncScopeGeneration()}`;
}

export function subscribeGestionaleDirtyAndScopes(fn: () => void): () => void {
  const unsubDirty = subscribeGestionaleDirty(fn);
  const unsubScope = subscribeGestionaleSyncScopes(fn);
  return () => {
    unsubDirty();
    unsubScope();
  };
}

/** Snapshot stabile per `useSyncExternalStore` — stesso ref finché dirty/scopes non cambiano. */
export function getDirtyForActiveScopesSnapshot(
  scopes: readonly GestionaleSyncScopeRegistration[],
): DirtyEntry[] {
  const key = activeScopesCacheKey(scopes);
  if (key === cachedActiveScopesKey) return cachedActiveScopesEntries;
  cachedActiveScopesKey = key;
  cachedActiveScopesEntries = getDirtyForActiveScopes(scopes);
  return cachedActiveScopesEntries;
}

export function hasRelevantDirtyForScopes(scopes: readonly GestionaleSyncScopeRegistration[]): boolean {
  return getDirtyForActiveScopes(scopes).length > 0;
}

export function hydrateGestionaleDirtyFromSession(): void {
  for (const entry of readPersistedGestionaleDirtyEntries()) {
    markGestionaleDirty(entry);
  }
}

function isStaleVerifiedDirtyEntry(
  entry: DirtyEntry,
  serverVersions: OperationalTableVersions,
  changedTables: readonly string[],
): boolean {
  if (changedTables.includes(entry.table)) return false;
  if (entry.remoteVersion == null || entry.remoteVersion === "") return false;
  const serverV = serverVersions[entry.table] ?? 0;
  const entryV = Number(entry.remoteVersion);
  if (!Number.isFinite(entryV)) return false;
  return serverV <= entryV;
}

/** Rimuove solo dirty persistiti stale — conserva realtime senza remoteVersion. */
export function clearStaleVerifiedDirtyEntries(opts: {
  serverVersions: OperationalTableVersions;
  changedTables: readonly string[];
}): void {
  const staleKeys: string[] = [];
  for (const entry of snapshot.entries.values()) {
    if (!isStaleVerifiedDirtyEntry(entry, opts.serverVersions, opts.changedTables)) continue;
    staleKeys.push(dirtyEntryKey(entry.table, entry.entityId));
  }
  if (staleKeys.length === 0) return;

  const nextEntries = new Map(snapshot.entries);
  for (const key of staleKeys) {
    nextEntries.delete(key);
  }

  snapshot = {
    ...snapshot,
    entries: nextEntries,
    lastSeenAt: Date.now(),
  };
  if (nextEntries.size === 0) {
    snapshot = { entries: new Map(), changeCount: 0, firstSeenAt: 0, lastSeenAt: 0 };
    clearPersistedGestionaleDirty();
  } else {
    removePersistedGestionaleDirtyKeys(staleKeys);
  }
  notifyDirtyListeners();
}

export function resetGestionaleDirtyStateForTests(): void {
  snapshot = { entries: new Map(), changeCount: 0, firstSeenAt: 0, lastSeenAt: 0 };
  dirtyListeners.clear();
  cachedActiveScopesKey = "";
  cachedActiveScopesEntries = [];
}
