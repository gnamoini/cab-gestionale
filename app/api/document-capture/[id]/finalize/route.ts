import "server-only";

import { CompanyNotConfiguredError, getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import {
  finalizeDocumentCaptureInTransaction,
  finalizeStorageErrorToDocumentCaptureCode,
} from "@/lib/document-capture/finalize-transaction.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { NextResponse } from "next/server";

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

  const { data: capture, error: fetchError } = await sb
    .from("document_capture")
    .select("id, storage_path, status, finalized_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !capture) {
    traceDocumentCaptureOperation({
      operation: "finalize",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode: "UPLOAD_FAILED",
    });
    return NextResponse.json({ error: "Capture non trovato" }, { status: 404 });
  }

  try {
    const result = await finalizeDocumentCaptureInTransaction({
      captureId: capture.id,
      storagePath: capture.storage_path,
    });

    if (!result.ok) {
      const errorCode = finalizeStorageErrorToDocumentCaptureCode(result.code);
      traceDocumentCaptureOperation({
        operation: "finalize",
        captureId: id,
        userId,
        companyId,
        durationMs: Math.round(performance.now() - t0),
        outcome: "error",
        errorCode,
        storagePath: result.storagePath,
        bucket: result.bucket,
        storageErrorCode: result.code,
        isPolicyError: result.isPolicyError,
      });
      const status = result.isPolicyError || result.code === "STORAGE_PERMISSION_DENIED" ? 403 : 400;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    traceDocumentCaptureOperation({
      operation: "finalize",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
      storagePath: capture.storage_path,
    });
    return NextResponse.json(result);
  } catch (e) {
    const errorCode = e instanceof CompanyNotConfiguredError ? "TENANT_MISSING" : "UPLOAD_FAILED";
    traceDocumentCaptureOperation({
      operation: "finalize",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode,
      storagePath: capture.storage_path,
    });
    if (e instanceof CompanyNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: "TENANT_MISSING" }, { status: 403 });
    }
    const code = (e as Error & { code?: string }).code;
    if (code === "invalid_status_transition") {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Transizione non valida" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Finalize non riuscito";
    const status = message.includes("Permesso") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
