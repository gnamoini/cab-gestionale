import { NextResponse } from "next/server";
import {
  loadDocumentModel,
  patchDocumentModelFields,
  type DocumentModelFieldPatch,
} from "@/lib/document-capture/document-model-service.server";
import { isDocumentCaptureV41Enabled } from "@/lib/document-capture/document-capture-v41.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { projectDocumentModelToFlatFields } from "@/lib/document-capture/projection/document-model-flat-projection";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

  return NextResponse.json({
    document,
    flatProjection: projectDocumentModelToFlatFields(document),
  });
}

type PatchBody = {
  patches?: DocumentModelFieldPatch[];
};

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

  if (!isDocumentCaptureV41Enabled()) {
    return NextResponse.json({ error: "Pipeline v4.1 non abilitata", code: "V41_DISABLED" }, { status: 404 });
  }

  const { id } = await context.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const sb = await createSupabaseServerUserClient();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const companyId = await getCompanyIdForUserOrNull();
  const t0 = performance.now();

  try {
    const document = await patchDocumentModelFields({
      captureId: id,
      userId,
      patches: body.patches ?? [],
    });
    traceDocumentCaptureOperation({
      operation: "document-model",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
    });
    return NextResponse.json({ document });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Patch fallita" },
      { status: 400 },
    );
  }
}
