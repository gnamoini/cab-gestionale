"use client";

import { pickLavorazioneWritePayload } from "@/lib/validation/services/lavorazioni-payload";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission, ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { formatLavorazioneLogOggettoLabel } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog, type AuditLogContext } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneRow, MezzoRow, PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { fetchLavorazioniListAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { partitionAddettiInUso } from "@/lib/lavorazioni/addetti-in-uso";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "lavorazioni";

/** Fallback stati «in corso» (senza settings). */
export const LAVORAZIONI_STATI_IN_CORSO: string[] = [
  "accettazione",
  "diagnosi",
  "in_lavorazione",
  "attesa_ricambi",
];

/** Fallback stati chiusi / archivio. */
export const LAVORAZIONI_STATI_CHIUSE: string[] = ["completata", "consegnata", "annullata"];

export type LavorazioneListRow = LavorazioneRow & {
  mezzo: MezzoRow | null;
  /** Nome profilo joinato in lista (ultima modifica). */
  updated_by_nome?: string | null;
  /** Nome profilo joinato in lista (fallback creazione). */
  created_by_nome?: string | null;
};

export type LavorazioneFilters = {
  /** Se valorizzato, filtra `stato` con `IN` (insieme esplicito). */
  stati_in?: StatoLavorazione[];
  mezzo_id?: string;
  stato?: StatoLavorazione;
  priorita?: PrioritaLavorazione;
  /** Se true, include join `mezzi` (relazione su mezzo_id). */
  includeMezzo?: boolean;
  /** Contenuto in `note` (case-insensitive). */
  search?: string;
  /** Range opzionale su `data_ingresso` (ISO `yyyy-mm-dd` o timestamp completo). */
  data_ingresso_da?: string;
  data_ingresso_a?: string;
  /** Range opzionale su `data_uscita`. */
  data_uscita_da?: string;
  data_uscita_a?: string;
  data_uscita_is_null?: boolean;
  /** Portale / storico: false = in corso, true = archivio. */
  archived?: boolean;
};

export type LavorazioneInsert = Omit<LavorazioneRow, "id" | "created_at" | "updated_at">;
export type LavorazioneUpdate = Partial<LavorazioneInsert>;

async function c() {
  return getBrowserSupabase();
}

async function authUserId(sb: Awaited<ReturnType<typeof c>>): Promise<string | null> {
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

function withRowUpdatedBy<T extends Record<string, unknown>>(
  patch: T,
  userId: string | null,
): T & { updated_by?: string | null } {
  if (!userId) return patch;
  return { ...patch, updated_by: userId };
}

async function oggettoContextForLavorazione(
  sb: Awaited<ReturnType<typeof c>>,
  row: LavorazioneRow,
): Promise<AuditLogContext | undefined> {
  if (!row.mezzo_id?.trim()) return undefined;
  const { data } = await sb
    .from("mezzi")
    .select("cliente, marca, modello, tipo_attrezzatura")
    .eq("id", row.mezzo_id)
    .maybeSingle();
  if (!data) return undefined;
  const m = data as MezzoRow;
  const oggetto = formatLavorazioneLogOggettoLabel({
    cliente: m.cliente,
    marca: m.marca,
    modello: m.modello,
    tipoAttrezzatura: m.tipo_attrezzatura,
  });
  if (oggetto === "—") return undefined;
  return auditContext(oggetto);
}

export const lavorazioniService = {
  async getAll(filters?: LavorazioneFilters): Promise<ServiceResult<LavorazioneListRow[]>> {
    return fetchLavorazioniListAuthorized(filters);
  },

  async getById(id: string): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const allowed = await ensureSectionRead("lavorazioni");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      const { data, error } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Lavorazione non trovata");
      return success(data as LavorazioneRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: LavorazioneInsert): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const allowed = await ensurePermission("editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      const userId = await authUserId(sb);
      const picked = pickLavorazioneWritePayload(data as Record<string, unknown>);
      const createdBy =
        typeof data.created_by === "string" && data.created_by.trim()
          ? data.created_by.trim()
          : userId;
      const insertPayload = {
        ...picked,
        created_by: createdBy,
        updated_by: createdBy ?? userId,
      } as LavorazioneInsert;
      const { data: row, error } = await sb.from("lavorazioni").insert(insertPayload).select("*").single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      const ctx = await oggettoContextForLavorazione(sb, r);
      await writeModificaLog(sb, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r, ctx) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: LavorazioneUpdate): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const allowed = await ensurePermission("editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      const userId = await authUserId(sb);
      const { data: before, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      const picked = pickLavorazioneWritePayload(data as Record<string, unknown>);
      const { data: row, error } = await applyLavorazioniNotDeletedFilter(
        sb.from("lavorazioni").update(withRowUpdatedBy(picked, userId)).eq("id", id),
      )
        .select("*")
        .single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      const ctx = await oggettoContextForLavorazione(sb, r);
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, ctx),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Ripristina lavorazione archiviata tra le attive (log dedicato RESTORE). */
  async restore(id: string, stato: StatoLavorazione): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const allowed = await ensurePermission("editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      const userId = await authUserId(sb);
      const { data: before, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await applyLavorazioniNotDeletedFilter(
        sb
          .from("lavorazioni")
          .update(withRowUpdatedBy({ stato, data_uscita: null, archived: false, archived_at: null }, userId))
          .eq("id", id),
      )
        .select("*")
        .single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      const ctx = await oggettoContextForLavorazione(sb, r);
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "RESTORE",
        payload: auditDiff(before, r, ctx),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Conclude e archivia: stato completata, archived=true, archived_at e data_uscita. Idempotente se già archiviata. */
  async conclude(id: string): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const allowed = await ensurePermission("editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      const userId = await authUserId(sb);
      const { data: before, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err("Lavorazione non trovata");
      const b = before as LavorazioneRow;
      if (b.archived === true) return success(b);

      const now = new Date().toISOString();
      const patch = withRowUpdatedBy(
        {
          stato: "completata" as StatoLavorazione,
          archived: true,
          archived_at: now,
          data_uscita: b.data_uscita?.trim() ? b.data_uscita : now,
        },
        userId,
      );
      const { data: row, error } = await applyLavorazioniNotDeletedFilter(
        sb.from("lavorazioni").update(patch).eq("id", id).eq("archived", false),
      )
        .select("*")
        .maybeSingle();
      if (error) return err(error.message);
      if (!row) {
        const { data: current, error: e1 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
        if (e1) return err(e1.message);
        if (current && (current as LavorazioneRow).archived === true) return success(current as LavorazioneRow);
        return err("Conclusione non riuscita.");
      }
      const r = row as LavorazioneRow;
      const ctx = await oggettoContextForLavorazione(sb, r);
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, ctx),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** @deprecated Usare `conclude`. */
  async archive(id: string): Promise<ServiceResult<LavorazioneRow>> {
    return this.conclude(id);
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const allowed = await ensurePermission("deleteRecords");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      const { data: existing, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      if (!existing) return err("Lavorazione non trovata");
      const { lavorazioneDocumentsService } = await import("@/src/services/lavorazione-documents.service");
      const purgeRes = await lavorazioneDocumentsService.purgeForLavorazione(id);
      if (!purgeRes.success) return err(purgeRes.error ?? "Errore rimozione documenti lavorazione.");
      const now = new Date().toISOString();
      const { error } = await sb.rpc("soft_delete_lavorazione", { p_lavorazione_id: id });
      if (error) return err(error.message);
      const deleted = existing as LavorazioneRow;
      const ctx = await oggettoContextForLavorazione(sb, deleted);
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "DELETE",
        payload: auditSnapshot({ ...deleted, deleted_at: now }, ctx),
      });
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Stati effettivamente usati su lavorazioni (per guard delete in impostazioni). */
  async getStatiInUso(): Promise<ServiceResult<{ attivi: StatoLavorazione[]; storico: StatoLavorazione[] }>> {
    try {
      const sb = await c();
      const { data, error } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("stato, archived"));
      if (error) return err(error.message);
      const attiviSet = new Set<StatoLavorazione>();
      const storicoSet = new Set<StatoLavorazione>();
      for (const row of data ?? []) {
        const s = row.stato as StatoLavorazione;
        if (row.archived === true) storicoSet.add(s);
        else attiviSet.add(s);
      }
      return success({ attivi: [...attiviSet], storico: [...storicoSet] });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Addetti effettivamente usati su schede lavorazione (per guard delete in impostazioni). */
  async getAddettiInUso(): Promise<ServiceResult<{ attivi: string[]; storico: string[] }>> {
    try {
      const sb = await c();
      const { data: lavRows, error: lavErr } = await applyLavorazioniNotDeletedFilter(
        sb.from("lavorazioni").select("id, archived"),
      );
      if (lavErr) return err(lavErr.message);
      const lavorazioni = lavRows ?? [];
      if (lavorazioni.length === 0) {
        return success({ attivi: [], storico: [] });
      }
      const ids = lavorazioni.map((r) => r.id);
      const { data: schedaRows, error: schedaErr } = await sb
        .from("scheda_lavorazione")
        .select("lavorazione_id, tipo, contenuto")
        .in("lavorazione_id", ids);
      if (schedaErr) return err(schedaErr.message);
      return success(
        partitionAddettiInUso(
          lavorazioni.map((r) => ({ id: r.id, archived: r.archived })),
          (schedaRows ?? []).map((r) => ({
            lavorazione_id: r.lavorazione_id,
            tipo: r.tipo,
            contenuto: r.contenuto,
          })),
        ),
      );
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
