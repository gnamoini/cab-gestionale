import { NextResponse } from "next/server";
import { enqueueUnoerpSyncJob } from "@/lib/integrations/unoerp/enqueue.server";
import type { CabDocumentType, UnoerpJobOperation } from "@/lib/integrations/unoerp/types";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

const TYPES = new Set(["preventivo", "consuntivo", "ddt"]);
const OPS = new Set(["CREATE", "UPDATE"]);

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canPrev = await verifyServerModuleCan("preventivi", "write");
  const canDdt = await verifyServerModuleCan("ddt", "write");
  if (!canPrev && !canDdt) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const type = String(b.cabDocumentType ?? "");
  const op = String(b.operation ?? "");
  const id = String(b.cabDocumentId ?? "");
  const sourceVersion = Number(b.sourceVersion);
  const payloadHash = String(b.payloadHash ?? "");
  if (!TYPES.has(type) || !OPS.has(op) || !id || !Number.isFinite(sourceVersion) || payloadHash.length < 2) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }
  if (type === "ddt" && !canDdt && !canPrev) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const result = await enqueueUnoerpSyncJob({
    cabDocumentType: type as CabDocumentType,
    cabDocumentId: id,
    sourceVersion,
    payloadHash,
    operation: op as UnoerpJobOperation,
    payloadSnapshot: typeof b.payloadSnapshot === "object" && b.payloadSnapshot ? (b.payloadSnapshot as Record<string, unknown>) : {},
    actorId: session.user.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, jobId: result.jobId, syncRunId: result.syncRunId });
}
