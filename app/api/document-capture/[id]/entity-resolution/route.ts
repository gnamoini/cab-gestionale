import { NextResponse } from "next/server";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { bindingForFieldKey } from "@/lib/entity-resolution/capture-field-entity-registry";
import { recordKnownCorrectionServer } from "@/lib/entity-resolution/server/persist-resolution.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  picks?: Array<{
    fieldKey: string;
    label: string;
    id?: string | null;
    original: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

  const { id: captureId } = await context.params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const picks = body.picks ?? [];
  if (picks.length === 0) {
    return NextResponse.json({ error: "Nessuna selezione" }, { status: 400 });
  }

  const sb = await createSupabaseServerUserClient();
  const companyId = await getCompanyIdForUserOrNull();
  if (!companyId) return NextResponse.json({ error: "Company non trovata" }, { status: 400 });
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id ?? null;

  for (const pick of picks) {
    if (!pick.label?.trim() || pick.label === pick.original) continue;
    const binding = bindingForFieldKey(pick.fieldKey);
    if (!binding) continue;
    await recordKnownCorrectionServer(sb, companyId, userId, {
      entityType: binding.entityType,
      ocrValue: pick.original,
      resolvedLabel: pick.label,
      resolvedId: pick.id ?? null,
      source: "ambiguity_pick",
    });
    await sb
      .from("document_capture_fields")
      .update({
        confirmed_value: pick.label,
        normalized_value: pick.label,
        value_source: "existing",
        confirmed_at: new Date().toISOString(),
        confirmed_by: userId,
      })
      .eq("document_capture_id", captureId)
      .eq("field_key", pick.fieldKey);
  }

  await mutateCaptureWithEvent({
    captureId,
    eventType: "entity_resolution_confirmed",
    idempotencyKey: `entity_resolution_confirmed:${captureId}:${Date.now()}`,
    payload: { picks },
  });

  return NextResponse.json({ ok: true });
}
