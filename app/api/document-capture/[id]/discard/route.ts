import "server-only";

import { discardEphemeralDocumentCapture } from "@/lib/document-capture/discard-ephemeral-capture.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

  const { id } = await context.params;

  try {
    const result = await discardEphemeralDocumentCapture(id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Eliminazione non riuscita";
    const status = message.includes("Permesso") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
