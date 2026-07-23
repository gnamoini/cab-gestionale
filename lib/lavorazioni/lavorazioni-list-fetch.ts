import {
  LAVORAZIONI_COLUMNS,
  LAVORAZIONI_DETAIL_COLUMNS,
  LAVORAZIONI_LIST_LIGHT_COLUMNS,
  LAVORAZIONI_REPORT_LIGHT_COLUMNS,
  MEZZI_EMBED_CLIENT_PORTAL_COLUMNS,
  MEZZI_EMBED_LIGHT_COLUMNS,
  MEZZI_LIST_EMBED_COLUMNS,
  lavorazioniMezziEmbedSelect,
} from "@/lib/db/table-select-columns";
import { mapLavorazioneLightToListRow } from "@/lib/db/dto-mappers";
import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
import { lazyEmbedMezziOnLavorazioniListRows } from "@/lib/lavorazioni/lavorazioni-lazy-mezzo-embed";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { isLazyEmbedEnabled } from "@/lib/performance/list-pagination-rollout";
import { resolveCabAppSettingsFallback } from "@/src/lib/app-settings/settings-fallback";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { resolveRole } from "@/lib/auth/rbac";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import {
  ensureClientLavorazioniAccess,
  ensurePageRead,
  getCurrentRoleForPermissionCheck,
  loadCallerClienteRef,
} from "@/src/lib/auth/permission-guards";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  LavorazioneFilters,
  LavorazioneListRow,
  LavorazioniListFetchMode,
} from "@/src/services/lavorazioni.service";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import { logLavorazioniListPipelineDebug } from "@/lib/lavorazioni/lavorazioni-list-pipeline-debug";
import { enrichLavorazioniListRowsWithAttrezzature } from "@/lib/mezzi/mezzi-attrezzature-batch";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type { SupabaseClient } from "@supabase/supabase-js";

type LavorazioniFilterQuery = {
  in(column: string, values: readonly unknown[]): LavorazioniFilterQuery;
  eq(column: string, value: unknown): LavorazioniFilterQuery;
  ilike(column: string, pattern: string): LavorazioniFilterQuery;
  or(filters: string): LavorazioniFilterQuery;
  gte(column: string, value: string): LavorazioniFilterQuery;
  lte(column: string, value: string): LavorazioniFilterQuery;
  is(column: string, value: null): LavorazioniFilterQuery;
  not(column: string, operator: string, value: unknown): LavorazioniFilterQuery;
  select(columns: string): LavorazioniFilterQuery;
  order(column: string, opts: { ascending: boolean }): LavorazioniFilterQuery;
};

function escapeIlikeToken(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function endOfDayIso(dateDay: string): string {
  const t = dateDay.trim();
  if (!t) return t;
  return t.length <= 10 ? `${t}T23:59:59.999Z` : t;
}

function resolveStatiForSanitize(override?: StatoLavorazioneConfig[]) {
  if (override?.length) return override;
  if (typeof window === "undefined") {
    return resolveCabAppSettingsFromRows([], null).lavorazioni.stati;
  }
  const resolved = getRuntimeCabAppSettings() ?? resolveCabAppSettingsFallback();
  return resolved.lavorazioni.stati;
}

const LAVORAZIONI_CREATED_BY_PROFILE_SELECT =
  "created_by_profile:profiles!lavorazioni_created_by_fkey(nome, cognome)";

const LAVORAZIONI_PROFILE_SELECT = `updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome, cognome), ${LAVORAZIONI_CREATED_BY_PROFILE_SELECT}`;

function isUpdatedByProfileJoinError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("lavorazioni_updated_by_fkey") ||
    (m.includes("could not find a relationship") && m.includes("profiles"))
  );
}

function resolveFetchMode(filters?: LavorazioneFilters): LavorazioniListFetchMode {
  return filters?.fetchMode ?? "light";
}

function lavorazioniColumnsForMode(mode: LavorazioniListFetchMode): string {
  switch (mode) {
    case "report":
      return LAVORAZIONI_REPORT_LIGHT_COLUMNS;
    case "detail":
      return LAVORAZIONI_DETAIL_COLUMNS;
    case "light":
    default:
      return LAVORAZIONI_LIST_LIGHT_COLUMNS;
  }
}

function mezziEmbedColumnsForMode(mode: LavorazioniListFetchMode, clientPortal?: boolean): string {
  if (clientPortal && mode !== "detail") return MEZZI_EMBED_CLIENT_PORTAL_COLUMNS;
  return mode === "detail" ? MEZZI_LIST_EMBED_COLUMNS : MEZZI_EMBED_LIGHT_COLUMNS;
}

