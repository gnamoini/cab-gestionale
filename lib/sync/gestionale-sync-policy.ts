import type { GestionaleDirtySyncMode } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import {
  isDirtySyncEnabledForDomain,
} from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { isOperationalSessionWarmingUp } from "@/lib/sync/operational-session-warmup";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import type { GestionaleActionSource } from "@/lib/sync/gestionale-sync-dispatch";
import type { DirtyEntry, DirtyEntryType } from "@/lib/sync/gestionale-dirty-state";
import {
  getActiveSyncContexts,
  resolveDomainForTable,
  type GestionaleSyncDomain,
  type GestionaleSyncScopeRegistration,
} from "@/lib/sync/gestionale-sync-scope";

export type SyncRefreshMode = "live" | "dirty_signal" | "manual_only";

export type SyncEffect =
  | { kind: "invalidate"; tables: string[]; entityIdByTable: Map<string, string> }
  | { kind: "mark_dirty"; entries: DirtyEntry[] }
  | { kind: "noop" };

export type ResolvedSyncEffects = {
  invalidateTables: string[];
  invalidateEntityIdByTable: Map<string, string>;
  dirtyEntries: DirtyEntry[];
};

/** Tabelle sempre invalidate — nessun dirty signal. */
export const ALWAYS_LIVE_TABLES = new Set([
  "user_permissions",
  "profiles",
  "log_modifiche",
]);

export function cabEventToDirtyType(ev: CabSyncEvent): DirtyEntryType | null {
  if (ev.type === "settings_updated") return null;
  if (ev.type === "entity_created") return "create";
  if (ev.type === "entity_deleted") return "delete";
  return "update";
}

function domainForTableInScopes(
  table: string,
  scopes: readonly GestionaleSyncScopeRegistration[],
): GestionaleSyncDomain | null {
  for (const scope of scopes) {
    if (scope.tables.includes(table)) return scope.domain;
  }
  return resolveDomainForTable(table);
}

function scopesInterestedInTable(
  table: string,
  scopes: readonly GestionaleSyncScopeRegistration[],
): GestionaleSyncScopeRegistration[] {
  return scopes.filter((s) => s.tables.includes(table));
}

function buildDirtyEntry(
  table: string,
  entityId: string | null,
  type: DirtyEntryType,
  source: GestionaleActionSource,
  domain: GestionaleSyncDomain,
  timestamp: number,
): DirtyEntry {
  return { domain, table, entityId, type, source, timestamp };
}

function dirtyTypeFromTablesAndEvents(
  table: string,
  cabEvents: CabSyncEvent[],
): DirtyEntryType {
  const match = cabEvents.find((e) => e.type !== "settings_updated" && (e.table === table || !e.table));
  if (!match || match.type === "settings_updated") return "update";
  const t = cabEventToDirtyType(match);
  return t ?? "update";
}

function shouldMarkDirtyForScope(
  entry: DirtyEntry,
  scopes: GestionaleSyncScopeRegistration[],
): boolean {
  return scopes.some((scope) => {
    if (!scope.tables.includes(entry.table)) return false;
    if (scope.domain !== entry.domain) return false;
    const visible = scope.visibleEntities ?? [];
    if (visible.length === 0) return true;
    if (!entry.entityId) return false;
    return visible.some((v) => v.table === entry.table && v.entityId === entry.entityId);
  });
}

export type ResolveSyncEffectInput = {
  source: GestionaleActionSource;
  tables: string[];
  entityIdByTable: Map<string, string>;
  cabEvents: CabSyncEvent[];
  activeScopes?: readonly GestionaleSyncScopeRegistration[];
  flag: GestionaleDirtySyncMode;
};

/**
 * Risolve l'effetto sync per un batch di tabelle.
 * Può produrre invalidate + dirty nello stesso dispatch (tabelle miste).
 */
export function resolveSyncEffects(input: ResolveSyncEffectInput): ResolvedSyncEffects {
  const {
    source,
    tables,
    entityIdByTable,
    cabEvents,
    flag,
  } = input;
  const activeScopes = input.activeScopes ?? getActiveSyncContexts();
  const now = Date.now();

  const invalidateTables: string[] = [];
  const invalidateEntityIdByTable = new Map<string, string>();
  const dirtyEntries: DirtyEntry[] = [];
  const dirtyKeys = new Set<string>();

  if (source === "local_mutation" || flag === "off") {
    return {
      invalidateTables: [...tables],
      invalidateEntityIdByTable: new Map(entityIdByTable),
      dirtyEntries: [],
    };
  }

  if (source === "reconnect") {
    return {
      invalidateTables: [...tables],
      invalidateEntityIdByTable: new Map(entityIdByTable),
      dirtyEntries: [],
    };
  }

  if (isOperationalSessionWarmingUp()) {
    return {
      invalidateTables: [...tables],
      invalidateEntityIdByTable: new Map(entityIdByTable),
      dirtyEntries: [],
    };
  }

  for (const table of tables) {
    if (ALWAYS_LIVE_TABLES.has(table)) {
      invalidateTables.push(table);
      const id = entityIdByTable.get(table);
      if (id) invalidateEntityIdByTable.set(table, id);
      continue;
    }

    const domain = domainForTableInScopes(table, activeScopes);
    if (!domain || !isDirtySyncEnabledForDomain(domain)) {
      invalidateTables.push(table);
      const id = entityIdByTable.get(table);
      if (id) invalidateEntityIdByTable.set(table, id);
      continue;
    }

    const interestedScopes = scopesInterestedInTable(table, activeScopes);
    if (interestedScopes.length === 0) {
      continue;
    }

    const entityId = entityIdByTable.get(table) ?? null;
    const type = dirtyTypeFromTablesAndEvents(table, cabEvents);
    const entry = buildDirtyEntry(table, entityId, type, source, domain, now);

    if (!shouldMarkDirtyForScope(entry, interestedScopes)) {
      continue;
    }

    const key = `${entry.table}:${entry.entityId ?? "*"}`;
    if (dirtyKeys.has(key)) continue;
    dirtyKeys.add(key);
    dirtyEntries.push(entry);
  }

  return { invalidateTables, invalidateEntityIdByTable, dirtyEntries };
}

/** @deprecated Usare resolveSyncEffects — mantiene compat per test singolo effetto. */
export function resolveSyncEffect(input: ResolveSyncEffectInput): SyncEffect {
  const resolved = resolveSyncEffects(input);
  if (resolved.invalidateTables.length > 0) {
    return {
      kind: "invalidate",
      tables: resolved.invalidateTables,
      entityIdByTable: resolved.invalidateEntityIdByTable,
    };
  }
  if (resolved.dirtyEntries.length > 0) {
    return { kind: "mark_dirty", entries: resolved.dirtyEntries };
  }
  return { kind: "noop" };
}
