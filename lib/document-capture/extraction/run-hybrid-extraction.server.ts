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

export async function runHybridExtraction(input: {
  bytes: Uint8Array;
  mime: string;
  pageObjects: PageObject[];
}): Promise<HybridExtractionResult | null> {
  if (!isDocumentCaptureHybridExtractionEnabled()) return null;

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

    return {
      schedaTipo,
      pdfTextFields,
      templateOcrFields,
      mergedPrefill,
      needsGemini,
      geminiUserPrompt: needsGemini ? buildGeminiPrefillPrompt(mergedPrefill) : undefined,
    };
  } catch {
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
  return Promise.race([
    runHybridExtraction(input),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), HYBRID_EXTRACTION_TIMEOUT_MS);
    }),
  ]);
}
