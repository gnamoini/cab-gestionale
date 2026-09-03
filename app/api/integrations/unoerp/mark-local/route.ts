import { NextResponse } from "next/server";
import { markLocalUnoerpEvent } from "@/lib/integrations/unoerp/enqueue.server";
import type { CabDocumentType } from "@/lib/integrations/unoerp/types";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const canPrev = await verifyServerModuleCan("preventivi", "write");
  const canDdt = await verifyServerModuleCan("ddt", "write");
  if (!canPrev && !canDdt) return NextResponse.json({ error: "Permesso negato" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const type = String(b.cabDocumentType ?? "");
  const id = String(b.cabDocumentId ?? "");
  const status = String(b.status ?? "");
  if (
    !["preventivo", "consuntivo", "ddt"].includes(type) ||
    !id ||
    !["CAB_DDT_CANCELLED_AFTER_SYNC", "CAB_DOCUMENT_REMOVED"].includes(status)
  ) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }
  await markLocalUnoerpEvent({
    cabDocumentType: type as CabDocumentType,
    cabDocumentId: id,
    status: status as "CAB_DDT_CANCELLED_AFTER_SYNC" | "CAB_DOCUMENT_REMOVED",
  });
  return NextResponse.json({ ok: true });
}
