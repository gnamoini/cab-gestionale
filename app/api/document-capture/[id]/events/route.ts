import "server-only";

import { fetchDocumentCaptureEvents } from "@/lib/document-capture/document-capture-events.server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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
