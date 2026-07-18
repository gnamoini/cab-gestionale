import { NextResponse } from "next/server";
import { dryRunInventoryReceivingApply } from "@/lib/document-capture/apply/adapters/inventory-receiving-apply-adapter";
import { fetchInventoryReceivingDocument } from "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server";
import {
  defaultLineActionWithGate,
  inferMatchMethod,
} from "@/lib/inventory-receiving/matching/confidence-gate";
import type { InventoryLineDecision } from "@/lib/inventory-receiving/inventory-receiving-import-client";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function buildDecisionsFromDocument(
  lines: NonNullable<Awaited<ReturnType<typeof fetchInventoryReceivingDocument>>>["lines"],
  matches?: unknown,
): Record<string, InventoryLineDecision> {
  const out: Record<string, InventoryLineDecision> = {};
  for (const line of lines) {
    const method = inferMatchMethod({ matchStatus: line.match_status, matchConfidence: line.match_confidence });
    const action = line.user_action ?? defaultLineActionWithGate(line.match_status, line.match_confidence, method);
    out[line.id] = {
      action: action as InventoryLineDecision["action"],
      manualMatchItemId: line.matched_item_id ?? undefined,
      newItemCodice: line.raw_code?.trim() || undefined,
      newItemNome: line.extracted_description,
    };
  }
  void matches;
  return out;
}

export async function POST(_request: Request, context: RouteContext) {
  const canRead = await verifyServerPageRead("magazzino_carichi");
  if (!canRead) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await fetchInventoryReceivingDocument(id);
  if (!existing?.document) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  const lineDecisions = buildDecisionsFromDocument(existing.lines);
  const result = dryRunInventoryReceivingApply({
    documentId: id,
    lines: existing.lines,
    lineDecisions,
    candidatesByLineId: {},
  });

  return NextResponse.json(result);
}
