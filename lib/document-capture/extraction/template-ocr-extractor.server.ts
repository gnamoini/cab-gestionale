import "server-only";

import { cropNormalizedBboxToPngBuffer } from "@/lib/document-capture/capture-bbox-crop.server";
import { normalizeCaptureExtractedFieldKey, normalizeCaptureIngressoDateValue, sanitizeCaptureExtractedFieldValue } from "@/lib/document-capture/capture-field-key-aliases";
import { formatCaptureMultilineText } from "@/lib/document-capture/capture-field-display-value";
import {
  blankFieldRegionsForTipo,
  lavorazioniBlankPageCount,
  schedaBlankTitleRegionNormalized,
} from "@/lib/document-capture/capture-template-field-template";
import type { CapturePageRasterCache } from "@/lib/document-capture/capture-page-raster-cache.server";
import type { DetectedSchedaBlankTipo, HybridField } from "@/lib/document-capture/extraction/hybrid-extraction-types";
import { detectSchedaTipoFromPdfText } from "@/lib/document-capture/extraction/native-pdf-text-extractor";
import { recognizePngBuffer, recognizePngBuffersPool } from "@/lib/document-capture/extraction/tesseract-ocr.server";
import type { PageObject } from "@/lib/document-capture/model/page-object";
import type { SchedaBlankTipo } from "@/lib/pdf/schede-blank-layout";
import type { AnalyzeTraceEmitter } from "@/lib/document-capture/pipeline/analyze-trace-emitter";

const NOISE = /^[\s._\-|/\\:]+$/;

function postProcessOcrValue(key: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || NOISE.test(trimmed)) return "";
  if (key === "data_ingresso") return normalizeCaptureIngressoDateValue(trimmed);
  if (key === "descrizione_anomalia" || key === "note" || key === "note_intervento") {
    return formatCaptureMultilineText(trimmed);
  }
  return sanitizeCaptureExtractedFieldValue(key, trimmed);
}

function titleTextToTipo(text: string): DetectedSchedaBlankTipo | null {
  const upper = text.toUpperCase();
  if (upper.includes("INGRESSO")) return "ingresso";
  if (upper.includes("LAVORAZIONI")) return "lavorazioni";
  if (upper.includes("RICAMBI")) return "ricambi";
  return null;
}

async function detectTemplateFromTitleOcr(
  bytes: Uint8Array,
  mime: string,
  pageIndex: number,
  options?: { rasterCache?: CapturePageRasterCache; trace?: AnalyzeTraceEmitter },
): Promise<DetectedSchedaBlankTipo | null> {
  const region = schedaBlankTitleRegionNormalized();
  const png = await cropNormalizedBboxToPngBuffer(bytes, region.bbox, mime, pageIndex, options);
  if (!png) return null;
  options?.trace?.emit("OCR_RECOGNIZE_START", "ok");
  const { text } = await recognizePngBuffer(png, "single_line");
  options?.trace?.emit("OCR_RECOGNIZE_OK", "ok");
  return titleTextToTipo(text);
}

export async function detectSchedaBlankTemplate(input: {
  bytes: Uint8Array;
  mime: string;
  pdfPages?: Array<{ pageIndex: number; text: string }>;
  pageCount: number;
  rasterCache?: CapturePageRasterCache;
  trace?: AnalyzeTraceEmitter;
}): Promise<DetectedSchedaBlankTipo | null> {
  if (input.pdfPages?.length) {
    const fromText = detectSchedaTipoFromPdfText(input.pdfPages);
    if (fromText) return fromText;
  }
  for (let page = 0; page < Math.min(input.pageCount, 2); page += 1) {
    const tipo = await detectTemplateFromTitleOcr(input.bytes, input.mime, page, {
      rasterCache: input.rasterCache,
      trace: input.trace,
    });
    if (tipo) return tipo;
  }
  return null;
}

