import type { DocumentCaptureUploadPhase } from "@/lib/document-capture/use-document-capture-upload";

export type InventoryReceivingAcquisitionCheckId = "uploaded" | "reading" | "extracting";

export type InventoryReceivingAcquisitionCheck = {
  id: InventoryReceivingAcquisitionCheckId;
  label: string;
  done: boolean;
  active: boolean;
};

export type InventoryReceivingAcquisitionState = {
  active: boolean;
  checks: InventoryReceivingAcquisitionCheck[];
  error: string | null;
};

export function deriveInventoryReceivingAcquisition(input: {
  uploadPhase: DocumentCaptureUploadPhase;
  analyzeBusy: boolean;
  uploadError?: string | null;
}): InventoryReceivingAcquisitionState {
  const uploaded =
    input.uploadPhase === "success" ||
    input.uploadPhase === "finalizing" ||
    input.analyzeBusy;
  const reading = input.uploadPhase === "success" || input.analyzeBusy;
  const extracting = input.analyzeBusy;

  if (input.uploadPhase === "error") {
    return {
      active: true,
      error: input.uploadError ?? "Caricamento non riuscito",
      checks: [
        { id: "uploaded", label: "Documento caricato", done: false, active: false },
        { id: "reading", label: "Lettura documento / OCR", done: false, active: false },
        { id: "extracting", label: "Estrazione ricambi", done: false, active: false },
      ],
    };
  }

  if (!uploaded && !input.analyzeBusy) {
    return { active: false, checks: [], error: null };
  }

  return {
    active: true,
    error: null,
    checks: [
      {
        id: "uploaded",
        label: "Documento caricato",
        done: uploaded,
        active: input.uploadPhase === "uploading" || input.uploadPhase === "finalizing",
      },
      {
        id: "reading",
        label: "Lettura documento / OCR",
        done: reading && !input.analyzeBusy,
        active: input.uploadPhase === "success" && !input.analyzeBusy ? false : reading && input.analyzeBusy,
      },
      {
        id: "extracting",
        label: "Estrazione ricambi",
        done: false,
        active: extracting,
      },
    ],
  };
}
