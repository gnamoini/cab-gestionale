import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClientPortalMezzoQrHref } from "@/lib/lavorazioni/client-portal-access";
import { writeMezzoQrScan } from "@/lib/mezzo-labels/audit/scans.server";
import { authorizeMezzoQrAccess } from "@/lib/mezzo-labels/qr/authorize-mezzo-qr-access.server";
import { buildNuovaLavorazioneWithMezzoTokenHref } from "@/lib/navigation/dashboard-log-links";

export type MezzoQrDestination =
  | { kind: "redirect"; href: string }
  | { kind: "forbidden" }
  | { kind: "token_error"; reason: "invalid" | "inactive" | "not_found" };

export type ResolveMezzoQrDestinationInput = {
  device?: string | null;
  referrer?: string | null;
};

export async function resolveMezzoQrDestination(
  sb: SupabaseClient,
  rawToken: string,
  scanMeta?: ResolveMezzoQrDestinationInput,
): Promise<MezzoQrDestination> {
  const authz = await authorizeMezzoQrAccess(sb, rawToken);
  if (!authz.ok) {
    if (authz.code === "token_error") {
      return { kind: "token_error", reason: authz.reason };
    }
    return { kind: "forbidden" };
  }

  const {
    data: { user },
  } = await sb.auth.getUser();

  void writeMezzoQrScan(sb, {
    tokenId: authz.tokenId,
    mezzoId: authz.mezzoId,
    userId: user?.id ?? null,
    device: scanMeta?.device ?? null,
    payload: { referrer: scanMeta?.referrer ?? null },
  });

  const href =
    authz.audience === "cliente"
      ? buildClientPortalMezzoQrHref(authz.token)
      : buildNuovaLavorazioneWithMezzoTokenHref(authz.token, "qr");

  return { kind: "redirect", href };
}
