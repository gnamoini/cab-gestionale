import { NextResponse } from "next/server";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import { inferCaptureSchedaTipo } from "@/lib/document-capture/capture-field-mapper";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { upsertCaptureSignatureFields } from "@/lib/document-capture/upsert-capture-signature-fields.server";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const userId = (await sb.auth.getUser()).data.user?.id;
  const companyId = await getCompanyIdForUserOrNull();
  const t0 = performance.now();

  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime")
    .eq("id", id)
    .maybeSingle();

  if (error || !capture?.company_id || !capture.finalized_at) {
    return NextResponse.json({ error: "Capture non trovato o non finalizzato" }, { status: 404 });
  }

  const { data: fileData, error: dlError } = await sb.storage
    .from(STORAGE_BUCKETS.documentCapture)
    .download(capture.storage_path);
  if (dlError || !fileData) {
    const classified = classifyStorageDownloadError(
      dlError,
      Boolean(fileData),
      STORAGE_BUCKETS.documentCapture,
      "estrazione firme",
    );
    return NextResponse.json({ error: classified.message, code: classified.code }, { status: 400 });
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const mime = normalizeCaptureMime({
    mime: capture.mime ?? fileData.type,
    fileName: capture.storage_path.split("/").pop(),
    bytes,
  });

  const { data: existingFields } = await sb
    .from("document_capture_fields")
    .select("field_key")
    .eq("document_capture_id", id);
  const existingFieldKeys = (existingFields ?? []).map((row) => row.field_key);

  const { data: attempt } = await sb
    .from("document_capture_attempts")
    .select("id")
    .eq("document_capture_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt?.id) {
    return NextResponse.json({ error: "Nessun tentativo di analisi per questa cattura" }, { status: 422 });
  }

  const schedaTipo = inferCaptureSchedaTipo(
    existingFieldKeys.map((field_key) => ({ field_key, normalized_value: "", confirmed_value: null })),
  );

  const signatureRows = await upsertCaptureSignatureFields(sb, {
    companyId: capture.company_id,
    captureId: id,
    attemptId: attempt.id,
    bytes,
    mime,
    schedaTipo,
    existingFieldKeys,
  });

  traceDocumentCaptureOperation({
    operation: "extract_signatures",
    captureId: id,
    userId,
    companyId,
    durationMs: Math.round(performance.now() - t0),
    outcome: signatureRows.length > 0 ? "ok" : "error",
    errorCode: signatureRows.length > 0 ? undefined : "NO_SIGNATURES",
  });

  return NextResponse.json({
    fields: signatureRows.map((row) => ({
      field_key: row.field_key,
      raw_value: row.raw_value,
      normalized_value: row.normalized_value,
      confirmed_value: row.raw_value,
      confidence: row.confidence,
    })),
  });
}
