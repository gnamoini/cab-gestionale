import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isClienteRole } from "@/lib/auth/rbac";
import { resolveMezzoQrToken } from "@/lib/mezzo-labels/domain/tokens.server";
import {
  evaluateMezzoQrAuthorization,
  type AuthorizeMezzoQrAccessResult,
  type MezzoQrTokenContext,
} from "@/lib/mezzo-labels/qr/authorize-mezzo-qr-access";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export type { AuthorizeMezzoQrAccessResult, MezzoQrAuthzContext, MezzoQrTokenContext } from "@/lib/mezzo-labels/qr/authorize-mezzo-qr-access";
export { evaluateMezzoQrAuthorization } from "@/lib/mezzo-labels/qr/authorize-mezzo-qr-access";

export async function authorizeMezzoQrAccess(
  sb: SupabaseClient,
  rawToken: string,
): Promise<AuthorizeMezzoQrAccessResult> {
  const resolved = await resolveMezzoQrToken(sb, rawToken);
  if (!resolved.ok) {
    const reason =
      resolved.code === "invalid_format"
        ? "invalid"
        : resolved.code === "inactive"
          ? "inactive"
          : "not_found";
    return { ok: false, code: "token_error", reason };
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return { ok: false, code: "forbidden" };
  }

  const { data: prof, error: profErr } = await sb
    .from("profiles")
    .select("role_key, cliente_ref")
    .eq("id", user.id)
    .maybeSingle();
  if (profErr) throw new Error(profErr.message);

  const roleKey = prof?.role_key ?? null;
  const clienteRef = prof?.cliente_ref ?? null;
  const tokenCtx: MezzoQrTokenContext = {
    mezzoId: resolved.row.mezzo_id,
    token: resolved.row.token,
    tokenId: resolved.row.id,
  };

  let mezzo: { id: string; cliente: string } | null = null;
  if (isClienteRole(roleKey)) {
    const { data, error: mezzoErr } = await sb
      .from("mezzi")
      .select("id, cliente")
      .eq("id", tokenCtx.mezzoId)
      .maybeSingle();
    if (mezzoErr) throw new Error(mezzoErr.message);
    mezzo = data;
  }

  const canWriteLavorazioni = isClienteRole(roleKey) ? false : await verifyServerPageWrite("lavorazioni");

  return evaluateMezzoQrAuthorization(tokenCtx, {
    roleKey,
    clienteRef,
    mezzo,
    canWriteLavorazioni,
  });
}
