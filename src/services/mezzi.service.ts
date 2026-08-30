"use client";

import { MEZZI_COLUMNS } from "@/lib/db/table-select-columns";
import { mezziCreateRaw } from "@/lib/domain/mezzo/mezzi-repository";
import { fetchMezziGestitiListRows, fetchMezziListRows } from "@/lib/mezzi/mezzi-list-fetch";
import { fetchMezzoGestitoById } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";
import { logAttrezzatureV2WritePath } from "@/lib/observability/attrezzature-v2-telemetry";
import { attachMezzoEntityKey } from "@/lib/validation/entity-persistence";
import { mezzoRowToAnagraficaSnapshot } from "@/lib/domain/mezzo/mezzo-anagrafica-snapshot";
import { recordMezzoAnagraficaDiff } from "@/src/services/mezzo-anagrafica-history.service";
import { sanitizeMezzoWritePayload } from "@/lib/validation/services/mezzi-payload";
import { mergeMezzoMetaPatch } from "@/lib/mezzi/mezzi-meta";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import {
  applyAssociationChangeDb,
  type ApplyAssociationChangeInput,
} from "@/lib/domain/mezzo/apply-association-change";
import {
  ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH,
  deriveEventKind,
  mezzoUpdateTouchesAssociationFields,
} from "@/lib/domain/mezzo/mezzo-association";

const ENTITA = "mezzi";

function oggettoMezzo(r: MezzoRow) {
  const ident = r.targa?.trim() || r.matricola?.trim() || "";
  const parts = [r.cliente?.trim(), ident].filter(Boolean);
  return parts.length ? auditContext(parts.join(" — ")) : undefined;
}

export type MezzoFilters = {
  cliente?: string;
  utilizzatore?: string;
  cantiere?: string;
  marca?: string;
  modello?: string;
  tipo_attrezzatura?: string;
  matricola?: string;
  /** Contiene (case-insensitive) */
  targa?: string;
  /** Contiene (case-insensitive) — colonna `numero_scuderia` */
  numero_scuderia?: string;
  marca_telaio?: string;
  modello_telaio?: string;
  tipo_telaio?: string;
  /** Contiene su `telaio_num` (VIN) */
  vin?: string;
  /** Matrice tagliandi: solo mezzi con flag Sì / No */
  tagliandi?: "" | "si" | "no";
  /** Ricerca globale su campi principali del mezzo */
  search?: string;
};

export type MezzoInsert = Omit<MezzoRow, "id" | "created_at" | "updated_at" | "telaio_num_norm">;
export type MezzoUpdate = Partial<MezzoInsert>;

export type { ApplyAssociationChangeInput };

const VIN_UNIQUE_INDEX = "idx_mezzi_telaio_num_norm_unique";
const VIN_DUPLICATE_MSG = "VIN già registrato su un altro mezzo.";

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function isVinUniqueViolation(error: PostgrestLikeError | null | undefined): boolean {
  if (!error || error.code !== "23505") return false;
  const hay = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return hay.includes(VIN_UNIQUE_INDEX);
}

function mapMezziWriteError(error: PostgrestLikeError): string {
  if (isVinUniqueViolation(error)) return VIN_DUPLICATE_MSG;
  return error.message ?? "Errore salvataggio mezzo.";
}

async function assertVinUnique(
  c: Awaited<ReturnType<typeof sb>>,
  telaioNum: string | null | undefined,
  excludeId?: string,
): Promise<ServiceResult<null>> {
  const norm = normalizeVin(telaioNum);
  if (!norm) return success(null);
  let q = c.from("mezzi").select("id").eq("telaio_num_norm", norm).limit(1);
  if (excludeId?.trim()) q = q.neq("id", excludeId.trim());
  const { data, error } = await q.maybeSingle();
  if (error) return err(error.message);
  if (data) return err(VIN_DUPLICATE_MSG);
  return success(null);
}

function prepareMezzoWritePayload(data: MezzoInsert | MezzoUpdate): MezzoInsert | MezzoUpdate {
  const sanitized = sanitizeMezzoWritePayload(data, { v2Enabled: true, source: "mezziService" });
  if ("telaio_num" in sanitized && sanitized.telaio_num !== undefined) {
    const raw = sanitized.telaio_num;
    sanitized.telaio_num = raw === null || String(raw).trim() === "" ? null : normalizeVin(String(raw));
  }
  return sanitized;
}

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
      const prepared = prepareMezzoWritePayload(data) as MezzoInsert;
      const vinCheck = await assertVinUnique(c, prepared.telaio_num);
      if (!vinCheck.success) return err<MezzoRow>(vinCheck.error ?? VIN_DUPLICATE_MSG);
      logAttrezzatureV2WritePath({ path: "v2", operation: "create" });
      const r = await mezziCreateRaw(c, prepared);
      return success(r);
    } catch (e) {
      if (e instanceof Error && e.message === VIN_DUPLICATE_MSG) return err<MezzoRow>(e.message);
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: MezzoUpdate): Promise<ServiceResult<MezzoRow>> {
    try {
      const c = await sb();
      const prepared =
        Object.keys(data).length > 0 ? (prepareMezzoWritePayload(data) as MezzoUpdate) : data;
      if (mezzoUpdateTouchesAssociationFields(prepared)) {
        return err<MezzoRow>(ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH);
      }
      if (prepared.telaio_num !== undefined) {
        const vinCheck = await assertVinUnique(c, prepared.telaio_num, id);
        if (!vinCheck.success) return err<MezzoRow>(vinCheck.error ?? VIN_DUPLICATE_MSG);
      }
      let payload =
        Object.keys(prepared).length > 0 ? attachMezzoEntityKey(prepared as MezzoInsert) : prepared;
      logAttrezzatureV2WritePath({ path: "v2", operation: "update" });
      const { data: before, error: e0 } = await c.from("mezzi").select(MEZZI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (payload.meta !== undefined && before) {
        payload = {
          ...payload,
          meta: mergeMezzoMetaPatch(
            before.meta,
            payload.meta as Record<string, unknown>,
          ) as MezzoRow["meta"],
        };
      }
      const { data: row, error } = await c.from("mezzi").update(payload).eq("id", id).select(MEZZI_COLUMNS).single();
      if (error) return err(mapMezziWriteError(error));
      const r = row as MezzoRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, oggettoMezzo(r)),
      });
      if (before) {
        const oldSnap = mezzoRowToAnagraficaSnapshot(before as MezzoRow);
        const newSnap = mezzoRowToAnagraficaSnapshot(r);
        void recordMezzoAnagraficaDiff({
          mezzoId: id,
          origine: "modifica_manuale",
          oldValues: oldSnap,
          newValues: newSnap,
          eventKind: deriveEventKind(
            Object.keys(oldSnap).filter((k) => oldSnap[k as keyof typeof oldSnap] !== newSnap[k as keyof typeof newSnap]),
          ),
        });
      }
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async applyAssociationChange(
    input: ApplyAssociationChangeInput,
  ): Promise<ServiceResult<MezzoRow>> {
    try {
      const c = await sb();
      const result = await applyAssociationChangeDb(c, input);
      if (!result.ok) {
        return err<MezzoRow>(result.message);
      }
      return success(result.row);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** @deprecated ponytail: v1 matrice tagliandi disabilitata — no-op. */
  async setTagliandiEnabled(id: string, _enabled: boolean): Promise<ServiceResult<MezzoRow>> {
    void _enabled;
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("mezzi").select(MEZZI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err(humanizeGestionaleError("Mezzo non trovato.", { entity: "mezzo", action: "update" }));
      return success(before as MezzoRow);
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
