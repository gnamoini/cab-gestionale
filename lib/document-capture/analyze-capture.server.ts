import "server-only";

import { generateObject } from "ai";
import { getGeminiReportModel, isGeminiConfigured } from "@/lib/ai/gemini-client";
import {
  captureExtractionSchema,
  type CaptureExtractionResult,
} from "@/lib/document-capture/capture-extraction-schema";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const SYSTEM = `Estrai campi da schede officina meccanica (ingresso, lavorazioni, ricambi).
Per ogni campo restituisci value e confidence 0-1. Se incerto, confidence bassa.`;

const RETRY_BACKOFF_MS = [1_000, 3_000] as const;

export type AnalyzeCaptureResult =
  | { ok: true; attemptId: string; extraction: CaptureExtractionResult; durationMs: number }
  | { ok: false; code: "not_configured" | "not_finalized" | "failed"; message: string };

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeDocumentCapture(captureId: string): Promise<AnalyzeCaptureResult> {
  const model = getGeminiReportModel();
  if (!model || !isGeminiConfigured()) {
    return { ok: false, code: "not_configured", message: "Servizio IA non configurato." };
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
    .from("document-capture")
    .download(capture.storage_path);
  if (dlError || !fileData) {
    await mutateCaptureWithEvent({
      captureId,
      eventType: "analyze_failed",
      idempotencyKey: `analyze_failed:download:${capture.capture_version}`,
      payload: { errorCode: "download_failed" },
      newStatus: "failed",
    });
    return { ok: false, code: "failed", message: "File non disponibile." };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const mime = capture.mime ?? fileData.type ?? "application/pdf";
  const t0 = performance.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt += 1) {
    try {
      const { object, usage, response } = await generateObject({
        model,
        schema: captureExtractionSchema,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Estrai campi scheda officina con confidence per campo." },
              { type: "file", data: Buffer.from(bytes), mediaType: mime },
            ],
          },
        ],
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(90_000),
      });

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

      const fieldRows = Object.entries(object.fields).map(([fieldKey, field]) => ({
        company_id: capture.company_id,
        document_capture_id: captureId,
        attempt_id: attempt.id,
        field_key: fieldKey,
        raw_value: field.value,
        normalized_value: field.value,
        confidence: field.confidence,
        value_source: "ai" as const,
      }));

      if (fieldRows.length > 0) {
        await sb.from("document_capture_fields").upsert(fieldRows, {
          onConflict: "document_capture_id,field_key",
        });
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
        },
        newStatus: "review",
      });

      return { ok: true, attemptId: attempt.id, extraction: object, durationMs };
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_BACKOFF_MS.length) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 1_000);
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
