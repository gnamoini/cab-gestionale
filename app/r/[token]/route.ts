import { NextResponse } from "next/server";
import { buildMagazzinoOpenRicambioHref } from "@/lib/navigation/dashboard-log-links";
import { INVENTORY_ENTITY_MAGAZZINO_RICAMBIO } from "@/lib/inventory-labels/domain/types";
import { resolveQrTokenForRedirect } from "@/lib/inventory-labels/qr/resolver";
import { writeInventoryQrScan } from "@/lib/inventory-labels/audit/scans.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function errorRedirect(request: Request, reason: string): NextResponse {
  const url = new URL("/r/errore", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url, 302);
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const resolved = await resolveQrTokenForRedirect(token);
  if (!resolved.ok) {
    if (resolved.code === "invalid_format") {
      return errorRedirect(request, "invalid");
    }
    if (resolved.code === "inactive") {
      return errorRedirect(request, "inactive");
    }
    return errorRedirect(request, "not_found");
  }

  const canRead = await verifyServerPageRead("magazzino");
  if (!canRead) {
    return errorRedirect(request, "forbidden");
  }

  if (resolved.entityType !== INVENTORY_ENTITY_MAGAZZINO_RICAMBIO) {
    return errorRedirect(request, "invalid");
  }

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  void writeInventoryQrScan(sb, {
    tokenId: resolved.tokenId,
    entityType: resolved.entityType,
    entityId: resolved.entityId,
    userId: user?.id ?? null,
    device: request.headers.get("user-agent"),
    payload: { referrer: request.headers.get("referer") ?? null },
  });

  const target = new URL(buildMagazzinoOpenRicambioHref(resolved.entityId, "qr"), request.url);
  return NextResponse.redirect(target, 302);
}
