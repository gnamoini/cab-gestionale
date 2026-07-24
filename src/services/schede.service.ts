"use client";

import { SCHEDA_LAVORAZIONE_COLUMNS } from "@/lib/db/table-select-columns";
import { syncActualLaborHoursForLavorazione } from "@/lib/lavorazioni/sync-actual-labor-hours";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { lavorazioneLogOggettoFromSchedaContenuto } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { SchedaLavorazioneRow, TipoSchedaLavorazione } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "scheda_lavorazione";

export type SchedaFilters = {
  lavorazione_id?: string;
  tipo?: TipoSchedaLavorazione;
};

export type SchedaInsert = Omit<SchedaLavorazioneRow, "id" | "created_at" | "updated_at">;
export type SchedaUpdate = Partial<Pick<SchedaLavorazioneRow, "tipo" | "contenuto">> & {
  updated_at?: string;
};

export const SCHEDA_CONCURRENCY_CONFLICT =
  "Un altro utente ha aggiornato questa scheda. Ricarica e riprova.";

async function sb() {
  return getBrowserSupabase();
}

function oggettoContextForScheda(row: SchedaLavorazioneRow) {
  const oggetto = lavorazioneLogOggettoFromSchedaContenuto(row.contenuto);
  if (oggetto === "—") return undefined;
  return auditContext(oggetto);
}

async function syncInterventiActualHours(
  client: Awaited<ReturnType<typeof sb>>,
  row: Pick<SchedaLavorazioneRow, "lavorazione_id" | "tipo" | "contenuto"> | null,
): Promise<void> {
  if (!row || row.tipo !== "interventi") return;
  const sync = await syncActualLaborHoursForLavorazione(
    client,
    row.lavorazione_id,
    row.contenuto,
    "scheda_save",
  );
  if (!sync.ok) {
    console.warn("[schede] sync actual_labor_hours fallito:", sync.error);
  }
}

async function zeroInterventiActualHours(
  client: Awaited<ReturnType<typeof sb>>,
  lavorazioneId: string,
): Promise<void> {
  const sync = await syncActualLaborHoursForLavorazione(client, lavorazioneId, null, "scheda_save");
  if (!sync.ok) {
    console.warn("[schede] azzeramento actual_labor_hours fallito:", sync.error);
  }
}

export const schedeService = {
  async getAll(filters?: SchedaFilters): Promise<ServiceResult<SchedaLavorazioneRow[]>> {
    try {
      const c = await sb();
      let q = c.from("scheda_lavorazione").select(SCHEDA_LAVORAZIONE_COLUMNS).order("created_at", { ascending: false });
      if (filters?.lavorazione_id) q = q.eq("lavorazione_id", filters.lavorazione_id);
      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as SchedaLavorazioneRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<SchedaLavorazioneRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("scheda_lavorazione").select(SCHEDA_LAVORAZIONE_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Scheda non trovata");
      return success(data as SchedaLavorazioneRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: SchedaInsert): Promise<ServiceResult<SchedaLavorazioneRow>> {
    try {
      const c = await sb();
      const { data: row, error } = await c.from("scheda_lavorazione").insert(data).select(SCHEDA_LAVORAZIONE_COLUMNS).single();
      if (error) return err(error.message);
      const r = row as SchedaLavorazioneRow;
      const ctx = oggettoContextForScheda(r);
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r, ctx) });
      await syncInterventiActualHours(c, r);
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: SchedaUpdate): Promise<ServiceResult<SchedaLavorazioneRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("scheda_lavorazione").select(SCHEDA_LAVORAZIONE_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      let q = c.from("scheda_lavorazione").update(data).eq("id", id);
      if (data.updated_at) q = q.eq("updated_at", data.updated_at);
      const { data: row, error } = await q.select(SCHEDA_LAVORAZIONE_COLUMNS).single();
      if (error) {
        if (error.code === "PGRST116") return err(SCHEDA_CONCURRENCY_CONFLICT);
        return err(error.message);
      }
      const r = row as SchedaLavorazioneRow;
      const ctx = oggettoContextForScheda(r);
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, ctx),
      });
      await syncInterventiActualHours(c, r);
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const c = await sb();
      const { data: existing, error: e0 } = await c.from("scheda_lavorazione").select(SCHEDA_LAVORAZIONE_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(existing) });
      const { error } = await c.from("scheda_lavorazione").delete().eq("id", id);
      if (error) return err(error.message);
      if (existing?.tipo === "interventi") {
        await zeroInterventiActualHours(c, existing.lavorazione_id);
      }
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
