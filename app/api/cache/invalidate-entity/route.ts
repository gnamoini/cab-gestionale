import { isMicEntityType } from "@/lib/cache/mic-types";
import { runMicServerInvalidations } from "@/lib/cache/mic-server-invalidate.server";
import {
  readCorrelationIdFromRequest,
  traceRuntimeCoordinationServer,
} from "@/lib/observability/runtime-coordination-tracer.server";
import type { PermissionKey } from "@/lib/auth/rbac";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function permissionForEntity(entityType: string): PermissionKey {
  switch (entityType) {
    case "lavorazione":
      return "editWorkOrders";
    case "documento":
      return "uploadDocuments";
    case "mezzo":
      return "editVehicles";
    case "report":
    case "settings":
    default:
      return "manageSettings";
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

  if (!(await verifyServerPermission(permissionForEntity(entityType)))) {
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
