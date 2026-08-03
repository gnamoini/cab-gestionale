import type { DocumentCaptureUploadPhase } from "@/lib/document-capture/use-document-capture-upload";
import {
  deriveLavorazioniCaptureChecksFromPhase,
  captureAnalyzeProgressPercent,
  type LavorazioniCaptureCheck,
} from "@/lib/document-capture/pipeline/analyze-progress-labels";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

export type CaptureAcquisitionPhase = "uploading" | "finalizing" | "processing" | "reading" | "error" | "idle";

export type CaptureAcquisitionProgressState = {
  active: boolean;
  phase: CaptureAcquisitionPhase;
  label: string;
  progress: number;
  creeping: boolean;
  error: string | null;
  checklist?: LavorazioniCaptureCheck[];
  heartbeatLabel?: string | null;
  streamActive?: boolean;
};

export function deriveCaptureAcquisitionProgress(input: {
  uploadPhase: DocumentCaptureUploadPhase;
  uploadProgress: number;
  analyzeBusy: boolean;
  pipelineProcessing?: boolean;
  uploadError?: string | null;
  analyzePhase?: AnalyzeTracePhase | null;
  heartbeatAt?: number | null;
  useChecklist?: boolean;
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
      streamActive: false,
      checklist: input.useChecklist
        ? deriveLavorazioniCaptureChecksFromPhase(null, false, true)
        : undefined,
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
      streamActive: false,
    };
  }

  if (input.pipelineProcessing && !analyzeBusy) {
    return {
      active: true,
      phase: "processing",
      label: "Avvio elaborazione documento…",
      progress: 38,
      creeping: false,
      error: null,
      streamActive: false,
      checklist: input.useChecklist
        ? deriveLavorazioniCaptureChecksFromPhase(null, uploadPhase === "success", true)
        : undefined,
    };
  }

  if (analyzeBusy) {
    if (input.useChecklist) {
      const checks = deriveLavorazioniCaptureChecksFromPhase(
        input.analyzePhase ?? null,
        uploadPhase === "success",
        true,
      );
      const activeCheck = checks.find((c) => c.active);
      const heartbeatLabel =
        input.heartbeatAt != null
          ? `Ultimo aggiornamento ${Math.max(0, Math.round((Date.now() - input.heartbeatAt) / 1000))}s fa`
          : null;
      return {
        active: true,
        phase: "reading",
        label: activeCheck?.label ?? "Elaborazione documento…",
        progress: captureAnalyzeProgressPercent(input.analyzePhase ?? null),
        creeping: false,
        error: null,
        checklist: checks,
        heartbeatLabel,
        streamActive: true,
      };
    }
    return {
      active: true,
      phase: "reading",
      label: "Lettura documento con AI…",
      progress: captureAnalyzeProgressPercent(input.analyzePhase ?? null),
      creeping: false,
      error: null,
      streamActive: true,
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
      streamActive: false,
    };
  }

  return {
    active: false,
    phase: "idle",
    label: "",
    progress: 0,
    creeping: false,
    error: null,
    streamActive: false,
  };
}
