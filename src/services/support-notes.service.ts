"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { SupportNoteRow, SupportNoteWithProfileRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export const SUPPORT_NOTE_CONCURRENCY_CONFLICT = "SUPPORT_NOTE_CONCURRENCY_CONFLICT";

const PROFILE_SELECT = `
  *,
  profiles:created_by (
    id,
    nome
  )
`;

export type SupportNoteInsert = {
  content: string;
  created_by: string;
};

async function sb() {
  return getBrowserSupabase();
}

export const supportNotesService = {
  async list(): Promise<ServiceResult<SupportNoteWithProfileRow[]>> {
    try {
      const allowed = await ensureSectionRead("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("support_notes")
        .select(PROFILE_SELECT)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as SupportNoteWithProfileRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(input: SupportNoteInsert): Promise<ServiceResult<SupportNoteWithProfileRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("support_notes")
        .insert({
          content: input.content.trim(),
          created_by: input.created_by,
        })
        .select(PROFILE_SELECT)
        .single();
      if (error) return err(error.message);
      return success(data as SupportNoteWithProfileRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async updateContent(
    id: string,
    content: string,
    expectedUpdatedAt: string,
  ): Promise<ServiceResult<SupportNoteRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const trimmed = content.trim();
      if (!trimmed) return err("Il testo della nota non può essere vuoto.");
      const c = await sb();
      const { data, error } = await c
        .from("support_notes")
        .update({ content: trimmed })
        .eq("id", id)
        .eq("updated_at", expectedUpdatedAt)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();
      if (error) return err(error.message);
      if (data) return success(data as SupportNoteRow);
      const { data: cur, error: curErr } = await c.from("support_notes").select("updated_at").eq("id", id).maybeSingle();
      if (curErr) return err(curErr.message);
      if (!cur) return err("Nota non trovata.");
      if (cur.updated_at !== expectedUpdatedAt) {
        return err(SUPPORT_NOTE_CONCURRENCY_CONFLICT);
      }
      return err("Aggiornamento nota non riuscito.");
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async setResolved(id: string, resolved: boolean): Promise<ServiceResult<SupportNoteRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("support_notes")
        .update({ resolved_at: resolved ? new Date().toISOString() : null })
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(data as SupportNoteRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async softDelete(id: string): Promise<ServiceResult<SupportNoteRow>> {
    try {
      const allowed = await ensureSectionWrite("supporto");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
      const c = await sb();
      const { data, error } = await c
        .from("support_notes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(data as SupportNoteRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