async function ocrRegionsOnPage(input: {
  bytes: Uint8Array;
  mime: string;
  pageIndex: number;
  sharpPage: number;
  tipo: SchedaBlankTipo;
  rasterCache?: CapturePageRasterCache;
  trace?: AnalyzeTraceEmitter;
}): Promise<HybridField[]> {
  const regions = blankFieldRegionsForTipo(input.tipo, input.pageIndex);
  const crops: Array<{ id: string; png: Buffer; mode: "single_line" | "block"; fieldKey: string }> = [];
  const cropOptions = { rasterCache: input.rasterCache, trace: input.trace };

  for (const region of regions) {
    if (region.fieldKey.startsWith("_")) continue;
    const png = await cropNormalizedBboxToPngBuffer(
      input.bytes,
      region.bbox,
      input.mime,
      input.sharpPage,
      cropOptions,
    );
    if (!png) continue;
    crops.push({
      id: `${input.pageIndex}:${region.fieldKey}`,
      png,
      mode: region.multiline ? "block" : "single_line",
      fieldKey: region.fieldKey,
    });
  }

  input.trace?.emit("OCR_RECOGNIZE_START", "ok", { fieldCount: crops.length });
  const recognized = await recognizePngBuffersPool(
    crops.map((c) => ({ id: c.id, png: c.png, mode: c.mode })),
    1,
    input.trace,
  );
  input.trace?.emit("OCR_RECOGNIZE_OK", "ok", { fieldCount: recognized.size });

  const fields: HybridField[] = [];
  for (const crop of crops) {
    const result = recognized.get(crop.id);
    if (!result) continue;
    const key = normalizeCaptureExtractedFieldKey(crop.fieldKey);
    const value = postProcessOcrValue(key, result.text);
    if (!value) continue;
    fields.push({
      key,
      value,
      confidence: result.confidence,
      source: "template_ocr",
      pageIndex: input.pageIndex,
    });
  }
  return fields;
}

/** Tier 1 — OCR Tesseract su bbox template CAB blank v2. */
export async function extractTemplateOcrFields(input: {
  bytes: Uint8Array;
  mime: string;
  pageObjects: PageObject[];
  schedaTipo: DetectedSchedaBlankTipo;
  rasterCache?: CapturePageRasterCache;
  trace?: AnalyzeTraceEmitter;
}): Promise<HybridField[]> {
  const all: HybridField[] = [];
  if (input.schedaTipo === "ingresso") {
    const pageBytes = input.pageObjects[0]?.bytes ?? input.bytes;
    const sharpPage = input.pageObjects[0]?.bytes ? 0 : 0;
    all.push(
      ...(await ocrRegionsOnPage({
        bytes: pageBytes,
        mime: input.mime,
        pageIndex: 0,
        sharpPage,
        tipo: "ingresso",
        rasterCache: input.rasterCache,
        trace: input.trace,
      })),
    );
    return all;
  }
  if (input.schedaTipo === "lavorazioni") {
    const pages = Math.min(input.pageObjects.length, lavorazioniBlankPageCount());
    for (let p = 0; p < pages; p += 1) {
      const pageBytes = input.pageObjects[p]?.bytes ?? input.bytes;
      const sharpPage = input.pageObjects[p]?.bytes ? 0 : p;
      all.push(
        ...(await ocrRegionsOnPage({
          bytes: pageBytes,
          mime: input.mime,
          pageIndex: p,
          sharpPage,
          tipo: "lavorazioni",
          rasterCache: input.rasterCache,
          trace: input.trace,
        })),
      );
    }
    return all;
  }
  const pageBytes = input.pageObjects[0]?.bytes ?? input.bytes;
  const sharpPage = input.pageObjects[0]?.bytes ? 0 : 0;
  all.push(
    ...(await ocrRegionsOnPage({
      bytes: pageBytes,
      mime: input.mime,
      pageIndex: 0,
      sharpPage,
      tipo: "ricambi",
      rasterCache: input.rasterCache,
      trace: input.trace,
    })),
  );
  return all;
}
