import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { resolveCabAppSettingsFallback } from "@/src/lib/app-settings/settings-fallback";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { resolveRole } from "@/lib/auth/rbac";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import {
  ensureClientLavorazioniAccess,
  ensureSectionRead,
  getCurrentRoleForPermissionCheck,
  loadCallerClienteRef,
} from "@/src/lib/auth/permission-guards";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneFilters, LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";
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

function embedMezzo(raw: unknown): MezzoRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return (raw[0] as MezzoRow) ?? null;
  return raw as MezzoRow;
}

function escapeIlikeToken(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function endOfDayIso(dateDay: string): string {
  const t = dateDay.trim();
  if (!t) return t;
  return t.length <= 10 ? `${t}T23:59:59.999Z` : t;
}

function settingsStatiForSanitize() {
  const resolved = getRuntimeCabAppSettings() ?? resolveCabAppSettingsFallback();
  return resolved.lavorazioni.stati;
}

/** Filtri server-side condivisi tra query con/senza join `mezzi`. */
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

function mapRawRows(raw: Array<LavorazioneRow & { mezzi?: unknown }>, includeMezzo: boolean): LavorazioneListRow[] {
  const stati = settingsStatiForSanitize();
  return raw.map((row) => {
    const { mezzi: em, ...rest } = row;
    const base: LavorazioneListRow = {
      ...(rest as LavorazioneRow),
      archived: rest.archived === true,
      mezzo: includeMezzo ? embedMezzo(em) : null,
    };
    return sanitizeClientLavorazioneRow(base, stati);
  });
}

export type LavorazioniListFetchOptions = {
  /** Filtra su `mezzi.cliente` (defense in depth oltre RLS). */
  clienteRefScope?: string | null;
};

/** Fetch puro da Supabase — nessun controllo permessi UI. */
export async function fetchLavorazioniListRows(
  sb: SupabaseClient,
  filters?: LavorazioneFilters,
  options?: LavorazioniListFetchOptions,
): Promise<ServiceResult<LavorazioneListRow[]>> {
  const clienteRefScope = normalizeClienteRef(options?.clienteRefScope);
  const includeMezzo = filters?.includeMezzo === true || !!clienteRefScope;
  const mezziSelect = clienteRefScope ? "mezzi!inner(*)" : "mezzi(*)";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- evita TS2589 su PostgrestFilterBuilder
  let q: any = applyLavorazioniNotDeletedFilter(
    sb
      .from("lavorazioni")
      .select(includeMezzo ? `*, ${mezziSelect}` : "*")
      .order("created_at", { ascending: false }),
  );
  q = applyLavorazioniListFilters(q, filters);
  if (clienteRefScope && includeMezzo) {
    q = q.eq("mezzi.cliente", clienteRefScope);
  }
  const { data, error } = await q;
  if (error) return err(error.message);
  if (includeMezzo) {
    const raw = (data ?? []) as Array<LavorazioneRow & { mezzi?: unknown }>;
    return success(mapRawRows(raw, true));
  }
  const raw = (data ?? []) as LavorazioneRow[];
  return success(mapRawRows(raw.map((row) => ({ ...row })), false));
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
 * Portale: ensureClientLavorazioniAccess; altrimenti ensureSectionRead("lavorazioni").
 */
export async function fetchLavorazioniListAuthorized(
  filters?: LavorazioneFilters,
  authOptions?: LavorazioniListAuthorizedOptions,
): Promise<ServiceResult<LavorazioneListRow[]>> {
  try {
    const portal = await ensureClientLavorazioniAccess();
    if (!portal.success) {
      const gestionale = await ensureSectionRead("lavorazioni");
      if (!gestionale.success) return err(gestionale.error ?? portal.error ?? "Permesso richiesto.");
    }
    const sb = getBrowserSupabase();
    const clienteRefScope = await resolveClienteRefScopeForAuthorizedList(authOptions);
    return fetchLavorazioniListRows(sb, filters, { clienteRefScope });
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
