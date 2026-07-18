import type { CaptureExperienceAdapter } from "@/lib/document-capture/capture-experience-adapter";
import { resolveCaptureReviewState } from "@/lib/document-capture/capture-review-state";
import {
  DOCUMENT_CAPTURE_UPLOAD_ACCEPT,
  DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT,
} from "@/lib/document-capture/capture-upload-accept";

export const LAVORAZIONI_CAPTURE_STEPS = [
  { id: "hub", label: "Carica documento", shortLabel: "Carica" },
  { id: "analyze", label: "Leggi con AI", shortLabel: "AI" },
  { id: "compile", label: "Compila scheda", shortLabel: "Compila" },
] as const;

export const lavorazioniCaptureAdapter: CaptureExperienceAdapter = {
  domain: "lavorazioni",
  ariaLabel: "Passaggi acquisizione",
  steps: [...LAVORAZIONI_CAPTURE_STEPS],
  stepCopy: {
    hub: {
      title: "Acquisizione documento con IA",
      subtitle:
        "Carica il documento in qualsiasi formato. L'intelligenza artificiale riconosce scheda ingresso, lavorazioni o ricambi e legge i campi in automatico.",
    },
    analyze: {
      title: "Lettura documento",
      subtitle: "Stiamo estraendo i dati dalla scheda con l'intelligenza artificiale.",
    },
    compile: {
      title: "Compila scheda",
      subtitle:
        "I dati letti sono già nella scheda. Controlla i campi evidenziati e salva la lavorazione o assegna alla lavorazione corretta.",
    },
  },
  upload: {
    accept: DOCUMENT_CAPTURE_UPLOAD_ACCEPT,
    formatHint: DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT,
    dropTitle: "Rilascia per acquisire la scheda",
    dropHint: "Word ed Excel verranno convertiti in PDF per la lettura AI",
    chooseLabel: "Scegli file dal computer",
    dragHint: "oppure trascina qui il documento della scheda compilata",
  },
  review: {
    columns: [
      { id: "description", label: "Descrizione", type: "text" },
      { id: "mezzo", label: "Mezzo", type: "matcher" },
      { id: "ore", label: "Ore", type: "quantity" },
      { id: "ricambi", label: "Ricambi", type: "text" },
      { id: "confidence", label: "Confidence", type: "confidence" },
    ],
  },
  apply: {
    confirmLabel: "Conferma importazione",
    confirmLoadingLabel: "Importazione…",
    successMessage: "Lavorazione importata.",
  },
  reviewState: resolveCaptureReviewState,
};
