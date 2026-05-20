"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission, ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneRow, MezzoRow, PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
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

export type LavorazioneListRow = LavorazioneRow & { mezzo: MezzoRow | null };

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

type LavorazioniFilterQuery = {
  in(column: string, values: readonly unknown[]): LavorazioniFilterQuery;
  eq(column: string, value: unknown): LavorazioniFilterQuery;
  ilike(column: string, pattern: string): LavorazioniFilterQuery;
  gte(column: string, value: string): LavorazioniFilterQuery;
  lte(column: string, value: string): LavorazioniFilterQuery;
  is(column: string, value: null): LavorazioniFilterQuery;
  not(column: string, operator: string, value: unknown): LavorazioniFilterQuery;
};

function embedMezzo(raw: unknown): MezzoRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return (raw[0] as MezzoRow) ?? null;
  return raw as MezzoRow;
}

async function c() {
  return getBrowserSupabase();
}

function escapeIlikeToken(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function endOfDayIso(dateDay: string): string {
  const t = dateDay.trim();
  if (!t) return t;
  return t.length <= 10 ? `${t}T23:59:59.999Z` : t;
}

/** Filtri server-side condivisi tra query con/senza join `mezzi`. */
function applyLavorazioniListFilters<TQuery extends LavorazioniFilterQuery>(q: TQuery, filters?: LavorazioneFilters): TQuery {
  let query: LavorazioniFilterQuery = applyLavorazioniNotDeletedFilter(q);
  if (!filters) return query as TQuery;
  if (filters.stati_in?.length) query = query.in("stato", filters.stati_in);
  if (filters.mezzo_id) query = query.eq("mezzo_id", filters.mezzo_id);
  if (filters.stato) query = query.eq("stato", filters.stato);
  if (filters.priorita) query = query.eq("priorita", filters.priorita);
  const search = filters.search?.trim();
  if (search) query = query.ilike("note", `%${escapeIlikeToken(search)}%`);
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

export const lavorazioniService = {
  async getAll(filters?: LavorazioneFilters): Promise<ServiceResult<LavorazioneListRow[]>> {
    try {
      const allowed = await ensureSectionRead("lavorazioni");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const sb = await c();
      if (filters?.includeMezzo) {
        let q = sb.from("lavorazioni").select("*, mezzi(*)").order("created_at", { ascending: false });
        q = applyLavorazioniListFilters(q, filters);
        const { data, error } = await q;
        if (error) return err(error.message);
        const raw = (data ?? []) as Array<LavorazioneRow & { mezzi?: unknown }>;
        const rows: LavorazioneListRow[] = raw.map((row) => {
          const { mezzi: em, ...rest } = row;
          return { ...(rest as LavorazioneRow), mezzo: embedMezzo(em) };
        });
        return success(rows);
      }

      let q = sb.from("lavorazioni").select("*").order("created_at", { ascending: false });
      q = applyLavorazioniListFilters(q, filters);
      const { data, error } = await q;
      if (error) return err(error.message);
      const raw = (data ?? []) as LavorazioneRow[];
      const rows: LavorazioneListRow[] = raw.map((row) => ({ ...row, mezzo: null }));
      return success(rows);
    } catch (e) {
      return serviceFailFromError(e);
    }
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
      const { data: row, error } = await sb.from("lavorazioni").insert(data).select("*").single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      await writeModificaLog(sb, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
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
      const { data: before, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await applyLavorazioniNotDeletedFilter(
        sb.from("lavorazioni").update(data).eq("id", id),
      )
        .select("*")
        .single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r),
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
      const { data: before, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await applyLavorazioniNotDeletedFilter(
        sb.from("lavorazioni").update({ stato, data_uscita: null, archived: false, archived_at: null }).eq("id", id),
      )
        .select("*")
        .single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "RESTORE",
        payload: auditDiff(before, r),
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
      const { data: before, error: e0 } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select("*").eq("id", id)).maybeSingle();
      if (e0) return err(e0.message);
      if (!before) return err("Lavorazione non trovata");
      const b = before as LavorazioneRow;
      if (b.archived === true) return success(b);

      const now = new Date().toISOString();
      const patch = {
        stato: "completata" as StatoLavorazione,
        archived: true,
        archived_at: now,
        data_uscita: b.data_uscita?.trim() ? b.data_uscita : now,
      };
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
      await writeModificaLog(sb, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r),
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
      const now = new Date().toISOString();
      const { data: row, error } = await applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").update({ deleted_at: now }).eq("id", id))
        .select("*")
        .maybeSingle();
      if (error) return err(error.message);
      if (!row) return err("Lavorazione non trovata");
      await writeModificaLog(sb, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(row) });
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
};
