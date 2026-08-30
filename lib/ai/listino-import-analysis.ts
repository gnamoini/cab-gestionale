import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { loadActiveKeys } from "@/lib/ai/runtime/config-store";
import { buildNoSelectableKeyError, selectBestKey } from "@/lib/ai/runtime/key-manager";
import { aiErrorMessage, classifyAiError } from "@/lib/ai/runtime/errors";
import { readRuntimeProviderDefault, readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import { getPdfPageCount, splitPdfIntoPageRangeChunks } from "@/lib/ai/pdf-page-ranges.server";
import { extractPdfTextPages, pageHasSufficientNativeText } from "@/lib/ai/pdf-text-pages.server";
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
  formatCaptureAnalyzeErrorMessage,
  isGeminiQuotaErrorMessage,
  resolveGeminiAnalyzeRetryDelayMs,
  GEMINI_API_USAGE_URL,
} from "@/lib/ai/gemini-retry-after";
import {
  LISTINO_PDF_CHUNK_DELAY_MS,
  LISTINO_PDF_MAX_CHUNKS,
  LISTINO_PDF_SINGLE_CALL_MAX_PAGES,
  resolveListinoPdfPagesPerChunk,
} from "@/lib/magazzino/listino-import/listino-import-types";
import { AI_PROMPT_BOUNDARY_GUARD } from "@/lib/ai/prompt-boundary-guard";

const LISTINO_PDF_SYSTEM = `Sei un assistente per officina meccanica. Estrai righe ricambi da listini fornitore PDF.
Per ogni riga restituisci codice articolo, descrizione, prezzo listino numerico (EUR), marca opzionale se presente.
Ignora intestazioni, totali, note legali.${AI_PROMPT_BOUNDARY_GUARD}`;

const LISTINO_COLUMNS_SYSTEM = `Mappa le colonne di un listino Excel/CSV italiano o inglese.
Indica indice colonna (0-based) per codice, descrizione, prezzo listino, marca opzionale.
headerRowIndex = riga intestazioni, dataStartRowIndex = prima riga dati.${AI_PROMPT_BOUNDARY_GUARD}`;

export type ListinoAiParseResult =
  | { ok: true; rows: ListinoImportRawRow[]; warnings: string[]; stats: ListinoPdfParseStats }
  | { ok: false; code: "not_configured" | "quota_exceeded" | "failed"; message: string };

export type ListinoPdfParseOptions = {
  /** Meno chiamate Gemini (es. indicizzazione Ricambi AI su listini lunghi). */
  pagesPerChunkMin?: number;
  chunkDelayMs?: number;
  maxQuotaRetriesPerChunk?: number;
};

export type ListinoPdfParseStats = {
  pageCount: number;
  chunkCount: number;
  chunksSucceeded: number;
  chunksFailed: number;
};

/** Stima chiamate Gemini prima dell'avvio — fail fast su listini troppo grandi per quota free. */
export async function estimateListinoPdfGeminiCalls(
  bytes: Uint8Array,
  options?: ListinoPdfParseOptions,
): Promise<{ pageCount: number; chunkCount: number; estimatedApiCalls: number }> {
  const pageCount = await getPdfPageCount(bytes);
  if (pageCount <= 0) return { pageCount: 0, chunkCount: 0, estimatedApiCalls: 0 };
  if (pageCount <= LISTINO_PDF_SINGLE_CALL_MAX_PAGES) {
    return { pageCount, chunkCount: 1, estimatedApiCalls: 1 };
  }
  const pagesPerChunk = resolveListinoPdfPagesPerChunk(pageCount, options);
  const chunkCount = Math.ceil(pageCount / pagesPerChunk);
  return { pageCount, chunkCount, estimatedApiCalls: chunkCount };
}

export const LISTINO_PREFLIGHT_MAX_ESTIMATED_CALLS = 18;

const LISTINO_CHUNK_QUOTA_RETRIES_DEFAULT = 4;

function formatListinoQuotaErrorMessage(raw: string): string {
  return `${formatCaptureAnalyzeErrorMessage(raw)} Piano free Gemini: limite basso su PDF multipagina — attendi 1–2 minuti tra i tentativi, verifica utilizzo su ${GEMINI_API_USAGE_URL}, oppure importa il listino via Excel in Magazzino.`;
}

type PdfChunkInput = {
  bytes: Uint8Array;
  fromPage: number;
  toPage: number;
};

type PdfChunkOutcome =
  | { ok: true; rows: ListinoImportRawRow[]; warnings: string[] }
  | { ok: false; timedOut: boolean; message: string };

