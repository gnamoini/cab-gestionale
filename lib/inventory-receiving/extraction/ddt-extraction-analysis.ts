import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import {
  ddtExtractionSchema,
  type DdtExtraction,
} from "@/lib/inventory-receiving/extraction/ddt-extraction-schema";

const SYSTEM = `Sei un assistente per officina meccanica. Estrai dati da DDT (documenti di trasporto) fornitore in PDF o immagine.
Restituisci JSON strutturato.
Per ogni riga articolo estrai: code, description, ordered_quantity, delivered_quantity, unit, confidence (0-1).
Se il DDT distingue quantità ordinata e consegnata, popola entrambi; altrimenti usa quantity per entrambi.
Estrai tutte le pagine del documento.
Per fornitore: ragioneSociale, partitaIva.
Per documento: document_number, date (YYYY-MM-DD), document_confidence (0-1 globale).
Unisci righe duplicate identiche sommando le quantità.`;

export type DdtAiParseResult =
  | { ok: true; extraction: DdtExtraction; warnings: string[] }
  | { ok: false; code: "not_configured" | "failed"; message: string };

export async function parseDdtWithAi(bytes: Uint8Array, mime: string): Promise<DdtAiParseResult> {
  if (!(await aiService.getConfigurationStatus()).configured) {
    return {
      ok: false,
      code: "not_configured",
      message: aiErrorMessage("AI_CONFIG_MISSING"),
    };
  }

  const mediaType = mime || "application/pdf";

  const result = await aiService.generateObject<DdtExtraction>({
    schema: ddtExtractionSchema,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Estrai DDT fornitore con confidence per riga e documento. Tutte le pagine." },
          { type: "file", data: Buffer.from(bytes), mediaType },
        ],
      },
    ],
    temperature: 0.2,
    timeoutMs: readRuntimeTimeoutMs(),
    operation: "ddt_receiving_import",
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.code === "AI_CONFIG_MISSING" ? "not_configured" : "failed",
      message: result.message,
    };
  }

  return {
    ok: true,
    extraction: result.data.object,
    warnings: result.data.object.warnings ?? [],
  };
}