function lavorazioniListSelect(options: {
  fetchMode: LavorazioniListFetchMode;
  includeMezzo: boolean;
  mezziSelect: string;
  includeProfiles: boolean;
  includeUpdatedByProfile: boolean;
}): string {
  const { fetchMode, includeMezzo, mezziSelect, includeProfiles, includeUpdatedByProfile } = options;
  const parts = [lavorazioniColumnsForMode(fetchMode)];

  if (includeProfiles && fetchMode !== "report") {
    const profilePart = includeUpdatedByProfile
      ? LAVORAZIONI_PROFILE_SELECT
      : LAVORAZIONI_CREATED_BY_PROFILE_SELECT;
    parts.push(profilePart);
  }

  if (includeMezzo && fetchMode !== "report") {
    parts.push(mezziSelect);
  }

  return parts.join(", ");
}

type LavorazioneListRawRow = LavorazioneRow & {
  mezzi?: unknown;
  updated_by_profile?: { nome?: string | null } | { nome?: string | null }[] | null;
  created_by_profile?: { nome?: string | null } | { nome?: string | null }[] | null;
};

function mapRawRows(
  raw: LavorazioneListRawRow[],
  includeMezzo: boolean,
  sanitizeStati?: StatoLavorazioneConfig[],
): LavorazioneListRow[] {
  const stati = resolveStatiForSanitize(sanitizeStati);
  return raw.map((row) => {
    const mapped = mapLavorazioneLightToListRow(row, { includeMezzo });
    return sanitizeClientLavorazioneRow(mapped, stati);
  });
}

export function applyLavorazioniListFilters<TQuery extends LavorazioniFilterQuery>(
  q: TQuery,
  filters?: LavorazioneFilters,
): TQuery {
  let query: LavorazioniFilterQuery = applyLavorazioniNotDeletedFilter(q);
  if (!filters) return query as TQuery;
  if (filters.stati_in?.length) query = query.in("stato", filters.stati_in);
  if (filters.mezzo_id) query = query.eq("mezzo_id", filters.mezzo_id);
  if (filters.stato) query = query.eq("stato", filters.stato);
  if (filters.priorita) query = query.eq("priorita", filters.priorita);
  const search = filters.search?.trim();
  if (search) {
    const token = escapeIlikeToken(search);
    query = query.or(`note.ilike.%${token}%,codice.ilike.%${token}%`);
  }
  if (filters.data_ingresso_da?.trim()) query = query.gte("data_ingresso", filters.data_ingresso_da.trim());
  if (filters.data_ingresso_a?.trim()) query = query.lte("data_ingresso", endOfDayIso(filters.data_ingresso_a));
  if (filters.data_uscita_da?.trim()) query = query.gte("data_uscita", filters.data_uscita_da.trim());
  if (filters.data_uscita_a?.trim()) query = query.lte("data_uscita", endOfDayIso(filters.data_uscita_a));
  if (filters.data_uscita_is_null === true) query = query.is("data_uscita", null);
  if (filters.data_uscita_is_null === false) query = query.not("data_uscita", "is", null);
  if (filters.archived === true) query = query.eq("archived", true);
  if (filters.archived === false) query = query.eq("archived", false);
  return query as TQuery;
}

export type LavorazioniListFetchOptions = {
  /** Filtra su `mezzi.cliente` (defense in depth oltre RLS). */
  clienteRefScope?: string | null;
  /** Server prefetch: stati da DB senza runtime client cache. */
  sanitizeStati?: StatoLavorazioneConfig[];
  /** Lista portale clienti: embed mezzo con `meta` (cantiere). */
  clientPortal?: boolean;
};

async function fetchLavorazioniListRowsQuery(
  sb: SupabaseClient,
  filters: LavorazioneFilters | undefined,
  options: {
    clienteRefScope: string | null;
    fetchMode: LavorazioniListFetchMode;
    includeMezzo: boolean;
    mezziSelect: string;
    includeProfiles: boolean;
    includeUpdatedByProfile: boolean;
  },
): Promise<{ data: LavorazioneListRawRow[] | null; error: { message: string } | null }> {
  const { clienteRefScope, fetchMode, includeMezzo, mezziSelect, includeProfiles, includeUpdatedByProfile } =
    options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- evita TS2589 su PostgrestFilterBuilder
  let q: any = applyLavorazioniNotDeletedFilter(
    sb
      .from("lavorazioni")
      .select(
        lavorazioniListSelect({
          fetchMode,
          includeMezzo,
          mezziSelect,
          includeProfiles,
          includeUpdatedByProfile,
        }),
      )
      .order("created_at", { ascending: false }),
  );
  q = applyLavorazioniListFilters(q, filters);
  if (clienteRefScope && includeMezzo && fetchMode !== "report") {
    q = q.eq("mezzi.cliente", clienteRefScope);
  }
  const { data, error } = await q;
  return { data: (data ?? null) as LavorazioneListRawRow[] | null, error };
}

