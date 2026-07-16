import "server-only";

import { generateObjectWithGeminiFailover } from "@/lib/ai/gemini-generate-object.server";
import {
  GEMINI_AUTH_ERROR_HINT,
  GEMINI_FILE_ANALYSIS_TIMEOUT_MS,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  GEMINI_QUOTA_ERROR_HINT,
  isGeminiAuthError,
  isGeminiConfigured,
  isGeminiQuotaError,
} from "@/lib/ai/gemini-client";
import { getPdfPageCount, splitPdfIntoPageRangeChunks } from "@/lib/ai/pdf-page-ranges.server";
import {
  listinoImportAiRowsSchema,
  listinoImportColumnMapSchema,
} from "@/lib/magazzino/listino-import/listino-import-schema";
import type { z } from "zod";
import {
  applyListinoColumnMap,
} from "@/lib/magazzino/listino-import/parse-listino-column-map";
import type { ListinoImportRawRow } from "@/lib/magazzino/listino-import/listino-import-types";
import {
  LISTINO_PDF_CHUNK_DELAY_MS,
  LISTINO_PDF_MAX_CHUNKS,
  LISTINO_PDF_SINGLE_CALL_MAX_PAGES,
  resolveListinoPdfPagesPerChunk,
} from "@/lib/magazzino/listino-import/listino-import-types";

const LISTINO_PDF_SYSTEM = `Sei un assistente per officina meccanica. Estrai righe ricambi da listini fornitore PDF.
Per ogni riga restituisci codice articolo, descrizione, prezzo listino numerico (EUR), marca opzionale se presente.
Ignora intestazioni, totali, note legali.`;

const LISTINO_COLUMNS_SYSTEM = `Mappa le colonne di un listino Excel/CSV italiano o inglese.
Indica indice colonna (0-based) per codice, descrizione, prezzo listino, marca opzionale.
headerRowIndex = riga intestazioni, dataStartRowIndex = prima riga dati.`;

export type ListinoAiParseResult =
  | { ok: true; rows: ListinoImportRawRow[]; warnings: string[] }
  | { ok: false; code: "not_configured" | "failed"; message: string };

type PdfChunkInput = {
  bytes: Uint8Array;
  fromPage: number;
  toPage: number;
};

type PdfChunkOutcome =
  | { ok: true; rows: ListinoImportRawRow[]; warnings: string[] }
  | { ok: false; timedOut: boolean; message: string };

function listinoAiFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Analisi listino scaduta per timeout. Riprova più tardi.";
  }
  if (isGeminiAuthError(error)) {
    return GEMINI_AUTH_ERROR_HINT;
  }
  if (isGeminiQuotaError(error)) {
    return GEMINI_QUOTA_ERROR_HINT;
  }
  return error instanceof Error ? error.message : fallback;
}

function isRetryableListinoChunkMessage(message: string): boolean {
  const upper = message.toUpperCase();
  return (
    upper.includes("TIMEOUT") ||
    upper.includes("429") ||
    upper.includes("QUOTA") ||
    upper.includes("RESOURCE_EXHAUSTED") ||
    upper.includes("RATE LIMIT")
  );
}

