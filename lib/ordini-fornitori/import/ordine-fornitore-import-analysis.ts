import "server-only";

import { generateObject } from "ai";
import {
  GEMINI_AUTH_ERROR_HINT,
  GEMINI_FILE_ANALYSIS_TIMEOUT_MS,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  getGeminiReportModel,
  isGeminiAuthError,
  isGeminiConfigured,
} from "@/lib/ai/gemini-client";
import {
  ordineFornitoreImportExtractionSchema,
  type OrdineFornitoreImportExtraction,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";

const SYSTEM = `Sei un assistente per officina meccanica. Estrai dati da preventivi/offerte fornitore (PDF o immagini).
Per ogni campo scalare restituisci value e confidence 0-1.
Estrai tutte le pagine del documento, incluse tabelle righe articolo su più pagine.
Per righe: codice, codice produttore, descrizione, quantità, unità, prezzo unitario, sconto %, IVA %.
Per fornitore: ragione sociale, P.IVA, codice fiscale, indirizzo, telefono, email, referente.
Per documento: numero preventivo, data (YYYY-MM-DD se possibile), validità, condizioni pagamento, tempi consegna, valuta, note.
Per costi aggiuntivi: trasporto, imballo, RAEE, altre spese.
Ignora totali documento come fonte di verità; estrai comunque righe e prezzi unitari.`;

export type OrdineFornitoreAiParseResult =
  | { ok: true; extraction: OrdineFornitoreImportExtraction; warnings: string[] }
  | { ok: false; code: "not_configured" | "failed"; message: string };

export async function parsePreventivoFornitoreWithAi(
  bytes: Uint8Array,
  mime: string,
): Promise<OrdineFornitoreAiParseResult> {
  const model = getGeminiReportModel();
  if (!model || !isGeminiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: GEMINI_NOT_CONFIGURED_MESSAGE,
    };
  }

  const mediaType = mime || "application/pdf";

  try {
    const { object } = await generateObject({
      model,
      schema: ordineFornitoreImportExtractionSchema,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Estrai preventivo fornitore con confidence per campo. Tutte le pagine.",
            },
            { type: "file", data: Buffer.from(bytes), mediaType },
          ],
        },
      ],
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(GEMINI_FILE_ANALYSIS_TIMEOUT_MS),
    });

    return { ok: true, extraction: object, warnings: object.warnings ?? [] };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        ok: false,
        code: "failed",
        message: "Analisi documento scaduta per timeout. Riprova più tardi.",
      };
    }
    if (isGeminiAuthError(error)) {
      return {
        ok: false,
        code: "failed",
        message: GEMINI_AUTH_ERROR_HINT,
      };
    }
    return {
      ok: false,
      code: "failed",
      message: error instanceof Error ? error.message : "Analisi documento non riuscita.",
    };
  }
}
