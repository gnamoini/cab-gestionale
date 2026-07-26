import { MEZZI_COLUMNS } from "@/lib/db/table-select-columns";
import { normalizeTarga, normCliente, normScuderiaIdentity } from "@/lib/domain/mezzo/mezzo-identity";
import type { MezzoIncomingPatch } from "@/lib/domain/mezzo/merge-mezzo-patch";
import type { MezzoResolveInsert } from "@/lib/domain/mezzo/resolve-or-create-mezzo";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import { attachMezzoEntityKey } from "@/lib/validation/entity-persistence";
import { sanitizeMezzoWritePayload } from "@/lib/validation/services/mezzi-payload";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { isVinUniqueViolation } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

const ENTITA = "mezzi";
const VIN_DUPLICATE_MSG = "VIN già registrato su un altro mezzo.";
const TARGA_UNIQUE_INDEX = "idx_mezzi_targa_norm_unique";

function oggettoMezzo(r: MezzoRow) {
  const ident = r.targa?.trim() || r.telaio_num?.trim() || "";
  const parts = [r.cliente?.trim(), ident].filter(Boolean);
  return parts.length ? auditContext(parts.join(" — ")) : undefined;
}

function prepareMezzoPayload(data: MezzoResolveInsert | MezzoIncomingPatch) {
  const sanitized = sanitizeMezzoWritePayload(data, { v2Enabled: true, source: "mezziRepository" });
  if ("telaio_num" in sanitized && sanitized.telaio_num !== undefined) {
    const raw = sanitized.telaio_num;
    sanitized.telaio_num = raw === null || String(raw).trim() === "" ? null : normalizeVin(String(raw));
  }
  return sanitized;
}

async function assertVinUnique(
  client: SupabaseClient,
  telaioNum: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  const norm = normalizeVin(telaioNum);
  if (!norm) return;
  let q = client.from("mezzi").select("id").eq("telaio_num_norm", norm).limit(1);
  if (excludeId?.trim()) q = q.neq("id", excludeId.trim());
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (data) throw new Error(VIN_DUPLICATE_MSG);
}

/** SSOT INSERT — solo chiamato da resolveOrCreateMezzo. */
export async function mezziCreateRaw(
  client: SupabaseClient,
  data: MezzoResolveInsert,
): Promise<MezzoRow> {
  const prepared = prepareMezzoPayload(data) as MezzoResolveInsert;
  await assertVinUnique(client, prepared.telaio_num);
  const { data: user } = await client.auth.getUser();
  const payload = attachMezzoEntityKey({ ...prepared, created_by: user.user?.id ?? null });
  const { data: row, error } = await client
    .from("mezzi")
    .insert(payload)
    .select(MEZZI_COLUMNS)
    .single();
  if (error) {
    if (isVinUniqueViolation(error)) throw new Error(VIN_DUPLICATE_MSG);
    throw error;
  }
  const r = row as MezzoRow;
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: r.id,
    azione: "CREATE",
    payload: auditSnapshot(r, oggettoMezzo(r)),
  });
  return r;
}

export async function mezziUpdateRaw(
  client: SupabaseClient,
  id: string,
  patch: MezzoIncomingPatch,
): Promise<MezzoRow> {
  const prepared = Object.keys(patch).length > 0 ? (prepareMezzoPayload(patch) as MezzoIncomingPatch) : patch;
  if (prepared.telaio_num !== undefined) {
    await assertVinUnique(client, prepared.telaio_num, id);
  }
  const { data: before, error: readErr } = await client
    .from("mezzi")
    .select(MEZZI_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!before) throw new Error("Mezzo non trovato.");

  const payload =
    Object.keys(prepared).length > 0 ? attachMezzoEntityKey(prepared as MezzoResolveInsert) : prepared;
  const { data: row, error } = await client
    .from("mezzi")
    .update(payload)
    .eq("id", id)
    .select(MEZZI_COLUMNS)
    .single();
  if (error) {
    if (isVinUniqueViolation(error)) throw new Error(VIN_DUPLICATE_MSG);
    throw error;
  }
  const r = row as MezzoRow;
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: id,
    azione: "UPDATE",
    payload: auditDiff(before as MezzoRow, r, oggettoMezzo(r)),
  });
  return r;
}