function summarizeListinoPdfFailures(failedRanges: string[], failureMessages: string[]): string {
  const unique = [...new Set(failureMessages.map((m) => m.trim()).filter(Boolean))];
  const reason = unique[0] ?? "Servizio IA non ha estratto righe dal PDF.";
  if (failedRanges.length === 0) return reason;
  const preview = failedRanges.slice(0, 4).join(", ");
  const extra = failedRanges.length > 4 ? ` (+${failedRanges.length - 4} blocchi)` : "";
  return `${reason} Blocchi non analizzati: ${preview}${extra}.`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

function normalizeListinoRow(
  row: { codice: string; descrizione: string; costo: number; marca?: string },
  marcaDefault: string,
): ListinoImportRawRow | null {
  const codice = row.codice.trim();
  const descrizione = row.descrizione.trim();
  if (!codice || !descrizione || !Number.isFinite(row.costo)) return null;
  return {
    codice,
    descrizione,
    costo: row.costo,
    marca: row.marca?.trim() || marcaDefault || undefined,
  };
}

function mergeListinoRows(chunks: ListinoImportRawRow[][]): ListinoImportRawRow[] {
  const seen = new Set<string>();
  const merged: ListinoImportRawRow[] = [];
  for (const rows of chunks) {
    for (const row of rows) {
      const key = row.codice.trim().toUpperCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }
  return merged;
}

function chunkPrompt(marcaDefault: string, fromPage: number, toPage: number, totalPages: number): string {
  const range =
    fromPage === toPage
      ? `pagina ${fromPage} di ${totalPages}`
      : `pagine ${fromPage}-${toPage} di ${totalPages}`;
  return `Marca listino: ${marcaDefault || "non specificata"}. Estrai righe ricambio (codice, descrizione, prezzo) da questo estratto PDF (${range}). Solo righe presenti in questo blocco.`;
}

async function parseListinoPdfChunkWithAi(
  chunk: PdfChunkInput,
  marcaDefault: string,
  totalPages: number,
): Promise<PdfChunkOutcome> {
  try {
    const { object: rawObject } = await generateObjectWithGeminiFailover({
      schema: listinoImportAiRowsSchema,
      system: LISTINO_PDF_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: chunkPrompt(marcaDefault, chunk.fromPage, chunk.toPage, totalPages),
            },
            { type: "file", data: Buffer.from(chunk.bytes), mediaType: "application/pdf" },
          ],
        },
      ],
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(GEMINI_FILE_ANALYSIS_TIMEOUT_MS),
    });
    const object = rawObject as z.infer<typeof listinoImportAiRowsSchema>;

    const rows = object.rows
      .map((r) => normalizeListinoRow(r, marcaDefault))
      .filter((r): r is ListinoImportRawRow => r != null);

    return { ok: true, rows, warnings: object.warnings ?? [] };
  } catch (error) {
    if (isGeminiAuthError(error)) {
      return { ok: false, timedOut: false, message: GEMINI_AUTH_ERROR_HINT };
    }
    return {
      ok: false,
      timedOut: isTimeoutError(error),
      message: listinoAiFailureMessage(error, "Analisi PDF non riuscita."),
    };
  }
}

async function parseChunkWithSplitRetry(
  chunk: PdfChunkInput,
  marcaDefault: string,
  totalPages: number,
): Promise<PdfChunkOutcome> {
  const first = await parseListinoPdfChunkWithAi(chunk, marcaDefault, totalPages);
  if (first.ok || !first.timedOut || chunk.fromPage >= chunk.toPage) return first;

  const pageCount = chunk.toPage - chunk.fromPage + 1;
  if (pageCount <= 1) return first;

  const subChunks = await splitPdfIntoPageRangeChunks(chunk.bytes, 1);
  if (subChunks.length <= 1) return first;

  const warnings: string[] = [];
  const rowBatches: ListinoImportRawRow[][] = [];
  for (const sub of subChunks) {
    const subOutcome = await parseListinoPdfChunkWithAi(sub, marcaDefault, totalPages);
    if (!subOutcome.ok) {
      return {
        ok: false,
        timedOut: subOutcome.timedOut,
        message: subOutcome.message,
      };
    }
    rowBatches.push(subOutcome.rows);
    warnings.push(...subOutcome.warnings);
  }

  warnings.push(
    `Blocco pagine ${chunk.fromPage}-${chunk.toPage} analizzato in sotto-blocchi dopo timeout.`,
  );
  return { ok: true, rows: mergeListinoRows(rowBatches), warnings };
}

function isFatalListinoChunkError(message: string): boolean {
  return message === GEMINI_AUTH_ERROR_HINT || message === GEMINI_QUOTA_ERROR_HINT;
}

