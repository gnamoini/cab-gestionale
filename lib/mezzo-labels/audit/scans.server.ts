import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type WriteMezzoQrScanInput = {
  tokenId: string;
  mezzoId: string;
  userId?: string | null;
  device?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeMezzoQrScan(
  sb: SupabaseClient,
  input: WriteMezzoQrScanInput,
): Promise<void> {
  const { error } = await sb.from("mezzo_qr_scans").insert({
    token_id: input.tokenId,
    mezzo_id: input.mezzoId,
    user_id: input.userId ?? null,
    device: input.device ?? null,
    payload: input.payload ?? {},
  });
  if (error) {
    console.error("[mezzo-qr-scan] write failed", { message: error.message });
  }
}
