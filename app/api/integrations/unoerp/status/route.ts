import { NextResponse } from "next/server";
import { listUnoerpLinkStatuses } from "@/lib/integrations/unoerp/status.server";
import type { CabDocumentType } from "@/lib/integrations/unoerp/types";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const canPrev = await verifyServerModuleCan("preventivi", "read");
  const canDdt = await verifyServerModuleCan("ddt", "read");
  if (!canPrev && !canDdt) return NextResponse.json({ error: "Permesso negato" }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "preventivo";
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (!["preventivo", "consuntivo", "ddt"].includes(type)) {
    return NextResponse.json({ error: "type non valido" }, { status: 400 });
  }
  const rows = await listUnoerpLinkStatuses(ids, type as CabDocumentType);
  return NextResponse.json({ rows });
}
