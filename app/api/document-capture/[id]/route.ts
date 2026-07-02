import "server-only";

import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_capture")
    .select(
      "id, status, file_name, mime, sha256, document_category, scheda_tipo, finalized_at, duplicate_of, capture_version, lavorazione_id, mezzo_id, attrezzatura_id, uploaded_at, uploaded_by",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Capture non trovato" }, { status: 404 });
  }

  return NextResponse.json({ capture: data });
}

type PatchBody = {
  status?: string;
  documentCategory?: string;
  schedaTipo?: string | null;
  lavorazioneId?: string | null;
  mezzoId?: string | null;
  attrezzaturaId?: string | null;
  softDelete?: boolean;
  deletionReason?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await verifyServerModuleCan("document_capture", "write"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const { patchDocumentCaptureInTransaction } = await import(
    "@/lib/document-capture/patch-capture-transaction.server"
  );

  try {
    const result = await patchDocumentCaptureInTransaction({
      captureId: id,
      status: body.status ?? null,
      documentCategory: body.documentCategory ?? null,
      schedaTipo: body.schedaTipo ?? null,
      lavorazioneId: body.lavorazioneId ?? null,
      mezzoId: body.mezzoId ?? null,
      attrezzaturaId: body.attrezzaturaId ?? null,
      softDelete: body.softDelete ?? false,
      deletionReason: body.deletionReason ?? null,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Patch non riuscita";
    const status = message.includes("invalid_status") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
