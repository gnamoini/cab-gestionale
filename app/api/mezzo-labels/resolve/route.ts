import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/mezzo-labels/api-auth.server";
import { authorizeMezzoQrAccess } from "@/lib/mezzo-labels/qr/authorize-mezzo-qr-access.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Token mancante" }, { status: 400 });

  const authz = await authorizeMezzoQrAccess(auth.sb, token);
  if (!authz.ok) {
    if (authz.code === "forbidden") {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }
    const status = authz.reason === "invalid" ? 400 : authz.reason === "inactive" ? 410 : 404;
    return NextResponse.json({ error: "Token non valido", code: authz.reason }, { status });
  }

  return NextResponse.json({ mezzoId: authz.mezzoId, token: authz.token });
}
