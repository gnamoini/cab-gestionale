import { NextResponse } from "next/server";
import { resolveMezzoQrDestination } from "@/lib/mezzo-labels/qr/resolve-destination.server";
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
  const destination = await resolveMezzoQrDestination(sb, rawToken, {
    device: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
  });

  if (destination.kind === "token_error") {
    return errorRedirect(request, destination.reason);
  }
  if (destination.kind === "forbidden") {
    return errorRedirect(request, "forbidden");
  }

  const target = new URL(destination.href, request.url);
  return NextResponse.redirect(target, 302);
}
