import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type WriteQrScanInput = {
  tokenId: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  device?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeInventoryQrScan(
  sb: SupabaseClient,
  input: WriteQrScanInput,
): Promise<void> {
  const { error } = await sb.from("inventory_qr_scans").insert({
    token_id: input.tokenId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    user_id: input.userId ?? null,
    device: input.device ?? null,
    payload: input.payload ?? {},
  });
  if (error) {
    console.error("[inventory-qr-scan] write failed", { message: error.message });
  }
}
