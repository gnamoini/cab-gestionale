import "server-only";

import { isDocumentCaptureHybridExtractionEnabled } from "@/lib/document-capture/document-capture-hybrid.server";
import {
  buildGeminiPrefillPrompt,
  mergeHybridFields,
  needsGeminiFallback,
} from "@/lib/document-capture/extraction/hybrid-extraction-merge";
import type { HybridExtractionResult } from "@/lib/document-capture/extraction/hybrid-extraction-types";
import { extractNativePdfTextFields, detectSchedaTipoFromPdfText } from "@/lib/document-capture/extraction/native-pdf-text-extractor";
import {
  detectSchedaBlankTemplate,
  extractTemplateOcrFields,
} from "@/lib/document-capture/extraction/template-ocr-extractor.server";
import type { PageObject } from "@/lib/document-capture/model/page-object";
import type { AnalyzeTraceEmitter } from "@/lib/document-capture/pipeline/analyze-trace-emitter";
import { CapturePageRasterCache } from "@/lib/document-capture/capture-page-raster-cache.server";
import { warmTesseractWorker } from "@/lib/document-capture/extraction/tesseract-ocr.server";

export type HybridExtractionRunResult =
  | { status: "ok"; data: HybridExtractionResult }
  | { status: "skip"; reason: string }
  | { status: "fail"; error: string };

export async function runHybridExtraction(input: {
  bytes: Uint8Array;
  mime: string;
  pageObjects: PageObject[];
  trace?: AnalyzeTraceEmitter;
}): Promise<HybridExtractionRunResult> {
  if (!isDocumentCaptureHybridExtractionEnabled()) {
    return { status: "skip", reason: "hybrid_disabled" };
  }

  try {
    void warmTesseractWorker();
    const rasterCache = new CapturePageRasterCache();

    input.trace?.emit("PDFJS_TEXT_START", "ok");
    const pdfTextPromise = extractNativePdfTextFields(input.bytes, input.mime, input.trace);
    const titleDetectPromise = detectSchedaBlankTemplate({
      bytes: input.bytes,
      mime: input.mime,
      pageCount: input.pageObjects.length,
      rasterCache,
      trace: input.trace,
    });

    const [pdfResult, schedaFromTitleOcr] = await Promise.all([pdfTextPromise, titleDetectPromise]);
    input.trace?.emit("PDFJS_TEXT_OK", "ok", { fieldCount: pdfResult.fields.length });

    const schedaTipo = detectSchedaTipoFromPdfText(pdfResult.pages) ?? schedaFromTitleOcr ?? null;
    const { fields: pdfTextFields, hasTextLayer } = pdfResult;

    let templateOcrFields: Awaited<ReturnType<typeof extractTemplateOcrFields>> = [];
    // ponytail: tier OCR solo su scan — PDF digitali hanno già testo nativo; OCR bbox qui è lento e inutile
    if (schedaTipo && !hasTextLayer) {
      templateOcrFields = await extractTemplateOcrFields({
        bytes: input.bytes,
        mime: input.mime,
        pageObjects: input.pageObjects,
        schedaTipo,
        rasterCache,
        trace: input.trace,
      });
    }

    const mergedPrefill = mergeHybridFields([pdfTextFields, templateOcrFields]);
    const needsGemini = needsGeminiFallback(mergedPrefill, schedaTipo);

    return {
      status: "ok",
      data: {
        schedaTipo,
        pdfTextFields,
        templateOcrFields,
        mergedPrefill,
        needsGemini,
        geminiUserPrompt: needsGemini ? buildGeminiPrefillPrompt(mergedPrefill) : undefined,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: "fail", error: message };
  }
}

export type { HybridExtractionResult };

const HYBRID_EXTRACTION_TIMEOUT_MS = 35_000;

/** Timeout globale — evita hang analyze su init/download Tesseract. */
export async function runHybridExtractionWithTimeout(input: {
  bytes: Uint8Array;
  mime: string;
  pageObjects: PageObject[];
  timeoutMs?: number;
  trace?: AnalyzeTraceEmitter;
}): Promise<HybridExtractionRunResult> {
  const timeoutMs = input.timeoutMs ?? HYBRID_EXTRACTION_TIMEOUT_MS;
  const result = await Promise.race([
    runHybridExtraction(input),
    new Promise<HybridExtractionRunResult>((resolve) => {
      setTimeout(() => resolve({ status: "skip", reason: "hybrid_timeout" }), timeoutMs);
    }),
  ]);
  return result;
}
