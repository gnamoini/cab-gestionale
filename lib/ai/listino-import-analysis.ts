import "server-only";

import { generateObject } from "ai";
import { GEMINI_NOT_CONFIGURED_MESSAGE, getGeminiReportModel, isGeminiConfigured } from "@/lib/ai/gemini-client";
import {
  listinoImportAiRowsSchema,
  listinoImportColumnMapSchema,
} from "@/lib/magazzino/listino-import/listino-import-schema";
import {
  applyListinoColumnMap,
} from "@/lib/magazzino/listino-import/parse-listino-column-map";
import type { ListinoImportRawRow } from "@/lib/magazzino/listino-import/listino-import-types";

const LISTINO_PDF_SYSTEM = `Sei un assistente per officina meccanica. Estrai righe ricambi da listini fornitore PDF.
Per ogni riga restituisci codice articolo, descrizione, prezzo listino numerico (EUR), marca opzionale se presente.
Ignora intestazioni, totali, note legali.`;

const LISTINO_COLUMNS_SYSTEM = `Mappa le colonne di un listino Excel/CSV italiano o inglese.
Indica indice colonna (0-based) per codice, descrizione, prezzo listino, marca opzionale.
headerRowIndex = riga intestazioni, dataStartRowIndex = prima riga dati.`;

export type ListinoAiParseResult =
  | { ok: true; rows: ListinoImportRawRow[]; warnings: string[] }
  | { ok: false; code: "not_configured" | "failed"; message: string };

export async function parseListinoPdfWithAi(
  bytes: Uint8Array,
  marcaDefault: string,
): Promise<ListinoAiParseResult> {
  const model = getGeminiReportModel();
  if (!model || !isGeminiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: GEMINI_NOT_CONFIGURED_MESSAGE,
    };
  }

  try {
    const { object } = await generateObject({
      model,
      schema: listinoImportAiRowsSchema,
      system: LISTINO_PDF_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Marca listino: ${marcaDefault || "non specificata"}. Estrai righe ricambio con codice, descrizione e prezzo.`,
            },
            { type: "file", data: Buffer.from(bytes), mediaType: "application/pdf" },
          ],
        },
      ],
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(60_000),
    });

    const rows = object.rows
      .map((r) => ({
        codice: r.codice.trim(),
        descrizione: r.descrizione.trim(),
        costo: r.costo,
        marca: r.marca?.trim() || marcaDefault || undefined,
      }))
      .filter((r) => r.codice && r.descrizione && Number.isFinite(r.costo));

    return { ok: true, rows, warnings: object.warnings ?? [] };
  } catch (error) {
    return {
      ok: false,
      code: "failed",
      message: error instanceof Error ? error.message : "Analisi PDF non riuscita.",
    };
  }
}

export async function mapListinoColumnsWithAi(
  matrix: unknown[][],
  marcaDefault: string,
): Promise<ListinoAiParseResult> {
  const model = getGeminiReportModel();
  if (!model || !isGeminiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: "Servizio IA non configurato per mapping colonne.",
    };
  }

  const sample = JSON.stringify(matrix.slice(0, 12));

  try {
    const { object } = await generateObject({
      model,
      schema: listinoImportColumnMapSchema,
      system: LISTINO_COLUMNS_SYSTEM,
      prompt: `Marca default: ${marcaDefault}. Sample: ${sample}`,
      temperature: 0.1,
      abortSignal: AbortSignal.timeout(30_000),
    });

    if (object.codiceColumn == null || object.descrizioneColumn == null || object.costoColumn == null) {
      return { ok: false, code: "failed", message: "IA non ha identificato colonne codice/descrizione/prezzo." };
    }

    const rows = applyListinoColumnMap(matrix, {
      codiceColumn: object.codiceColumn,
      descrizioneColumn: object.descrizioneColumn,
      costoColumn: object.costoColumn,
      marcaColumn: object.marcaColumn,
      dataStartRowIndex: object.dataStartRowIndex,
    }).map((r) => ({ ...r, marca: r.marca || marcaDefault || undefined }));

    return { ok: true, rows, warnings: object.warnings ?? ["Mapping colonne via IA."] };
  } catch (error) {
    return {
      ok: false,
      code: "failed",
      message: error instanceof Error ? error.message : "Mapping colonne IA non riuscito.",
    };
  }
}