async function runChunksSequential(
  chunks: PdfChunkInput[],
  marcaDefault: string,
  totalPages: number,
): Promise<{ rows: ListinoImportRawRow[]; warnings: string[]; failedRanges: string[]; failureMessages: string[] }> {
  const warnings: string[] = [];
  const failedRanges: string[] = [];
  const failureMessages: string[] = [];
  const rowBatches: ListinoImportRawRow[][] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    let outcome = await parseChunkWithSplitRetry(chunk, marcaDefault, totalPages);
    if (!outcome.ok && isRetryableListinoChunkMessage(outcome.message)) {
      await sleep(LISTINO_PDF_CHUNK_DELAY_MS);
      outcome = await parseChunkWithSplitRetry(chunk, marcaDefault, totalPages);
    }

    if (outcome.ok) {
      rowBatches.push(outcome.rows);
      warnings.push(...outcome.warnings);
    } else {
      failedRanges.push(
        chunk.fromPage === chunk.toPage ? `pagina ${chunk.fromPage}` : `pagine ${chunk.fromPage}-${chunk.toPage}`,
      );
      failureMessages.push(outcome.message);
      warnings.push(outcome.message);
      if (process.env.NODE_ENV === "development") {
        console.error("[listino-import] chunk failed", {
          fromPage: chunk.fromPage,
          toPage: chunk.toPage,
          message: outcome.message,
        });
      }
      if (isFatalListinoChunkError(outcome.message)) break;
    }

    if (index < chunks.length - 1) {
      await sleep(LISTINO_PDF_CHUNK_DELAY_MS);
    }
  }

  return {
    rows: mergeListinoRows(rowBatches),
    warnings,
    failedRanges,
    failureMessages,
  };
}

export async function parseListinoPdfWithAi(
  bytes: Uint8Array,
  marcaDefault: string,
): Promise<ListinoAiParseResult> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: GEMINI_NOT_CONFIGURED_MESSAGE,
    };
  }

  let pageCount: number;
  try {
    pageCount = await getPdfPageCount(bytes);
  } catch {
    return { ok: false, code: "failed", message: "PDF listino non leggibile o protetto." };
  }

  if (pageCount <= 0) {
    return { ok: false, code: "failed", message: "PDF listino senza pagine." };
  }

  if (pageCount <= LISTINO_PDF_SINGLE_CALL_MAX_PAGES) {
    const single = await parseChunkWithSplitRetry(
      { bytes, fromPage: 1, toPage: pageCount },
      marcaDefault,
      pageCount,
    );
    if (!single.ok) {
      return { ok: false, code: "failed", message: single.message };
    }
    return { ok: true, rows: single.rows, warnings: single.warnings };
  }

  const pagesPerChunk = resolveListinoPdfPagesPerChunk(pageCount);
  const ranges = await splitPdfIntoPageRangeChunks(bytes, pagesPerChunk);
  if (ranges.length > LISTINO_PDF_MAX_CHUNKS) {
    return {
      ok: false,
      code: "failed",
      message: `Listino troppo grande (${pageCount} pagine). Suddividi il PDF o usa formato Excel/CSV.`,
    };
  }

  const { rows, warnings, failedRanges, failureMessages } = await runChunksSequential(
    ranges.map((r) => ({ bytes: r.bytes, fromPage: r.fromPage, toPage: r.toPage })),
    marcaDefault,
    pageCount,
  );

  if (!rows.length) {
    return {
      ok: false,
      code: "failed",
      message: summarizeListinoPdfFailures(failedRanges, failureMessages),
    };
  }

  if (failedRanges.length > 0) {
    warnings.unshift(
      `Alcuni blocchi non analizzati: ${failedRanges.join(", ")}. Verifica le righe estratte.`,
    );
  } else if (ranges.length > 1) {
    warnings.unshift(`PDF analizzato in ${ranges.length} blocchi (${pageCount} pagine).`);
  }

  return { ok: true, rows, warnings };
}

export async function mapListinoColumnsWithAi(
  matrix: unknown[][],
  marcaDefault: string,
): Promise<ListinoAiParseResult> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: "Servizio IA non configurato per mapping colonne.",
    };
  }

  const sample = JSON.stringify(matrix.slice(0, 12));

  try {
    const { object: rawObject } = await generateObjectWithGeminiFailover({
      schema: listinoImportColumnMapSchema,
      system: LISTINO_COLUMNS_SYSTEM,
      prompt: `Marca default: ${marcaDefault}. Sample: ${sample}`,
      temperature: 0.1,
      abortSignal: AbortSignal.timeout(GEMINI_FILE_ANALYSIS_TIMEOUT_MS),
    });
    const object = rawObject as z.infer<typeof listinoImportColumnMapSchema>;

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
      message: listinoAiFailureMessage(error, "Mapping colonne IA non riuscito."),
    };
  }
}
