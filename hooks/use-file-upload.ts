"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadFeedback } from "@/context/upload-feedback-context";
import { UPLOAD_SUCCESS_VISIBLE_MS } from "@/lib/upload/upload-feedback-messages";
import type { TrackUploadParams, UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";

export type UseFileUploadOptions<T> = Omit<TrackUploadParams<T>, "file"> & {
  /** Disabilita toast successo globale (es. se il chiamante mostra già un messaggio). */
  successToast?: string | false;
  /** Avvia upload subito dopo la selezione (default true). */
  autoUploadOnSelect?: boolean;
};

export type UseFileUploadResult<T> = {
  phase: UploadFeedbackPhase;
  file: File | null;
  error: string | null;
  isUploading: boolean;
  isBusy: boolean;
  canSelect: boolean;
  selectFile: (file: File | null) => void;
  upload: (file?: File) => Promise<{ ok: true; data: T } | { ok: false; error: string } | { ok: false; error: "no_file" }>;
  retry: () => void;
  reset: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Hook locale per input file + stato UX unificato.
 * Registra il caricamento nel provider globale (`trackUpload`).
 */
export function useFileUpload<T>(options: UseFileUploadOptions<T>): UseFileUploadResult<T> {
  const { trackUpload } = useUploadFeedback();
  const autoUploadOnSelect = options.autoUploadOnSelect !== false;
  const [phase, setPhase] = useState<UploadFeedbackPhase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearSuccessTimer(), [clearSuccessTimer]);

  const reset = useCallback(() => {
    clearSuccessTimer();
    fileRef.current = null;
    setFile(null);
    setError(null);
    setPhase("idle");
  }, [clearSuccessTimer]);

  const selectFile = useCallback(
    (f: File | null) => {
      if (phase === "uploading") return;
      clearSuccessTimer();
      fileRef.current = f;
      setFile(f);
      setError(null);
      setPhase(f ? "selected" : "idle");
    },
    [clearSuccessTimer, phase],
  );

  const upload = useCallback(
    async (override?: File) => {
      const f = override ?? fileRef.current;
      if (!f) return { ok: false as const, error: "no_file" as const };
      if (phase === "uploading") return { ok: false as const, error: "no_file" as const };

      setPhase("uploading");
      setError(null);

      const result = await trackUpload({
        ...options,
        file: f,
        onSuccess: (data) => {
          setPhase("success");
          options.onSuccess?.(data);
          successTimerRef.current = window.setTimeout(() => {
            reset();
          }, UPLOAD_SUCCESS_VISIBLE_MS);
        },
        onError: (message) => {
          setPhase("error");
          setError(message);
          options.onError?.(message);
        },
        successToast: options.successToast ?? false,
      });

      if (!result.ok) {
        setPhase("error");
        setError(result.error);
      }

      return result;
    },
    [options, phase, reset, trackUpload],
  );

  const retry = useCallback(() => {
    if (fileRef.current) void upload(fileRef.current);
  }, [upload]);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.currentTarget.files?.[0] ?? null;
      e.currentTarget.value = "";
      if (!picked) {
        selectFile(null);
        return;
      }
      selectFile(picked);
      if (autoUploadOnSelect) void upload(picked);
    },
    [autoUploadOnSelect, selectFile, upload],
  );

  const isUploading = phase === "uploading";
  const isBusy = isUploading;

  return {
    phase,
    file,
    error,
    isUploading,
    isBusy,
    canSelect: !isBusy,
    selectFile,
    upload,
    retry,
    reset,
    onFileInputChange,
  };
}
