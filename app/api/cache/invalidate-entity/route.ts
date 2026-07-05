import { isMicEntityType } from "@/lib/cache/mic-types";
import { runMicServerInvalidations } from "@/lib/cache/mic-server-invalidate.server";
import {
  readCorrelationIdFromRequest,
  traceRuntimeCoordinationServer,
} from "@/lib/observability/runtime-coordination-tracer.server";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pageForEntity(entityType: string): GestionalePageKey {
  switch (entityType) {
    case "lavorazione":
      return "lavorazioni";
    case "documento":
      return "documenti";
    case "mezzo":
      return "mezzi";
    case "report":
      return "report";
    case "settings":
    default:
      return "impostazioni";
  }
}

export async function POST(request: Request) {
  let body: { entityType?: string; entityId?: string };
  try {
    body = (await request.json()) as { entityType?: string; entityId?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const entityType = body.entityType?.trim() ?? "";
  const entityId = body.entityId?.trim() ?? "";
  if (!isMicEntityType(entityType)) {
    return NextResponse.json({ error: "entityType non valido" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId mancante" }, { status: 400 });
  }

  if (!(await verifyServerPageWrite(pageForEntity(entityType)))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const correlationId = readCorrelationIdFromRequest(request);

  try {
    const { pdfRemoved } = await runMicServerInvalidations(entityType, entityId, correlationId);
    traceRuntimeCoordinationServer({
      type: "asset_regenerated",
      correlationId,
      entityType,
      entityId,
      scope: "pdf",
      layer: "mic",
      meta: { pdfRemoved },
    });
    return NextResponse.json({ ok: true, pdfRemoved });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalidazione non riuscita";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
