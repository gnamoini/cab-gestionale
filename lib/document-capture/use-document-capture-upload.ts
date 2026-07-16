"use client";

import { useCallback, useState } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { mapDocumentCaptureUploadError } from "@/lib/document-capture/upload-error-message";
import { resolveCaptureMimeFromFile } from "@/lib/document-capture/capture-mime";

export type DocumentCaptureUploadPhase =
  | "idle"
  | "uploading"
  | "finalizing"
  | "success"
  | "error"
  | "duplicate";

export type DocumentCaptureUploadResult = {
  captureId: string;
  duplicateOf?: string | null;
};

type UploadInput = {
  file: File;
  source?: string;
  documentCategory?: string;
  schedaTipo?: string;
  lavorazioneId?: string;
};

export function useDocumentCaptureUpload() {
  const [phase, setPhase] = useState<DocumentCaptureUploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setProgress(0);
  }, []);

  const upload = useCallback(async (input: UploadInput): Promise<DocumentCaptureUploadResult | null> => {
    setPhase("uploading");
    setError(null);
    setProgress(0.1);

    try {
      const expectedMime = resolveCaptureMimeFromFile(input.file);
      const policyRes = await fetch("/api/document-capture/upload-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: input.file.name,
          expectedMime,
          expectedSizeBytes: input.file.size,
          source: input.source ?? "lavorazioni_drop",
          documentCategory: input.documentCategory ?? "scheda_officina",
          schedaTipo: input.schedaTipo,
          lavorazioneId: input.lavorazioneId,
        }),
      });

      if (!policyRes.ok) {
        const body = (await policyRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(mapDocumentCaptureUploadError(body.error ?? "Policy upload non riuscita"));
      }

      const policy = (await policyRes.json()) as {
        captureId: string;
        bucket: string;
        path: string;
      };

      setProgress(0.35);
      const sb = getBrowserSupabase();
      const contentType = expectedMime !== "application/octet-stream" ? expectedMime : input.file.type || undefined;
      const { error: storageError } = await sb.storage
        .from(policy.bucket ?? STORAGE_BUCKETS.documentCapture)
        .upload(policy.path, input.file, { upsert: false, contentType });

      if (storageError) {
        throw new Error(storageError.message);
      }

      setPhase("finalizing");
      setProgress(0.7);

      const finalizeRes = await fetch(`/api/document-capture/${policy.captureId}/finalize`, {
        method: "POST",
      });

      if (!finalizeRes.ok) {
        const body = (await finalizeRes.json().catch(() => ({}))) as { error?: string; code?: string };
        // #region agent log
        fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
          body: JSON.stringify({
            sessionId: "bd086a",
            hypothesisId: "CLIENT",
            location: "use-document-capture-upload.ts:finalize",
            message: "finalize response not ok",
            data: {
              status: finalizeRes.status,
              error: body.error ?? null,
              code: body.code ?? null,
              captureId: policy.captureId,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw new Error(mapDocumentCaptureUploadError(body.error ?? "Finalize non riuscito"));
      }

      const finalized = (await finalizeRes.json()) as {
        id: string;
        duplicateOf?: string | null;
      };

      const effectiveId = finalized.id ?? policy.captureId;

      setProgress(1);
      if (finalized.duplicateOf) {
        setPhase("duplicate");
      } else {
        setPhase("success");
      }

      return { captureId: effectiveId, duplicateOf: finalized.duplicateOf ?? null };
    } catch (e) {
      setPhase("error");
      const raw = e instanceof Error ? e.message : "Upload non riuscito";
      setError(mapDocumentCaptureUploadError(raw));
      return null;
    }
  }, []);

  return { phase, error, progress, upload, reset };
}
