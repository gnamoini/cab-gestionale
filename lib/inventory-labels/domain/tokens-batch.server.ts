import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryEntityType } from "@/lib/inventory-labels/domain/types";
import {
  generateInventoryPublicToken,
} from "@/lib/inventory-labels/domain/tokens";
import { getActiveTokenForEntity } from "@/lib/inventory-labels/domain/tokens.server";
import { writeInventoryLabelEvent } from "@/lib/inventory-labels/audit/events.server";

const MAX_TOKEN_COLLISION_RETRIES = 5;

export async function getActiveTokensForEntities(
  sb: SupabaseClient,
  entityType: InventoryEntityType,
  entityIds: string[],
): Promise<Map<string, { id: string; token: string }>> {
  if (!entityIds.length) return new Map();
  const { data, error } = await sb
    .from("inventory_qr_tokens")
    .select("id, token, entity_id")
    .eq("entity_type", entityType)
    .eq("status", "active")
    .in("entity_id", entityIds);
  if (error) throw new Error(error.message);
  const map = new Map<string, { id: string; token: string }>();
  for (const row of data ?? []) {
    map.set(String(row.entity_id), { id: String(row.id), token: String(row.token) });
  }
  return map;
}

export async function ensureActiveTokensForEntities(
  sb: SupabaseClient,
  entityType: InventoryEntityType,
  entityIds: string[],
  userId?: string | null,
): Promise<Map<string, string>> {
  const existing = await getActiveTokensForEntities(sb, entityType, entityIds);
  const result = new Map<string, string>();
  for (const [id, row] of existing) result.set(id, row.token);

  const missing = entityIds.filter((id) => !result.has(id));
  for (const entityId of missing) {
    const raced = await getActiveTokenForEntity(sb, entityType, entityId);
    if (raced) {
      result.set(entityId, raced.token);
      continue;
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
        })
        .select("token")
        .single();
      if (!error && data) {
        await writeInventoryLabelEvent(sb, {
          eventType: "QR_CREATED",
          entityType,
          entityId,
          userId,
          payload: { token },
        });
        result.set(entityId, String(data.token));
        break;
      }
      if (error?.code === "23505") {
        const again = await getActiveTokenForEntity(sb, entityType, entityId);
        if (again) {
          result.set(entityId, again.token);
          break;
        }
        continue;
      }
      if (error) throw new Error(error.message);
    }
  }
  return result;
}