function listinoAiFailureMessage(error: unknown, _fallback?: string): string {
  void _fallback;
  if (error instanceof Error && error.name === "TimeoutError") {
    return aiErrorMessage("AI_TIMEOUT");
  }
  const code = classifyAiError(error);
  return aiErrorMessage(code);
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

function isFatalListinoChunkError(message: string): boolean {
  return (
    message.includes("AI_KEY") ||
    isGeminiQuotaErrorMessage(message) ||
    message.includes(aiErrorMessage("AI_CONFIG_MISSING"))
  );
}

/** ponytail: testo nativo → meno quota Gemini vs PDF multimodale; upgrade path: OCR bridge. */
async function buildListinoChunkUserContent(
  chunk: PdfChunkInput,
  marcaDefault: string,
  totalPages: number,
): Promise<Array<{ type: "text"; text: string } | { type: "file"; data: Buffer; mediaType: string }>> {
  const prompt = chunkPrompt(marcaDefault, chunk.fromPage, chunk.toPage, totalPages);
  try {
    const pages = await extractPdfTextPages(chunk.bytes);
    const sufficient = pages.filter((p) => pageHasSufficientNativeText(p.text)).length;
    const text = pages.map((p) => p.text).join("\n").trim();
    if (pages.length > 0 && sufficient >= Math.ceil(pages.length * 0.6) && text.length >= 200) {
      return [{ type: "text", text: `${prompt}\n\nTesto estratto dal PDF:\n${text}` }];
    }
  } catch {
    // fallback PDF multimodale
  }
  return [
    { type: "text", text: prompt },
    { type: "file", data: Buffer.from(chunk.bytes), mediaType: "application/pdf" },
  ];
}

async function parseListinoPdfChunkWithAi(
  chunk: PdfChunkInput,
  marcaDefault: string,
  totalPages: number,
  maxQuotaRetries: number,
): Promise<PdfChunkOutcome> {
  let lastMessage = "Analisi listino non riuscita.";
  for (let attempt = 0; attempt <= maxQuotaRetries; attempt += 1) {
    if (attempt > 0) {
      const delayMs = resolveGeminiAnalyzeRetryDelayMs(new Error(lastMessage), attempt - 1);
      await sleep(delayMs);
    }
    try {
      const userContent = await buildListinoChunkUserContent(chunk, marcaDefault, totalPages);
      const aiResult = await aiService.generateObject<z.infer<typeof listinoImportAiRowsSchema>>({
        schema: listinoImportAiRowsSchema,
        system: LISTINO_PDF_SYSTEM,
        messages: [
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.2,
        timeoutMs: readRuntimeTimeoutMs(),
        operation: "listino_pdf_chunk",
        maxRetries: 0,
      });
      if (!aiResult.ok) {
        lastMessage = aiResult.message;
        if (aiResult.code === "AI_QUOTA_EXCEEDED" || isRetryableListinoChunkMessage(aiResult.message)) {
          if (attempt < maxQuotaRetries) continue;
          if (isGeminiQuotaErrorMessage(aiResult.message)) {
            return { ok: false, timedOut: false, message: formatListinoQuotaErrorMessage(aiResult.message) };
          }
        }
        return { ok: false, timedOut: aiResult.code === "AI_TIMEOUT", message: aiResult.message };
      }
      const object = aiResult.data.object;

      const rows = object.rows
        .map((r) => normalizeListinoRow(r, marcaDefault))
        .filter((r): r is ListinoImportRawRow => r != null);

      return { ok: true, rows, warnings: object.warnings ?? [] };
    } catch (error) {
      lastMessage = listinoAiFailureMessage(error, "Analisi listino non riuscita.");
      if (isRetryableListinoChunkMessage(lastMessage) && attempt < maxQuotaRetries) continue;
      if (isGeminiQuotaErrorMessage(lastMessage)) {
        return { ok: false, timedOut: false, message: formatListinoQuotaErrorMessage(lastMessage) };
      }
      return {
        ok: false,
        timedOut: isTimeoutError(error),
        message: lastMessage,
      };
    }
  }
  return {
    ok: false,
    timedOut: false,
    message: isGeminiQuotaErrorMessage(lastMessage)
      ? formatListinoQuotaErrorMessage(lastMessage)
      : lastMessage,
  };
}

async function parseChunkWithSplitRetry(
  chunk: PdfChunkInput,
  marcaDefault: string,
  totalPages: number,
  maxQuotaRetries: number,
): Promise<PdfChunkOutcome> {
  const first = await parseListinoPdfChunkWithAi(chunk, marcaDefault, totalPages, maxQuotaRetries);
  if (first.ok || !first.timedOut || chunk.fromPage >= chunk.toPage) return first;

  const pageCount = chunk.toPage - chunk.fromPage + 1;
  if (pageCount <= 1) return first;

  const subChunks = await splitPdfIntoPageRangeChunks(chunk.bytes, 1);
  if (subChunks.length <= 1) return first;

  const warnings: string[] = [];
  const rowBatches: ListinoImportRawRow[][] = [];
  for (const sub of subChunks) {
    const subOutcome = await parseListinoPdfChunkWithAi(sub, marcaDefault, totalPages, maxQuotaRetries);
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

async function runChunksSequential(
  chunks: PdfChunkInput[],
  marcaDefault: string,
  totalPages: number,
  chunkDelayMs: number,
  maxQuotaRetries: number,
): Promise<{ rows: ListinoImportRawRow[]; warnings: string[]; failedRanges: string[]; failureMessages: string[]; quotaExceeded: boolean }> {
  const warnings: string[] = [];
  const failedRanges: string[] = [];
  const failureMessages: string[] = [];
  const rowBatches: ListinoImportRawRow[][] = [];
  let quotaExceeded = false;

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    const outcome = await parseChunkWithSplitRetry(chunk, marcaDefault, totalPages, maxQuotaRetries);

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
      if (isFatalListinoChunkError(outcome.message)) {
        quotaExceeded = isGeminiQuotaErrorMessage(outcome.message);
        break;
      }
    }

    if (index < chunks.length - 1) {
      await sleep(chunkDelayMs);
    }
  }

  return {
    rows: mergeListinoRows(rowBatches),
    warnings,
    failedRanges,
    failureMessages,
    quotaExceeded,
  };
}

export async function parseListinoPdfWithAi(
  bytes: Uint8Array,
  marcaDefault: string,
  options?: ListinoPdfParseOptions,
): Promise<ListinoAiParseResult> {
  const chunkDelayMs = options?.chunkDelayMs ?? LISTINO_PDF_CHUNK_DELAY_MS;
  const maxQuotaRetries = options?.maxQuotaRetriesPerChunk ?? LISTINO_CHUNK_QUOTA_RETRIES_DEFAULT;
  const provider = readRuntimeProviderDefault() as "google";
  const { keys } = await loadActiveKeys(provider);
  if (!selectBestKey(keys)) {
    const err = buildNoSelectableKeyError(keys);
    return {
      ok: false,
      code:
        err.code === "AI_QUOTA_EXCEEDED" || err.code === "AI_RATE_LIMIT"
          ? "quota_exceeded"
          : err.code === "AI_CONFIG_MISSING"
            ? "not_configured"
            : "failed",
      message: err.message,
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
      maxQuotaRetries,
    );
    if (!single.ok) {
      return {
        ok: false,
        code: isGeminiQuotaErrorMessage(single.message) ? "quota_exceeded" : "failed",
        message: single.message,
      };
    }
    return {
      ok: true,
      rows: single.rows,
      warnings: single.warnings,
      stats: { pageCount, chunkCount: 1, chunksSucceeded: 1, chunksFailed: 0 },
    };
  }

  const pagesPerChunk = resolveListinoPdfPagesPerChunk(pageCount, options);
  const ranges = await splitPdfIntoPageRangeChunks(bytes, pagesPerChunk);
  if (ranges.length > LISTINO_PDF_MAX_CHUNKS) {
    return {
      ok: false,
      code: "failed",
      message: `Listino troppo grande (${pageCount} pagine). Suddividi il PDF o usa formato Excel/CSV.`,
    };
  }

  const { rows, warnings, failedRanges, failureMessages, quotaExceeded } = await runChunksSequential(
    ranges.map((r) => ({ bytes: r.bytes, fromPage: r.fromPage, toPage: r.toPage })),
    marcaDefault,
    pageCount,
    chunkDelayMs,
    maxQuotaRetries,
  );

  if (!rows.length) {
    return {
      ok: false,
      code: quotaExceeded || failureMessages.some((m) => isGeminiQuotaErrorMessage(m)) ? "quota_exceeded" : "failed",
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

  const chunkCount = ranges.length;
  const chunksFailed = failedRanges.length;
  return {
    ok: true,
    rows,
    warnings,
    stats: {
      pageCount,
      chunkCount,
      chunksSucceeded: chunkCount - chunksFailed,
      chunksFailed,
    },
  };
}

export async function mapListinoColumnsWithAi(
  matrix: unknown[][],
  marcaDefault: string,
): Promise<ListinoAiParseResult> {
  if (!(await aiService.getConfigurationStatus()).configured) {
    return {
      ok: false,
      code: "not_configured",
      message: "Servizio IA non configurato per mapping colonne.",
    };
  }

  const sample = JSON.stringify(matrix.slice(0, 12));

  try {
    const aiResult = await aiService.generateObject<z.infer<typeof listinoImportColumnMapSchema>>({
      schema: listinoImportColumnMapSchema,
      system: LISTINO_COLUMNS_SYSTEM,
      prompt: `Marca default: ${marcaDefault}. Sample: ${sample}`,
      temperature: 0.1,
      timeoutMs: readRuntimeTimeoutMs(),
      operation: "listino_column_map",
    });
    if (!aiResult.ok) {
      return { ok: false, code: "failed", message: aiResult.message };
    }
    const object = aiResult.data.object;

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

    return {
      ok: true,
      rows,
      warnings: object.warnings ?? ["Mapping colonne via IA."],
      stats: { pageCount: matrix.length, chunkCount: 1, chunksSucceeded: 1, chunksFailed: 0 },
    };
  } catch (error) {
    return {
      ok: false,
      code: "failed",
      message: listinoAiFailureMessage(error, "Mapping colonne IA non riuscito."),
    };
  }
}
