import "server-only";

import { fetchDocumentCaptureEvents } from "@/lib/document-capture/document-capture-events.server";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write", { editWorkOrders: true });
  if (authError) return authError;

  const { id } = await context.params;
  let body: {
    eventType?: string;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  if (body.eventType !== "duplicate_override") {
    return NextResponse.json({ error: "eventType non supportato" }, { status: 400 });
  }
  const reason = typeof body.payload?.reason === "string" ? body.payload.reason.trim() : "";
  if (reason.length < 8) {
    return NextResponse.json({ error: "Motivazione obbligatoria (min 8 caratteri)" }, { status: 400 });
  }

  try {
    await mutateCaptureWithEvent({
      captureId: id,
      eventType: "duplicate_override",
      idempotencyKey: body.idempotencyKey,
      payload: {
        reason,
        duplicateOf: body.payload?.duplicateOf ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Evento non registrato" },
      { status: 400 },
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const events = await fetchDocumentCaptureEvents(id);
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore timeline" },
      { status: 400 },
    );
  }
}
