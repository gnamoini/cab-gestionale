import { ATTREZZATURE_COLUMNS } from "@/lib/db/table-select-columns";
import { resolveAssetLifecycleV1EnabledClient } from "@/lib/officina/resolve-asset-lifecycle-v1-client";
import { isAssetLifecycleSubFlagActive } from "@/lib/officina/asset-lifecycle-v1-flag";
import type { AttrezzaturaResolveInsert } from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { AttrezzaturaIncomingPatch } from "@/lib/domain/mezzo-attrezzatura/merge-attrezzatura-patch";
import type { SupabaseClient } from "@supabase/supabase-js";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import type { AssignmentChangeReason, AttrezzaturaRow } from "@/src/types/supabase-tables";

const ENTITA = "attrezzature";

function oggettoAttrezzatura(r: AttrezzaturaRow) {
  const parts = [r.marca?.trim(), r.modello?.trim(), r.matricola?.trim()].filter(Boolean);
  return parts.length ? auditContext(parts.join(" ")) : undefined;
}

async function openAssignmentIfEnabled(
  client: SupabaseClient,
  attrezzaturaId: string,
  mezzoId: string,
  reason: AssignmentChangeReason = "installazione",
): Promise<void> {
  const flags = resolveAssetLifecycleV1EnabledClient();
  if (!isAssetLifecycleSubFlagActive(flags, "assignment_history")) return;
  const { data: user } = await client.auth.getUser();
  await client.rpc("open_attrezzatura_assignment", {
    p_attrezzatura_id: attrezzaturaId,
    p_mezzo_id: mezzoId,
    p_change_reason: reason,
    p_actor_id: user.user?.id ?? null,
  });
}

/** SSOT INSERT — solo chiamato da resolveOrCreateAttrezzatura. */
export async function attrezzatureCreateRaw(
  client: SupabaseClient,
  data: AttrezzaturaResolveInsert,
): Promise<AttrezzaturaRow> {
  const { data: user } = await client.auth.getUser();
  const payload = { ...data, created_by: user.user?.id ?? null };
  const { data: row, error } = await client
    .from("attrezzature")
    .insert(payload)
    .select(ATTREZZATURE_COLUMNS)
    .single();
  if (error) throw error;
  const r = row as AttrezzaturaRow;
  await openAssignmentIfEnabled(client, r.id, r.mezzo_id, "installazione");
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: r.id,
    azione: "CREATE",
    payload: auditSnapshot(r, oggettoAttrezzatura(r)),
  });
  return r;
}

export async function attrezzatureUpdateRaw(
  client: SupabaseClient,
  id: string,
  patch: AttrezzaturaIncomingPatch,
): Promise<AttrezzaturaRow> {
  const { data: before, error: readErr } = await client
    .from("attrezzature")
    .select(ATTREZZATURE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!before) throw new Error("Attrezzatura non trovata.");

  const { data: row, error } = await client
    .from("attrezzature")
    .update(patch)
    .eq("id", id)
    .select(ATTREZZATURE_COLUMNS)
    .single();
  if (error) throw error;
  const r = row as AttrezzaturaRow;
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: id,
    azione: "UPDATE",
    payload: auditDiff(before as AttrezzaturaRow, r, oggettoAttrezzatura(r)),
  });
  return r;
}

export async function attrezzatureGetById(
  client: SupabaseClient,
  id: string,
): Promise<AttrezzaturaRow | null> {
  const { data, error } = await client
    .from("attrezzature")
    .select(ATTREZZATURE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as AttrezzaturaRow | null) ?? null;
}

export async function attrezzatureListByMezzo(
  client: SupabaseClient,
  mezzoId: string,
): Promise<AttrezzaturaRow[]> {
  const { data, error } = await client
    .from("attrezzature")
    .select(ATTREZZATURE_COLUMNS)
    .eq("mezzo_id", mezzoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AttrezzaturaRow[];
}

export async function logAttrezzaturaResolvedExisting(
  client: SupabaseClient,
  input: {
    mezzoId: string;
    incomingMatricola: string | null;
    matchedBy: string;
    existingAttrezzaturaId: string;
    conflicts: unknown[];
  },
): Promise<void> {
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: input.existingAttrezzaturaId,
    azione: "ATTREZZATURA_RESOLVED_EXISTING",
    event_type: "SYSTEM_EVENT",
    payload: {
      mezzo_id: input.mezzoId,
      incoming_matricola: input.incomingMatricola,
      matched_by: input.matchedBy,
      existing_attrezzatura_id: input.existingAttrezzaturaId,
      conflicts: input.conflicts,
    },
  });
}

export async function logAttrezzaturaConflictKept(
  client: SupabaseClient,
  input: {
    mezzoId: string;
    attrezzaturaId: string;
    field: string;
    existingValue: string | number | null;
    incomingValue: string | number | null;
  },
): Promise<void> {
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: input.attrezzaturaId,
    azione: "ATTREZZATURA_CONFLICT_KEPT",
    event_type: "SYSTEM_EVENT",
    payload: {
      mezzo_id: input.mezzoId,
      attrezzatura_id: input.attrezzaturaId,
      field: input.field,
      existing_value: input.existingValue,
      incoming_value: input.incomingValue,
      resolution: "kept_existing",
    },
  });
}
