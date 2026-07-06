"use client";

import { MEZZI_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchMezziGestitiListRows, fetchMezziListRows } from "@/lib/mezzi/mezzi-list-fetch";
import { fetchMezzoGestitoById } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";
import { logAttrezzatureV2WritePath } from "@/lib/observability/attrezzature-v2-telemetry";
import { attachMezzoEntityKey } from "@/lib/validation/entity-persistence";
import { sanitizeMezzoWritePayload } from "@/lib/validation/services/mezzi-payload";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "mezzi";

function oggettoMezzo(r: MezzoRow) {
  const ident = r.targa?.trim() || r.matricola?.trim() || "";
  const parts = [r.cliente?.trim(), ident].filter(Boolean);
  return parts.length ? auditContext(parts.join(" — ")) : undefined;
}

export type MezzoFilters = {
  cliente?: string;
  marca?: string;
  modello?: string;
  /** Contiene (case-insensitive) */
  targa?: string;
  /** Contiene (case-insensitive) — colonna `numero_scuderia` */
  numero_scuderia?: string;
  /** Ricerca OR su cliente, marca, modello, targa, matricola, numero_scuderia */
  search?: string;
};

export type MezzoInsert = Omit<MezzoRow, "id" | "created_at" | "updated_at">;
export type MezzoUpdate = Partial<MezzoInsert>;

async function sb() {
  return getBrowserSupabase();
}

async function countMezzoDependencies(id: string): Promise<ServiceResult<MezzoDependencies>> {
  try {
    const c = await sb();
    const { data, error } = await c.rpc("count_mezzo_dependencies", { p_mezzo_id: id });
    if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));

    const row = (data ?? {}) as Record<string, unknown>;
    const num = (key: string) => {
      const v = row[key];
      return typeof v === "number" ? v : Number(v) || 0;
    };

    return success({
      lavorazioniInCorso: num("lavorazioni_in_corso"),
      lavorazioniArchiviate: num("lavorazioni_archiviate"),
      lavorazioniStoriche: num("lavorazioni_storiche"),
      preventivi: num("preventivi"),
      documenti: num("documenti"),
      schedeStoriche: num("schede_storiche"),
      schedeAttive: num("schede_attive"),
    });
  } catch (e) {
    return serviceFailFromError<MezzoDependencies>(e, null, { entity: "mezzo", action: "read" });
  }
}

export type MezzoDependencies = {
  /** Lavorazioni non archiviate (in corso) collegate per mezzo_id. */
  lavorazioniInCorso: number;
  /** Lavorazioni archiviate ma non soft-deleted (FK ancora attivo). */
  lavorazioniArchiviate: number;
  /** Lavorazioni eliminate logicamente (purge con delete mezzo). */
  lavorazioniStoriche: number;
  preventivi: number;
  documenti: number;
  schedeStoriche: number;
  schedeAttive: number;
};

export function mezzoDeleteBlockedBy(deps: MezzoDependencies, identityLinkedLavorazione = false): boolean {
  const lav =
    deps.lavorazioniInCorso + deps.lavorazioniArchiviate + (identityLinkedLavorazione ? 1 : 0);
  return lav > 0 || deps.preventivi > 0;
}

export function mezzoDeleteBlockedByLavorazioni(
  deps: MezzoDependencies,
  identityLinkedLavorazione = false,
): boolean {
  return deps.lavorazioniInCorso + deps.lavorazioniArchiviate + (identityLinkedLavorazione ? 1 : 0) > 0;
}

export const mezziService = {
  countDependencies: countMezzoDependencies,

  async getAll(filters?: MezzoFilters): Promise<ServiceResult<MezzoGestito[]>> {
    try {
      const c = await sb();
      return fetchMezziGestitiListRows(c, { filters, variant: "list" });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getAllForReport(filters?: MezzoFilters): Promise<ServiceResult<MezzoGestito[]>> {
    try {
      const c = await sb();
      return fetchMezziGestitiListRows(c, { filters, variant: "report" });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Righe DB grezze (uso interno / import). */
  async getAllRows(filters?: MezzoFilters): Promise<ServiceResult<MezzoRow[]>> {
    try {
      const c = await sb();
      return fetchMezziListRows(c, { filters, variant: "list" });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getGestitoById(id: string): Promise<ServiceResult<MezzoGestito>> {
    try {
      const c = await sb();
      const gestito = await fetchMezzoGestitoById(c, id);
      if (!gestito) return err("Mezzo non trovato");
      return success(gestito);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<MezzoRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("mezzi").select(MEZZI_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Mezzo non trovato");
      return success(data as MezzoRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: MezzoInsert): Promise<ServiceResult<MezzoRow>> {
    try {
      const c = await sb();
      const payload = attachMezzoEntityKey(
        sanitizeMezzoWritePayload(data, { v2Enabled: true, source: "mezziService.create" }),
      );
      logAttrezzatureV2WritePath({ path: "v2", operation: "create" });
      const { data: row, error } = await c.from("mezzi").insert(payload).select(MEZZI_COLUMNS).single();
      if (error) return err(error.message);
      const r = row as MezzoRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r, oggettoMezzo(r)) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: MezzoUpdate): Promise<ServiceResult<MezzoRow>> {
    try {
      const c = await sb();
      const payload =
        Object.keys(data).length > 0
          ? attachMezzoEntityKey(
              sanitizeMezzoWritePayload(data, { v2Enabled: true, source: "mezziService.update" }),
            )
          : data;
      logAttrezzatureV2WritePath({ path: "v2", operation: "update" });
      const { data: before, error: e0 } = await c.from("mezzi").select(MEZZI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await c.from("mezzi").update(payload).eq("id", id).select(MEZZI_COLUMNS).single();
      if (error) return err(error.message);
      const r = row as MezzoRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, oggettoMezzo(r)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const c = await sb();
      const { data: existing, error: e0 } = await c.from("mezzi").select(MEZZI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(humanizeGestionaleError(e0.message, { entity: "mezzo", action: "delete" }));
      if (existing) {
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "DELETE",
          payload: auditSnapshot(existing as MezzoRow, oggettoMezzo(existing as MezzoRow)),
        });
      }
      const { error } = await c.rpc("delete_mezzo", { p_mezzo_id: id });
      if (error) {
        return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "delete" }));
      }
      return success(null);
    } catch (e) {
      return serviceFailFromError(e, null, { entity: "mezzo", action: "delete" });
    }
  },
};
