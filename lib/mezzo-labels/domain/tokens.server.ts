import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateMezzoPublicToken,
  isValidMezzoQrTokenFormat,
  normalizeMezzoQrToken,
} from "@/lib/mezzo-labels/domain/tokens";
import type { MezzoQrTokenRow, MezzoTokenStatus } from "@/lib/mezzo-labels/domain/types";
import { writeMezzoLabelEvent } from "@/lib/mezzo-labels/audit/events.server";

const MAX_TOKEN_COLLISION_RETRIES = 5;

export type ResolveMezzoTokenResult =
  | { ok: true; row: Pick<MezzoQrTokenRow, "id" | "token" | "mezzo_id" | "status"> }
  | { ok: false; code: "not_found" | "invalid_format" | "inactive"; status?: MezzoTokenStatus };

export async function resolveMezzoQrToken(
  sb: SupabaseClient,
  rawToken: string,
): Promise<ResolveMezzoTokenResult> {
  if (!isValidMezzoQrTokenFormat(rawToken)) {
    return { ok: false, code: "invalid_format" };
  }
  const token = normalizeMezzoQrToken(rawToken);
  const { data, error } = await sb
    .from("mezzo_qr_tokens")
    .select("id, token, mezzo_id, status")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, code: "not_found" };
  if (data.status !== "active") {
    return { ok: false, code: "inactive", status: data.status as MezzoTokenStatus };
  }
  return { ok: true, row: data };
}

export async function getActiveMezzoQrToken(
  sb: SupabaseClient,
  mezzoId: string,
): Promise<MezzoQrTokenRow | null> {
  const { data, error } = await sb
    .from("mezzo_qr_tokens")
    .select("*")
    .eq("mezzo_id", mezzoId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MezzoQrTokenRow | null;
}

export async function ensureActiveMezzoQrToken(
  sb: SupabaseClient,
  mezzoId: string,
  userId?: string | null,
): Promise<MezzoQrTokenRow> {
  const existing = await getActiveMezzoQrToken(sb, mezzoId);
  if (existing) return existing;

  for (let attempt = 0; attempt < MAX_TOKEN_COLLISION_RETRIES; attempt++) {
    const token = generateMezzoPublicToken();
    const { data, error } = await sb
      .from("mezzo_qr_tokens")
      .insert({
        token,
        mezzo_id: mezzoId,
        status: "active",
        created_by: userId ?? null,
      })
      .select("*")
      .single();

    if (!error && data) {
      await writeMezzoLabelEvent(sb, {
        eventType: "MEZZO_QR_CREATED",
        mezzoId,
        userId,
        payload: { token },
      });
      return data as MezzoQrTokenRow;
    }

    if (error?.code === "23505") {
      const raced = await getActiveMezzoQrToken(sb, mezzoId);
      if (raced) return raced;
      continue;
    }
    if (error) throw new Error(error.message);
  }

  throw new Error("Impossibile generare token QR univoco");
}

export async function regenerateMezzoQrToken(
  sb: SupabaseClient,
  mezzoId: string,
  userId?: string | null,
): Promise<MezzoQrTokenRow> {
  const active = await getActiveMezzoQrToken(sb, mezzoId);

  if (active) {
    const { error: revokeErr } = await sb
      .from("mezzo_qr_tokens")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: userId ?? null,
      })
      .eq("id", active.id)
      .eq("status", "active");
    if (revokeErr) throw new Error(revokeErr.message);
  }

  for (let attempt = 0; attempt < MAX_TOKEN_COLLISION_RETRIES; attempt++) {
    const token = generateMezzoPublicToken();
    const { data, error } = await sb
      .from("mezzo_qr_tokens")
      .insert({
        token,
        mezzo_id: mezzoId,
        status: "active",
        created_by: userId ?? null,
      })
      .select("*")
      .single();

    if (!error && data) {
      if (active) {
        await sb.from("mezzo_qr_tokens").update({ superseded_by: data.id }).eq("id", active.id);
      }
      await writeMezzoLabelEvent(sb, {
        eventType: "MEZZO_QR_REGENERATED",
        mezzoId,
        userId,
        payload: {
          previousTokenId: active?.id ?? null,
          token: data.token,
        },
      });
      return data as MezzoQrTokenRow;
    }
    if (error?.code === "23505") continue;
    if (error) throw new Error(error.message);
  }

  throw new Error("Impossibile rigenerare token QR");
}
