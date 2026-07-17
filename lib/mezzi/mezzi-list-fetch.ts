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
import { mezzoTagliandiEnabled } from "@/lib/mezzi/mezzi-meta";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MezziListVariant = "list" | "report";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function gestitoSearchHaystack(g: MezzoGestito): string {
  return [
    g.cliente,
    g.utilizzatore,
    g.cantiere ?? "",
    g.tipoAttrezzatura,
    g.marca,
    g.modello,
    g.matricola,
    g.targa,
    g.numeroScuderia ?? "",
    g.marcaTelaio ?? "",
    g.modelloTelaio ?? "",
    g.tipoTelaio ?? "",
    g.vin ?? "",
  ]
    .map(norm)
    .join(" ");
}

/** Filtri identità mezzo (telaio/cliente) — query DB. */
function applyMezzoIdentityFilters<
  T extends { ilike: (col: string, pat: string) => T; or: (f: string) => T },
>(q: T, filters?: MezzoFilters): T {
  let query = q;
  if (filters?.cliente?.trim()) query = query.ilike("cliente", `%${filters.cliente.trim()}%`);
  if (filters?.utilizzatore?.trim()) query = query.ilike("utilizzatore", `%${filters.utilizzatore.trim()}%`);
  if (filters?.targa?.trim()) query = query.ilike("targa", `%${filters.targa.trim()}%`);
  if (filters?.numero_scuderia?.trim()) {
    query = query.ilike("numero_scuderia", `%${filters.numero_scuderia.trim()}%`);
  }
  if (filters?.marca_telaio?.trim()) query = query.ilike("marca_telaio", `%${filters.marca_telaio.trim()}%`);
  if (filters?.modello_telaio?.trim()) query = query.ilike("modello_telaio", `%${filters.modello_telaio.trim()}%`);
  if (filters?.tipo_telaio?.trim()) query = query.ilike("tipo_telaio", `%${filters.tipo_telaio.trim()}%`);
  if (filters?.vin?.trim()) query = query.ilike("telaio_num", `%${filters.vin.trim()}%`);
  return query;
}

/** Filtri attrezzatura + search globale — post-compose su MezzoGestito (SSOT V2). */
export function filterMezziGestiti(gestiti: MezzoGestito[], filters?: MezzoFilters): MezzoGestito[] {
  if (!filters) return gestiti;
  let out = gestiti;
  if (filters.cliente?.trim()) {
    const m = norm(filters.cliente);
    out = out.filter((g) => norm(g.cliente).includes(m));
  }
  if (filters.targa?.trim()) {
    const m = norm(filters.targa);
    out = out.filter((g) => norm(g.targa).includes(m));
  }
  if (filters.numero_scuderia?.trim()) {
    const m = norm(filters.numero_scuderia);
    out = out.filter((g) => norm(g.numeroScuderia ?? "").includes(m));
  }
  if (filters.utilizzatore?.trim()) {
    const m = norm(filters.utilizzatore);
    out = out.filter((g) => norm(g.utilizzatore).includes(m));
  }
  if (filters.cantiere?.trim()) {
    const m = norm(filters.cantiere);
    out = out.filter((g) => norm(g.cantiere ?? "").includes(m));
  }
  if (filters.marca?.trim()) {
    const m = norm(filters.marca);
    out = out.filter((g) => norm(g.marca).includes(m));
  }
  if (filters.modello?.trim()) {
    const m = norm(filters.modello);
    out = out.filter((g) => norm(g.modello).includes(m));
  }
  if (filters.tipo_attrezzatura?.trim()) {
    const m = norm(filters.tipo_attrezzatura);
    out = out.filter((g) => norm(g.tipoAttrezzatura).includes(m));
  }
  if (filters.matricola?.trim()) {
    const m = norm(filters.matricola);
    out = out.filter((g) => norm(g.matricola).includes(m));
  }
  if (filters.marca_telaio?.trim()) {
    const m = norm(filters.marca_telaio);
    out = out.filter((g) => norm(g.marcaTelaio ?? "").includes(m));
  }
  if (filters.modello_telaio?.trim()) {
    const m = norm(filters.modello_telaio);
    out = out.filter((g) => norm(g.modelloTelaio ?? "").includes(m));
  }
  if (filters.tipo_telaio?.trim()) {
    const m = norm(filters.tipo_telaio);
    out = out.filter((g) => norm(g.tipoTelaio ?? "").includes(m));
  }
  if (filters.vin?.trim()) {
    const m = norm(filters.vin);
    out = out.filter((g) => norm(g.vin ?? "").includes(m));
  }
  if (filters.tagliandi === "si") {
    out = out.filter((g) => mezzoTagliandiEnabled(g));
  } else if (filters.tagliandi === "no") {
    out = out.filter((g) => !mezzoTagliandiEnabled(g));
  }
  if (filters.search?.trim()) {
    const tokens = norm(filters.search)
      .split(/\s+/)
      .filter(Boolean);
    out = out.filter((g) => {
      const hay = gestitoSearchHaystack(g);
      return tokens.every((t) => hay.includes(t));
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