/** Fetch puro da Supabase — nessun controllo permessi UI. */
export async function fetchLavorazioniListRows(
  sb: SupabaseClient,
  filters?: LavorazioneFilters,
  options?: LavorazioniListFetchOptions,
): Promise<ServiceResult<LavorazioneListRow[]>> {
  const clienteRefScope = normalizeClienteRef(options?.clienteRefScope);
  const fetchMode = resolveFetchMode(filters);
  const lazyEmbed = isLazyEmbedEnabled() && fetchMode !== "report";
  const includeMezzo =
    fetchMode !== "report" &&
    !lazyEmbed &&
    (filters?.includeMezzo === true || !!clienteRefScope);
  const includeProfiles =
    filters?.includeProfiles === true || (fetchMode === "detail" && filters?.includeProfiles !== false);
  const mezziCols = mezziEmbedColumnsForMode(fetchMode, options?.clientPortal);
  const mezziSelect = lavorazioniMezziEmbedSelect(mezziCols, { inner: !!clienteRefScope });
  const baseOpts = { clienteRefScope, fetchMode, includeMezzo, mezziSelect, includeProfiles };

  let profileJoinFallback = false;
  let { data, error } = await fetchLavorazioniListRowsQuery(sb, filters, {
    ...baseOpts,
    includeUpdatedByProfile: true,
  });

  if (error && isUpdatedByProfileJoinError(error.message) && includeProfiles) {
    profileJoinFallback = true;
    ({ data, error } = await fetchLavorazioniListRowsQuery(sb, filters, {
      ...baseOpts,
      includeUpdatedByProfile: false,
    }));
  }

  logLavorazioniListPipelineDebug({
    surface: "fetch",
    archivedFilter: filters?.archived ?? null,
    clienteRefScope,
    queryError: error?.message ?? null,
    rawInCorso: filters?.archived === false ? (data?.length ?? 0) : undefined,
    rawArchivio: filters?.archived === true ? (data?.length ?? 0) : undefined,
    profileJoinFallback,
  });

  if (error) return err(error.message);
  const raw = (data ?? []) as LavorazioneListRawRow[];
  let mapped = mapRawRows(raw, includeMezzo, options?.sanitizeStati);
  const wantsMezzoEmbed =
    fetchMode !== "report" && (filters?.includeMezzo === true || !!clienteRefScope);
  if (lazyEmbed && wantsMezzoEmbed && mapped.length > 0) {
    mapped = await lazyEmbedMezziOnLavorazioniListRows(sb, mapped);
  } else if (includeMezzo && mapped.length > 0) {
    mapped = await enrichLavorazioniListRowsWithAttrezzature(sb, mapped);
  }
  return success(mapped);
}

export type LavorazioniListAuthorizedOptions = {
  /** Lista portale clienti: applica filtro `profiles.cliente_ref` se valorizzato. */
  clientPortal?: boolean;
};

async function resolveClienteRefScopeForAuthorizedList(
  authOptions?: LavorazioniListAuthorizedOptions,
): Promise<string | null> {
  const role = await getCurrentRoleForPermissionCheck();
  const scopeByRole = resolveRole(role) === "cliente";
  const scopeByPortal = authOptions?.clientPortal === true;
  if (!scopeByRole && !scopeByPortal) return null;
  return normalizeClienteRef(await loadCallerClienteRef());
}

/**
 * Fetch autorizzato per liste condivise (gestionale + portale clienti).
 * Portale: ensureClientLavorazioniAccess; altrimenti ensurePageRead("lavorazioni").
 */
export async function fetchLavorazioniListAuthorized(
  filters?: LavorazioneFilters,
  authOptions?: LavorazioniListAuthorizedOptions,
): Promise<ServiceResult<LavorazioneListRow[]>> {
  try {
    const portal = await ensureClientLavorazioniAccess();
    if (!portal.success) {
      const gestionale = await ensurePageRead("lavorazioni");
      if (!gestionale.success) return err(gestionale.error ?? portal.error ?? "Permesso richiesto.");
    }
    const sb = getBrowserSupabase();
    const clienteRefScope = await resolveClienteRefScopeForAuthorizedList(authOptions);
    logLavorazioniListPipelineDebug({
      surface: "fetch",
      guardOk: true,
      archivedFilter: filters?.archived ?? null,
      clienteRefScope,
    });
    return fetchLavorazioniListRows(sb, filters, {
      clienteRefScope,
      clientPortal: authOptions?.clientPortal === true,
    });
  } catch (e) {
    return serviceFailFromError(e);
  }
}

