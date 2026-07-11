import type { DocumentCaptureUploadPhase } from "@/lib/document-capture/use-document-capture-upload";

export type CaptureAcquisitionPhase = "uploading" | "finalizing" | "reading" | "error" | "idle";

export type CaptureAcquisitionProgressState = {
  active: boolean;
  phase: CaptureAcquisitionPhase;
  label: string;
  /** 0–100; `reading` uses creeping animation in UI. */
  progress: number;
  creeping: boolean;
  error: string | null;
};

export function deriveCaptureAcquisitionProgress(input: {
  uploadPhase: DocumentCaptureUploadPhase;
  uploadProgress: number;
  analyzeBusy: boolean;
  uploadError?: string | null;
}): CaptureAcquisitionProgressState {
  const { uploadPhase, uploadProgress, analyzeBusy, uploadError } = input;

  if (uploadPhase === "uploading") {
    return {
      active: true,
      phase: "uploading",
      label: "Caricamento documento…",
      progress: 8 + uploadProgress * 28,
      creeping: false,
      error: null,
    };
  }

  if (uploadPhase === "finalizing") {
    return {
      active: true,
      phase: "finalizing",
      label: "Verifica documento…",
      progress: 40 + uploadProgress * 22,
      creeping: false,
      error: null,
    };
  }

  if (analyzeBusy) {
    return {
      active: true,
      phase: "reading",
      label: "Lettura documento con AI…",
      progress: 62,
      creeping: true,
      error: null,
    };
  }

  if (uploadPhase === "error") {
    return {
      active: true,
      phase: "error",
      label: "Caricamento non riuscito",
      progress: 0,
      creeping: false,
      error: uploadError ?? "Upload non riuscito",
    };
  }

  return {
    active: false,
    phase: "idle",
    label: "",
    progress: 0,
    creeping: false,
    error: null,
  };
}