export async function mezziGetById(client: SupabaseClient, id: string): Promise<MezzoRow | null> {
  const { data, error } = await client.from("mezzi").select(MEZZI_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as MezzoRow | null) ?? null;
}

export async function mezziFindByVinNorm(client: SupabaseClient, vinNorm: string): Promise<MezzoRow[]> {
  const norm = normalizeVin(vinNorm);
  if (!norm) return [];
  const { data, error } = await client
    .from("mezzi")
    .select(MEZZI_COLUMNS)
    .eq("telaio_num_norm", norm)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MezzoRow[];
}

export async function mezziFindByTargaNorm(client: SupabaseClient, targaNorm: string): Promise<MezzoRow[]> {
  const norm = normalizeTarga(targaNorm);
  if (!norm) return [];
  const { data, error } = await client.from("mezzi").select(MEZZI_COLUMNS).not("targa", "is", null);
  if (error) throw error;
  return ((data ?? []) as MezzoRow[]).filter((r) => normalizeTarga(r.targa) === norm);
}

export async function mezziListPartialIdentityCandidates(
  client: SupabaseClient,
  input: {
    cliente?: string | null;
    numero_scuderia?: string | null;
    tipo_telaio?: string | null;
  },
): Promise<MezzoRow[]> {
  const cliente = normCliente(input.cliente);
  if (!cliente) return [];

  let q = client.from("mezzi").select(MEZZI_COLUMNS).ilike("cliente", input.cliente!.trim());
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;

  const scud = normScuderiaIdentity(input.numero_scuderia);
  const tipo = input.tipo_telaio?.trim().toLowerCase() || null;

  return ((data ?? []) as MezzoRow[]).filter((r) => {
    if (normCliente(r.cliente) !== cliente) return false;
    if (scud) {
      const rScud = normScuderiaIdentity(r.numero_scuderia);
      if (rScud && rScud !== scud) return false;
    }
    if (tipo) {
      const rTipo = r.tipo_telaio?.trim().toLowerCase() || null;
      if (rTipo && rTipo !== tipo) return false;
    }
    return true;
  });
}

export function isMezzoTargaUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  if (e.code !== "23505") return false;
  const hay = [e.message, e.details, e.hint].filter(Boolean).join(" ");
  return hay.includes(TARGA_UNIQUE_INDEX) || hay.toLowerCase().includes("targa");
}

export async function logMezzoResolvedExisting(
  client: SupabaseClient,
  input: {
    mezzoId: string;
    matchedBy: string;
    incomingIdent: { vin?: string | null; targa?: string | null };
    conflicts: unknown[];
  },
): Promise<void> {
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: input.mezzoId,
    azione: "MEZZO_RESOLVED_EXISTING",
    event_type: "SYSTEM_EVENT",
    payload: {
      mezzo_id: input.mezzoId,
      matched_by: input.matchedBy,
      incoming_ident: input.incomingIdent,
      conflicts: input.conflicts,
    },
  });
}

export async function logMezzoConflictKept(
  client: SupabaseClient,
  input: {
    mezzoId: string;
    field: string;
    existingValue: string | number | Record<string, unknown> | null;
    incomingValue: string | number | Record<string, unknown> | null;
  },
): Promise<void> {
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: input.mezzoId,
    azione: "MEZZO_CONFLICT_KEPT",
    event_type: "SYSTEM_EVENT",
    payload: {
      mezzo_id: input.mezzoId,
      field: input.field,
      existing_value: input.existingValue,
      incoming_value: input.incomingValue,
      resolution: "kept_existing",
    },
  });
}

export async function logMezzoDuplicatePrevented(
  client: SupabaseClient,
  input: { mezzoId: string; matchedBy: string },
): Promise<void> {
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: input.mezzoId,
    azione: "MEZZO_DUPLICATE_PREVENTED",
    event_type: "SYSTEM_EVENT",
    payload: {
      mezzo_id: input.mezzoId,
      matched_by: input.matchedBy,
    },
  });
}
