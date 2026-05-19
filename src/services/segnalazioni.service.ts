"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { SegnalazioneRow, SegnalazioneStato, SegnalazioneWithProfileRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type SegnalazioneInsert = {
  messaggio: string;
  tipo?: string;
  entita_tipo?: string | null;
  entita_id?: string | null;
  created_by: string;
};

async function sb() {
  return getBrowserSupabase();
}

export const segnalazioniService = {
  async list(): Promise<ServiceResult<SegnalazioneWithProfileRow[]>> {
    try {
      const allowed = await ensureSectionRead("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("segnalazioni")
        .select(
          `
          *,
          profiles!segnalazioni_created_by_fkey (
            id,
            nome
          )
        `,
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as SegnalazioneWithProfileRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(input: SegnalazioneInsert): Promise<ServiceResult<SegnalazioneWithProfileRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const payload = {
        messaggio: input.messaggio.trim(),
        tipo: input.tipo?.trim() || "generale",
        entita_tipo: input.entita_tipo ?? null,
        entita_id: input.entita_id ?? null,
        created_by: input.created_by,
        stato: "attiva" as SegnalazioneStato,
      };
      const { data, error } = await c
        .from("segnalazioni")
        .insert(payload)
        .select(
          `
          *,
          profiles!segnalazioni_created_by_fkey (
            id,
            nome
          )
        `,
        )
        .single();
      if (error) return err(error.message);
      return success(data as SegnalazioneWithProfileRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async setStato(id: string, stato: SegnalazioneStato): Promise<ServiceResult<SegnalazioneRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("segnalazioni")
        .update({ stato })
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(data as SegnalazioneRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async softDelete(id: string): Promise<ServiceResult<SegnalazioneRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("segnalazioni")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(data as SegnalazioneRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
