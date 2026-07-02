import "server-only";

import { CompanyNotConfiguredError } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { checkDocumentCaptureRateLimit } from "@/lib/document-capture/document-capture-rate-limit.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import {
  DOCUMENT_CAPTURE_MAX_BYTES,
  isAllowedCaptureMime,
} from "@/lib/document-capture/mime-allowlist";
import { createDocumentCaptureUploadPolicy } from "@/lib/document-capture/upload-policy.server";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UploadPolicyBody = {
  fileName?: string;
  expectedMime?: string;
  expectedSizeBytes?: number;
  source?: string;
  documentCategory?: string;
  schedaTipo?: string;
  lavorazioneId?: string;
};

export async function POST(request: Request) {
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

  let body: UploadPolicyBody;
  try {
    body = (await request.json()) as UploadPolicyBody;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const fileName = body.fileName?.trim() ?? "";
  const expectedMime = body.expectedMime?.trim().toLowerCase() ?? "";
  const expectedSizeBytes = Number(body.expectedSizeBytes ?? 0);
  const source = body.source?.trim() ?? "lavorazioni_drop";

  if (!fileName) {
    return NextResponse.json({ error: "fileName richiesto" }, { status: 400 });
  }
  if (!isAllowedCaptureMime(expectedMime)) {
    return NextResponse.json({ error: "MIME non consentito" }, { status: 400 });
  }
  if (!Number.isFinite(expectedSizeBytes) || expectedSizeBytes <= 0) {
    return NextResponse.json({ error: "expectedSizeBytes non valido" }, { status: 400 });
  }
  if (expectedSizeBytes > DOCUMENT_CAPTURE_MAX_BYTES) {
    return NextResponse.json({ error: "File troppo grande" }, { status: 400 });
  }

  const sb = await createSupabaseServerUserClient();
  const { data: userData } = await sb.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non autenticato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const t0 = performance.now();
  const companyId = await getCompanyIdForUserOrNull();

  const rate = await checkDocumentCaptureRateLimit(userId, "upload_policy");
  if (!rate.ok) {
    traceDocumentCaptureOperation({
      operation: "upload-policy",
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode: "RATE_LIMITED",
    });
    return NextResponse.json(
      { error: "Troppi upload, riprova tra poco", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const policy = await createDocumentCaptureUploadPolicy({
      fileName,
      expectedMime,
      expectedSizeBytes,
      source,
      documentCategory: body.documentCategory,
      schedaTipo: body.schedaTipo ?? null,
      lavorazioneId: body.lavorazioneId ?? null,
    });
    traceDocumentCaptureOperation({
      operation: "upload-policy",
      captureId: policy.captureId,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
    });
    return NextResponse.json(policy);
  } catch (e) {
    traceDocumentCaptureOperation({
      operation: "upload-policy",
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode: e instanceof CompanyNotConfiguredError ? "TENANT_MISSING" : "UPLOAD_FAILED",
    });
    if (e instanceof CompanyNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: "TENANT_MISSING" }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : "Errore policy upload";
    return NextResponse.json({ error: message, code: "UPLOAD_FAILED" }, { status: 400 });
  }
}
