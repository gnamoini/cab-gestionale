"use client";

import { useCallback, useState } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

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
      const policyRes = await fetch("/api/document-capture/upload-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: input.file.name,
          expectedMime: input.file.type || "application/octet-stream",
          expectedSizeBytes: input.file.size,
          source: input.source ?? "lavorazioni_drop",
          documentCategory: input.documentCategory ?? "scheda_officina",
          schedaTipo: input.schedaTipo,
          lavorazioneId: input.lavorazioneId,
        }),
      });

      if (!policyRes.ok) {
        const body = (await policyRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Policy upload non riuscita");
      }

      const policy = (await policyRes.json()) as {
        captureId: string;
        bucket: string;
        path: string;
      };

      setProgress(0.35);
      const sb = getBrowserSupabase();
      const { error: storageError } = await sb.storage
        .from(policy.bucket ?? STORAGE_BUCKETS.documentCapture)
        .upload(policy.path, input.file, { upsert: false, contentType: input.file.type });

      if (storageError) {
        throw new Error(storageError.message);
      }

      setPhase("finalizing");
      setProgress(0.7);

      const finalizeRes = await fetch(`/api/document-capture/${policy.captureId}/finalize`, {
        method: "POST",
      });

      if (!finalizeRes.ok) {
        const body = (await finalizeRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Finalize non riuscito");
      }

      const finalized = (await finalizeRes.json()) as {
        id: string;
        duplicateOf?: string | null;
      };

      setProgress(1);
      if (finalized.duplicateOf) {
        setPhase("duplicate");
      } else {
        setPhase("success");
      }

      return { captureId: finalized.id ?? policy.captureId, duplicateOf: finalized.duplicateOf ?? null };
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Upload non riuscito");
      return null;
    }
  }, []);

  return { phase, error, progress, upload, reset };
}
