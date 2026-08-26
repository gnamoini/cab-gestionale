import { NextResponse } from "next/server";
import {
  buildNuovaLavorazioneWithMezzoTokenHref,
} from "@/lib/navigation/dashboard-log-links";
import { resolveMezzoQrToken } from "@/lib/mezzo-labels/domain/tokens.server";
import { writeMezzoQrScan } from "@/lib/mezzo-labels/audit/scans.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function errorRedirect(request: Request, reason: string): NextResponse {
  const url = new URL("/m/q/errore", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url, 302);
}

export async function GET(request: Request, context: RouteContext) {
  const { token: rawToken } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const resolved = await resolveMezzoQrToken(sb, rawToken);

  if (!resolved.ok) {
    if (resolved.code === "invalid_format") return errorRedirect(request, "invalid");
    if (resolved.code === "inactive") return errorRedirect(request, "inactive");
    return errorRedirect(request, "not_found");
  }

  const {
    data: { user },
  } = await sb.auth.getUser();

  void writeMezzoQrScan(sb, {
    tokenId: resolved.row.id,
    mezzoId: resolved.row.mezzo_id,
    userId: user?.id ?? null,
    device: request.headers.get("user-agent"),
    payload: { referrer: request.headers.get("referer") ?? null },
  });

  const target = new URL(
    buildNuovaLavorazioneWithMezzoTokenHref(resolved.row.token, "qr"),
    request.url,
  );
  return NextResponse.redirect(target, 302);
}
