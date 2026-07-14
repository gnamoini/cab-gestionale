"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { sanitizeLogOggettoRiga } from "@/lib/gestionale-log/log-summary";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchMagazzinoListRows } from "@/lib/magazzino/magazzino-list-fetch";
import { attachMagazzinoEntityKey } from "@/lib/validation/entity-persistence";
import { errMessageFromSupabase, serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "magazzino_ricambi";

function oggettoRicambio(r: MagazzinoRicambioRow) {
  const parts = [r.marca?.trim(), r.nome?.trim()].filter((p): p is string => !!p);
  if (!parts.length) return undefined;
  const label = sanitizeLogOggettoRiga(parts.join(" — "));
  return label !== "—" ? auditContext(label) : undefined;
}

export type MagazzinoFilters = {
  codice?: string;
  nome?: string;
  marca?: string;
};

export type MagazzinoInsert = Omit<MagazzinoRicambioRow, "id" | "created_at" | "updated_at">;
export type MagazzinoUpdate = Partial<MagazzinoInsert>;

async function sb() {
  return getBrowserSupabase();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const magazzinoService = {
  async getAll(filters?: MagazzinoFilters): Promise<ServiceResult<MagazzinoRicambioRow[]>> {
    try {
      const c = await sb();
      return fetchMagazzinoListRows(c, { filters, variant: "list" });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Report/dashboard widget — subset KPI senza payload lista densa. */
  async getAllForReport(filters?: MagazzinoFilters): Promise<ServiceResult<MagazzinoRicambioRow[]>> {
    try {
      const c = await sb();
      return fetchMagazzinoListRows(c, { filters, variant: "report" });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(errMessageFromSupabase(error, { module: "magazzino", action: "read" }));
      if (!data) return err("Ricambio non trovato");
      return success(data as MagazzinoRicambioRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: MagazzinoInsert): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const payload = attachMagazzinoEntityKey(data);
      const { data: row, error } = await c.from("magazzino_ricambi").insert(payload).select(MAGAZZINO_RICAMBI_COLUMNS).single();
      if (error) return err(errMessageFromSupabase(error, { module: "magazzino", action: "read" }));
      const r = row as MagazzinoRicambioRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r, oggettoRicambio(r)) });
      void fetch(`/api/inventory-labels/ricambi/${encodeURIComponent(r.id)}`).catch(() => undefined);
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: MagazzinoUpdate): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const payload = Object.keys(data).length > 0 ? attachMagazzinoEntityKey(data) : data;
      const { data: before, error: e0 } = await c.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(errMessageFromSupabase(e0, { module: "magazzino" }));
      const { data: row, error } = await c.from("magazzino_ricambi").update(payload).eq("id", id).select(MAGAZZINO_RICAMBI_COLUMNS).single();
      if (error) return err(errMessageFromSupabase(error, { module: "magazzino", action: "read" }));
      const r = row as MagazzinoRicambioRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, oggettoRicambio(r)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const c = await sb();
      const { data: existing, error: e0 } = await c.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(errMessageFromSupabase(e0, { module: "magazzino" }));
      if (existing) {
        const ex = existing as MagazzinoRicambioRow;
        await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(ex, oggettoRicambio(ex)) });
      }
      const { error } = await c.from("magazzino_ricambi").delete().eq("id", id);
      if (error) return err(errMessageFromSupabase(error, { module: "magazzino", action: "read" }));
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /**
   * Stima `consumo_medio_mensile` dalle uscite degli ultimi `windowMonths` mesi (somma uscite / mesi).
   * Aggiorna la riga magazzino e registra audit come update standard.
   */
  async ricalcolaConsumoMedioMensile(
    id: string,
    windowMonths = 3,
  ): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const since = new Date();
      since.setMonth(since.getMonth() - Math.max(1, Math.min(windowMonths, 24)));
      const { data: movs, error: eM } = await c
        .from("movimenti_ricambi")
        .select("quantita")
        .eq("ricambio_id", id)
        .eq("tipo", "uscita")
        .gte("created_at", since.toISOString());
      if (eM) return err(errMessageFromSupabase(eM, { module: "magazzino" }));
      const sum = (movs ?? []).reduce((s, m) => s + num((m as { quantita: unknown }).quantita), 0);
      const months = Math.max(1, Math.min(windowMonths, 24));
      const mensile = Math.round((sum / months) * 1000) / 1000;
      return magazzinoService.update(id, { consumo_medio_mensile: mensile });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
