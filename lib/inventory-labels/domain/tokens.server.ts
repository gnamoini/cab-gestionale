import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateInventoryPublicToken,
  isValidInventoryTokenFormat,
  normalizeInventoryToken,
} from "@/lib/inventory-labels/domain/tokens";
import type { InventoryEntityType, InventoryQrTokenRow, TokenStatus } from "@/lib/inventory-labels/domain/types";
import { writeInventoryLabelEvent } from "@/lib/inventory-labels/audit/events.server";

const MAX_TOKEN_COLLISION_RETRIES = 5;

export type ResolveTokenResult =
  | { ok: true; row: Pick<InventoryQrTokenRow, "id" | "token" | "entity_type" | "entity_id" | "status"> }
  | { ok: false; code: "not_found" | "invalid_format" | "inactive"; status?: TokenStatus };

export async function resolveInventoryToken(
  sb: SupabaseClient,
  rawToken: string,
): Promise<ResolveTokenResult> {
  if (!isValidInventoryTokenFormat(rawToken)) {
    return { ok: false, code: "invalid_format" };
  }
  const token = normalizeInventoryToken(rawToken);
  const { data, error } = await sb
    .from("inventory_qr_tokens")
    .select("id, token, entity_type, entity_id, status")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, code: "not_found" };
  if (data.status !== "active") {
    return { ok: false, code: "inactive", status: data.status as TokenStatus };
  }
  return { ok: true, row: data };
}

export async function getActiveTokenForEntity(
  sb: SupabaseClient,
  entityType: InventoryEntityType,
  entityId: string,
): Promise<InventoryQrTokenRow | null> {
  const { data, error } = await sb
    .from("inventory_qr_tokens")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as InventoryQrTokenRow | null;
}

export async function ensureActiveInventoryToken(
  sb: SupabaseClient,
  entityType: InventoryEntityType,
  entityId: string,
  userId?: string | null,
): Promise<InventoryQrTokenRow> {
  const existing = await getActiveTokenForEntity(sb, entityType, entityId);
  if (existing) return existing;

  for (let attempt = 0; attempt < MAX_TOKEN_COLLISION_RETRIES; attempt++) {
    const token = generateInventoryPublicToken();
    const { data, error } = await sb
      .from("inventory_qr_tokens")
      .insert({
        token,
        entity_type: entityType,
        entity_id: entityId,
        status: "active",
        created_by: userId ?? null,
      })
      .select("*")
      .single();

    if (!error && data) {
      await writeInventoryLabelEvent(sb, {
        eventType: "QR_CREATED",
        entityType,
        entityId,
        userId,
        payload: { token },
      });
      return data as InventoryQrTokenRow;
    }

    if (error?.code === "23505") {
      const raced = await getActiveTokenForEntity(sb, entityType, entityId);
      if (raced) return raced;
      continue;
    }
    if (error) throw new Error(error.message);
  }

  throw new Error("Impossibile generare token QR univoco");
}

export async function regenerateInventoryToken(
  sb: SupabaseClient,
  entityType: InventoryEntityType,
  entityId: string,
  userId?: string | null,
): Promise<InventoryQrTokenRow> {
  const active = await getActiveTokenForEntity(sb, entityType, entityId);
  const newToken = await ensureActiveInventoryTokenAfterRevoke(sb, entityType, entityId, active, userId);
  await writeInventoryLabelEvent(sb, {
    eventType: "QR_REGENERATED",
    entityType,
    entityId,
    userId,
    payload: {
      previousTokenId: active?.id ?? null,
      token: newToken.token,
    },
  });
  return newToken;
}

async function ensureActiveInventoryTokenAfterRevoke(
  sb: SupabaseClient,
  entityType: InventoryEntityType,
  entityId: string,
  active: InventoryQrTokenRow | null,
  userId?: string | null,
): Promise<InventoryQrTokenRow> {
  if (active) {
    const { error: revokeErr } = await sb
      .from("inventory_qr_tokens")
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
    const token = generateInventoryPublicToken();
    const { data, error } = await sb
      .from("inventory_qr_tokens")
      .insert({
        token,
        entity_type: entityType,
        entity_id: entityId,
        status: "active",
        created_by: userId ?? null,
        superseded_by: null,
      })
      .select("*")
      .single();

    if (!error && data) {
      if (active) {
        await sb
          .from("inventory_qr_tokens")
          .update({ superseded_by: data.id })
          .eq("id", active.id);
      }
      return data as InventoryQrTokenRow;
    }
    if (error?.code === "23505") continue;
    if (error) throw new Error(error.message);
  }

  throw new Error("Impossibile rigenerare token QR");
}
