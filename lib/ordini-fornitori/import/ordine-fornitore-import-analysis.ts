import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
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
  if (!(await aiService.getConfigurationStatus()).configured) {
    return {
      ok: false,
      code: "not_configured",
      message: aiErrorMessage("AI_CONFIG_MISSING"),
    };
  }

  const mediaType = mime || "application/pdf";

  const result = await aiService.generateObject<OrdineFornitoreImportExtraction>({
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
    timeoutMs: readRuntimeTimeoutMs(),
    operation: "ordine_fornitore_import",
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.code === "AI_CONFIG_MISSING" ? "not_configured" : "failed",
      message: result.message,
    };
  }

  const extraction = result.data.object;
  return { ok: true, extraction, warnings: extraction.warnings ?? [] };
}
