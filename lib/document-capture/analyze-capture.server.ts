import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";
import { GeminiAnalyzeError } from "@/lib/document-capture/analyze-errors";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import {
  captureExtractionSchema,
  listCaptureExtractionFields,
  type CaptureExtractionResult,
} from "@/lib/document-capture/capture-extraction-schema";
import { buildGeminiCaptureDocumentPart } from "@/lib/document-capture/gemini-capture-content";
import { SCHEDA_OFFICINA_EXTRACTION_SYSTEM, SCHEDA_OFFICINA_EXTRACTION_USER } from "@/lib/document-capture/scheda-officina-extraction-prompt";
import { resolveGeminiAnalyzeRetryDelayMs } from "@/lib/ai/gemini-retry-after";
import { isTransientAnalyzeRetryError } from "@/lib/ai/gemini-analyze-retry-policy";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import {
  applyEntityResolutionToCaptureFields,
  mergeResolutionIntoFieldRows,
} from "@/lib/entity-resolution/server/apply-capture-resolution.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const RETRY_BACKOFF_MS = [1_000, 3_000] as const;

export type AnalyzeCaptureResult =
  | { ok: true; attemptId: string; extraction: CaptureExtractionResult; durationMs: number; fieldCount: number }
  | { ok: false; code: "not_configured" | "not_finalized" | "failed" | "no_fields"; message: string };

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeDocumentCapture(captureId: string): Promise<AnalyzeCaptureResult> {
  if (!(await aiService.getConfigurationStatus()).configured) {
    return { ok: false, code: "not_configured", message: aiErrorMessage("AI_CONFIG_MISSING") };
  }

  const sb = await createSupabaseServerUserClient();
  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime, document_category, status, capture_version")
    .eq("id", captureId)
    .maybeSingle();

  if (error || !capture?.finalized_at) {
    return { ok: false, code: "not_finalized", message: "Documento non finalizzato." };
  }

  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_started",
    idempotencyKey: `analyze_started:${capture.capture_version}`,
    payload: { captureVersion: capture.capture_version },
    newStatus: "analyzing",
  });

  const { data: fileData, error: dlError } = await sb.storage
    .from(STORAGE_BUCKETS.documentCapture)
    .download(capture.storage_path);
  if (dlError || !fileData) {
    const classified = classifyStorageDownloadError(
      dlError,
      Boolean(fileData),
      STORAGE_BUCKETS.documentCapture,
      "analisi documento",
    );
    await mutateCaptureWithEvent({
      captureId,
      eventType: "analyze_failed",
      idempotencyKey: `analyze_failed:download:${capture.capture_version}`,
      payload: { errorCode: classified.code, isPolicyError: classified.isPolicyError },
      newStatus: "failed",
    });
    return { ok: false, code: "failed", message: classified.message };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const mime = normalizeCaptureMime({
    mime: capture.mime ?? fileData.type,
    fileName: capture.storage_path.split("/").pop(),
    bytes,
  });
  const t0 = performance.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt += 1) {
    try {
      const aiResult = await aiService.analyzeDocument<CaptureExtractionResult>({
        schema: captureExtractionSchema,
        system: SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
        userContent: [
          {
            role: "user",
            content: [
              { type: "text", text: SCHEDA_OFFICINA_EXTRACTION_USER },
              buildGeminiCaptureDocumentPart(bytes, mime),
            ],
          },
        ],
        temperature: 0.2,
        timeoutMs: readRuntimeTimeoutMs(),
      });
      if (!aiResult.ok) throw new GeminiAnalyzeError(aiResult.code, aiResult.message);
      const object = aiResult.data.object;
      const usage = aiResult.data.usage;
      const response = aiResult.data.response;

      const durationMs = Math.round(performance.now() - t0);
      const { count } = await sb
        .from("document_capture_attempts")
        .select("id", { count: "exact", head: true })
        .eq("document_capture_id", captureId);

      const attemptNumber = (count ?? 0) + 1;
      const providerRequestId =
        response && typeof response === "object" && "id" in response
          ? String((response as { id?: string }).id ?? "")
          : null;

      const { data: attempt, error: insError } = await sb
        .from("document_capture_attempts")
        .insert({
          company_id: capture.company_id,
          document_capture_id: captureId,
          attempt_number: attemptNumber,
          provider: "google",
          model: "gemini",
          structured_response: object,
          status: "completed",
          input_tokens: usage?.inputTokens ?? null,
          output_tokens: usage?.outputTokens ?? null,
          total_tokens: usage?.totalTokens ?? null,
          duration_ms: durationMs,
          provider_request_id: providerRequestId,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insError || !attempt) {
        throw new Error(insError?.message ?? "Salvataggio attempt fallito.");
      }

      let fieldRows = listCaptureExtractionFields(object.fields).map((field) => ({
        company_id: capture.company_id,
        document_capture_id: captureId,
        attempt_id: attempt.id,
        field_key: field.key,
        raw_value: field.value,
        normalized_value: field.value,
        confidence: field.confidence,
        value_source: "ai" as const,
      }));

      let resolutionAudit: Awaited<ReturnType<typeof applyEntityResolutionToCaptureFields>>["audit"] | undefined;
      if (fieldRows.length > 0) {
        const resolution = await applyEntityResolutionToCaptureFields(sb, {
          companyId: capture.company_id,
          captureId,
          fields: fieldRows.map((f) => ({ field_key: f.field_key, raw_value: f.raw_value })),
        });
        resolutionAudit = resolution.audit;
        fieldRows = mergeResolutionIntoFieldRows(fieldRows, resolution);
        await sb.from("document_capture_fields").upsert(fieldRows, {
          onConflict: "document_capture_id,field_key",
        });
      }

      if (fieldRows.length === 0) {
        await mutateCaptureWithEvent({
          captureId,
          eventType: "analyze_failed",
          idempotencyKey: `analyze_failed:empty:${capture.capture_version}`,
          payload: { errorCode: "no_fields" },
          newStatus: "failed",
        });
        return {
          ok: false,
          code: "no_fields",
          message: "Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova.",
        };
      }

      await mutateCaptureWithEvent({
        captureId,
        eventType: "analyze_completed",
        idempotencyKey: `analyze_completed:${attempt.id}`,
        payload: {
          attemptId: attempt.id,
          durationMs,
          fieldCount: fieldRows.length,
          totalTokens: usage?.totalTokens ?? null,
          entityResolution: resolutionAudit,
        },
        newStatus: "review",
      });

      return { ok: true, attemptId: attempt.id, extraction: object, durationMs, fieldCount: fieldRows.length };
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_BACKOFF_MS.length && isTransientAnalyzeRetryError(e)) {
        await sleep(resolveGeminiAnalyzeRetryDelayMs(e, attempt, RETRY_BACKOFF_MS));
      } else {
        break;
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Analisi non riuscita.";
  await sb.from("document_capture_attempts").insert({
    company_id: capture.company_id,
    document_capture_id: captureId,
    attempt_number: 1,
    provider: "google",
    model: "gemini",
    status: "failed",
    error_code: "analyze_failed",
    completed_at: new Date().toISOString(),
  });

  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_failed",
    idempotencyKey: `analyze_failed:${capture.capture_version}`,
    payload: { errorCode: "analyze_failed", message },
    newStatus: "failed",
  });

  return { ok: false, code: "failed", message };
}
