import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

const PHASE_LABELS: Partial<Record<AnalyzeTracePhase, string>> = {
  DOWNLOAD_STORAGE_OK: "Documento ricevuto",
  HYBRID_START: "Estrazione OCR",
  HYBRID_OK: "Estrazione OCR",
  HYBRID_SKIP: "Estrazione OCR",
  GEMINI_REQUEST: "Analisi AI",
  GEMINI_RESPONSE: "Analisi AI",
  PARSE_OK: "Estrazione dati",
  UPSERT_FIELDS_OK: "Verifica informazioni",
  END_OK: "Preparazione revisione",
};

export function captureAnalyzePhaseLabel(phase: AnalyzeTracePhase): string | undefined {
  return PHASE_LABELS[phase];
}

export type LavorazioniCaptureCheckId =
  | "uploaded"
  | "documentReceived"
  | "ocr"
  | "ai"
  | "extract"
  | "verify"
  | "reviewReady";

export type LavorazioniCaptureCheck = {
  id: LavorazioniCaptureCheckId;
  label: string;
  done: boolean;
  active: boolean;
};

export function deriveLavorazioniCaptureChecksFromPhase(
  phase: AnalyzeTracePhase | null,
  uploadDone: boolean,
  analyzeActive: boolean,
): LavorazioniCaptureCheck[] {
  const doneThrough = phaseProgressRank(phase);
  return [
    {
      id: "uploaded",
      label: "Documento caricato",
      done: uploadDone,
      active: !uploadDone && analyzeActive,
    },
    {
      id: "documentReceived",
      label: "Documento ricevuto",
      done: doneThrough >= 1,
      active: analyzeActive && doneThrough === 0,
    },
    {
      id: "ocr",
      label: "Estrazione OCR",
      done: doneThrough >= 2,
      active: analyzeActive && doneThrough === 1,
    },
    {
      id: "ai",
      label: "Analisi AI",
      done: doneThrough >= 3,
      active: analyzeActive && doneThrough === 2,
    },
    {
      id: "extract",
      label: "Estrazione dati",
      done: doneThrough >= 4,
      active: analyzeActive && doneThrough === 3,
    },
    {
      id: "verify",
      label: "Verifica informazioni",
      done: doneThrough >= 5,
      active: analyzeActive && doneThrough === 4,
    },
    {
      id: "reviewReady",
      label: "Preparazione revisione",
      done: doneThrough >= 6,
      active: analyzeActive && doneThrough === 5,
    },
  ];
}

function phaseProgressRank(phase: AnalyzeTracePhase | null): number {
  if (!phase) return 0;
  if (phase === "END_OK") return 6;
  if (phase === "UPSERT_FIELDS_OK") return 5;
  if (phase === "PARSE_OK") return 4;
  if (phase === "GEMINI_RESPONSE" || phase === "GEMINI_REQUEST") return 3;
  if (phase === "HYBRID_OK" || phase === "HYBRID_SKIP" || phase === "HYBRID_START") return 2;
  if (phase === "DOWNLOAD_STORAGE_OK") return 1;
  return 0;
}
