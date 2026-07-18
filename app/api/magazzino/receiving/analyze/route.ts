import { NextResponse } from "next/server";
import {
  DdtReceivingAnalyzeError,
  processDdtReceivingAnalyze,
} from "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server";
import { isDdtReceivingAiRateLimited } from "@/lib/inventory-receiving/ddt-receiving-rate-limit.server";
import { ddtReceivingAnalyzeRequestSchema } from "@/lib/inventory-receiving/extraction/ddt-extraction-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

function httpStatus(code: string): number {
  if (code === "NOT_CONFIGURED") return 503;
  if (code === "DUPLICATE_HASH" || code === "DUPLICATE_SEMANTIC") return 409;
  if (code === "PERMISSION_DENIED") return 403;
  return 400;
}

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("magazzino_carichi");
  if (!canWrite) {
    return NextResponse.json({ error: "Permesso negato", code: "PERMISSION_DENIED" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  if (await isDdtReceivingAiRateLimited(userId)) {
    return NextResponse.json({ error: "Troppe richieste IA. Attendi qualche minuto.", code: "RATE_LIMITED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = ddtReceivingAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  try {
    const result = await processDdtReceivingAnalyze(parsed.data.importFileId, userId, {
      skipHashDuplicate: parsed.data.skipHashDuplicate,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DdtReceivingAnalyzeError) {
      return NextResponse.json(
        { error: e.message, code: e.code, duplicateDocumentId: e.duplicateDocumentId },
        { status: httpStatus(e.code) },
      );
    }
    const message = e instanceof Error ? e.message : "Analisi non riuscita";
    return NextResponse.json({ error: message, code: "ANALYZE_FAILED" }, { status: 400 });
  }
}
