"use client";

import { normMatricola, pickCanonicalAttrezzatura, matricolaRowsForNorm } from "@/lib/domain/mezzo-attrezzatura/attrezzatura-identity";
import { isAssetLifecycleSubFlagActive } from "@/lib/officina/asset-lifecycle-v1-flag";
import { resolveAssetLifecycleV1EnabledClient } from "@/lib/officina/resolve-asset-lifecycle-v1-client";
import { ATTREZZATURE_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "attrezzature";

export type AttrezzaturaInsert = Omit<AttrezzaturaRow, "id" | "created_at" | "updated_at" | "created_by"> & {
  created_by?: string | null;
};
export type AttrezzaturaUpdate = Partial<Omit<AttrezzaturaInsert, "mezzo_id">> & {
  mezzo_id?: string;
};

async function sb() {
  return getBrowserSupabase();
}

function oggettoAttrezzatura(r: AttrezzaturaRow) {
  const parts = [r.marca?.trim(), r.modello?.trim(), r.matricola?.trim()].filter(Boolean);
  return parts.length ? auditContext(parts.join(" ")) : undefined;
}

export const attrezzatureService = {
  async listByMezzo(mezzoId: string): Promise<ServiceResult<AttrezzaturaRow[]>> {
    try {
      const client = await sb();
      const { data, error } = await client
        .from("attrezzature")
        .select(ATTREZZATURE_COLUMNS)
        .eq("mezzo_id", mezzoId)
        .order("created_at", { ascending: true });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AttrezzaturaRow[]);
    } catch (e) {
      return serviceFailFromError<AttrezzaturaRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async getById(id: string): Promise<ServiceResult<AttrezzaturaRow | null>> {
    try {
      const client = await sb();
      const { data, error } = await client
        .from("attrezzature")
        .select(ATTREZZATURE_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data as AttrezzaturaRow | null) ?? null);
    } catch (e) {
      return serviceFailFromError<AttrezzaturaRow | null>(e, null, { entity: "mezzo", action: "read" });
    }
  },

  async findByMatricola(mezzoId: string, matricola: string): Promise<ServiceResult<AttrezzaturaRow | null>> {
    const norm = normMatricola(matricola);
    if (!norm) return success(null);
    try {
      const listRes = await this.listByMezzo(mezzoId);
      if (!listRes.success) return err(listRes.error ?? "Errore lettura attrezzature.");
      const hits = matricolaRowsForNorm(listRes.data ?? [], mezzoId, norm);
      if (hits.length === 0) return success(null);
      return success(pickCanonicalAttrezzatura(hits));
    } catch (e) {
      return serviceFailFromError<AttrezzaturaRow | null>(e, null, { entity: "mezzo", action: "read" });
    }
  },

  async update(id: string, patch: AttrezzaturaUpdate): Promise<ServiceResult<AttrezzaturaRow>> {
    try {
      const client = await sb();
      const beforeRes = await this.getById(id);
      if (!beforeRes.success || !beforeRes.data) {
        return err(beforeRes.error ?? "Attrezzatura non trovata.");
      }
      const before = beforeRes.data;

      if (patch.mezzo_id != null && patch.mezzo_id !== before.mezzo_id) {
        const flags = resolveAssetLifecycleV1EnabledClient();
        if (isAssetLifecycleSubFlagActive(flags, "assignment_history")) {
          const { data: user } = await client.auth.getUser();
          const { data: row, error } = await client.rpc("reassign_attrezzatura_mezzo", {
            p_attrezzatura_id: id,
            p_new_mezzo_id: patch.mezzo_id,
            p_change_reason: "spostamento",
            p_actor_id: user.user?.id ?? null,
          });
          if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
          const rest = { ...patch };
          delete rest.mezzo_id;
          if (Object.keys(rest).length === 0) {
            const updated = row as AttrezzaturaRow;
            await writeModificaLog(client, {
              entita: ENTITA,
              entita_id: id,
              azione: "UPDATE",
              payload: auditDiff(before, updated, oggettoAttrezzatura(updated)),
            });
            return success(updated);
          }
          patch = rest;
        }
      }

      const { data: row, error } = await client
        .from("attrezzature")
        .update(patch)
        .eq("id", id)
        .select(ATTREZZATURE_COLUMNS)
        .single();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
      const r = row as AttrezzaturaRow;
      await writeModificaLog(client, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, oggettoAttrezzatura(r)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError<AttrezzaturaRow>(e, null as never, { entity: "mezzo", action: "update" });
    }
  },

  async remove(id: string): Promise<ServiceResult<void>> {
    try {
      const client = await sb();
      const beforeRes = await this.getById(id);
      const before = beforeRes.data;
      const flags = resolveAssetLifecycleV1EnabledClient();
      if (before && isAssetLifecycleSubFlagActive(flags, "assignment_history")) {
        await client.rpc("close_attrezzatura_assignment", {
          p_attrezzatura_id: id,
          p_change_reason: "smontaggio",
        });
      }
      const { error } = await client.from("attrezzature").delete().eq("id", id);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "delete" }));
      if (before) {
        await writeModificaLog(client, {
          entita: ENTITA,
          entita_id: id,
          azione: "DELETE",
          payload: auditSnapshot(before, oggettoAttrezzatura(before)),
        });
      }
      return success(undefined);
    } catch (e) {
      return serviceFailFromError<void>(e, undefined, { entity: "mezzo", action: "delete" });
    }
  },
};

export { ENTITA as ATTREZZATURE_ENTITA };
