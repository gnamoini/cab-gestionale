/** Fasi UX upload file (selezione → caricamento → esito). */
export type UploadFeedbackPhase = "idle" | "selected" | "uploading" | "success" | "error";

export type UploadFeedbackItem = {
  id: string;
  fileName: string;
  label: string;
  phase: UploadFeedbackPhase;
  error: string | null;
  startedAt: number;
  /** Progresso upload 0–100; `null` = indeterminato. */
  progress: number | null;
  /** File conservato per retry (solo client-side). */
  file: File | null;
  retry: (() => void) | null;
};

export type TrackUploadParams<T> = {
  file: File;
  label?: string;
  run: (file: File) => Promise<T>;
  onProgress?: (pct: number) => void;
  onSuccess?: (data: T) => void;
  onError?: (message: string) => void;
  /** Messaggio toast successo; `false` per disabilitare. */
  successToast?: string | false;
  /** Toast errore (default true). */
  showErrorToast?: boolean;
};

export type RunUploadParams<T> = {
  fileName: string;
  label?: string;
  run: () => Promise<T>;
  onProgress?: (pct: number) => void;
  onSuccess?: (data: T) => void;
  onError?: (message: string) => void;
  successToast?: string | false;
  showErrorToast?: boolean;
};
