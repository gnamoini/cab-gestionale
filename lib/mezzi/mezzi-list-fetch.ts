import {
  MEZZI_LIST_LIGHT_COLUMNS,
  MEZZI_REPORT_LIGHT_COLUMNS,
} from "@/lib/db/table-select-columns";
import { mapMezzoLightToRow } from "@/lib/db/dto-mappers";
import {
  fetchAttrezzatureForMezzoIds,
  mapMezziRowsWithAttrezzature,
} from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MezziListVariant = "list" | "report";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Filtri identità mezzo (telaio/cliente) — query DB. */
function applyMezzoIdentityFilters<
  T extends { ilike: (col: string, pat: string) => T; or: (f: string) => T },
>(q: T, filters?: MezzoFilters): T {
  let query = q;
  if (filters?.cliente?.trim()) query = query.ilike("cliente", `%${filters.cliente.trim()}%`);
  if (filters?.targa?.trim()) query = query.ilike("targa", `%${filters.targa.trim()}%`);
  if (filters?.numero_scuderia?.trim()) {
    query = query.ilike("numero_scuderia", `%${filters.numero_scuderia.trim()}%`);
  }
  return query;
}

/** Filtri attrezzatura + search globale — post-compose su MezzoGestito (SSOT V2). */
export function filterMezziGestiti(gestiti: MezzoGestito[], filters?: MezzoFilters): MezzoGestito[] {
  if (!filters) return gestiti;
  let out = gestiti;
  if (filters.marca?.trim()) {
    const m = norm(filters.marca);
    out = out.filter((g) => norm(g.marca).includes(m));
  }
  if (filters.modello?.trim()) {
    const m = norm(filters.modello);
    out = out.filter((g) => norm(g.modello).includes(m));
  }
  if (filters.search?.trim()) {
    const s = norm(filters.search);
    out = out.filter((g) => {
      const hay = [
        g.cliente,
        g.marca,
        g.modello,
        g.targa,
        g.matricola,
        g.numeroScuderia ?? "",
        g.marcaTelaio ?? "",
        g.modelloTelaio ?? "",
        g.tipoAttrezzatura,
      ]
        .map(norm)
        .join(" ");
      return hay.includes(s);
    });
  }
  return out;
}

/** Fetch puro mezzi — injectable server/client Supabase. */
export async function fetchMezziListRows(
  sb: SupabaseClient,
  options?: { filters?: MezzoFilters; variant?: MezziListVariant },
): Promise<ServiceResult<MezzoRow[]>> {
  const variant = options?.variant ?? "list";
  const columns = variant === "report" ? MEZZI_REPORT_LIGHT_COLUMNS : MEZZI_LIST_LIGHT_COLUMNS;
  let q = sb.from("mezzi").select(columns).order("created_at", { ascending: false });
  q = applyMezzoIdentityFilters(q, options?.filters);
  const { data, error } = await q;
  if (error) return err(error.message);
  const rows = ((data ?? []) as unknown as MezzoRow[]).map(mapMezzoLightToRow);
  return success(rows);
}

/** Fetch mezzi + batch attrezzature → MezzoGestito[] (SSOT read V2). */
export async function fetchMezziGestitiListRows(
  sb: SupabaseClient,
  options?: { filters?: MezzoFilters; variant?: MezziListVariant },
): Promise<ServiceResult<MezzoGestito[]>> {
  const rowsRes = await fetchMezziListRows(sb, options);
  if (!rowsRes.success || !rowsRes.data) return rowsRes.success ? success([]) : err(rowsRes.error ?? "Errore mezzi");
  try {
    const attRows = await fetchAttrezzatureForMezzoIds(
      sb,
      rowsRes.data.map((r) => r.id),
    );
    const gestiti = filterMezziGestiti(mapMezziRowsWithAttrezzature(rowsRes.data, attRows), options?.filters);
    return success(gestiti);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore attrezzature");
  }
}
