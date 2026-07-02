import { NextResponse } from "next/server";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { hashCaptureFieldsRows } from "@/lib/document-capture/capture-apply-plan";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("read");
  if (authError) return authError;

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_capture_fields")
    .select("*")
    .eq("document_capture_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ fields: data ?? [] });
}

type PatchBody = {
  fields?: Array<{ fieldKey: string; confirmedValue: string | null; valueSource?: "manual" | "existing" }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

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
  const companyId = await getCompanyIdForUserOrNull();
  const t0 = performance.now();

  const { data: capture } = await sb
    .from("document_capture")
    .select("company_id, capture_version")
    .eq("id", id)
    .maybeSingle();
  if (!capture?.company_id) {
    return NextResponse.json({ error: "Capture non trovato" }, { status: 404 });
  }

  for (const field of body.fields ?? []) {
    await sb.from("document_capture_fields").upsert(
      {
        company_id: capture.company_id,
        document_capture_id: id,
        field_key: field.fieldKey,
        confirmed_value: field.confirmedValue,
        value_source: field.valueSource ?? "manual",
        confirmed_at: new Date().toISOString(),
        confirmed_by: userId,
      },
      { onConflict: "document_capture_id,field_key" },
    );
  }

  if ((body.fields?.length ?? 0) > 0) {
    const fieldsHash = hashCaptureFieldsRows(
      (body.fields ?? []).map((f) => ({
        field_key: f.fieldKey,
        confirmed_value: f.confirmedValue,
        normalized_value: f.confirmedValue,
      })),
    );
    await mutateCaptureWithEvent({
      captureId: id,
      eventType: "fields_confirmed",
      idempotencyKey: `fields_confirmed:${capture.capture_version}:${fieldsHash}`,
      payload: { fieldCount: body.fields?.length ?? 0, fieldsHash },
    });
  }

  traceDocumentCaptureOperation({
    operation: "fields",
    captureId: id,
    userId,
    companyId,
    durationMs: Math.round(performance.now() - t0),
    outcome: "ok",
  });

  return NextResponse.json({ ok: true });
}
