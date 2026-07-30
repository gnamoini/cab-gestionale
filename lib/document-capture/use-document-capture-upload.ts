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
  uploadDurationMs?: number;
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
      const uploadStartedAt = performance.now();
      const sb = getBrowserSupabase();
      const contentType = expectedMime !== "application/octet-stream" ? expectedMime : input.file.type || undefined;
      const { error: storageError } = await sb.storage
        .from(policy.bucket ?? STORAGE_BUCKETS.documentCapture)
        .upload(policy.path, input.file, { upsert: false, contentType });

      if (storageError) {
        throw new Error(storageError.message);
      }

      setPhase("success");
      setProgress(1);

      return {
        captureId: policy.captureId,
        duplicateOf: null,
        uploadDurationMs: Math.round(performance.now() - uploadStartedAt),
      };
    } catch (e) {
      setPhase("error");
      const raw = e instanceof Error ? e.message : "Upload non riuscito";
      setError(mapDocumentCaptureUploadError(raw));
      return null;
    }
  }, []);

  return { phase, error, progress, upload, reset };
}
