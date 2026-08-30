import { isClienteRole } from "@/lib/auth/rbac";
import { mezzoMatchesClienteRef } from "@/src/lib/auth/cliente-portal-scope";

export type AuthorizeMezzoQrAccessResult =
  | { ok: true; mezzoId: string; token: string; tokenId: string; audience: "cliente" | "operator" }
  | { ok: false; code: "token_error"; reason: "invalid" | "inactive" | "not_found" }
  | { ok: false; code: "forbidden" };

export type MezzoQrTokenContext = {
  mezzoId: string;
  token: string;
  tokenId: string;
};

export type MezzoQrAuthzContext = {
  roleKey: string | null;
  clienteRef: string | null;
  mezzo: { id: string; cliente: string } | null;
  canWriteLavorazioni: boolean;
};

/** SSOT regole cliente/staff — usata da route QR e API resolve. */
export function evaluateMezzoQrAuthorization(
  tokenCtx: MezzoQrTokenContext,
  authCtx: MezzoQrAuthzContext,
): AuthorizeMezzoQrAccessResult {
  const { mezzoId, token, tokenId } = tokenCtx;
  const { roleKey, clienteRef, mezzo, canWriteLavorazioni } = authCtx;

  if (isClienteRole(roleKey)) {
    if (
      !mezzo ||
      mezzo.id !== mezzoId ||
      !mezzoMatchesClienteRef(mezzo, clienteRef, { failClosedForClienteRole: true, role: roleKey })
    ) {
      return { ok: false, code: "forbidden" };
    }
    return { ok: true, mezzoId, token, tokenId, audience: "cliente" };
  }

  if (!canWriteLavorazioni) {
    return { ok: false, code: "forbidden" };
  }

  return { ok: true, mezzoId, token, tokenId, audience: "operator" };
}
