import { NextResponse } from "next/server";
import { enqueueUnoerpSyncJob } from "@/lib/integrations/unoerp/enqueue.server";
import type { CabDocumentType } from "@/lib/integrations/unoerp/types";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createUnoerpAdminClient } from "@/lib/integrations/unoerp/admin-client.server";

export const runtime = "nodejs";

/** Risincronizza: solo UPDATE se mapping esiste. Mai CREATE per correggere errori. */
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
  if (!["preventivo", "consuntivo", "ddt"].includes(type) || !id) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const client = createUnoerpAdminClient();
  const { data: link } = await client
    .from("unoerp_document_links")
    .select("cab_document_id, last_synced_source_version, last_synced_hash")
    .eq("cab_document_id", id)
    .eq("cab_document_type", type)
    .maybeSingle();
  if (!link) {
    return NextResponse.json({ error: "Mapping assente: UPDATE non consentito" }, { status: 409 });
  }
  const sourceVersion = Date.now();
  const result = await enqueueUnoerpSyncJob({
    cabDocumentType: type as CabDocumentType,
    cabDocumentId: id,
    sourceVersion,
    payloadHash: `resync-${sourceVersion}`,
    operation: "UPDATE",
    payloadSnapshot: { resync: true },
    actorId: session.user.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, syncRunId: result.syncRunId });
}
