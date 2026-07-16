import "server-only";

import { isDocumentCaptureHybridExtractionEnabled } from "@/lib/document-capture/document-capture-hybrid.server";
import {
  buildGeminiPrefillPrompt,
  mergeHybridFields,
  needsGeminiFallback,
} from "@/lib/document-capture/extraction/hybrid-extraction-merge";
import type { HybridExtractionResult } from "@/lib/document-capture/extraction/hybrid-extraction-types";
import { extractNativePdfTextFields } from "@/lib/document-capture/extraction/native-pdf-text-extractor";
import {
  detectSchedaBlankTemplate,
  extractTemplateOcrFields,
} from "@/lib/document-capture/extraction/template-ocr-extractor.server";
import type { PageObject } from "@/lib/document-capture/model/page-object";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

const DEBUG_LOG_PATHS = [
  join(process.cwd(), "debug-bd086a.log"),
  join(process.cwd(), ".cursor", "debug-bd086a.log"),
];

function debugAnalyzeLog(payload: Record<string, unknown>): void {
  const line = `${JSON.stringify({ sessionId: "bd086a", timestamp: Date.now(), ...payload })}\n`;
  for (const logPath of DEBUG_LOG_PATHS) {
    try {
      appendFileSync(logPath, line);
    } catch {
      /* ignore */
    }
  }
  fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
    body: JSON.stringify({ sessionId: "bd086a", timestamp: Date.now(), ...payload }),
  }).catch(() => {});
}

export async function runHybridExtraction(input: {
  bytes: Uint8Array;
  mime: string;
  pageObjects: PageObject[];
}): Promise<HybridExtractionResult | null> {
  if (!isDocumentCaptureHybridExtractionEnabled()) return null;

  const t0 = performance.now();
  try {
    const { pages, fields: pdfTextFields, hasTextLayer } = await extractNativePdfTextFields(
      input.bytes,
      input.mime,
    );

    const schedaTipo =
      (await detectSchedaBlankTemplate({
        bytes: input.bytes,
        mime: input.mime,
        pdfPages: pages,
        pageCount: input.pageObjects.length,
      })) ?? null;

    let templateOcrFields: Awaited<ReturnType<typeof extractTemplateOcrFields>> = [];
    // ponytail: tier OCR solo su scan — PDF digitali hanno già testo nativo; OCR bbox qui è lento e inutile
    if (schedaTipo && !hasTextLayer) {
      templateOcrFields = await extractTemplateOcrFields({
        bytes: input.bytes,
        mime: input.mime,
        pageObjects: input.pageObjects,
        schedaTipo,
      });
    }

    const mergedPrefill = mergeHybridFields([pdfTextFields, templateOcrFields]);
    const needsGemini = needsGeminiFallback(mergedPrefill, schedaTipo);

    debugAnalyzeLog({
      hypothesisId: "HYBRID_OK",
      location: "run-hybrid-extraction.server.ts",
      message: "hybrid extraction completed",
      data: {
        durationMs: Math.round(performance.now() - t0),
        schedaTipo,
        hasTextLayer,
        pdfTextCount: pdfTextFields.length,
        templateOcrCount: templateOcrFields.length,
        mergedCount: mergedPrefill.length,
        needsGemini,
      },
    });

    return {
      schedaTipo,
      pdfTextFields,
      templateOcrFields,
      mergedPrefill,
      needsGemini,
      geminiUserPrompt: needsGemini ? buildGeminiPrefillPrompt(mergedPrefill) : undefined,
    };
  } catch (e) {
    debugAnalyzeLog({
      hypothesisId: "HYBRID_FAIL",
      location: "run-hybrid-extraction.server.ts",
      message: "hybrid extraction failed",
      data: {
        durationMs: Math.round(performance.now() - t0),
        error: e instanceof Error ? e.message : String(e),
      },
    });
    return null;
  }
}

export type { HybridExtractionResult };

const HYBRID_EXTRACTION_TIMEOUT_MS = 35_000;

/** Timeout globale — evita hang analyze su init/download Tesseract. */
export async function runHybridExtractionWithTimeout(input: {
  bytes: Uint8Array;
  mime: string;
  pageObjects: PageObject[];
}): Promise<HybridExtractionResult | null> {
  const result = await Promise.race([
    runHybridExtraction(input),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), HYBRID_EXTRACTION_TIMEOUT_MS);
    }),
  ]);
  if (result === null) {
    debugAnalyzeLog({
      hypothesisId: "HYBRID_TIMEOUT",
      location: "run-hybrid-extraction.server.ts",
      message: "hybrid extraction timed out",
      data: { timeoutMs: HYBRID_EXTRACTION_TIMEOUT_MS },
    });
  }
  return result;
}
