import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";

export type CaptureCompileLoadPhase = "settings" | "fetch_fields" | "map_fields" | "field_hints";

const COMPILE_LOAD: Record<
  CaptureCompileLoadPhase,
  Pick<CaptureAcquisitionProgressState, "label" | "progress" | "creeping">
> = {
  settings: {
    label: "Caricamento impostazioni globali…",
    progress: 15,
    creeping: false,
  },
  fetch_fields: {
    label: "Recupero campi letti dalla scansione…",
    progress: 38,
    creeping: true,
  },
  map_fields: {
    label: "Mappatura campi sulla scheda ingresso…",
    progress: 62,
    creeping: true,
  },
  field_hints: {
    label: "Verifica suggerimenti di compilazione…",
    progress: 86,
    creeping: true,
  },
};

export function deriveCaptureCompileProgress(
  phase: CaptureCompileLoadPhase,
): CaptureAcquisitionProgressState {
  const step = COMPILE_LOAD[phase];
  return {
    active: true,
    phase: "reading",
    label: step.label,
    progress: step.progress,
    creeping: step.creeping,
    error: null,
    streamActive: phase === "fetch_fields" || phase === "field_hints",
  };
}
