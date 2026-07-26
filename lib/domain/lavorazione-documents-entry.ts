"use client";

import { lavorazioneDocumentsService } from "@/src/services/lavorazione-documents.service";

/** @deprecated Usare official-documents API. */
export const lavorazioneDocumentsEntry = {
  listByLavorazione: lavorazioneDocumentsService.listByLavorazione.bind(lavorazioneDocumentsService),
};
