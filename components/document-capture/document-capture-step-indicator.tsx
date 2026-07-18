"use client";

import { GestionaleCaptureStepIndicator } from "@/components/document-capture/gestionale-capture-step-indicator";
import { LAVORAZIONI_CAPTURE_STEPS, lavorazioniCaptureAdapter } from "@/lib/document-capture/lavorazioni-capture-adapter";

export type DocumentCaptureFlowStep = "hub" | "analyze" | "compile";

export function DocumentCaptureStepIndicator({ current }: { current: DocumentCaptureFlowStep }) {
  return (
    <GestionaleCaptureStepIndicator
      steps={LAVORAZIONI_CAPTURE_STEPS}
      current={current}
      ariaLabel={lavorazioniCaptureAdapter.ariaLabel}
    />
  );
}

export const DOCUMENT_CAPTURE_STEP_COPY = lavorazioniCaptureAdapter.stepCopy as Record<
  DocumentCaptureFlowStep,
  { title: string; subtitle: string }
>;