/** Conteggio leggero (head) — stessi filtri della lista, senza caricare righe. */
export async function fetchLavorazioniListCountRows(
  sb: SupabaseClient,
  filters?: LavorazioneFilters,
  options?: { clienteRefScope?: string | null },
): Promise<ServiceResult<number>> {
  try {
    const clienteRefScope = normalizeClienteRef(options?.clienteRefScope);
    const needsMezziInner = Boolean(clienteRefScope && filters?.includeMezzo);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- evita TS2589 su PostgrestFilterBuilder
    let q: any = needsMezziInner
      ? applyLavorazioniNotDeletedFilter(
          sb.from("lavorazioni").select(`id, ${lavorazioniMezziEmbedSelect("cliente", { inner: true })}`, {
            count: "exact",
            head: true,
          }),
        )
      : applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("id", { count: "exact", head: true }));
    q = applyLavorazioniListFilters(q, filters);
    if (needsMezziInner) q = q.eq("mezzi.cliente", clienteRefScope);
    const { count, error } = await q;
    if (error) return err(error.message);
    return success(count ?? 0);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export async function fetchLavorazioniListCountAuthorized(
  filters?: LavorazioneFilters,
  authOptions?: LavorazioniListAuthorizedOptions,
): Promise<ServiceResult<number>> {
  try {
    const portal = await ensureClientLavorazioniAccess();
    if (!portal.success) {
      const gestionale = await ensurePageRead("lavorazioni");
      if (!gestionale.success) return err(gestionale.error ?? portal.error ?? "Permesso richiesto.");
    }
    const sb = getBrowserSupabase();
    const clienteRefScope = await resolveClienteRefScopeForAuthorizedList(authOptions);
    return fetchLavorazioniListCountRows(sb, filters, { clienteRefScope });
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export function completionSortKey(row: LavorazioneListRow): string {
  return row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at || row.created_at || "";
}

export function ingressoSortKey(row: LavorazioneListRow): string {
  return row.data_ingresso?.trim() || row.created_at || "";
}

/** @deprecated Usare `LAVORAZIONI_DETAIL_COLUMNS` — alias per test legacy. */
export const LAVORAZIONI_LIST_FULL_COLUMNS = LAVORAZIONI_COLUMNS;

/** Fetch sottoinsieme per ID (es. enrich mezzo dashboard top-N). */
export async function fetchLavorazioniListRowsByIds(
  sb: SupabaseClient,
  ids: readonly string[],
  options?: LavorazioniListFetchOptions & { filters?: LavorazioneFilters },
): Promise<ServiceResult<LavorazioneListRow[]>> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return success([]);

  const filters: LavorazioneFilters = {
    includeMezzo: true,
    fetchMode: "light",
    includeProfiles: false,
    archived: false,
    ...options?.filters,
  };
  const clienteRefScope = normalizeClienteRef(options?.clienteRefScope);
  const fetchMode = resolveFetchMode(filters);
  const includeMezzo = fetchMode !== "report" && (filters.includeMezzo === true || !!clienteRefScope);
  const mezziCols = mezziEmbedColumnsForMode(fetchMode);
  const mezziSelect = lavorazioniMezziEmbedSelect(mezziCols, { inner: !!clienteRefScope });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = applyLavorazioniNotDeletedFilter(
    sb
      .from("lavorazioni")
      .select(
        lavorazioniListSelect({
          fetchMode,
          includeMezzo,
          mezziSelect,
          includeProfiles: false,
          includeUpdatedByProfile: false,
        }),
      )
      .in("id", uniqueIds),
  );
  q = applyLavorazioniListFilters(q, filters);
  const { data, error } = await q;
  if (error) return err(error.message);

  const stati = resolveStatiForSanitize(options?.sanitizeStati);
  const raw = (data ?? []) as LavorazioneListRawRow[];
  return success(mapRawRows(raw, includeMezzo, stati));
}

/** Unisce embed mezzo su righe già in cache (dashboard lite BFF). */
export function mergeMezzoIntoLavorazioneRows(
  base: readonly LavorazioneListRow[],
  enriched: readonly LavorazioneListRow[],
): LavorazioneListRow[] {
  if (enriched.length === 0) return [...base];
  const byId = new Map(enriched.map((row) => [row.id, row]));
  return base.map((row) => {
    const hit = byId.get(row.id);
    return hit?.mezzo ? { ...row, mezzo: hit.mezzo } : row;
  });
}
