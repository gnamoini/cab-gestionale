"use client";

/**
 * Persistenza `app_settings` + OCC client-side.
 * Storico modifiche: tabella `app_settings_audit` (trigger AFTER UPDATE), lettura via `appSettingsAuditService` / `useAppSettingsAuditQuery`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

/** Esito conflitto concorrenza (altro admin ha già aggiornato la riga). */
export const SETTINGS_CONCURRENCY_CONFLICT = "SETTINGS_CONCURRENCY_CONFLICT";

async function sb(): Promise<SupabaseClient> {
  return getBrowserSupabase();
}

export type AppSettingsUpsertInput = {
  module: string;
  key: string;
  value: Record<string, unknown>;
  /**
   * Se valorizzato: `UPDATE` solo se `updated_at` coincide (OCC).
   * Se omesso: `upsert` senza check (bootstrap / prima creazione riga).
   */
  expectedUpdatedAt?: string;
};

function rowVersionKey(module: string, key: string): string {
  return `${module}\u0000${key}`;
}

/** Aggiunge `expectedUpdatedAt` dalle righe lette l’ultima volta (cache query). */
export function mergeAppSettingsUpsertWithVersions(
  rows: { module: string; key: string; value: Record<string, unknown> }[],
  previous: AppSettingRow[],
): AppSettingsUpsertInput[] {
  const map = new Map(previous.map((r) => [rowVersionKey(r.module, r.key), r.updated_at]));
  return rows.map((r) => ({
    ...r,
    expectedUpdatedAt: map.get(rowVersionKey(r.module, r.key)),
  }));
}

async function applyAppSettingsUpsert(c: SupabaseClient, input: AppSettingsUpsertInput): Promise<ServiceResult<AppSettingRow>> {
  const { data: userData } = await c.auth.getUser();
  const updated_by = userData.user?.id ?? null;
  const { module, key, value, expectedUpdatedAt } = input;

  if (expectedUpdatedAt === undefined) {
    const { data, error } = await c
      .from("app_settings")
      .upsert({ module, key, value, updated_by }, { onConflict: "module,key" })
      .select("*")
      .maybeSingle();
    if (error) return err(error.message);
    if (!data) return err("Aggiornamento impostazioni fallito.");
    return success(data);
  }

  const { data: updated, error: upErr } = await c
    .from("app_settings")
    .update({ value, updated_by })
    .eq("module", module)
    .eq("key", key)
    .eq("updated_at", expectedUpdatedAt)
    .select("*")
    .maybeSingle();

  if (upErr) return err(upErr.message);
  if (updated) return success(updated);

  const { data: cur, error: curErr } = await c.from("app_settings").select("*").eq("module", module).eq("key", key).maybeSingle();
  if (curErr) return err(curErr.message);

  if (!cur) {
    const ins = await c.from("app_settings").insert({ module, key, value, updated_by }).select("*").maybeSingle();
    if (ins.error) return err(ins.error.message);
    if (!ins.data) return err("Inserimento impostazioni fallito.");
    return success(ins.data);
  }

  if (cur.updated_at !== expectedUpdatedAt) {
    return err(SETTINGS_CONCURRENCY_CONFLICT);
  }

  return err("Aggiornamento impostazioni non riuscito (permessi o stato riga).");
}

export const settingsService = {
  async getAllSettings(): Promise<ServiceResult<AppSettingRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("app_settings").select("*").order("module", { ascending: true }).order("key", { ascending: true });
      if (error) return err(error.message);
      return success((data ?? []) as AppSettingRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getModuleSettings(module: string): Promise<ServiceResult<AppSettingRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("app_settings").select("*").eq("module", module).order("key", { ascending: true });
      if (error) return err(error.message);
      return success((data ?? []) as AppSettingRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getSetting(module: string, key: string): Promise<ServiceResult<AppSettingRow | null>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("app_settings").select("*").eq("module", module).eq("key", key).maybeSingle();
      if (error) return err(error.message);
      return success((data as AppSettingRow | null) ?? null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsertSetting(input: AppSettingsUpsertInput): Promise<ServiceResult<AppSettingRow>> {
    try {
      const c = await sb();
      return applyAppSettingsUpsert(c, input);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async bulkUpsertSettings(inputs: AppSettingsUpsertInput[]): Promise<ServiceResult<AppSettingRow[]>> {
    try {
      if (inputs.length === 0) return success([]);
      const c = await sb();
      const out: AppSettingRow[] = [];
      for (const input of inputs) {
        const r = await applyAppSettingsUpsert(c, input);
        if (!r.success || !r.data) {
          return err<AppSettingRow[]>(r.error ?? "Operazione fallita", null);
        }
        out.push(r.data);
      }
      return success(out);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
