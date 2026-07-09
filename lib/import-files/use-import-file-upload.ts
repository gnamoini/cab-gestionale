"use client";

import { useCallback, useState } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import type { ImportFileKind } from "@/lib/import-files/import-file-types";

export type ImportFileUploadPhase =
  | "idle"
  | "uploading"
  | "finalizing"
  | "success"
  | "error";

export type ImportFileUploadResult = {
  fileId: string;
  sha256?: string;
};

type UploadInput = {
  file: File;
  kind: ImportFileKind;
  importSessionId?: string;
};

export function useImportFileUpload() {
  const [phase, setPhase] = useState<ImportFileUploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setProgress(0);
  }, []);

  const upload = useCallback(async (input: UploadInput): Promise<ImportFileUploadResult | null> => {
    setPhase("uploading");
    setError(null);
    setProgress(0.1);

    try {
      const policyRes = await fetch("/api/import-files/upload-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: input.kind,
          fileName: input.file.name,
          expectedMime: input.file.type || "application/octet-stream",
          expectedSizeBytes: input.file.size,
          importSessionId: input.importSessionId,
        }),
      });
      const policy = (await policyRes.json().catch(() => ({}))) as {
        error?: string;
        fileId?: string;
        bucket?: string;
        path?: string;
      };
      if (!policyRes.ok || !policy.fileId || !policy.path) {
        throw new Error(policy.error ?? "Policy upload non riuscita.");
      }

      setProgress(0.4);
      const sb = getBrowserSupabase();
      const { error: uploadError } = await sb.storage
        .from(policy.bucket ?? STORAGE_BUCKETS.importSources)
        .upload(policy.path, input.file, {
          upsert: false,
          contentType: input.file.type || "application/octet-stream",
        });
      if (uploadError) throw new Error(uploadError.message);

      setPhase("finalizing");
      setProgress(0.7);

      const finalizeRes = await fetch(`/api/import-files/${policy.fileId}/finalize`, {
        method: "POST",
      });
      const finalizeBody = (await finalizeRes.json().catch(() => ({}))) as {
        error?: string;
        sha256?: string;
      };
      if (!finalizeRes.ok) {
        throw new Error(finalizeBody.error ?? "Finalizzazione import non riuscita.");
      }

      setPhase("success");
      setProgress(1);
      return { fileId: policy.fileId, sha256: finalizeBody.sha256 };
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Upload non riuscito.");
      return null;
    }
  }, []);

  return { phase, error, progress, upload, reset };
}
