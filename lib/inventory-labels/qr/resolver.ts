import "server-only";

import { resolveInventoryToken, type ResolveTokenResult } from "@/lib/inventory-labels/domain/tokens.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type QrResolveOutcome =
  | { ok: true; entityType: string; entityId: string; tokenId: string }
  | { ok: false; code: Extract<ResolveTokenResult, { ok: false }>["code"]; status?: string };

export async function resolveQrTokenForRedirect(rawToken: string): Promise<QrResolveOutcome> {
  const sb = await createSupabaseServerUserClient();
  const result = await resolveInventoryToken(sb, rawToken);
  if (!result.ok) {
    return { ok: false, code: result.code, status: result.status };
  }
  return {
    ok: true,
    entityType: result.row.entity_type,
    entityId: result.row.entity_id,
    tokenId: result.row.id,
  };
}
