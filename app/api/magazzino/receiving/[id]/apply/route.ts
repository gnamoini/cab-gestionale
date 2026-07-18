import { NextResponse } from "next/server";
import {
  InventoryReceivingApplyError,
  applyInventoryReceivingDocument,
} from "@/lib/inventory-receiving/apply/inventory-receiving-apply-rpc.server";
import { buildApplyPayloadFromDecisions } from "@/lib/inventory-receiving/apply/build-apply-payload";
import { assertApplyAllowed } from "@/lib/import-processing/apply-lock";
import { fetchInventoryReceivingDocument } from "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server";
import { ddtReceivingConfirmReviewSchema } from "@/lib/inventory-receiving/extraction/ddt-extraction-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const canWrite = await verifyServerPageWrite("magazzino_carichi");
  if (!canWrite) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await fetchInventoryReceivingDocument(id);
  if (!existing?.document) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  try {
    assertApplyAllowed(existing.document.status);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Apply non consentito", code: "ALREADY_APPLIED" },
      { status: 409 },
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = ddtReceivingConfirmReviewSchema.safeParse(body);
  const decisions = parsed.success
    ? parsed.data.decisions
    : existing.lines
        .filter((l) => l.apply_status === "pending")
        .map((l) => ({
          lineId: l.id,
          action: (l.user_action as "add" | "create" | "skip") ?? (l.match_status === "NEW_ITEM" ? "create" : "add"),
          receivedQuantity: Number(l.received_quantity) || 0,
          finalItemId: l.matched_item_id ?? undefined,
          newItem:
            l.match_status === "NEW_ITEM"
              ? {
                  codice: l.raw_code?.trim() || `DDT-${l.line_index + 1}`,
                  nome: l.extracted_description,
                }
              : undefined,
        }));

  if (parsed.success) {
    await fetchInventoryReceivingDocument(id);
    const { confirmDdtReceivingReview } = await import(
      "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server"
    );
    await confirmDdtReceivingReview(id, parsed.data.decisions);
  }

  const lines = buildApplyPayloadFromDecisions(
    decisions.map((d) => ({
      lineId: d.lineId,
      action: d.action,
      finalQuantity: d.receivedQuantity,
      finalItemId: d.finalItemId,
      manualMatchItemId: "manualMatchItemId" in d ? d.manualMatchItemId : undefined,
      newItem: d.newItem,
    })),
  );

  try {
    const result = await applyInventoryReceivingDocument({
      documentId: id,
      lines,
      userId,
      documentNumber: existing.document.document_number,
      supplierLabel: existing.document.supplier_label,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof InventoryReceivingApplyError) {
      const status = e.code === "ALREADY_APPLIED" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Apply fallito";
    return NextResponse.json({ error: message, code: "APPLY_FAILED" }, { status: 400 });
  }
}
