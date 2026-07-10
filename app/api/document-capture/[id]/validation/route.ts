import { NextResponse } from "next/server";
import { loadDocumentModel } from "@/lib/document-capture/document-model-service.server";
import { isDocumentCaptureV41Enabled } from "@/lib/document-capture/document-capture-v41.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { runSchedaPipelineViews } from "@/lib/document-capture/registry/scheda-officina-plugin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** WIZ-01: vista read-only ValidationResult — non persistita. */
export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("read");
  if (authError) return authError;

  if (!isDocumentCaptureV41Enabled()) {
    return NextResponse.json({ error: "Pipeline v4.1 non abilitata", code: "V41_DISABLED" }, { status: 404 });
  }

  const { id } = await context.params;
  const document = await loadDocumentModel(id);
  if (!document) {
    return NextResponse.json({ error: "DocumentModel non presente" }, { status: 404 });
  }

  const { validation } = runSchedaPipelineViews(document);
  return NextResponse.json({ validation });
}
