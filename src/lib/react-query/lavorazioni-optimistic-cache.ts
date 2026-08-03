import type { QueryClient } from "@tanstack/react-query";
import type { Page } from "@/lib/domain/list-types";
import { flattenLavorazioneListPages } from "@/lib/domain/list-flatten";
import type { NormalizedLavorazioniFilters } from "@/lib/domain/list-where-spec";
import { logLavorazioniArchiveMembershipDebug } from "@/lib/lavorazioni/lavorazioni-archive-membership-debug";
import {
  emptyLavorazioniInfiniteListData,
  isLavorazioniInfiniteListCacheData,
  lavorazioniInfiniteSeedFromRows,
  type LavorazioniInfiniteListData,
} from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { isLavorazioniListRowsQueryKey } from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import { lavorazioneCompletamentoFieldsFromYmd } from "@/lib/lavorazioni/date-day-only";
import type { LavorazioneListRow, LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import { QK } from "@/src/lib/react-query/query-keys";

export type LavorazioniListSnapshot = {
  queryKey: readonly unknown[];
  data: LavorazioniListCacheData | undefined;
};

export type LavorazioneBaseSnapshot = {
  queryKey: readonly unknown[];
  data: LavorazioneRow | undefined;
};

export type LavorazioneUpdateOptimisticContext = {
  lists: LavorazioniListSnapshot[];
  bases: LavorazioneBaseSnapshot[];
};

type LavorazioniFlatListData = LavorazioneListRow[];
export type LavorazioniListCacheData = LavorazioniFlatListData | LavorazioniInfiniteListData;

function lavorazioneBaseQueryKey(lavorazioneId: string) {
  return [...QK.lavorazioniQueries, "base", lavorazioneId] as const;
}

/** SSOT: chiavi cache lista lavorazioni (legacy `list` + paginated `list-v2`). */
export function isLavorazioniListCacheQueryKey(queryKey: readonly unknown[]): boolean {
  return isLavorazioniListRowsQueryKey(queryKey);
}

function listKindFromQueryKey(queryKey: readonly unknown[]): "list" | "list-v2" | "unknown" {
  if (queryKey[1] === "list") return "list";
  if (queryKey[1] === "list-v2") return "list-v2";
  return "unknown";
}

function isLavorazioniFlatListCacheData(data: unknown): data is LavorazioniFlatListData {
  return Array.isArray(data);
}

/** Estrae righe da cache lista (flat o infinite). */
export function lavorazioniListCacheRows(data: LavorazioniListCacheData | undefined): LavorazioneListRow[] {
  if (!data) return [];
  if (isLavorazioniInfiniteListCacheData(data)) {
    return flattenLavorazioneListPages(data.pages) as LavorazioneListRow[];
  }
  if (!isLavorazioniFlatListCacheData(data)) return [];
  return [...data];
}

function parseListFilterArchived(queryKey: readonly unknown[]): boolean | null {
  if (!isLavorazioniListCacheQueryKey(queryKey)) return null;
  if (queryKey[1] === "list-v2") {
    const norm = queryKey[2] as NormalizedLavorazioniFilters | undefined;
    if (norm?.mode === "active") return false;
    if (norm?.mode === "closed") return true;
    return null;
  }
  if (typeof queryKey[2] !== "string") return null;
  try {
    const parsed = JSON.parse(queryKey[2]) as { ar?: number };
    if (parsed.ar === 1) return true;
    if (parsed.ar === 0) return false;
  } catch {
    /* ignore */
  }
  return null;
}

/** Membership lista: solo `archived` DB — stato workflow chiuso non sposta in archivio. */
function rowBelongsInArchivedList(row: LavorazioneListRow, listArchived: boolean | null): boolean {
  if (listArchived == null) return true;
  return listArchived ? row.archived === true : row.archived !== true;
}

function parseUpdatedAtMs(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/** Versione più recente vince (updated_at server). */
export function isLavorazioneRowVersionNewer(
  candidate: Pick<LavorazioneRow, "updated_at"> | null | undefined,
  baseline: Pick<LavorazioneRow, "updated_at"> | null | undefined,
): boolean {
  const c = parseUpdatedAtMs(candidate?.updated_at);
  const b = parseUpdatedAtMs(baseline?.updated_at);
  if (c !== b) return c > b;
  return false;
}

export type LavorazioneUpdateOptimisticAudit = {
  updated_by?: string | null;
  updated_at?: string;
};

function mergeOptimisticAuditPatch(
  patch: LavorazioneUpdate,
  audit?: LavorazioneUpdateOptimisticAudit,
): LavorazioneUpdate & LavorazioneUpdateOptimisticAudit {
  if (!audit?.updated_by && !audit?.updated_at) return patch;
  return {
    ...patch,
    ...(audit.updated_by ? { updated_by: audit.updated_by } : {}),
    ...(audit.updated_at ? { updated_at: audit.updated_at } : {}),
  };
}

function mergeListRow(
  row: LavorazioneListRow,
  patch: LavorazioneUpdate,
  serverRow?: LavorazioneRow,
  audit?: LavorazioneUpdateOptimisticAudit,
): LavorazioneListRow {
  const merged = {
    ...row,
    ...mergeOptimisticAuditPatch(patch, audit),
    ...(serverRow ?? {}),
  } as LavorazioneListRow;
  if (serverRow) {
    merged.mezzo = row.mezzo;
  }
  return merged;
}

function listRowFromBase(base: LavorazioneRow, mezzo: LavorazioneListRow["mezzo"]): LavorazioneListRow {
  return { ...base, mezzo } as LavorazioneListRow;
}

function findRowInListCaches(qc: QueryClient, lavorazioneId: string): LavorazioneListRow | undefined {
  const listEntries = qc.getQueriesData<LavorazioniListCacheData>({
    queryKey: QK.lavorazioniQueries,
    predicate: (q) => isLavorazioniListCacheQueryKey(q.queryKey),
  });
  for (const [, old] of listEntries) {
    const hit = lavorazioniListCacheRows(old).find((r) => r.id === lavorazioneId);
    if (hit) return hit;
  }
  return undefined;
}

function resolveMergedRow(
  qc: QueryClient,
  lavorazioneId: string,
  patch: LavorazioneUpdate,
  serverRow?: LavorazioneRow,
  audit?: LavorazioneUpdateOptimisticAudit,
): LavorazioneListRow | undefined {
  const existing = findRowInListCaches(qc, lavorazioneId);
  const base = qc.getQueryData<LavorazioneRow>(lavorazioneBaseQueryKey(lavorazioneId));
  if (existing) {
    const merged = mergeListRow(existing, patch, serverRow, audit);
    if (base && isLavorazioneRowVersionNewer(base, merged) && !serverRow) {
      return listRowFromBase(base, existing.mezzo);
    }
    return merged;
  }
  if (!serverRow && !base) return undefined;
  const seed = serverRow ?? base!;
  const mezzo = null;
  return mergeListRow(listRowFromBase(seed, mezzo), patch, serverRow, audit);
}

function patchFlatList(
  prev: LavorazioneListRow[],
  lavorazioneId: string,
  merged: LavorazioneListRow,
  listArchived: boolean | null,
): LavorazioneListRow[] {
  const belongs = rowBelongsInArchivedList(merged, listArchived);
  const hadRow = prev.some((r) => r.id === lavorazioneId);
  if (belongs) {
    return hadRow ? prev.map((r) => (r.id === lavorazioneId ? merged : r)) : [...prev, merged];
  }
  return prev.filter((r) => r.id !== lavorazioneId);
}

function patchInfiniteList(
  data: LavorazioniInfiniteListData,
  lavorazioneId: string,
  merged: LavorazioneListRow,
  listArchived: boolean | null,
): LavorazioniInfiniteListData {
  const belongs = rowBelongsInArchivedList(merged, listArchived);

  if (!belongs) {
    const pages = data.pages.map((page) => ({
      ...page,
      rows: (page.rows ?? []).filter((r) => r.id !== lavorazioneId),
    }));
    return { ...data, pages };
  }

  const existsAnywhere = data.pages.some((page) =>
    (page.rows ?? []).some((r) => r.id === lavorazioneId),
  );

  if (existsAnywhere) {
    const pages = data.pages.map((page) => ({
      ...page,
      rows: (page.rows ?? []).map((r) => (r.id === lavorazioneId ? merged : r)),
    }));
    return { ...data, pages };
  }

  if (data.pages.length === 0) {
    return {
      ...data,
      pages: [
        {
          rows: [merged],
          pageInfo: { hasNextPage: false, nextCursor: null, totalEstimate: 1 },
        },
      ],
    };
  }

  const pages = [...data.pages];
  const lastIdx = pages.length - 1;
  const last = pages[lastIdx];
  pages[lastIdx] = { ...last, rows: [...(last.rows ?? []), merged] };
  return { ...data, pages };
}

function reconcileRowAcrossLists(qc: QueryClient, lavorazioneId: string, merged: LavorazioneListRow): void {
  const listEntries = qc.getQueriesData<LavorazioniListCacheData>({
    queryKey: QK.lavorazioniQueries,
    predicate: (q) => isLavorazioniListCacheQueryKey(q.queryKey),
  });

  for (const [queryKey, old] of listEntries) {
    const key = queryKey as readonly unknown[];
    const listArchived = parseListFilterArchived(key);
    const prev = old;
    // ponytail: key match ≠ data shape; skip unexpected cache (count scalar, prefetch errato)
    if (prev != null && !isLavorazioniInfiniteListCacheData(prev) && !isLavorazioniFlatListCacheData(prev)) {
      continue;
    }
    const listKind = listKindFromQueryKey(key);
    let next: LavorazioniListCacheData;
    if (isLavorazioniInfiniteListCacheData(prev)) {
      next = patchInfiniteList(prev, lavorazioneId, merged, listArchived);
    } else if (listKind === "list-v2") {
      const seed = isLavorazioniFlatListCacheData(prev)
        ? lavorazioniInfiniteSeedFromRows(prev)
        : emptyLavorazioniInfiniteListData();
      next = patchInfiniteList(seed, lavorazioneId, merged, listArchived);
    } else if (!prev) {
      next = patchFlatList([], lavorazioneId, merged, listArchived);
    } else {
      next = patchFlatList(prev, lavorazioneId, merged, listArchived);
    }
    qc.setQueryData(queryKey, next);
    logLavorazioniArchiveMembershipDebug({
      event: "reconcile",
      lavorazioneId,
      archived: merged.archived,
      updatedAt: merged.updated_at,
      queryKey: key,
      listKind: listKindFromQueryKey(key),
      listArchived,
    });
  }
}

function collectLavorazioneIdsFromContext(context: LavorazioneUpdateOptimisticContext): Set<string> {
  const ids = new Set<string>();
  for (const { data } of context.lists) {
    for (const row of lavorazioniListCacheRows(data)) ids.add(row.id);
  }
  for (const { queryKey } of context.bases) {
    const id = queryKey[queryKey.length - 1];
    if (typeof id === "string" && id) ids.add(id);
  }
  return ids;
}

/** Invariante: nessuna row archived=true nelle liste attive in cache. */
export function assertNoArchivedInActiveLists(qc: QueryClient): void {
  const listEntries = qc.getQueriesData<LavorazioniListCacheData>({
    queryKey: QK.lavorazioniQueries,
    predicate: (q) => isLavorazioniListCacheQueryKey(q.queryKey),
  });
  for (const [queryKey, data] of listEntries) {
    const listArchived = parseListFilterArchived(queryKey as readonly unknown[]);
    if (listArchived !== false) continue;
    for (const row of lavorazioniListCacheRows(data)) {
      if (row.archived === true) {
        logLavorazioniArchiveMembershipDebug({
          event: "invariant_violation",
          lavorazioneId: row.id,
          archived: row.archived,
          updatedAt: row.updated_at,
          queryKey: queryKey as readonly unknown[],
          listKind: listKindFromQueryKey(queryKey as readonly unknown[]),
          listArchived,
        });
        throw new Error(
          `Invariant: archived row ${row.id} in active list cache ${JSON.stringify(queryKey)}`,
        );
      }
    }
  }
}

export async function snapshotLavorazioneUpdateQueries(
  qc: QueryClient,
  lavorazioneId: string,
): Promise<LavorazioneUpdateOptimisticContext> {
  await qc.cancelQueries({ queryKey: QK.lavorazioniQueries });

  const lists = qc
    .getQueriesData<LavorazioniListCacheData>({
      queryKey: QK.lavorazioniQueries,
      predicate: (q) => isLavorazioniListCacheQueryKey(q.queryKey),
    })
    .map(([queryKey, data]) => ({ queryKey: queryKey as readonly unknown[], data }));

  const bases = qc
    .getQueriesData<LavorazioneRow>({
      queryKey: lavorazioneBaseQueryKey(lavorazioneId),
    })
    .map(([queryKey, data]) => ({ queryKey: queryKey as readonly unknown[], data }));

  return { lists, bases };
}

export function applyOptimisticLavorazioneUpdate(
  qc: QueryClient,
  lavorazioneId: string,
  patch: LavorazioneUpdate,
  serverRow?: LavorazioneRow,
  audit?: LavorazioneUpdateOptimisticAudit,
): void {
  const merged = resolveMergedRow(qc, lavorazioneId, patch, serverRow, audit);
  if (merged) {
    reconcileRowAcrossLists(qc, lavorazioneId, merged);
    logLavorazioniArchiveMembershipDebug({
      event: "optimistic_apply",
      lavorazioneId,
      archived: merged.archived,
      updatedAt: merged.updated_at,
      note: serverRow ? "with_server_row" : "patch_only",
    });
  }

  if (serverRow) {
    qc.setQueryData(lavorazioneBaseQueryKey(lavorazioneId), serverRow);
  } else if (Object.keys(patch).length > 0) {
    qc.setQueriesData<LavorazioneRow>(
      { queryKey: lavorazioneBaseQueryKey(lavorazioneId) },
      (old) => (old ? { ...old, ...patch } : old),
    );
  }
}

export function rollbackLavorazioneUpdateQueries(
  qc: QueryClient,
  context: LavorazioneUpdateOptimisticContext,
): void {
  for (const { queryKey, data } of context.bases) {
    const current = qc.getQueryData<LavorazioneRow>(queryKey);
    if (data && current && isLavorazioneRowVersionNewer(current, data)) {
      continue;
    }
    qc.setQueryData(queryKey, data);
  }

  for (const { queryKey, data } of context.lists) {
    qc.setQueryData(queryKey, data);
  }

  const ids = collectLavorazioneIdsFromContext(context);
  for (const id of ids) {
    const base = qc.getQueryData<LavorazioneRow>(lavorazioneBaseQueryKey(id));
    if (!base) continue;
    const mezzo = findRowInListCaches(qc, id)?.mezzo ?? null;
    reconcileRowAcrossLists(qc, id, listRowFromBase(base, mezzo));
    logLavorazioniArchiveMembershipDebug({
      event: "optimistic_rollback",
      lavorazioneId: id,
      archived: base.archived,
      updatedAt: base.updated_at,
      note: "post_rollback_reconcile_from_base",
    });
  }
}

/** Patch optimistic allineata a `lavorazioniService.conclude` (archiviazione). */
export function buildConcludeOptimisticPatch(row: LavorazioneListRow | undefined): LavorazioneUpdate {
  const now = new Date().toISOString();
  return {
    stato: "completata",
    archived: true,
    archived_at: now,
    data_uscita: row?.data_uscita?.trim() ? row.data_uscita : now,
  };
}

/** Patch optimistic allineata a `lavorazioniService.updateArchivioCompletamento`. */
export function buildCompletamentoOptimisticPatch(completionYmd: string): LavorazioneUpdate {
  const res = lavorazioneCompletamentoFieldsFromYmd(completionYmd);
  if (!res.ok) return {};
  return res.fields;
}

/** Patch optimistic allineata a `lavorazioniService.restore`. */
export function buildRestoreOptimisticPatch(stato: LavorazioneRow["stato"]): LavorazioneUpdate {
  return {
    stato,
    archived: false,
    archived_at: null,
    data_uscita: null,
  };
}

/** Audit riga per update optimistic (updated_by / updated_at). */
export function buildLavorazioneOptimisticAudit(userId: string | null | undefined): LavorazioneUpdateOptimisticAudit {
  if (!userId?.trim()) return {};
  return { updated_by: userId.trim(), updated_at: new Date().toISOString() };
}
