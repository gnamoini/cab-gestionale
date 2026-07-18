import type { CaptureExperienceAdapter } from "@/lib/document-capture/capture-experience-adapter";
import { resolveCaptureReviewState } from "@/lib/document-capture/capture-review-state";

export const DDT_UPLOAD_ACCEPT = "application/pdf,.pdf,image/jpeg,image/png,image/webp,image/*";

export const INVENTORY_RECEIVING_CAPTURE_STEPS = [
  { id: "hub", label: "Carica DDT", shortLabel: "Carica" },
  { id: "analyze", label: "Leggi con AI", shortLabel: "AI" },
  { id: "review", label: "Rivedi carico", shortLabel: "Rivedi" },
] as const;

export const inventoryReceivingCaptureAdapter: CaptureExperienceAdapter = {
  domain: "ddt",
  ariaLabel: "Passaggi carico DDT",
  steps: [...INVENTORY_RECEIVING_CAPTURE_STEPS],
  stepCopy: {
    hub: {
      title: "Carico merce da DDT",
      subtitle:
        "Carica il documento di trasporto in PDF o immagine. L'AI legge fornitore, righe e quantità per il carico a magazzino.",
    },
    analyze: {
      title: "Lettura DDT",
      subtitle: "Stiamo estraendo i dati dal documento con l'intelligenza artificiale.",
    },
    review: {
      title: "Rivedi carico",
      subtitle: "Controlla abbinamenti al catalogo e quantità ricevute prima di confermare l'importazione.",
    },
  },
  upload: {
    accept: DDT_UPLOAD_ACCEPT,
    formatHint: "PDF · JPG · PNG · WEBP",
    dropTitle: "Rilascia per caricare il DDT",
    dropHint: "PDF o immagine — l'AI legge fornitore, righe e quantità",
    chooseLabel: "Scegli file dal computer",
    dragHint: "oppure trascina qui il documento di trasporto",
  },
  review: {
    columns: [
      { id: "article", label: "Articolo", type: "text" },
      { id: "match", label: "Match", type: "matcher" },
      { id: "ordered", label: "Ord.", type: "quantity" },
      { id: "received", label: "Ricev.", type: "quantity" },
      { id: "action", label: "Azione", type: "status" },
      { id: "confidence", label: "Confidence", type: "confidence" },
    ],
  },
  apply: {
    confirmLabel: "Conferma importazione",
    confirmLoadingLabel: "Importazione…",
    successMessage: "Carico DDT applicato a magazzino.",
  },
  reviewState: resolveCaptureReviewState,
};
