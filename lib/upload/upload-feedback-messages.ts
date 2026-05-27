/** Durata minima stato "uploading" per evitare flicker su upload rapidi. */
export const UPLOAD_MIN_LOADING_MS = 400;

/** Durata badge successo inline prima di tornare idle. */
export const UPLOAD_SUCCESS_VISIBLE_MS = 1_800;

export const UPLOAD_MESSAGES = {
  uploading: "Caricamento…",
  selected: "File selezionato",
  success: "Caricamento completato",
  retry: "Riprova",
  dismiss: "Chiudi",
} as const;
